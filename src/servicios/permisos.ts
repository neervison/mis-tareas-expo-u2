// ============================================================
// SERVICIO: permisos del dispositivo (cámara y ubicación)
// ------------------------------------------------------------
// Buena práctica aplicada: PERMISOS INCREMENTALES CON
// CONTEXTO, como recomiendan el apunte de la unidad y la
// guía de permisos de Android:
// 1) INCREMENTAL: cada permiso se pide SOLO cuando el usuario
//    va a usar esa función (al tocar "Tomar foto" o
//    "Registrar ubicación"), nunca todos juntos al abrir la
//    app por primera vez.
// 2) CON CONTEXTO: antes de la solicitud del sistema, la
//    interfaz explica PARA QUÉ se usará el permiso (los
//    textos viven en src/constantes/mensajes.ts). El usuario
//    decide informado.
// 3) RESPETO A LA DENEGACIÓN: si el usuario deniega un
//    permiso, la app NO vuelve a insistir y sigue usable:
//    la tarea se guarda sin foto o sin ubicación, y la
//    función queda disponible para cuando el usuario quiera
//    (puede otorgar el permiso desde los ajustes del
//    teléfono).
//
// Este servicio NO dibuja nada: recibe la función que
// muestra la explicación (un diálogo de la pantalla) y
// devuelve true/false. Así la regla se prueba sola, sin
// pantalla, con un doble de la explicación.
// ============================================================

import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

/** Periférico cuyo permiso se está gestionando. */
export type TipoPermiso = 'camara' | 'ubicacion';

/**
 * Estado simplificado de un permiso, en palabras de la app:
 * - 'otorgado': el sistema ya dio el permiso.
 * - 'denegado': el usuario lo negó (no se insiste).
 * - 'sin-responder': aún no se ha pedido o no se pudo saber.
 */
export type EstadoPermiso = 'otorgado' | 'denegado' | 'sin-responder';

/**
 * Traduce el estado del sistema ('granted' | 'denied' |
 * 'undetermined') al vocabulario de la app.
 */
export function traducirEstado(estadoSistema: string): EstadoPermiso {
  if (estadoSistema === 'granted') return 'otorgado';
  if (estadoSistema === 'denied') return 'denegado';
  return 'sin-responder';
}

/** Consulta el estado actual del permiso de cámara, sin pedirlo. */
export async function verificarPermisoCamara(): Promise<EstadoPermiso> {
  try {
    const respuesta = await Camera.getCameraPermissionsAsync();
    return traducirEstado(respuesta.status);
  } catch {
    return 'sin-responder';
  }
}

/** Solicita el permiso de cámara al sistema y devuelve el resultado. */
export async function solicitarPermisoCamara(): Promise<EstadoPermiso> {
  try {
    const respuesta = await Camera.requestCameraPermissionsAsync();
    return traducirEstado(respuesta.status);
  } catch {
    return 'sin-responder';
  }
}

/** Consulta el estado actual del permiso de ubicación, sin pedirlo. */
export async function verificarPermisoUbicacion(): Promise<EstadoPermiso> {
  try {
    const respuesta = await Location.getForegroundPermissionsAsync();
    return traducirEstado(respuesta.status);
  } catch {
    return 'sin-responder';
  }
}

/** Solicita el permiso de ubicación al sistema y devuelve el resultado. */
export async function solicitarPermisoUbicacion(): Promise<EstadoPermiso> {
  try {
    const respuesta = await Location.requestForegroundPermissionsAsync();
    return traducirEstado(respuesta.status);
  } catch {
    return 'sin-responder';
  }
}

/**
 * Asegura un permiso siguiendo el flujo incremental:
 * - Si ya está otorgado, devuelve true sin molestar.
 * - Si está denegado, devuelve false SIN volver a pedirlo.
 * - Si aún no se responde, muestra la explicación (la
 *   interfaz decide cómo) y solo si el usuario acepta
 *   ver la solicitud, pide el permiso al sistema.
 */
export async function asegurarPermiso(
  tipo: TipoPermiso,
  mostrarExplicacion: () => Promise<boolean>,
): Promise<boolean> {
  const verificar = tipo === 'camara' ? verificarPermisoCamara : verificarPermisoUbicacion;
  const estado = await verificar();
  if (estado === 'otorgado') return true;
  if (estado === 'denegado') return false;

  const aceptaVerSolicitud = await mostrarExplicacion();
  if (!aceptaVerSolicitud) return false;

  const solicitar = tipo === 'camara' ? solicitarPermisoCamara : solicitarPermisoUbicacion;
  return (await solicitar()) === 'otorgado';
}
