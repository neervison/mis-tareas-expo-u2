import { Tarea } from '../modelos/tarea';

// ============================================================
// SERVICIO: comunicación con la API externa (JSONPlaceholder)
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// TODA la comunicación HTTP vive aquí: ningún otro archivo
// llama a fetch directamente. La pantalla y la
// sincronización piden "importar" o "subir" y este servicio
// traduce a peticiones REST.
//
// API USADA: JSONPlaceholder (https://jsonplaceholder.typicode.com)
// es una API REST pública de PRUEBAS que imita una API real:
// acepta GET, POST, PUT y DELETE y responde con JSON, pero
// NO persiste los cambios (los datos vuelven a su estado
// inicial en cada petición). Por eso la app trata el
// almacenamiento local como la fuente de verdad y usa la
// API para demostrar importación y sincronización: los
// "idRemoto" que devuelve POST permiten relacionar cada
// tarea local con su equivalente remoto.
//
// ROBUSTEZ:
// - Cada petición tiene un TIEMPO LÍMITE con AbortController:
//   si la red no responde a tiempo, se cancela y se informa
//   como error de API, sin dejar la app esperando.
// - Toda respuesta que no es 2xx se convierte en ErrorApi
//   con el estado HTTP, para que quien llama distinga un
//   fallo del servidor de un fallo de red.
// - La importación VALIDA cada elemento recibido y omite los
//   que no traen la forma esperada, contándolos: una API que
//   cambia su forma no rompe la app ni guarda basura.
// - La importación trae un LÍMITE de 20 tareas (_limit=20),
//   para no bajar los 200 registros completos de la API:
//   optimización de tráfico y de memoria del teléfono.
// ============================================================

/** Dirección base de la API externa de pruebas. */
export const URL_BASE_API = 'https://jsonplaceholder.typicode.com';

/** Tiempo máximo de espera de cada petición, en milisegundos. */
export const TIEMPO_ESPERA_API_MS = 8000;

/** Cantidad máxima de tareas que se importan en una sola llamada. */
export const LIMITE_IMPORTACION = 20;

/**
 * Error de la API con el estado HTTP que la originó (null
 * cuando el fallo fue de red o de tiempo de espera, es
 * decir, cuando ni siquiera llegó una respuesta).
 */
export class ErrorApi extends Error {
  readonly estado: number | null;

  constructor(mensaje: string, estado: number | null = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
  }
}

/**
 * Forma de una tarea tal como la entrega la API externa.
 * Se define aquí (y no en el modelo) porque pertenece al
 * contrato con la API: si la API cambiara, solo este
 * archivo y el mapeo se tocarían.
 */
interface TareaExterna {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

/**
 * Petición HTTP con tiempo límite y conversión de errores.
 * Es el único lugar que llama a fetch: todas las funciones
 * del servicio pasan por aquí.
 */
async function pedir<T>(
  ruta: string,
  opciones: RequestInit,
  tiempoEsperaMs: number = TIEMPO_ESPERA_API_MS,
): Promise<T> {
  const controlador = new AbortController();
  const idTemporizador = setTimeout(() => controlador.abort(), tiempoEsperaMs);
  try {
    const respuesta = await fetch(`${URL_BASE_API}${ruta}`, {
      ...opciones,
      signal: controlador.signal,
    });
    if (!respuesta.ok) {
      throw new ErrorApi(
        `La API respondió con el estado ${respuesta.status}.`,
        respuesta.status,
      );
    }
    return (await respuesta.json()) as T;
  } catch (error) {
    if (error instanceof ErrorApi) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ErrorApi('Tiempo de espera agotado al comunicarse con la API.', null);
    }
    // Errores de red (sin conexión): suben tal cual para que
    // quien llama los distinga de un error de la API.
    throw error;
  } finally {
    clearTimeout(idTemporizador);
  }
}

/** Cuerpo que se envía al crear o actualizar una tarea remota. */
function cuerpoTarea(tarea: Tarea): string {
  return JSON.stringify({
    title: tarea.titulo,
    completed: tarea.completada,
    userId: 1,
  });
}

