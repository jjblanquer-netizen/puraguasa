// ============================================================
// INTRUSO — Lógica de la aplicación (SPA sin frameworks).
// Un único punto de entrada que:
//  1) gestiona la identidad local del jugador (localStorage),
//  2) escucha la sala de Firebase en tiempo real,
//  3) renderiza la pantalla correspondiente a cada fase,
//  4) el ANFITRIÓN es quien ejecuta las transiciones de fase
//     (evita que dos móviles escriban el mismo cambio a la vez).
// ============================================================
import * as DB from './db.js';
import * as Engine from './gameEngine.js';
import { CATEGORIES, AVATARS, AVATAR_COLORS, getAvatar, getColorHex, TERMS } from './gameData.js';

// ---------------------------- Identidad local ----------------------------
const ME_KEY = 'intruso.me';
const LAST_ROOM_KEY = 'intruso.lastRoom';
const ONBOARDING_KEY = 'intruso.onboardingSeen';

const ONBOARDING_SLIDES = [
  {
    emoji: '🔍',
    title: 'Descubre el secreto',
    text: 'Todos los jugadores reciben la misma palabra secreta en su propio móvil… excepto el Intruso, que no tiene ni idea de qué va la cosa.',
  },
  {
    emoji: '💬',
    title: 'Da pistas sin pasarte',
    text: 'Por turnos, cada uno dice una palabra relacionada con el secreto. ¡Cuidado! Si eres muy obvio, le regalas la respuesta al Intruso.',
  },
  {
    emoji: '🗳️',
    title: 'Debate y vota en secreto',
    text: 'Tras comentar las pistas entre todos, cada jugador vota desde su propio móvil a quién cree que es el Intruso. Nadie ve el voto de los demás.',
  },
  {
    emoji: '🎭',
    title: '¡Que gane el mejor!',
    text: 'Si descubrís al Intruso, tiene una última oportunidad de adivinar la palabra. Si consigue pasar desapercibido… ¡gana él solito!',
  },
];

function loadMe() {
  try {
    const raw = localStorage.getItem(ME_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const fresh = {
    id: Engine.generateId('player'),
    name: '',
    avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)].id,
    colorId: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].id,
  };
  saveMe(fresh);
  return fresh;
}

function saveMe(me) {
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

let me = loadMe();

// ---------------------------- Estado de la app ----------------------------
const state = {
  screen: 'landing', // landing | join | lobby | config | reveal | clues | debate | voting | voteResult | lastChance | finalResult
  code: null,
  room: null,
  error: null,
  serverOffset: 0,
  // sub-estado de UI local (no vive en Firebase)
  ui: {
    joinCodeInput: '',
    nameInput: me.name || '',
    configDraft: null,
    lastChanceMode: 'choice',
    lastChanceOptions: [],
    revealPeeking: false,
    revealConfirmedLocally: false,
    voteCandidateId: null,
    voteConfirming: false,
    resetConfirming: false,
    onboardingIndex: 0,
    onboardingDontShow: false,
  },
  lastVoteRound: 0,
  locks: { clueAdvance: false, debateAdvance: false },
};

let unsubRoom = null;
let unsubOffset = null;

function serverNow() {
  return Date.now() + state.serverOffset;
}

// ---------------------------- Utilidades UI ----------------------------
function $(sel) { return document.querySelector(sel); }

function showToast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function avatarHtml(avatarId, colorId, size = 56, state2 = '') {
  const a = getAvatar(avatarId);
  const hex = getColorHex(colorId);
  const badge = { suspect: '🤔', winner: '🏆', loser: '💥', voting: '🗳️' }[state2] || '';
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${hex}33;border-color:${hex}">
    <span class="avatar-emoji" style="font-size:${Math.round(size * 0.5)}px">${a.emoji}</span>
    ${badge ? `<span style="position:absolute;bottom:-4px;right:-4px;font-size:${Math.round(size * 0.28)}px">${badge}</span>` : ''}
  </div>`;
}

function playersArray(room) {
  const players = room?.players || {};
  return Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

function isHost() {
  return state.room && state.room.hostId === me.id;
}

function render() {
  const screen = $('#screen');
  screen.innerHTML = renderScreen();
  screen.scrollTop = 0;
}

// ---------------------------- Arranque y enrutado ----------------------------
async function init() {
  unsubOffset = DB.listenServerOffset((offset) => { state.serverOffset = offset; });

  const hashCode = (location.hash || '').replace('#', '').trim().toUpperCase();
  const lastRoom = localStorage.getItem(LAST_ROOM_KEY);
  const onboardingSeen = localStorage.getItem(ONBOARDING_KEY);

  if (hashCode) {
    // Alguien entra desde un enlace de invitación: directos a unirse, sin
    // interponer el onboarding.
    await tryEnterRoom(hashCode);
  } else if (!onboardingSeen) {
    state.screen = 'onboarding';
    state.ui.onboardingIndex = 0;
    render();
  } else if (lastRoom) {
    // Ofrecemos reconectar a la última partida en vez de forzarlo.
    state.screen = 'landing';
    state.ui.rejoinCode = lastRoom;
    render();
  } else {
    state.screen = 'landing';
    render();
  }

  window.addEventListener('hashchange', () => {
    const code = (location.hash || '').replace('#', '').trim().toUpperCase();
    if (code && code !== state.code) tryEnterRoom(code);
  });
}

async function tryEnterRoom(code) {
  try {
    const room = await DB.readOnceAt(`rooms/${code}`);
    if (!room) {
      showToast('Esa sala no existe o ha caducado.');
      state.screen = 'landing';
      render();
      return;
    }
    state.code = code;
    localStorage.setItem(LAST_ROOM_KEY, code);
    history.replaceState(null, '', `#${code}`);

    const alreadyIn = room.players && room.players[me.id];
    if (alreadyIn) {
      // Reconexión: ya somos parte de esta sala (p. ej. tras recargar la página).
      attachRoomListener(code);
    } else {
      state.screen = 'join';
      render();
    }
  } catch (e) {
    showToast('No se pudo conectar. Comprueba tu conexión.');
    state.screen = 'landing';
    render();
  }
}

function attachRoomListener(code) {
  if (unsubRoom) unsubRoom();
  unsubRoom = DB.listenRoom(code, (data) => {
    if (!data) {
      // La sala fue eliminada (p. ej. el anfitrión salió y borró la partida).
      showToast('La partida ha terminado.');
      leaveToLanding();
      return;
    }
    state.room = data;
    const iAmIn = data.players && data.players[me.id];
    if (!iAmIn) {
      // Me han eliminado o aún no me he unido.
      if (state.screen !== 'join' && state.screen !== 'landing') {
        state.screen = 'join';
      }
      render();
      return;
    }
    const voteRound = data.game?.voteRound || 0;
    if (voteRound !== state.lastVoteRound) {
      // Nueva ronda de votación (inicial o desempate): limpia la selección local.
      state.ui.voteCandidateId = null;
      state.ui.voteConfirming = false;
      state.lastVoteRound = voteRound;
    }
    syncScreenFromPhase(data.game?.phase);
    render();
  });
}

