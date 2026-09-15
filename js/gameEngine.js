// ============================================================
// INTRUSO — Motor del juego (funciones puras, JS estándar).
// Idéntica lógica que la versión React Native original, sin
// tipos ni dependencias de UI. Se comparte entre todos los
// clientes, pero solo el anfitrión ejecuta las decisiones que
// escriben en Firebase (evita condiciones de carrera).
// ============================================================

// ---------------------------- Aleatoriedad ----------------------------
export function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickN(input, n) {
  if (n >= input.length) return shuffle(input);
  return shuffle(input).slice(0, n);
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateRoomCode() {
  // Sin caracteres ambiguos (0/O, 1/I/L).
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ---------------------------- Texto (Última oportunidad) ----------------------------
export function normalizeText(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function isCloseEnough(guess, answer) {
  const g = normalizeText(guess);
  const a = normalizeText(answer);
  if (g.length === 0) return false;
  if (g === a) return true;
  const maxLen = Math.max(g.length, a.length);
  const distance = levenshtein(g, a);
  const tolerance = Math.min(2, Math.max(1, Math.floor(maxLen / 5)));
  return distance <= tolerance;
}

// ---------------------------- Roles / intrusos ----------------------------
export function maxIntrusosFor(numPlayers) {
  if (numPlayers < 3) return 0;
  const byThird = Math.floor(numPlayers / 3);
  const bySafety = numPlayers - 2;
  return Math.max(1, Math.min(byThird, bySafety));
}

export function clampNumIntrusos(numPlayers, requested) {
  const max = maxIntrusosFor(numPlayers);
  if (max <= 0) return 1;
  return Math.min(Math.max(1, requested), max);
}

/** playerIds: array de ids. Devuelve { [playerId]: 'jugador' | 'intruso' } */
export function assignRoles(playerIds, numIntrusos) {
  const n = clampNumIntrusos(playerIds.length, numIntrusos);
  const intrusos = new Set(pickN(playerIds, n));
  const roles = {};
  playerIds.forEach((id) => {
    roles[id] = intrusos.has(id) ? 'intruso' : 'jugador';
  });
  return roles;
}

export function getIntrusoIds(roles) {
  return Object.entries(roles || {})
    .filter(([, r]) => r === 'intruso')
    .map(([id]) => id);
}

export function isIntruso(roles, playerId) {
  return roles && roles[playerId] === 'intruso';
}

// ---------------------------- Selección de términos ----------------------------
export function getAvailableTerms(allTerms, config, usedTermIds) {
  const categoryIds = config.categoryIds || [];
  const byCategory = categoryIds.length ? allTerms.filter((t) => categoryIds.includes(t.category)) : allTerms;

  const byDifficulty =
    config.difficulty === 'extrema'
      ? byCategory.filter((t) => t.difficulty === 'dificil' || t.difficulty === 'extrema')
      : byCategory.filter((t) => t.difficulty === config.difficulty);

  const byRating = byDifficulty.filter((t) => {
    if (config.contentRating === 'infantil') return t.childFriendly && !t.adultOnly;
    if (config.contentRating === 'adultos') return true;
    return !t.adultOnly;
  });

  const usedSet = new Set(Object.keys(usedTermIds || {}));
  const unused = byRating.filter((t) => !usedSet.has(t.id));
  return unused.length > 0 ? unused : byRating;
}

export function selectTerm(allTerms, config, usedTermIds) {
  const pool = getAvailableTerms(allTerms, config, usedTermIds);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------- Votación ----------------------------
export function tallyVotes(votes, playerIds) {
  const counts = {};
  playerIds.forEach((id) => (counts[id] = 0));
  Object.values(votes || {}).forEach((votedForId) => {
    counts[votedForId] = (counts[votedForId] || 0) + 1;
  });
  const maxVotes = Math.max(0, ...Object.values(counts));
  const mostVotedIds = maxVotes > 0 ? Object.entries(counts).filter(([, c]) => c === maxVotes).map(([id]) => id) : [];
  return { counts, maxVotes, mostVotedIds };
}

// ---------------------------- Puntuación ----------------------------
export const POINTS = {
  SURVIVE_AS_INTRUSO: 3,
  GUESS_WORD_AFTER_CAUGHT: 2,
  CORRECT_VOTE: 1,
  NO_VOTES_RECEIVED: 1,
};

export function computeRoundPoints({ playerIds, roles, votes, eliminatedId, eliminatedWasIntruso, lastChanceCorrect }) {
  const points = {};
  playerIds.forEach((id) => (points[id] = 0));

  const intrusoIds = getIntrusoIds(roles);
  const receivedVotes = new Set(Object.values(votes || {}));

  intrusoIds.forEach((id) => {
    const survived = eliminatedId !== id;
    if (survived) points[id] += POINTS.SURVIVE_AS_INTRUSO;
  });

  if (eliminatedId && eliminatedWasIntruso && lastChanceCorrect) {
    points[eliminatedId] = (points[eliminatedId] || 0) + POINTS.GUESS_WORD_AFTER_CAUGHT;
  }

  Object.entries(votes || {}).forEach(([voterId, votedForId]) => {
    if (isIntruso(roles, votedForId)) {
      points[voterId] = (points[voterId] || 0) + POINTS.CORRECT_VOTE;
    }
  });

  playerIds.forEach((id) => {
    const normal = !intrusoIds.includes(id);
    if (normal && !receivedVotes.has(id)) {
      points[id] = (points[id] || 0) + POINTS.NO_VOTES_RECEIVED;
    }
  });

  return points;
}
