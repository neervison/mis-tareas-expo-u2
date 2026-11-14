// ============================================================
// MODELO DE DATOS: Tarea
// ------------------------------------------------------------
// Patrón aplicado: SEPARACIÓN DE RESPONSABILIDADES.
// El "modelo" solo describe CÓMO ES una tarea (su forma/tipos).
// No contiene lógica ni pantallas: eso vive en los servicios
// (src/servicios/), en los hooks (src/hooks/) y en los
// componentes. Así cada archivo tiene una única
// responsabilidad y es fácil de explicar y mantener.
//
// EVOLUCIÓN (Unidad 2): la tarea de la Unidad 1 (título,
// descripción y estado) crece con los campos que piden las
// nuevas funciones, sin romper los originales:
// - prioridad: para ordenar y filtrar por importancia.
// - usuarioId: cada tarea pertenece a un usuario (la
//   autenticación separa las listas).
// - fotoUri: la foto adjuntada con la cámara, guardada como
//   texto (data URI en base64) para que sobreviva al cierre
//   de la app sin depender de un archivo temporal.
// - ubicacion: latitud, longitud, precisión y fecha del
//   momento en que se creó la tarea (GPS del dispositivo).
// - idRemoto y pendienteSync: el puente con la API externa:
//   idRemoto es el id que la API le dio a la tarea y
//   pendienteSync marca si falta subir un cambio local.
// - actualizadaEn: marca de tiempo del último cambio, que
//   decide qué versión gana al mezclar datos locales y
//   remotos durante la sincronización.
// ============================================================

/** Importancia de la tarea: se elige en el formulario. */
export type Prioridad = 'baja' | 'media' | 'alta';

/** Etiquetas en español para cada prioridad (las usa la interfaz). */
export const ETIQUETAS_PRIORIDAD: Record<Prioridad, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

/**
 * Ubicación registrada por el GPS al crear la tarea.
 * Se guarda tal cual la entrega el dispositivo: coordenadas
 * en grados decimales, precisión en metros y fecha ISO.
 */
export interface UbicacionTarea {
  /** Latitud en grados decimales (ej.: -33.4489). */
  latitud: number;
  /** Longitud en grados decimales (ej.: -70.6693). */
  longitud: number;
  /** Precisión estimada del GPS en metros (mientras menor, mejor). */
  precision: number;
  /** Fecha y hora de la medición en formato ISO. */
  fecha: string;
}

export interface Tarea {
  /** Identificador único de la tarea (se genera al crearla). */
  id: string;
  /** Usuario dueño de la tarea: las listas se separan por usuario. */
  usuarioId: string;
  /** Título obligatorio: es lo que el usuario escribe primero. */
  titulo: string;
  /** Descripción opcional con el detalle de la tarea. */
  descripcion: string;
  /** Importancia elegida en el formulario. */
  prioridad: Prioridad;
  /** true = tarea completada (se muestra tachada); false = pendiente. */
  completada: boolean;
  /** Fecha de creación en milisegundos (Date.now()), para ordenar y mostrar. */
  fechaCreacion: number;
  /** Último cambio en milisegundos: decide la mezcla al sincronizar. */
  actualizadaEn: number;
  /** Foto adjunta como data URI en base64, o null si no tiene foto. */
  fotoUri: string | null;
  /** Ubicación GPS registrada al crearla, o null si no se registró. */
  ubicacion: UbicacionTarea | null;
  /** Id que la API externa le dio a la tarea, o null si nunca se subió. */
  idRemoto: number | null;
  /** true = tiene cambios locales que aún no se sincronizaron. */
  pendienteSync: boolean;
}

/**
 * Datos que entrega el formulario al crear o editar.
 * Es el mismo contenido que edita el usuario, sin id, dueño,
 * estado ni datos de sincronización: por eso se separa de la
 * interfaz Tarea completa.
 */
export interface DatosTarea {
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  fotoUri: string | null;
  ubicacion: UbicacionTarea | null;
}

/**
 * Filtro de la lista: qué grupo de tareas se está mirando.
 * Es un TIPO del modelo porque describe un estado posible de
 * los datos (no un dibujo): lo usan la pantalla, el servicio de
 * filtrado (src/servicios/filtradoTareas.ts) y los chips de
 * filtro (src/componentes/FiltrosTareas.tsx).
 */
export type FiltroTareas = 'todas' | 'pendientes' | 'completadas';

/** Filtro por importancia: 'todas' o una prioridad concreta. */
export type FiltroPrioridad = 'todas' | Prioridad;
