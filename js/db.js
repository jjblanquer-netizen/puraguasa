// ============================================================
// INTRUSO — Capa de acceso a Firebase Realtime Database.
// Envuelve el SDK modular (v10, vía CDN) en funciones sencillas
// de leer/escuchar/escribir. Ninguna otra parte de la app debe
// importar el SDK de Firebase directamente — todo pasa por aquí,
// igual que storage.js centraliza AsyncStorage en la versión móvil.
//
// IMPORTANTE (aprendido en SplitGuasa): Firebase convierte los
// arrays JS en objetos al guardarlos. Por eso aquí SIEMPRE se
// usan objetos indexados por id ({ [playerId]: {...} }), nunca
// arrays, tanto al escribir como al leer.
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  remove,
  onValue,
  off,
  onDisconnect,
  serverTimestamp,
  runTransaction,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { generateRoomCode } from './gameEngine.js';

let app = null;
let db = null;

export function initFirebase() {
  if (app) return db;
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  return db;
}

function r(path) {
  return ref(initFirebase(), path);
}

export async function writeAt(path, value) {
  await set(r(path), value);
}

export async function updateAt(path, patch) {
  await update(r(path), patch);
}

export async function removeAt(path) {
  await remove(r(path));
}

export async function readOnceAt(path) {
  const snap = await get(r(path));
  return snap.exists() ? snap.val() : null;
}

/** Escucha continua. Devuelve una función para dejar de escuchar. */
export function listenAt(path, callback) {
  const nodeRef = r(path);
  const handler = (snap) => callback(snap.exists() ? snap.val() : null);
  onValue(nodeRef, handler);
  return () => off(nodeRef, 'value', handler);
}

export function timestamp() {
  return serverTimestamp();
}

/** Transacción atómica — útil para evitar condiciones de carrera (p. ej. dos jugadores uniéndose a la vez). */
export async function transact(path, updater) {
  const result = await runTransaction(r(path), updater);
  return result.snapshot.exists() ? result.snapshot.val() : null;
}

// ---------------------------- Salas ----------------------------

/**
 * Crea una sala nueva con un código corto y único (reintenta si por
 * casualidad el código ya existe), y añade al anfitrión como primer
 * jugador. Devuelve el código de la sala.
 */
export async function createRoom(hostPlayer) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const existing = await readOnceAt(`rooms/${code}`);
    if (existing) continue; // colisión rarísima: reintenta con otro código

    await writeAt(`rooms/${code}`, {
      createdAt: timestamp(),
      hostId: hostPlayer.id,
      config: null,
      players: { [hostPlayer.id]: { ...hostPlayer, joinedAt: timestamp(), connected: true } },
      game: { phase: 'lobby' },
      usedTermIds: {},
      totalScores: {},
    });
    setupPresence(code, hostPlayer.id);
    return code;
  }
  throw new Error('No se pudo crear la sala, inténtalo de nuevo.');
}

export async function roomExists(code) {
  const room = await readOnceAt(`rooms/${code}`);
  return !!room;
}

export async function joinRoom(code, player) {
  const exists = await roomExists(code);
  if (!exists) throw new Error('Esa sala no existe o ha caducado.');
  await writeAt(`rooms/${code}/players/${player.id}`, { ...player, joinedAt: timestamp(), connected: true });
  setupPresence(code, player.id);
}

/** Marca al jugador como desconectado automáticamente si cierra la app o pierde la red. */
function setupPresence(code, playerId) {
  const presenceRef = r(`rooms/${code}/players/${playerId}/connected`);
  onDisconnect(presenceRef).set(false);
}

export function listenRoom(code, callback) {
  return listenAt(`rooms/${code}`, callback);
}

/** Offset entre el reloj del dispositivo y el reloj de los servidores de
 * Firebase — imprescindible para que los temporizadores (debate, turnos)
 * se vean igual en todos los móviles aunque su hora local difiera. */
export function listenServerOffset(callback) {
  const offsetRef = r('.info/serverTimeOffset');
  const handler = (snap) => callback(snap.val() || 0);
  onValue(offsetRef, handler);
  return () => off(offsetRef, 'value', handler);
}


export async function leaveRoom(code, playerId) {
  await removeAt(`rooms/${code}/players/${playerId}`);
}

export async function deleteRoom(code) {
  await removeAt(`rooms/${code}`);
}
