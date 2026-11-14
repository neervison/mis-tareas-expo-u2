// ============================================================
// SERVICIO: filtrado de la lista de tareas
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES.
// Decidir QUÉ tareas se muestran según el filtro elegido
// (todas / pendientes / completadas) es una REGLA de la app,
// no un dibujo: por eso vive aquí como FUNCIÓN PURA y la
// pantalla solo la usa con useMemo.
//
// Al ser pura (mismas tareas + mismo filtro → mismo resultado,
// sin tocar el arreglo original) se puede probar sola con un
// script, igual que el servicio de validación.
// ============================================================

import { FiltroPrioridad, FiltroTareas, Tarea } from '../modelos/tarea';

/**
 * Devuelve un arreglo NUEVO con las tareas que corresponden al
 * filtro: 'todas' devuelve una copia completa, 'pendientes'
 * solo las no completadas y 'completadas' solo las terminadas.
 * El arreglo original nunca se modifica (estado inmutable).
 */
export function filtrarTareas(tareas: Tarea[], filtro: FiltroTareas): Tarea[] {
  if (filtro === 'pendientes') return tareas.filter((tarea) => !tarea.completada);
  if (filtro === 'completadas') return tareas.filter((tarea) => tarea.completada);
  return [...tareas];
}

/**
 * Devuelve un arreglo NUEVO con las tareas de la prioridad
 * elegida ('todas' devuelve una copia completa). Se combina
 * con filtrarTareas: la pantalla aplica primero el filtro de
 * estado, luego el de prioridad y al final la búsqueda.
 */
export function filtrarPorPrioridad(tareas: Tarea[], filtro: FiltroPrioridad): Tarea[] {
  if (filtro === 'todas') return [...tareas];
  return tareas.filter((tarea) => tarea.prioridad === filtro);
}

/**
 * Devuelve un arreglo NUEVO con las tareas cuyo título o
 * descripción contiene el texto buscado (sin distinguir
 * mayúsculas y sin contar espacios de sobra). Un texto vacío
 * devuelve una copia completa.
 */
export function buscarTareas(tareas: Tarea[], texto: string): Tarea[] {
  const buscado = texto.trim().toLowerCase();
  if (buscado === '') return [...tareas];
  return tareas.filter(
    (tarea) =>
      tarea.titulo.toLowerCase().includes(buscado) ||
      tarea.descripcion.toLowerCase().includes(buscado),
  );
}
