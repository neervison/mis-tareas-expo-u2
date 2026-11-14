// ============================================================
// SERVICIO: autenticación básica multiusuario (local)
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// Todo lo que sabe de cuentas y sesiones vive aquí: la
// pantalla solo pide nombre y clave y muestra el resultado.
//
// CÓMO FUNCIONA (y cuál es su alcance):
// - Las cuentas se guardan SOLO en este dispositivo, con
//   AsyncStorage (ver almacenamiento.ts). NO hay un servidor
//   de cuentas: es una autenticación básica DEMOSTRABLE, que
//   separa las tareas por usuario y protege la lista con una
//   clave. En una versión con backend real, estas mismas
//   funciones llamarían a la API en vez de leer el
//   almacenamiento local, sin cambiar las pantallas.
// - La clave NUNCA se guarda: se guarda su HASH SHA-256
//   mezclado con una SAL aleatoria única por usuario. El
//   hash es de un solo sentido (no se puede "deshashear") y
//   la sal impide que dos usuarios con la misma clave tengan
//   el mismo hash. Al entrar, se calcula el hash de la clave
//   escrita con la sal guardada y se compara con el hash
//   guardado: si coinciden, la clave era la correcta.
// - La sesión guarda un token aleatorio para identificar el
//   inicio de sesión en el dispositivo.
//
// Las reglas de validación (largo mínimo) viven en
// src/constantes/limites.ts, como en el resto de la app.
// ============================================================

import * as Crypto from 'expo-crypto';
import { LARGO_MIN_CLAVE, LARGO_MIN_NOMBRE_USUARIO } from '../constantes/limites';
import { Sesion, Usuario } from '../modelos/usuario';
import { generarId } from '../utilidades/ids';
import { CLAVE_SESION, CLAVE_USUARIOS, eliminarClave, guardarJson, leerJson } from './almacenamiento';

/** Mensajes de error de autenticación (un solo lugar los define). */
export const MENSAJE_NOMBRE_CORTO = `El nombre de usuario debe tener al menos ${LARGO_MIN_NOMBRE_USUARIO} caracteres.`;
export const MENSAJE_CLAVE_CORTA = `La clave debe tener al menos ${LARGO_MIN_CLAVE} caracteres.`;
export const MENSAJE_NOMBRE_EN_USO = 'Ese nombre de usuario ya está registrado: elige otro o inicia sesión.';
export const MENSAJE_CREDENCIALES_INVALIDAS =
  'Nombre de usuario o clave incorrectos. Revisa los datos e inténtalo de nuevo.';

/**
 * Convierte bytes aleatorios a texto hexadecimal, para guardar
 * la sal y el token como cadenas legibles.
 */
function bytesAHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Genera una sal aleatoria de 16 bytes (32 caracteres hex). */
export function generarSal(): string {
  return bytesAHex(Crypto.getRandomBytes(16));
}

/** Genera un token de sesión aleatorio de 32 bytes (64 caracteres hex). */
export function generarTokenSesion(): string {
  return bytesAHex(Crypto.getRandomBytes(32));
}

/**
 * Calcula el hash SHA-256 de la clave mezclada con la sal.
 * El formato "sal:clave" es fijo: al entrar se repite
 * exactamente igual para que la comparación funcione.
 */
export async function calcularHash(clave: string, sal: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${clave}`);
}

/**
 * Valida nombre y clave antes de registrar o entrar.
 * Devuelve '' si ambos sirven, o el mensaje del primer
 * problema encontrado (la pantalla lo muestra tal cual).
 */
export function validarCredenciales(nombre: string, clave: string): string {
  if (nombre.trim().length < LARGO_MIN_NOMBRE_USUARIO) return MENSAJE_NOMBRE_CORTO;
  if (clave.length < LARGO_MIN_CLAVE) return MENSAJE_CLAVE_CORTA;
  return '';
}

/** Lee todos los usuarios registrados (arreglo vacío si no hay ninguno). */
export async function leerUsuarios(): Promise<Usuario[]> {
  return (await leerJson<Usuario[]>(CLAVE_USUARIOS)) ?? [];
}

/** Guarda la lista completa de usuarios. */
async function guardarUsuarios(usuarios: Usuario[]): Promise<void> {
  await guardarJson(CLAVE_USUARIOS, usuarios);
}

/** Crea y guarda la sesión de un usuario que acaba de entrar. */
async function crearSesion(usuario: Usuario): Promise<Sesion> {
  const sesion: Sesion = {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    token: generarTokenSesion(),
    creadaEn: Date.now(),
  };
  await guardarJson(CLAVE_SESION, sesion);
  return sesion;
}

/**
 * Registra un usuario nuevo y deja su sesión iniciada.
 * Falla si los datos no pasan la validación o si el nombre
 * ya está en uso (la comparación no distingue mayúsculas).
 */
export async function registrarUsuario(nombre: string, clave: string): Promise<Sesion> {
  const problema = validarCredenciales(nombre, clave);
  if (problema !== '') throw new Error(problema);

  const nombreLimpio = nombre.trim();
  const usuarios = await leerUsuarios();
  const enUso = usuarios.some(
    (usuario) => usuario.nombre.toLowerCase() === nombreLimpio.toLowerCase(),
  );
  if (enUso) throw new Error(MENSAJE_NOMBRE_EN_USO);

  const sal = generarSal();
  const nuevo: Usuario = {
    id: generarId(),
    nombre: nombreLimpio,
    hashClave: await calcularHash(clave, sal),
    sal,
    creadoEn: Date.now(),
  };
  await guardarUsuarios([...usuarios, nuevo]);
  return crearSesion(nuevo);
}

/**
 * Inicia sesión con nombre y clave. El mensaje de error es
 * el mismo exista o no el usuario, para no revelar qué
 * nombres están registrados (buena práctica de seguridad).
 */
export async function iniciarSesion(nombre: string, clave: string): Promise<Sesion> {
  const usuarios = await leerUsuarios();
  const usuario = usuarios.find(
    (candidato) => candidato.nombre.toLowerCase() === nombre.trim().toLowerCase(),
  );
  if (!usuario) throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);

  const hashIntento = await calcularHash(clave, usuario.sal);
  if (hashIntento !== usuario.hashClave) throw new Error(MENSAJE_CREDENCIALES_INVALIDAS);

  return crearSesion(usuario);
}

/** Cierra la sesión: borra el token guardado en el dispositivo. */
export async function cerrarSesion(): Promise<void> {
  await eliminarClave(CLAVE_SESION);
}

/** Devuelve la sesión guardada, o null si nadie ha entrado. */
export async function obtenerSesion(): Promise<Sesion | null> {
  return leerJson<Sesion>(CLAVE_SESION);
}
