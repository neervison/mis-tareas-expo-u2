// ============================================================
// SERVICIO: interacciones con el dispositivo
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// Las dos interacciones "extra" con el hardware viven aquí,
// lejos de las pantallas: la vibración al completar una
// tarea (Haptics) y la lectura del estado de la red
// (Network). Las pantallas piden "vibrar" o "¿hay
// conexión?" y este servicio habla con el dispositivo.
//
// RED: el estado se calcula combinando isConnected (¿el
// teléfono está conectado a alguna red?) e
// isInternetReachable (¿esa red llega a internet?). Cuando
// alguno aún no se ha medido (null al inicio), se asume
// que sí hay conexión: la petición a la API fallará igual
// si no la hay, y la cola offline guardará el cambio.
// ============================================================

import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';

/** Estado de la red en palabras de la app. */
export interface EstadoRed {
  /** true = hay conexión usable; false = modo sin conexión. */
  conectada: boolean;
  /** Tipo de red ('wifi', 'cellular', 'none', ...), o null si no se sabe. */
  tipo: string | null;
}

/** Traduce el estado crudo de Network al formato de la app. */
export function traducirEstadoRed(estado: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
  type?: string | null;
}): EstadoRed {
  return {
    conectada: (estado.isConnected ?? true) && (estado.isInternetReachable ?? true),
    tipo: estado.type ?? null,
  };
}

/** Lee el estado actual de la red (una sola lectura). */
export async function obtenerEstadoRed(): Promise<EstadoRed> {
  const estado = await Network.getNetworkStateAsync();
  return traducirEstadoRed(estado);
}

/**
 * Se suscribe a los cambios de la red: la función recibida
 * se ejecuta cada vez que la conexión cambia. Devuelve la
 * función para cancelar la suscripción (la pantalla la
 * llama al desmontarse, para no dejar escuchas activas).
 */
export function suscribirseACambiosRed(
  alCambiar: (estado: EstadoRed) => void,
): () => void {
  const suscripcion = Network.addNetworkStateListener((estado) => {
    alCambiar(traducirEstadoRed(estado));
  });
  return () => suscripcion.remove();
}

/**
 * Vibración breve al completar una tarea: el usuario siente
 * el cambio sin mirar la pantalla. Si el dispositivo no
 * vibra, la llamada simplemente no hace nada.
 */
export async function vibrarAlCompletar(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Vibración de confirmación al guardar o sincronizar con éxito. */
export async function vibrarAlConfirmar(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