function syncScreenFromPhase(phase) {
  const map = {
    lobby: 'lobby',
    config: 'config',
    reveal: 'reveal',
    clues: 'clues',
    debate: 'debate',
    voting: 'voting',
    voteResult: 'voteResult',
    lastChance: 'lastChance',
    finalResult: 'finalResult',
  };
  const next = map[phase] || 'lobby';
  const changed = next !== state.lastPhase;
  if (changed) {
    // Reinicia sub-estado de UI local propio de cada pantalla al ENTRAR en ella
    // (no en cada actualización dentro de la misma fase, para no perder lo que
    // el anfitrión está editando en Configuración mientras llegan otros datos).
    state.ui.voteCandidateId = null;
    state.ui.voteConfirming = false;
    state.ui.revealPeeking = false;
    state.ui.revealConfirmedLocally = false;
    state.ui.lastChanceMode = 'choice';
    state.ui.resetConfirming = false;
    if (next !== 'config') state.ui.configDraft = null;
  }
  state.lastPhase = next;
  state.screen = next;
}

function leaveToLanding() {
  if (unsubRoom) unsubRoom();
  unsubRoom = null;
  state.code = null;
  state.room = null;
  state.screen = 'landing';
  localStorage.removeItem(LAST_ROOM_KEY);
  history.replaceState(null, '', location.pathname);
  render();
}

function finishOnboarding() {
  if (state.ui.onboardingDontShow) {
    localStorage.setItem(ONBOARDING_KEY, '1');
  }
  state.screen = 'landing';
  render();
}

// ---------------------------- Dispatcher de pantallas ----------------------------
const RESET_ELIGIBLE_SCREENS = ['reveal', 'clues', 'debate', 'voting', 'voteResult', 'lastChance'];

function renderScreen() {
  let html;
  switch (state.screen) {
    case 'onboarding': html = screenOnboarding(); break;
    case 'landing': html = screenLanding(); break;
    case 'join': html = screenJoin(); break;
    case 'lobby': html = screenLobby(); break;
    case 'config': html = screenConfig(); break;
    case 'reveal': html = screenReveal(); break;
    case 'clues': html = screenClues(); break;
    case 'debate': html = screenDebate(); break;
    case 'voting': html = screenVoting(); break;
    case 'voteResult': html = screenVoteResult(); break;
    case 'lastChance': html = screenLastChance(); break;
    case 'finalResult': html = screenFinalResult(); break;
    default: html = `<div class="screen center"><p>Cargando…</p></div>`;
  }
  if (isHost() && RESET_ELIGIBLE_SCREENS.includes(state.screen)) {
    html += hostResetControl();
  }
  return html;
}

// ---------------------------- Control de reinicio (solo anfitrión) ----------------------------
// Disponible durante la partida por si hay que corregir algo grave: añadir o
// quitar un jugador, arreglar una configuración equivocada, etc. Exige doble
// confirmación porque destruye la ronda en curso.
function hostResetControl() {
  if (state.ui.resetConfirming) {
    return `
      <div class="screen" style="padding-top:0">
        <div class="card" style="border-color:var(--danger)">
          <p style="color:#fff;font-weight:700;margin-bottom:6px">⚠️ ¿Reiniciar la partida?</p>
          <p class="muted" style="margin-bottom:12px">Se perderán los puntos de esta ronda y todos volveréis al lobby, donde podrás añadir o quitar jugadores antes de empezar de nuevo.</p>
          <div class="btn-row">
            <button class="btn secondary auto" onclick="App.cancelReset()">Cancelar</button>
            <button class="btn danger auto" onclick="App.doReset()">Sí, reiniciar</button>
          </div>
        </div>
      </div>
    `;
  }
  return `<div class="screen" style="padding-top:0;padding-bottom:4px"><div class="reset-link" onclick="App.confirmReset()">🔄 Reiniciar partida (volver al lobby)</div></div>`;
}

// ---------------------------- Onboarding ----------------------------
function screenOnboarding() {
  const i = state.ui.onboardingIndex || 0;
  const slide = ONBOARDING_SLIDES[i];
  const isLast = i === ONBOARDING_SLIDES.length - 1;

  return `
    <div class="screen center">
      <div class="brand-row">
        <img src="icons/hero.png" alt="PuraGuasa" class="hero-image sm" />
        <div class="brand-text">
          <div class="brand-name">PuraGuasa</div>
          <div class="brand-tag">🔎 En busca del Intruso</div>
        </div>
      </div>
      <div style="font-size:44px;margin-top:8px">${slide.emoji}</div>
      <h2>${esc(slide.title)}</h2>
      <p>${esc(slide.text)}</p>
    </div>
    <div class="chip-row" style="justify-content:center">
      ${ONBOARDING_SLIDES.map((_, idx) => `
        <span style="width:${idx === i ? 22 : 8}px;height:8px;border-radius:4px;background:${idx === i ? 'var(--primary)' : 'rgba(255,255,255,0.25)'};display:inline-block"></span>
      `).join('')}
    </div>
    <label style="display:flex;align-items:center;gap:8px;justify-content:center;color:var(--text-muted);font-size:13px;padding:4px 0;cursor:pointer">
      <input type="checkbox" ${state.ui.onboardingDontShow ? 'checked' : ''} onchange="App.setOnboardingDontShow(this.checked)" style="width:18px;height:18px;accent-color:var(--primary)" />
      No volver a mostrar esto
    </label>
    <div class="btn-row">
      <button class="btn ghost auto" onclick="App.skipOnboarding()">Saltar</button>
      <button class="btn auto" onclick="App.nextOnboarding()">${isLast ? '¡Vamos! 🎉' : 'Siguiente'}</button>
    </div>
  `;
}

// ---------------------------- Landing ----------------------------
function screenLanding() {
  const rejoin = state.ui.rejoinCode
    ? `<button class="btn secondary" onclick="App.rejoinLast()">▶️ Continuar en ${esc(state.ui.rejoinCode)}</button>`
    : '';
  return `
    <div class="screen center">
      <img src="icons/hero.png" alt="PuraGuasa" class="hero-image" />
      <div class="hero-title">PURAGUASA</div>
      <p class="tagline">🔎 En busca del Intruso</p>
      <p>Descubre quién no sabe la palabra secreta. Cada jugador con su propio móvil.</p>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <button class="btn" onclick="App.goCreate()">🎮 Crear partida</button>
      <button class="btn secondary" onclick="App.goJoinForm()">🔗 Unirme con un código</button>
      ${rejoin}
    </div>
  `;
}

