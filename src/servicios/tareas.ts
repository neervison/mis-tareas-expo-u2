// ============================================================
// SERVICIO: tareas — persistencia y construcción
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// Este servicio es el dueño de las tareas guardadas: sabe
// leerlas y escribirlas en el almacenamiento local, sembrar
// los ejemplos la primera vez que un usuario entra y crear
// o actualizar tareas con todos sus campos correctos. El
// hook useTareas orquesta estas funciones y la pantalla
// nunca toca el almacenamiento directamente.
//
// SIN CONEXIÓN: leer y guardar pasan solo por el
// almacenamiento local, así que el CRUD completo funciona
// sin internet. La sincronización con la API es otra capa
// (sincronizacion.ts) que se apoya en estas funciones.
//
// INMUTABILIDAD: construir, aplicar cambios y marcar
// completada devuelven tareas NUEVAS sin modificar la
// original, igual que en la Unidad 1: React detecta el
// cambio comparando referencias y redibuja la lista.
// ============================================================

import { DatosTarea, Tarea } from '../modelos/tarea';
import { generarId } from '../utilidades/ids';
import { claveSemilla, claveTareas, guardarJson, leerJson } from './almacenamiento';
import { normalizarTexto } from './validacionTarea';

/** Lee las tareas guardadas de un usuario (arreglo vacío si no hay). */
export async function leerTareas(usuarioId: string): Promise<Tarea[]> {
  return (await leerJson<Tarea[]>(claveTareas(usuarioId))) ?? [];
}

/** Guarda la lista completa de tareas de un usuario. */
export async function guardarTareas(usuarioId: string, tareas: Tarea[]): Promise<void> {
  await guardarJson(claveTareas(usuarioId), tareas);
}

/**
 * Carga las tareas de un usuario al entrar: si ya tiene
 * guardadas, devuelve esas; si es su primera vez, guarda y
 * devuelve los ejemplos recibidos y marca la siembra, para
 * que los ejemplos no reaparezcan si el usuario los borra
 * todos (ver claveSemilla en almacenamiento.ts).
 */
export async function cargarTareasIniciales(
  usuarioId: string,
  ejemplos: Tarea[],
): Promise<Tarea[]> {
  const guardadas = await leerTareas(usuarioId);
  if (guardadas.length > 0) return guardadas;

  const yaSembrado = await leerJson<boolean>(claveSemilla(usuarioId));
  if (yaSembrado === true) return [];

  await guardarTareas(usuarioId, ejemplos);
  await guardarJson(claveSemilla(usuarioId), true);
  return ejemplos;
}

/**
 * Construye una tarea nueva a partir de los datos del
 * formulario: genera el id, normaliza los textos, marca la
 * fecha de creación y la deja pendiente de sincronizar
 * (aún no existe en la API).
 */
export function construirTarea(usuarioId: string, datos: DatosTarea): Tarea {
  const ahora = Date.now();
  return {
    id: generarId(),
    usuarioId,
    titulo: normalizarTexto(datos.titulo),
    descripcion: normalizarTexto(datos.descripcion),
    prioridad: datos.prioridad,
    completada: false,
    fechaCreacion: ahora,
    actualizadaEn: ahora,
    fotoUri: datos.fotoUri,
    ubicacion: datos.ubicacion,
    idRemoto: null,
    pendienteSync: true,
  };
}

/**
 * Aplica los datos del formulario a una tarea existente:
 * conserva id, dueño, estado y datos de sincronización,
 * actualiza la fecha de cambio y la marca pendiente de
 * sincronizar.
 */
export function aplicarCambios(tarea: Tarea, datos: DatosTarea): Tarea {
  return {
    ...tarea,
    titulo: normalizarTexto(datos.titulo),
    descripcion: normalizarTexto(datos.descripcion),
    prioridad: datos.prioridad,
    fotoUri: datos.fotoUri,
    ubicacion: datos.ubicacion,
    actualizadaEn: Date.now(),
    pendienteSync: true,
  };
}

/**
 * Devuelve la tarea con el estado de completada cambiado y
 * la fecha de cambio actualizada (pendiente de subir).
 */
export function marcarCompletada(tarea: Tarea, completada: boolean): Tarea {
  return {
    ...tarea,
    completada,
    actualizadaEn: Date.now(),
    pendienteSync: true,
  };
}
