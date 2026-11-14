// ============================================================
// SERVICIO: diálogos con el usuario (mensajes y confirmaciones)
// ------------------------------------------------------------
// POR QUÉ EXISTE ESTE SERVICIO: `Alert.alert` de React
// Native NO HACE NADA en el build web — react-native-web lo
// define como una función vacía. Un flujo que espera la
// respuesta de un Alert (como la explicación previa a pedir
// un permiso) se queda esperando para siempre en la web y
// el botón parece muerto, sin ningún mensaje en pantalla.
// En el teléfono (Expo Go o emulador) Alert sí funciona.
//
// Este servicio elige el diálogo según la plataforma, con
// una sola interfaz para todo el código:
// - Nativo (iOS/Android): Alert.alert, el diálogo del sistema.
// - Web: window.alert / window.confirm, los diálogos del
//   navegador, que sí muestran el mensaje y devuelven la
//   respuesta del usuario.
//
// La interfaz NO cambia entre plataformas: pedirConfirmacion
// devuelve true solo si el usuario acepta, igual que el
// Alert nativo con botones.
// ============================================================

import { Alert, Platform } from 'react-native';

/**
 * Muestra un mensaje informativo. En la web usa el diálogo
 * del navegador; en el teléfono, el Alert del sistema.
 */
export function mostrarMensaje(titulo: string, mensaje: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensaje}`);
    return;
  }
  Alert.alert(titulo, mensaje);
}

/**
 * Pide una confirmación con dos opciones y devuelve true
 * solo si el usuario acepta. En la web usa window.confirm,
 * que devuelve la respuesta de inmediato; en el teléfono
 * usa Alert.alert con botones. `esPeligrosa` marca el botón
 * de aceptar como destructivo en el diálogo nativo
 * (eliminar, salir): en la web no cambia nada.
 */
export function pedirConfirmacion(
  titulo: string,
  mensaje: string,
  textoAceptar: string,
  textoCancelar = 'Cancelar',
  esPeligrosa = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return new Promise((resolver) => {
    Alert.alert(titulo, mensaje, [
      { text: textoCancelar, style: 'cancel', onPress: () => resolver(false) },
      {
        text: textoAceptar,
        style: esPeligrosa ? 'destructive' : 'default',
        onPress: () => resolver(true),
      },
    ]);
  });
}
