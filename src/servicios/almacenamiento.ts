// ============================================================
// SERVICIO: almacenamiento local (AsyncStorage)
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// TODO lo que la app guarda en el dispositivo pasa por aquí:
// ningún otro archivo importa AsyncStorage directamente. Si
// mañana el almacenamiento cambiara (por ejemplo, a SQLite),
// solo este archivo se tocaría.
//
// QUÉ GUARDA Y DÓNDE:
// - AsyncStorage persiste pares clave/valor en el dispositivo
//   (en la web usa localStorage): los datos SOBREVIVEN al
//   cierre de la app y funcionan SIN CONEXIÓN, porque nada
//   de esto viaja por la red.
// - Las claves llevan el id del usuario cuando el dato es
//   personal (tareas y cola): así dos usuarios del mismo
//   teléfono nunca ven ni pisan los datos del otro.
// - Los valores se guardan como JSON (texto), porque
//   AsyncStorage solo guarda cadenas.
//
// SEGURIDAD: aquí NO se guardan claves en claro. La clave
// del usuario se guarda como hash con sal (ver el servicio
// de autenticación) y la sesión solo guarda un token.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

/** Clave única con la lista de usuarios registrados. */
export const CLAVE_USUARIOS = 'mis-tareas:usuarios';

/** Clave única con la sesión activa (un solo usuario a la vez). */
export const CLAVE_SESION = 'mis-tareas:sesion';

/** Clave de las tareas de un usuario. */
export function claveTareas(usuarioId: string): string {
  return `mis-tareas:tareas:${usuarioId}`;
}

/** Clave de la cola de sincronización de un usuario. */
export function claveCola(usuarioId: string): string {
  return `mis-tareas:cola:${usuarioId}`;
}

/**
 * Clave que recuerda si a un usuario ya se le sembraron las
 * tareas de ejemplo. Sin esta marca, un usuario que borrara
 * todas sus tareas vería reaparecer los ejemplos al reabrir
 * la app.
 */
export function claveSemilla(usuarioId: string): string {
  return `mis-tareas:semilla:${usuarioId}`;
}

/**
 * Guarda un valor como JSON bajo la clave dada.
 * Acepta cualquier valor serializable (arreglos, objetos).
 */
export async function guardarJson(clave: string, valor: unknown): Promise<void> {
  await AsyncStorage.setItem(clave, JSON.stringify(valor));
}

/**
 * Lee un valor guardado como JSON. Devuelve null cuando la
 * clave no existe o el contenido no es JSON válido (por
 * ejemplo, si el almacenamiento se dañó): la app sigue
 * funcionando con valores vacíos en vez de romperse.
 */
export async function leerJson<T>(clave: string): Promise<T | null> {
  const texto = await AsyncStorage.getItem(clave);
  if (texto === null) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

/** Borra una clave del almacenamiento (sesión al salir, por ejemplo). */
export async function eliminarClave(clave: string): Promise<void> {
  await AsyncStorage.removeItem(clave);
}
