// ============================================================
// MODELO DE DATOS: Usuario, Sesión y cola de sincronización
// ------------------------------------------------------------
// Igual que el modelo de tareas (src/modelos/tarea.ts), este
// archivo solo describe FORMAS de datos, sin lógica: la
// lógica vive en los servicios (autenticación y
// sincronización) y en los hooks. Separar los modelos por
// tema mantiene cada archivo chico y con un solo motivo
// para cambiar.
//
// SEGURIDAD: el usuario guarda el HASH de la clave con su sal,
// NUNCA la clave tal cual. Si alguien leyera el almacenamiento
// del teléfono, vería el hash y no podría recuperar la clave
// original a partir de él (SHA-256 es de un solo sentido).
// ============================================================

import { Tarea } from './tarea';

/** Cuenta local de la app: vive solo en este dispositivo. */
export interface Usuario {
  /** Identificador único del usuario (dueño de sus tareas). */
  id: string;
  /** Nombre de usuario con el que inicia sesión (único). */
  nombre: string;
  /** Hash SHA-256 de la clave combinada con la sal (nunca la clave). */
  hashClave: string;
  /** Valor aleatorio único por usuario que se mezcla con la clave. */
  sal: string;
  /** Fecha de registro en milisegundos. */
  creadoEn: number;
}

/**
 * Sesión activa: se guarda al entrar y se borra al salir.
 * El token es un valor aleatorio que identifica esta sesión
 * en el dispositivo; no autoriza nada en un servidor, porque
 * la autenticación de esta versión es local (ver el servicio
 * de autenticación para el alcance exacto).
 */
export interface Sesion {
  /** Usuario que inició sesión. */
  usuarioId: string;
  /** Nombre del usuario, para mostrarlo en la interfaz. */
  nombre: string;
  /** Token aleatorio de la sesión. */
  token: string;
  /** Fecha de inicio de sesión en milisegundos. */
  creadaEn: number;
}

/** Operación pendiente de subir a la API externa. */
export type OperacionCola = 'crear' | 'actualizar' | 'eliminar';

/**
 * Un elemento de la cola de sincronización (offline-first):
 * cuando no hay conexión, los cambios se guardan aquí y se
 * suben solos cuando vuelve internet. Guardar la operación
 * (y no solo la tarea) permite subir cada cambio con el
 * verbo HTTP correcto: POST al crear, PUT al modificar y
 * DELETE al eliminar.
 */
export interface ElementoCola {
  /** Identificador único del elemento encolado. */
  id: string;
  /** Usuario dueño del cambio. */
  usuarioId: string;
  /** Qué hay que hacer en la API cuando haya conexión. */
  operacion: OperacionCola;
  /** Id local de la tarea afectada. */
  tareaId: string;
  /** Id remoto de la tarea, si ya existe en la API. */
  idRemoto: number | null;
  /** Copia de la tarea al momento de encolar (null al eliminar). */
  datos: Tarea | null;
  /** Fecha en que se encoló, en milisegundos. */
  creadaEn: number;
}