function screenJoinForm() {
  return `
    <div class="screen">
      <h2>Unirse a una partida</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        <input type="text" id="codeInput" placeholder="CÓDIGO DE SALA" maxlength="5"
          style="text-transform:uppercase;letter-spacing:4px;text-align:center;font-weight:800"
          value="${esc(state.ui.joinCodeInput)}" oninput="App.setJoinCode(this.value)" />
        <button class="btn" onclick="App.submitJoinCode()">Continuar</button>
        <button class="btn ghost" onclick="App.goLanding()">Cancelar</button>
      </div>
    </div>
  `;
}

// ---------------------------- Unirse (con código ya resuelto) ----------------------------
function screenJoin() {
  if (!state.code && !state.ui.pendingCreate) return screenJoinForm();
  const title = state.ui.pendingCreate ? 'Crea tu perfil de jugador' : `Unirse a la sala ${esc(state.code)}`;
  return `
    <div class="screen">
      <h2>${title}</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <p class="mb-0">Tu nombre</p>
          <input type="text" id="nameInput" placeholder="Escribe tu nombre" maxlength="20"
            value="${esc(state.ui.nameInput)}" oninput="App.setNameInput(this.value)" />
        </div>
        <div>
          <p class="mb-0">Tu avatar</p>
          <div class="chip-row">${avatarPickerHtml()}</div>
        </div>
        <div>
          <p class="mb-0">Tu color</p>
          <div class="chip-row">${colorPickerHtml()}</div>
        </div>
        ${state.error ? `<p class="error-text">${esc(state.error)}</p>` : ''}
        <button class="btn" onclick="App.confirmJoin()" ${state.ui.nameInput.trim() ? '' : 'disabled'}>${state.ui.pendingCreate ? 'Crear partida' : 'Entrar en la partida'}</button>
        <button class="btn ghost" onclick="App.goLanding()">Cancelar</button>
      </div>
    </div>
  `;
}

function avatarPickerHtml() {
  return AVATARS.map((a) => `
    <span class="chip ${a.id === me.avatarId ? 'active' : ''}" style="font-size:20px;padding:8px 12px"
      onclick="App.pickAvatar('${a.id}')">${a.emoji}</span>
  `).join('');
}

function colorPickerHtml() {
  return AVATAR_COLORS.map((c) => `
    <span onclick="App.pickColor('${c.id}')" style="width:30px;height:30px;border-radius:50%;background:${c.hex};display:inline-block;cursor:pointer;border:3px solid ${c.id === me.colorId ? '#fff' : 'transparent'}"></span>
  `).join('');
}

