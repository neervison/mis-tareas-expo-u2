// ============================================================
// SERVICIO: ubicación GPS del dispositivo
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// Este servicio sabe PEDIR la posición al GPS y convertirla
// al formato que guarda la tarea (UbicacionTarea). No dibuja
// nada ni pide permisos: el permiso se gestiona antes, en el
// servicio de permisos, y la interfaz muestra el resultado.
//
// TIEMPO LÍMITE: la lectura del GPS puede tardar (interior,
// cielo cubierto) o no responder. Para que la app nunca se
// quede esperando, la lectura compite con un temporizador:
// si pasan los milisegundos indicados sin respuesta, se
// abandona con motivo 'tiempo-agotado' y la tarea se guarda
// sin ubicación. El valor por defecto es 10 segundos.
//
// MANEJO DE ERRORES: igual que la foto, la lectura devuelve
// un RESULTADO con motivo clasificado ('denegada' |
// 'tiempo-agotado' | 'sin-soporte' | 'error'), para que la
// interfaz reaccione distinto a cada caso y la tarea nunca
// se pierda por un fallo del GPS.
// ============================================================

import * as Location from 'expo-location';
import { UbicacionTarea } from '../modelos/tarea';

/** Tiempo máximo de espera del GPS, en milisegundos. */
export const TIEMPO_ESPERA_GPS_MS = 10000;

/** Resultado de intentar leer la posición actual. */
export type ResultadoUbicacion =
  | { ok: true; ubicacion: UbicacionTarea }
  | {
      ok: false;
      motivo: 'denegada' | 'tiempo-agotado' | 'sin-soporte' | 'error';
      mensaje: string;
    };

/** Mensajes en español para cada motivo de fallo de la lectura. */
const MENSAJES_FALLO: Record<'denegada' | 'tiempo-agotado' | 'sin-soporte' | 'error', string> = {
  denegada: 'Sin permiso de ubicación: la tarea se guardará sin ubicación.',
  'tiempo-agotado':
    'El GPS tardó demasiado en responder: la tarea se guardará sin ubicación.',
  'sin-soporte': 'Este dispositivo no entrega ubicación: la tarea se guardará sin ubicación.',
  error: 'No se pudo obtener la ubicación. La tarea se guardará sin ubicación.',
};

/**
 * Clasifica el error del GPS según su mensaje, para distinguir
 * una denegación de permiso, un tiempo agotado y la falta de
 * soporte del dispositivo.
 */
export function clasificarErrorUbicacion(
  error: unknown,
): 'denegada' | 'tiempo-agotado' | 'sin-soporte' | 'error' {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (/denied|denegado|permission|permiso|not authorized|unauthorized/i.test(mensaje)) {
    return 'denegada';
  }
  if (/tiempo de espera|timeout|timed out/i.test(mensaje)) return 'tiempo-agotado';
  if (/not available|sin soporte|unsupported|unavailable/i.test(mensaje)) return 'sin-soporte';
  return 'error';
}

/**
 * Lee la posición actual con la mayor precisión disponible
 * (Accuracy.High) y la devuelve en el formato de la tarea.
 * Valida que las coordenadas y la precisión sean números
 * finitos: un GPS que devuelve valores absurdos se trata
 * como error, no se guarda.
 */
export async function obtenerUbicacionActual(
  tiempoEsperaMs: number = TIEMPO_ESPERA_GPS_MS,
): Promise<ResultadoUbicacion> {
  let idTemporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    const posicion = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, rechazar) => {
        idTemporizador = setTimeout(
          () => rechazar(new Error('Tiempo de espera agotado al obtener la ubicación.')),
          tiempoEsperaMs,
        );
      }),
    ]);

    const { latitude, longitude, accuracy } = posicion.coords;
    const precision = accuracy ?? -1;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(precision) ||
      precision < 0
    ) {
      return {
        ok: false,
        motivo: 'error',
        mensaje: 'El GPS devolvió datos no válidos: la tarea se guardará sin ubicación.',
      };
    }

    return {
      ok: true,
      ubicacion: {
        latitud: latitude,
        longitud: longitude,
        precision,
        fecha: new Date(posicion.timestamp).toISOString(),
      },
    };
  } catch (error) {
    const motivo = clasificarErrorUbicacion(error);
    return { ok: false, motivo, mensaje: MENSAJES_FALLO[motivo] };
  } finally {
    if (idTemporizador !== undefined) clearTimeout(idTemporizador);
  }
}

/**
 * Enlace para abrir la ubicación en Google Maps (se abre en
 * el navegador o en la app de mapas con Linking).
 */
export function enlaceMapas(ubicacion: UbicacionTarea): string {
  return `https://www.google.com/maps?q=${ubicacion.latitud},${ubicacion.longitud}`;
}

/** Texto corto con las coordenadas y la precisión, para la lista. */
export function textoUbicacion(ubicacion: UbicacionTarea): string {
  return `${ubicacion.latitud.toFixed(4)}, ${ubicacion.longitud.toFixed(4)} · ±${Math.round(
    ubicacion.precision,
  )} m`;
}