/**
 * Convierte una tarea recibida de la API al modelo de la
 * app. Devuelve null cuando el elemento no trae la forma
 * esperada (tipos incorrectos o campos ausentes): la
 * importación lo omite y lo cuenta, en vez de guardar
 * datos inválidos.
 */
export function mapearTareaImportada(externa: unknown, usuarioId: string): Tarea | null {
  if (typeof externa !== 'object' || externa === null) return null;
  const candidata = externa as Partial<TareaExterna>;
  if (
    typeof candidata.id !== 'number' ||
    typeof candidata.title !== 'string' ||
    typeof candidata.completed !== 'boolean'
  ) {
    return null;
  }
  const ahora = Date.now();
  return {
    id: `remota-${candidata.id}`,
    usuarioId,
    titulo: candidata.title,
    descripcion: '',
    prioridad: 'media',
    completada: candidata.completed,
    fechaCreacion: ahora,
    actualizadaEn: ahora,
    fotoUri: null,
    ubicacion: null,
    idRemoto: candidata.id,
    pendienteSync: false,
  };
}

/** Resultado de importar: las tareas válidas y cuántas se omitieron. */
export interface ResumenImportacionApi {
  importadas: Tarea[];
  omitidas: number;
}

/**
 * Importa tareas desde la API externa (GET /todos con
 * límite). La API no entrega marcas de tiempo, así que la
 * fecha de importación se usa como fecha de actualización
 * de las tareas importadas (ver la mezcla en
 * sincronizacion.ts).
 */
export async function importarTareas(
  usuarioId: string,
  tiempoEsperaMs: number = TIEMPO_ESPERA_API_MS,
): Promise<ResumenImportacionApi> {
  const respuesta = await pedir<unknown>(
    `/todos?_limit=${LIMITE_IMPORTACION}`,
    { method: 'GET' },
    tiempoEsperaMs,
  );
  if (!Array.isArray(respuesta)) {
    throw new ErrorApi('La API devolvió una respuesta con forma inesperada.', null);
  }
  const importadas: Tarea[] = [];
  let omitidas = 0;
  for (const elemento of respuesta) {
    const tarea = mapearTareaImportada(elemento, usuarioId);
    if (tarea === null) {
      omitidas += 1;
    } else {
      importadas.push(tarea);
    }
  }
  return { importadas, omitidas };
}

/**
 * Sube una tarea nueva a la API (POST /todos) y devuelve el
 * id remoto que la API le asigna.
 */
export async function crearTareaRemota(
  tarea: Tarea,
  tiempoEsperaMs: number = TIEMPO_ESPERA_API_MS,
): Promise<number> {
  const respuesta = await pedir<Partial<TareaExterna>>(
    '/todos',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: cuerpoTarea(tarea),
    },
    tiempoEsperaMs,
  );
  if (typeof respuesta.id !== 'number') {
    throw new ErrorApi('La API no devolvió un identificador para la tarea creada.', null);
  }
  return respuesta.id;
}

/** Actualiza una tarea que ya existe en la API (PUT /todos/:id). */
export async function actualizarTareaRemota(
  tarea: Tarea,
  tiempoEsperaMs: number = TIEMPO_ESPERA_API_MS,
): Promise<void> {
  if (tarea.idRemoto === null) {
    throw new ErrorApi('No se puede actualizar una tarea sin identificador remoto.', null);
  }
  await pedir<unknown>(
    `/todos/${tarea.idRemoto}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: cuerpoTarea(tarea),
    },
    tiempoEsperaMs,
  );
}

/** Elimina una tarea de la API (DELETE /todos/:id). */
export async function eliminarTareaRemota(
  idRemoto: number,
  tiempoEsperaMs: number = TIEMPO_ESPERA_API_MS,
): Promise<void> {
  await pedir<unknown>(`/todos/${idRemoto}`, { method: 'DELETE' }, tiempoEsperaMs);
}