// ---------------------------- Lobby ----------------------------
function screenLobby() {
  const players = playersArray(state.room);
  const host = isHost();
  const shareUrl = `${location.origin}${location.pathname}#${state.code}`;
  return `
    <div class="screen">
      <div class="text-center">
        <p class="mb-0">Código de la sala</p>
        <div class="room-code">${esc(state.code)}</div>
        <div class="room-link" onclick="App.copyLink()">🔗 Toca para copiar el enlace de invitación</div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px">Jugadores (${players.length})</h3>
        <div class="player-list">
          ${players.map((p) => `
            <div class="player-row">
              ${avatarHtml(p.avatarId, p.colorId, 44)}
              <span class="player-name">${esc(p.name)}${p.id === state.room.hostId ? ' 👑' : ''}</span>
              ${p.connected === false ? '<span class="muted">desconectado</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      ${host ? `
        <p class="muted text-center">Se necesitan al menos 3 jugadores conectados para empezar.</p>
        <button class="btn" onclick="App.goConfig()" ${players.length >= 3 ? '' : 'disabled'}>⚙️ Configurar y empezar</button>
        <button class="btn ghost" onclick="App.leaveRoom()">Cerrar sala y salir</button>
      ` : `
        <div class="card center"><p>⏳ Esperando a que el anfitrión configure y empiece la partida…</p></div>
        <button class="btn ghost" onclick="App.leaveRoom()">Salir de la sala</button>
      `}
    </div>
  `;
}

// ---------------------------- Configuración (solo anfitrión) ----------------------------
const DEFAULT_CONFIG = {
  numIntrusos: 1,
  intrusosKnowEachOther: true,
  intrusoGetsHint: false,
  intrusoCanGuess: true,
  categoryIds: [],
  difficulty: 'media',
  contentRating: 'general',
  turnSeconds: 30,
  debateSeconds: 120,
  randomizeOrder: true,
  rounds: 1,
};

function ensureConfigDraft() {
  if (!state.ui.configDraft) {
    // Firebase elimina los arrays/objetos vacíos al guardarlos (p. ej.
    // "categoryIds: []" desaparece del todo), así que al releerlo hay que
    // rellenar cualquier campo así con su valor por defecto, o el resto del
    // código rompe al llamar a .includes()/.map() sobre "undefined".
    const base = state.room?.config || DEFAULT_CONFIG;
    state.ui.configDraft = { ...DEFAULT_CONFIG, ...base, categoryIds: base.categoryIds || [] };
  }
  return state.ui.configDraft;
}

function screenConfig() {
  if (!isHost()) {
    return `
      <div class="screen center">
        <div class="card center">
          <div class="hero-emoji">⚙️</div>
          <p>El anfitrión está configurando la partida…</p>
        </div>
      </div>
    `;
  }
  const players = playersArray(state.room);
  const cfg = ensureConfigDraft();
  const maxIntrusos = Math.max(1, Engine.maxIntrusosFor(players.length));

  const intrusosChips = Array.from({ length: maxIntrusos }, (_, i) => i + 1)
    .map((n) => `<span class="chip ${cfg.numIntrusos === n ? 'active' : ''}" onclick="App.cfgSet('numIntrusos', ${n})">${n}</span>`).join('');

  const catChips = CATEGORIES.map((c) => `
    <span class="chip ${cfg.categoryIds.includes(c.id) ? 'active' : ''}" onclick="App.cfgToggleCategory('${c.id}')">${c.icon} ${esc(c.name)}</span>
  `).join('');

  const diffChips = [['facil', 'Fácil'], ['media', 'Media'], ['dificil', 'Difícil'], ['extrema', 'Extrema']]
    .map(([id, label]) => `<span class="chip ${cfg.difficulty === id ? 'active' : ''}" onclick="App.cfgSet('difficulty','${id}')">${label}</span>`).join('');

  const ratingChips = [['general', 'General'], ['infantil', 'Infantil'], ['adultos', 'Adultos']]
    .map(([id, label]) => `<span class="chip ${cfg.contentRating === id ? 'active' : ''}" onclick="App.cfgSet('contentRating','${id}')">${label}</span>`).join('');

  const turnChips = [0, 15, 30, 45, 60]
    .map((s) => `<span class="chip ${cfg.turnSeconds === s ? 'active' : ''}" onclick="App.cfgSet('turnSeconds', ${s})">${s === 0 ? 'Sin límite' : s + 's'}</span>`).join('');

  const debateChips = [0, 60, 120, 180, 300]
    .map((s) => `<span class="chip ${cfg.debateSeconds === s ? 'active' : ''}" onclick="App.cfgSet('debateSeconds', ${s})">${s === 0 ? 'Sin límite' : (s / 60) + 'min'}</span>`).join('');

  const roundChips = [1, 3, 5, 0]
    .map((r) => `<span class="chip ${cfg.rounds === r ? 'active' : ''}" onclick="App.cfgSet('rounds', ${r})">${r === 0 ? 'Sin límite' : r}</span>`).join('');

  return `
    <div class="screen scroll-y">
      <h2>Configuración</h2>

      <div class="card">
        <h3>🎭 Modo de juego</h3>
        <div class="chip-row" style="margin-top:8px">
          <span class="chip active">Palabra secreta ✅</span>
          <span class="chip disabled">Personajes (próx.)</span>
          <span class="chip disabled">Lugar secreto (próx.)</span>
        </div>
      </div>

      <div class="card">
        <h3>👤 Intrusos</h3>
        <div class="chip-row" style="margin:8px 0">${intrusosChips}</div>
        <p class="muted">Máximo recomendado para ${players.length} jugadores: ${maxIntrusos}</p>
        ${switchRow('Los intrusos se conocen entre sí', 'intrusosKnowEachOther', cfg.intrusosKnowEachOther)}
        ${switchRow('Dar una pista general al intruso', 'intrusoGetsHint', cfg.intrusoGetsHint)}
        ${switchRow('El intruso puede adivinar la palabra', 'intrusoCanGuess', cfg.intrusoCanGuess)}
      </div>

      <div class="card">
        <h3>📚 Categorías</h3>
        <div class="chip-row" style="margin-top:8px">${catChips}</div>
        <p class="muted">Sin selección = todas las categorías.</p>
      </div>

      <div class="card">
        <h3>🎯 Dificultad</h3>
        <div class="chip-row" style="margin-top:8px">${diffChips}</div>
      </div>

      <div class="card">
        <h3>🔞 Contenido</h3>
        <div class="chip-row" style="margin-top:8px">${ratingChips}</div>
      </div>

      <div class="card">
        <h3>⏱️ Tiempos</h3>
        <p class="muted">Turno de pista</p>
        <div class="chip-row">${turnChips}</div>
        <p class="muted" style="margin-top:10px">Debate</p>
        <div class="chip-row">${debateChips}</div>
      </div>

      <div class="card">
        ${switchRow('Orden aleatorio de participación', 'randomizeOrder', cfg.randomizeOrder)}
        <p class="muted" style="margin-top:8px">Número de rondas</p>
        <div class="chip-row">${roundChips}</div>
      </div>

      <div class="btn-row">
        <button class="btn secondary" onclick="App.backToLobby()">Atrás</button>
        <button class="btn" onclick="App.startGame()">🚀 Empezar</button>
      </div>
    </div>
  `;
}

function switchRow(label, key, value) {
  return `
    <div class="switch-row">
      <span style="font-size:14px">${esc(label)}</span>
      <label class="switch">
        <input type="checkbox" ${value ? 'checked' : ''} onchange="App.cfgSet('${key}', this.checked)" />
        <span class="switch-track"></span>
        <span class="switch-thumb"></span>
      </label>
    </div>
  `;
}

// ---------------------------- Revelación individual y privada ----------------------------
function screenReveal() {
  const game = state.room.game || {};
  const myRole = game.roles ? game.roles[me.id] : null;
  const players = playersArray(state.room);
  const confirmedCount = Object.keys(game.revealConfirmed || {}).length;
  const allConfirmed = confirmedCount >= players.length;

  if (state.ui.revealConfirmedLocally) {
    return `
      <div class="screen center">
        <div class="card center">
          <div class="hero-emoji">🤫</div>
          <p>Ya sabes tu secreto. ¡Ni una palabra todavía!</p>
          <p class="muted">Esperando a que el resto también lo descubra… (${confirmedCount}/${players.length})</p>
        </div>
        ${isHost() ? `
          <button class="btn" onclick="App.goClues()" ${allConfirmed ? '' : 'disabled'}>Empezar la ronda de pistas</button>
          ${!allConfirmed ? `<button class="btn ghost" onclick="App.goClues()">Continuar de todos modos</button>` : ''}
        ` : `<div class="card center"><p>Cuando todos hayáis fisgoneado vuestra pantalla, el anfitrión dará paso a las pistas.</p></div>`}
      </div>
    `;
  }

  const revealedContent = myRole === 'intruso'
    ? `
      <div class="intruso-banner">🎭 ¡ERES EL INTRUSO!</div>
      ${state.room.config?.intrusoGetsHint ? `<p>Pista: ${esc(game.term.hintForIntruso)}</p>` : ''}
      <p class="muted">No tienes ni idea de la palabra secreta. ¡A camuflarte con estilo! 🕶️</p>
    `
    : `
      <p class="muted mb-0">Psss… tu palabra secreta es</p>
      <div class="secret-word">${esc(game.term.word)}</div>
    `;

  return `
    <div class="screen center">
      <h2>🤫 ¡Es tu momento, ${esc(me.name)}!</h2>
      <p>Ahora mismo cada jugador está descubriendo, a solas en su móvil, si conoce la palabra secreta… o si le ha tocado ser el Intruso. Que nadie mire tu pantalla 👀</p>
      <div class="secret-box" id="secretBox">
        ${state.ui.revealPeeking ? revealedContent : '<p class="muted">🙈 Aquí se esconde tu secreto…</p>'}
      </div>
      <button class="btn"
        onmousedown="App.setPeek(true)" onmouseup="App.setPeek(false)" onmouseleave="App.setPeek(false)"
        ontouchstart="App.setPeek(true)" ontouchend="App.setPeek(false)">
        👆 Mantén pulsado para descubrirlo
      </button>
      <button class="btn secondary" onclick="App.confirmReveal()">✅ Ya lo sé, ¡vamos!</button>
    </div>
  `;
}

// ---------------------------- Fase de pistas ----------------------------
function screenClues() {
  const game = state.room.game || {};
  const order = game.order || [];
  const players = playersArray(state.room);
  const turnIndex = game.turnIndex || 0;
  const currentId = order[turnIndex];
  const current = players.find((p) => p.id === currentId);
  const turnSeconds = state.room.config?.turnSeconds || 0;
  const cluesPaused = !!game.turnPausedRemaining;
  const remaining = turnSeconds > 0
    ? (cluesPaused ? Math.ceil(game.turnPausedRemaining / 1000) : Math.max(0, Math.ceil(((game.turnEndAt || 0) - serverNow()) / 1000)))
    : null;
  const isLast = turnIndex >= order.length - 1;

  if (isHost() && turnSeconds > 0 && remaining === 0 && !cluesPaused && !state.locks.clueAdvance) {
    state.locks.clueAdvance = true;
    queueMicrotask(async () => { await advanceClueTurn(); state.locks.clueAdvance = false; });
  }

  return `
    <div class="screen">
      <h2>💬 Ronda de pistas</h2>
      <p>Di una sola palabra relacionada con el secreto, ¡sin ser demasiado obvio!</p>

      <div class="card center">
        ${current ? avatarHtml(current.avatarId, current.colorId, 84, 'voting') : ''}
        <h3>${current ? esc(current.name) : ''}</h3>
        <p class="muted">Le toca dar su pista</p>
        ${remaining !== null ? `<div class="timer-display ${remaining <= 10 ? 'timer-warning' : ''}">${remaining}s</div>` : '<p class="muted">⏱ Sin límite de tiempo</p>'}
      </div>

      <div class="chip-row" style="justify-content:center">
        ${order.map((id, i) => {
          const p = players.find((pp) => pp.id === id);
          if (!p) return '';
          return `<span style="opacity:${i === turnIndex ? 1 : 0.4}">${avatarHtml(p.avatarId, p.colorId, 36)}</span>`;
        }).join('')}
      </div>

      ${isHost() ? `
        <div class="btn-row">
          ${turnSeconds > 0 ? `<button class="btn secondary auto" onclick="App.toggleCluesPause()">${cluesPaused ? 'Reanudar' : 'Pausar'}</button>` : ''}
          <button class="btn" onclick="App.advanceClueTurnManual()">${isLast ? 'Ir al debate' : 'Siguiente jugador'}</button>
        </div>
      ` : `<p class="muted text-center">El anfitrión controla el ritmo de esta fase.</p>`}
    </div>
  `;
}

// ---------------------------- Debate ----------------------------
function screenDebate() {
  const game = state.room.game || {};
  const debateSeconds = state.room.config?.debateSeconds || 0;
  const paused = !!game.debatePausedRemaining;
  const remaining = debateSeconds > 0
    ? (paused ? Math.ceil(game.debatePausedRemaining / 1000) : Math.max(0, Math.ceil((game.debateEndAt - serverNow()) / 1000)))
    : null;

  if (isHost() && debateSeconds > 0 && remaining === 0 && !paused && !state.locks.debateAdvance) {
    state.locks.debateAdvance = true;
    queueMicrotask(async () => { await goVoting(); state.locks.debateAdvance = false; });
  }

  return `
    <div class="screen center">
      <h2>🗣️ Debate</h2>
      <p>Comentad las pistas y discutid quién creéis que es el Intruso. La palabra secreta sigue oculta.</p>
      <div class="card center" style="width:100%">
        ${remaining !== null
          ? `<div class="timer-display ${remaining <= 10 ? 'timer-warning' : ''}">${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}</div>`
          : '<p class="muted">⏱ Sin límite de tiempo</p>'}
      </div>
      ${isHost() ? `
        <div class="btn-row">
          ${debateSeconds > 0 ? `
            <button class="btn secondary" onclick="App.toggleDebatePause()">${paused ? 'Reanudar' : 'Pausar'}</button>
            <button class="btn secondary" onclick="App.addDebateTime()">+30s</button>
          ` : ''}
        </div>
        <button class="btn" onclick="App.goVoting()">🗳️ Terminar debate y votar</button>
      ` : `<p class="muted">El anfitrión controla el temporizador.</p>`}
    </div>
  `;
}

// ---------------------------- Votación secreta (en paralelo) ----------------------------
function screenVoting() {
  const game = state.room.game || {};
  const players = playersArray(state.room);
  const votes = game.votes || {};
  const myVote = votes[me.id];
  const candidateIds = game.tieCandidates && game.tieCandidates.length
    ? game.tieCandidates
    : players.map((p) => p.id);
  const candidates = players.filter((p) => p.id !== me.id && candidateIds.includes(p.id));
  const votedCount = Object.keys(votes).length;
  const totalVoters = players.length;

  if (myVote) {
    return `
      <div class="screen center">
        <div class="card center">
          <div class="hero-emoji">🗳️</div>
          <p>Voto registrado.</p>
          <p class="muted">Esperando a los demás… (${votedCount}/${totalVoters})</p>
        </div>
        ${isHost() ? `<button class="btn" onclick="App.resolveVoting()" ${votedCount >= totalVoters ? '' : 'disabled'}>Ver resultado</button>
        ${votedCount < totalVoters ? `<button class="btn ghost" onclick="App.resolveVoting()">Forzar resultado ahora</button>` : ''}` : ''}
      </div>
    `;
  }

  if (state.ui.voteConfirming && state.ui.voteCandidateId) {
    const c = players.find((p) => p.id === state.ui.voteCandidateId);
    return `
      <div class="screen center">
        <h2>¿Confirmas tu voto?</h2>
        <div class="card center">${avatarHtml(c.avatarId, c.colorId, 90)}<h3>${esc(c.name)}</h3></div>
        <div class="btn-row">
          <button class="btn secondary" onclick="App.cancelVoteConfirm()">Cambiar</button>
          <button class="btn" onclick="App.submitVote()">Confirmar voto</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="screen">
      <h2 class="text-center">${game.tieCandidates ? '🔁 Desempate — vota de nuevo' : '¿Quién es el Intruso?'}</h2>
      <div class="grid-2">
        ${candidates.map((p) => `
          <div class="card center" style="cursor:pointer" onclick="App.selectVoteCandidate('${p.id}')">
            ${avatarHtml(p.avatarId, p.colorId, 64)}
            <span style="font-weight:700">${esc(p.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ---------------------------- Resultado de la votación ----------------------------
function screenVoteResult() {
  const game = state.room.game || {};
  const players = playersArray(state.room);
  const eliminated = game.eliminatedId ? players.find((p) => p.id === game.eliminatedId) : null;
  const eliminatedIsIntruso = eliminated && game.roles[eliminated.id] === 'intruso';

  return `
    <div class="screen center">
      ${!eliminated ? `
        <div class="card center glow-danger">
          <div class="hero-emoji">🤝</div>
          <h2>Empate sin resolver</h2>
          <p>Nadie ha sido eliminado en esta ronda.</p>
        </div>
      ` : `
        <div class="card center ${eliminatedIsIntruso ? 'glow-success' : 'glow-danger'}">
          ${avatarHtml(eliminated.avatarId, eliminated.colorId, 100, eliminatedIsIntruso ? 'winner' : 'loser')}
          <h2>${esc(eliminated.name)}</h2>
          <p style="font-weight:700;color:#fff">${eliminatedIsIntruso ? '🎭 ¡Era el Intruso!' : '😅 No era el Intruso'}</p>
        </div>
      `}
      ${isHost() ? `<button class="btn" onclick="App.continueAfterVoteResult()">Continuar</button>`
        : `<p class="muted">El anfitrión continuará la partida.</p>`}
    </div>
  `;
}

// ---------------------------- Última oportunidad ----------------------------
function screenLastChance() {
  const game = state.room.game || {};
  const players = playersArray(state.room);
  const eliminated = players.find((p) => p.id === game.eliminatedId);
  const iAmGuessing = me.id === game.eliminatedId;
  const alreadyAnswered = game.lastChanceGuess !== undefined && game.lastChanceGuess !== null;

  if (!iAmGuessing) {
    return `
      <div class="screen center">
        <div class="card center glow-danger">
          <div class="hero-emoji">🎭</div>
          <h2>¡Descubrieron a ${esc(eliminated?.name || '')}!</h2>
          <p>${alreadyAnswered ? 'Ha respondido. Un momento…' : 'Tiene una última oportunidad para adivinar la palabra…'}</p>
        </div>
      </div>
    `;
  }

  if (alreadyAnswered) {
    return `
      <div class="screen center">
        <div class="card center">
          <p>${game.lastChanceCorrect ? '✅ ¡Correcto!' : '❌ No era esa palabra.'}</p>
          <p class="muted">La palabra era: ${esc(game.term.word)}</p>
        </div>
      </div>
    `;
  }

  if (!state.ui.lastChanceOptions.length) {
    const decoys = TERMS.filter((t) => t.category === game.term.category && t.id !== game.term.id).map((t) => t.word);
    state.ui.lastChanceOptions = Engine.shuffle([game.term.word, ...Engine.shuffle(decoys).slice(0, 3)]);
  }

  return `
    <div class="screen center">
      <h2>🎭 ¡Te han descubierto!</h2>
      <p>Última oportunidad: adivina la palabra secreta.</p>
      <div class="chip-row" style="justify-content:center;margin-bottom:6px">
        <span class="chip ${state.ui.lastChanceMode === 'choice' ? 'active' : ''}" onclick="App.setLastChanceMode('choice')">Elegir opción</span>
        <span class="chip ${state.ui.lastChanceMode === 'write' ? 'active' : ''}" onclick="App.setLastChanceMode('write')">Escribirla</span>
      </div>
      ${state.ui.lastChanceMode === 'choice' ? `
        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          ${state.ui.lastChanceOptions.map((w) => `<button class="btn secondary" onclick="App.submitLastChance('${esc(w).replace(/'/g, "\\'")}')">${esc(w)}</button>`).join('')}
        </div>
      ` : `
        <input type="text" id="guessInput" placeholder="Escribe la palabra secreta" style="text-align:center" />
        <button class="btn" onclick="App.submitLastChance(document.getElementById('guessInput').value)">Confirmar respuesta</button>
      `}
      <button class="btn ghost" onclick="App.submitLastChance('')">No lo sé, pasar</button>
    </div>
  `;
}

// ---------------------------- Resultado final ----------------------------
function screenFinalResult() {
  const game = state.room.game || {};
  const players = playersArray(state.room);
  const intrusoIds = Engine.getIntrusoIds(game.roles || {});
  const intrusosWon = game.intrusosWon;
  const winners = intrusosWon ? players.filter((p) => intrusoIds.includes(p.id)) : players.filter((p) => !intrusoIds.includes(p.id));
  const totalScores = state.room.totalScores || {};
  const sorted = [...players].sort((a, b) => (totalScores[b.id] || 0) - (totalScores[a.id] || 0));
  const roundPoints = game.roundPoints || {};
  const mvpId = Object.entries(roundPoints).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mvp = players.find((p) => p.id === mvpId);

  return `
    <div class="screen scroll-y">
      <div class="confetti-row">🎉 ✨ 🎊 🥳 ⭐</div>
      <h2 class="text-center">${intrusosWon ? '🎭 ¡Ganan los Intrusos!' : '🕵️ ¡Gana el grupo!'}</h2>
      <div class="chip-row" style="justify-content:center">${winners.map((w) => avatarHtml(w.avatarId, w.colorId, 56, 'winner')).join('')}</div>

      <div class="card center">
        <p class="muted mb-0">La palabra secreta era</p>
        <div class="secret-word">${esc(game.term.word)}</div>
      </div>

      ${mvp ? `
        <div class="card">
          <p class="muted mb-0">🌟 Reconocimiento de la ronda</p>
          <div class="player-row">${avatarHtml(mvp.avatarId, mvp.colorId, 44)}<span class="player-name">${esc(mvp.name)} — jugador más destacado</span></div>
        </div>
      ` : ''}

      <div class="card">
        <h3 style="margin-bottom:8px">Puntuaciones totales</h3>
        ${sorted.map((p) => `
          <div class="player-row">
            ${avatarHtml(p.avatarId, p.colorId, 32)}
            <span class="player-name">${esc(p.name)}</span>
            <strong style="color:var(--accent)">${totalScores[p.id] || 0} pts</strong>
          </div>
        `).join('')}
      </div>

      ${isHost() ? `
        <button class="btn" onclick="App.playAgain(false)">🔁 Revancha (puntos a cero)</button>
        <button class="btn secondary" onclick="App.playAgain(true)">➕ Nueva ronda (conservar puntos)</button>
        <button class="btn secondary" onclick="App.goToConfigFromFinal()">⚙️ Cambiar configuración</button>
        <button class="btn ghost" onclick="App.leaveRoom()">🏠 Cerrar sala y salir</button>
      ` : `<p class="muted text-center">El anfitrión decide el siguiente paso.</p>
        <button class="btn ghost" onclick="App.leaveRoom()">Salir de la sala</button>`}
    </div>
  `;
}

// ---------------------------- Lógica de transición de fases (anfitrión) ----------------------------

function currentPlayerIds() {
  return playersArray(state.room).map((p) => p.id);
}

async function startGame() {
  const cfg = ensureConfigDraft();
  const playerIds = currentPlayerIds();
  if (playerIds.length < 3) { showToast('Se necesitan al menos 3 jugadores.'); return; }

  const config = { ...cfg, numIntrusos: Engine.clampNumIntrusos(playerIds.length, cfg.numIntrusos) };
  const term = Engine.selectTerm(TERMS, config, state.room.usedTermIds || {});
  if (!term) {
    showToast('No hay palabras disponibles con esta configuración. Prueba con otras categorías o dificultad.');
    return;
  }
  const roles = Engine.assignRoles(playerIds, config.numIntrusos);
  const order = config.randomizeOrder ? Engine.shuffle(playerIds) : playerIds;
  const prevRound = state.room.game?.roundNumber || 0;

  await DB.updateAt(`rooms/${state.code}`, {
    config,
    game: {
      phase: 'reveal',
      roundNumber: prevRound + 1,
      term,
      roles,
      order,
      revealConfirmed: {},
      turnIndex: 0,
    },
    [`usedTermIds/${term.id}`]: true,
  });
}

async function advanceClueTurn() {
  const game = state.room.game || {};
  const order = game.order || [];
  const nextIndex = (game.turnIndex || 0) + 1;
  const turnSeconds = state.room.config?.turnSeconds || 0;

  if (nextIndex >= order.length) {
    await debateInit();
    return;
  }
  await DB.updateAt(`rooms/${state.code}/game`, {
    turnIndex: nextIndex,
    turnEndAt: turnSeconds > 0 ? serverTimeEnd(turnSeconds) : null,
    turnPausedRemaining: null,
  });
}

function serverTimeEnd(seconds) {
  return serverNow() + seconds * 1000;
}

async function debateInit() {
  const debateSeconds = state.room.config?.debateSeconds || 0;
  await DB.updateAt(`rooms/${state.code}/game`, {
    phase: 'debate',
    debateEndAt: debateSeconds > 0 ? serverTimeEnd(debateSeconds) : null,
    debatePausedRemaining: null,
  });
}

async function goVoting() {
  const game = state.room.game || {};
  await DB.updateAt(`rooms/${state.code}/game`, {
    phase: 'voting',
    votes: {},
    voteRound: (game.voteRound || 0) + 1,
  });
}

async function resolveVoting() {
  const game = state.room.game || {};
  const playerIds = currentPlayerIds();
  const { mostVotedIds } = Engine.tallyVotes(game.votes || {}, playerIds);
  const isTie = mostVotedIds.length > 1;

  if (isTie && !game.tieBreakAttempted) {
    await DB.updateAt(`rooms/${state.code}/game`, {
      tieCandidates: mostVotedIds,
      tieBreakAttempted: true,
      votes: {},
      voteRound: (game.voteRound || 0) + 1,
    });
    return;
  }

  const eliminatedId = isTie ? null : (mostVotedIds[0] || null);
  await DB.updateAt(`rooms/${state.code}/game`, {
    phase: 'voteResult',
    eliminatedId,
    mostVotedIds,
    tieCandidates: null,
  });
}

async function continueAfterVoteResult() {
  const game = state.room.game || {};
  const eliminatedIsIntruso = game.eliminatedId && game.roles[game.eliminatedId] === 'intruso';
  if (eliminatedIsIntruso && state.room.config?.intrusoCanGuess) {
    await DB.updateAt(`rooms/${state.code}/game`, { phase: 'lastChance' });
  } else {
    await finalizeRound(undefined, undefined);
  }
}

async function finalizeRound(guess, correct) {
  const game = state.room.game || {};
  const playerIds = currentPlayerIds();
  const eliminatedWasIntruso = !!(game.eliminatedId && game.roles[game.eliminatedId] === 'intruso');
  const intrusosWon = !game.eliminatedId ? true : (!eliminatedWasIntruso ? true : !!correct);

  const roundPoints = Engine.computeRoundPoints({
    playerIds,
    roles: game.roles,
    votes: game.votes || {},
    eliminatedId: game.eliminatedId,
    eliminatedWasIntruso,
    lastChanceCorrect: correct,
  });

  const totalScores = { ...(state.room.totalScores || {}) };
  playerIds.forEach((id) => { totalScores[id] = (totalScores[id] || 0) + (roundPoints[id] || 0); });

  await DB.updateAt(`rooms/${state.code}`, {
    'game/phase': 'finalResult',
    'game/lastChanceGuess': guess ?? null,
    'game/lastChanceCorrect': correct ?? null,
    'game/intrusosWon': intrusosWon,
    'game/roundPoints': roundPoints,
    totalScores,
  });
}

// ---------------------------- Acciones expuestas a la interfaz (onclick) ----------------------------
window.App = {
  // Onboarding
  setOnboardingDontShow: (v) => { state.ui.onboardingDontShow = v; },
  nextOnboarding: () => {
    const i = state.ui.onboardingIndex || 0;
    if (i < ONBOARDING_SLIDES.length - 1) {
      state.ui.onboardingIndex = i + 1;
      render();
    } else {
      finishOnboarding();
    }
  },
  skipOnboarding: () => finishOnboarding(),

  // Landing / navegación inicial
  goCreate: async () => {
    if (!me.name) { state.ui.pendingCreate = true; state.screen = 'join'; state.code = null; render(); return; }
    await doCreate();
  },
  goJoinForm: () => { state.ui.pendingCreate = false; state.screen = 'join'; state.code = null; state.ui.joinCodeInput = ''; render(); },
  goLanding: () => { state.ui.pendingCreate = false; state.screen = 'landing'; render(); },
  rejoinLast: () => tryEnterRoom(state.ui.rejoinCode),

  setJoinCode: (v) => { state.ui.joinCodeInput = v.toUpperCase(); },
  submitJoinCode: async () => {
    const code = state.ui.joinCodeInput.trim().toUpperCase();
    if (code.length < 4) { showToast('Introduce un código válido.'); return; }
    location.hash = code;
    await tryEnterRoom(code);
  },

  setNameInput: (v) => { state.ui.nameInput = v; },
  pickAvatar: (id) => { me.avatarId = id; saveMe(me); render(); },
  pickColor: (id) => { me.colorId = id; saveMe(me); render(); },

  confirmJoin: async () => {
    const name = state.ui.nameInput.trim();
    if (!name) return;
    me.name = name;
    saveMe(me);
    try {
      if (state.ui.pendingCreate) {
        state.ui.pendingCreate = false;
        await doCreate();
      } else {
        await DB.joinRoom(state.code, { id: me.id, name: me.name, avatarId: me.avatarId, colorId: me.colorId });
        localStorage.setItem(LAST_ROOM_KEY, state.code);
        attachRoomListener(state.code);
      }
    } catch (e) {
      state.error = e.message || 'No se pudo unir a la sala.';
      render();
    }
  },

  copyLink: () => {
    const url = `${location.origin}${location.pathname}#${state.code}`;
    navigator.clipboard?.writeText(url).then(
      () => showToast('Enlace copiado 🔗'),
      () => showToast(url)
    );
  },

  // Lobby / configuración
  goConfig: async () => { await DB.updateAt(`rooms/${state.code}/game`, { phase: 'config' }); },
  backToLobby: async () => { state.ui.configDraft = null; await DB.updateAt(`rooms/${state.code}/game`, { phase: 'lobby' }); },
  cfgSet: (key, value) => { ensureConfigDraft()[key] = value; render(); },
  cfgToggleCategory: (id) => {
    const cfg = ensureConfigDraft();
    const ids = cfg.categoryIds || [];
    cfg.categoryIds = ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id];
    render();
  },
  startGame: () => startGame(),

  leaveRoom: async () => {
    if (isHost()) {
      await DB.deleteRoom(state.code);
    } else {
      await DB.leaveRoom(state.code, me.id);
    }
    leaveToLanding();
  },

  // Revelación
  setPeek: (v) => { state.ui.revealPeeking = v; render(); },
  confirmReveal: async () => {
    state.ui.revealConfirmedLocally = true;
    render();
    await DB.updateAt(`rooms/${state.code}/game/revealConfirmed`, { [me.id]: true });
  },
  goClues: async () => {
    const turnSeconds = state.room.config?.turnSeconds || 0;
    await DB.updateAt(`rooms/${state.code}/game`, {
      phase: 'clues',
      turnIndex: 0,
      turnEndAt: turnSeconds > 0 ? serverTimeEnd(turnSeconds) : null,
      turnPausedRemaining: null,
    });
  },

  // Pistas
  advanceClueTurnManual: () => advanceClueTurn(),
  toggleCluesPause: async () => {
    const game = state.room.game || {};
    if (game.turnPausedRemaining) {
      // Reanudar: recalcula el instante final a partir del tiempo restante guardado.
      await DB.updateAt(`rooms/${state.code}/game`, {
        turnEndAt: serverNow() + game.turnPausedRemaining,
        turnPausedRemaining: null,
      });
    } else {
      const remainingMs = Math.max(0, (game.turnEndAt || serverNow()) - serverNow());
      await DB.updateAt(`rooms/${state.code}/game`, { turnPausedRemaining: remainingMs });
    }
  },

  // Debate
  goVoting: () => goVoting(),
  toggleDebatePause: async () => {
    const game = state.room.game || {};
    const debateSeconds = state.room.config?.debateSeconds || 0;
    if (game.debatePausedRemaining) {
      // Reanudar: recalcula el instante final a partir del tiempo restante guardado.
      await DB.updateAt(`rooms/${state.code}/game`, {
        debateEndAt: serverNow() + game.debatePausedRemaining,
        debatePausedRemaining: null,
      });
    } else {
      const remainingMs = Math.max(0, (game.debateEndAt || serverNow()) - serverNow());
      await DB.updateAt(`rooms/${state.code}/game`, { debatePausedRemaining: remainingMs });
    }
  },
  addDebateTime: async () => {
    const game = state.room.game || {};
    if (game.debatePausedRemaining) {
      await DB.updateAt(`rooms/${state.code}/game`, { debatePausedRemaining: game.debatePausedRemaining + 30000 });
    } else {
      await DB.updateAt(`rooms/${state.code}/game`, { debateEndAt: (game.debateEndAt || serverNow()) + 30000 });
    }
  },

  // Votación
  selectVoteCandidate: (id) => { state.ui.voteCandidateId = id; state.ui.voteConfirming = true; render(); },
  cancelVoteConfirm: () => { state.ui.voteConfirming = false; state.ui.voteCandidateId = null; render(); },
  submitVote: async () => {
    const candidateId = state.ui.voteCandidateId;
    state.ui.voteConfirming = false;
    render();
    await DB.updateAt(`rooms/${state.code}/game/votes`, { [me.id]: candidateId });
  },
  resolveVoting: () => resolveVoting(),

  // Resultado de votación / última oportunidad
  continueAfterVoteResult: () => continueAfterVoteResult(),
  setLastChanceMode: (m) => { state.ui.lastChanceMode = m; render(); },
  submitLastChance: async (guess) => {
    const game = state.room.game || {};
    const correct = guess ? Engine.isCloseEnough(guess, game.term.word) : false;
    await finalizeRound(guess || '', correct);
  },

  // Resultado final
  playAgain: async (keepScores) => {
    if (!keepScores) {
      await DB.writeAt(`rooms/${state.code}/totalScores`, {});
      await DB.writeAt(`rooms/${state.code}/usedTermIds`, {});
      state.room.totalScores = {};
      state.room.usedTermIds = {};
    }
    await startGame();
  },
  goToConfigFromFinal: async () => { await DB.updateAt(`rooms/${state.code}/game`, { phase: 'config' }); },

  // Reinicio de emergencia (anfitrión) — vuelve al lobby para poder tocar la lista de jugadores.
  confirmReset: () => { state.ui.resetConfirming = true; render(); },
  cancelReset: () => { state.ui.resetConfirming = false; render(); },
  doReset: async () => {
    state.ui.resetConfirming = false;
    await DB.writeAt(`rooms/${state.code}/game`, { phase: 'lobby' });
    await DB.writeAt(`rooms/${state.code}/totalScores`, {});
    await DB.writeAt(`rooms/${state.code}/usedTermIds`, {});
  },
};

async function doCreate() {
  try {
    const code = await DB.createRoom({ id: me.id, name: me.name, avatarId: me.avatarId, colorId: me.colorId });
    state.code = code;
    localStorage.setItem(LAST_ROOM_KEY, code);
    history.replaceState(null, '', `#${code}`);
    attachRoomListener(code);
  } catch (e) {
    showToast(e.message || 'No se pudo crear la sala.');
  }
}

// ---------------------------- Ticker (temporizadores en vivo) ----------------------------
setInterval(() => {
  if (['clues', 'debate'].includes(state.screen)) render();
}, 1000);

// ---------------------------- Arranque ----------------------------
init();
