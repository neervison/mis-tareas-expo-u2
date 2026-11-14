// ============================================================
// SERVICIO: captura de fotos con la cámara del dispositivo
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES +
// INYECCIÓN DE DEPENDENCIAS. Este servicio sabe TOMAR la foto
// y convertirla al formato que guarda la tarea, pero NO sabe
// dibujar la vista previa: la pantalla de cámara
// (src/pantallas/PantallaCamara.tsx) dibuja el visor y le
// entrega su referencia a este servicio. Al recibir la
// cámara como parámetro, el servicio se prueba solo con una
// cámara falsa, sin abrir la cámara real.
//
// FORMATO GUARDADO: la foto se pide en base64 y se guarda
// como data URI ("data:image/jpeg;base64,...") dentro de la
// tarea. Así la imagen viaja CON la tarea en el
// almacenamiento local y no depende de un archivo temporal
// que el sistema podría borrar. La calidad 0.6 equilibra
// nitidez y tamaño: una foto típica queda en decenas de KB.
// OJO CON LA WEB: en el build web, expo-camera entrega el
// base64 YA como data URI completa ("data:image/png;..."),
// así que si el valor ya empieza con "data:" se usa tal
// cual, sin anteponerle otro prefijo (eso dejaría una URI
// inválida y la imagen no se vería).
//
// MANEJO DE ERRORES: la captura devuelve un RESULTADO con
// motivo ('denegada' | 'cancelada' | 'error'), nunca una
// excepción sin clasificar. La interfaz distingue así una
// denegación de permiso (no insistir) de un error técnico
// (reintentar) y de una cancelación del usuario.
// ============================================================

/** Calidad de compresión JPEG de la foto (0 = mínima, 1 = máxima). */
export const CALIDAD_FOTO = 0.6;

/** Lo mínimo que debe entregar una foto capturada (lo que usa este servicio). */
export interface FotoCapturada {
  /** Ruta o data URI de la imagen capturada. */
  uri: string;
  /** Imagen en base64, cuando se pidió con esa opción. */
  base64?: string;
  /** Ancho de la imagen en píxeles. */
  width: number;
  /** Alto de la imagen en píxeles. */
  height: number;
}

/**
 * Referencia a la cámara: cualquier objeto capaz de tomar una
 * foto. En la app real es la referencia del componente
 * CameraView; en las pruebas es un doble controlable.
 */
export interface ReferenciaCamara {
  takePictureAsync: (opciones: {
    quality?: number;
    base64?: boolean;
    exif?: boolean;
  }) => Promise<FotoCapturada>;
}

/** Resultado de intentar tomar una foto. */
export type ResultadoFoto =
  | { ok: true; fotoUri: string; ancho: number; alto: number }
  | { ok: false; motivo: 'denegada' | 'cancelada' | 'error'; mensaje: string };

/** Mensajes en español para cada motivo de fallo de la captura. */
const MENSAJES_FALLO: Record<'denegada' | 'cancelada' | 'error', string> = {
  denegada: 'Sin permiso de cámara: la tarea se guardará sin foto.',
  cancelada: 'Captura cancelada: la tarea se guardará sin foto.',
  error: 'No se pudo tomar la foto. Inténtalo de nuevo.',
};

/**
 * Clasifica el error de la cámara según su mensaje: una
 * cancelación del usuario y una denegación de permiso no son
 * lo mismo que un fallo técnico, y la interfaz reacciona
 * distinto a cada uno.
 */
export function clasificarErrorFoto(error: unknown): 'denegada' | 'cancelada' | 'error' {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (/cancel/i.test(mensaje)) return 'cancelada';
  if (/denied|denegado|permission|permiso|not authorized|unauthorized/i.test(mensaje)) {
    return 'denegada';
  }
  return 'error';
}

/**
 * Toma una foto con la cámara recibida y la devuelve como
 * data URI lista para guardar en la tarea. Si la cámara no
 * entrega base64 (algunas plataformas), usa la uri tal cual.
 */
export async function capturarFoto(camara: ReferenciaCamara): Promise<ResultadoFoto> {
  try {
    const foto = await camara.takePictureAsync({
      quality: CALIDAD_FOTO,
      base64: true,
      exif: false,
    });
    const fotoUri = !foto.base64
      ? foto.uri
      : foto.base64.startsWith('data:')
        ? foto.base64
        : `data:image/jpeg;base64,${foto.base64}`;
    if (!fotoUri) {
      return { ok: false, motivo: 'error', mensaje: 'La cámara no devolvió ninguna imagen.' };
    }
    return { ok: true, fotoUri, ancho: foto.width, alto: foto.height };
  } catch (error) {
    const motivo = clasificarErrorFoto(error);
    return { ok: false, motivo, mensaje: MENSAJES_FALLO[motivo] };
  }
}
