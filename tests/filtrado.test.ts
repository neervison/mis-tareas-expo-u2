// ============================================================
// PRUEBAS: filtrado y búsqueda de tareas
// ------------------------------------------------------------
// El servicio de filtrado es PURO (sin almacenamiento ni
// red), así que se prueba directo con tareas construidas a
// mano: estado, prioridad y texto de búsqueda.
// ============================================================

import { describe, expect, test } from '@jest/globals';
import { Tarea } from '../src/modelos/tarea';
import { buscarTareas, filtrarPorPrioridad, filtrarTareas } from '../src/servicios/filtradoTareas';

function tarea(id: string, titulo: string, completada: boolean, prioridad: Tarea['prioridad'], descripcion = ''): Tarea {
  return {
    id,
    usuarioId: 'u1',
    titulo,
    descripcion,
    prioridad,
    completada,
    fechaCreacion: 1,
    actualizadaEn: 1,
    fotoUri: null,
    ubicacion: null,
    idRemoto: null,
    pendienteSync: false,
  };
}

const LISTA: Tarea[] = [
  tarea('1', 'Estudiar React', false, 'alta', 'Repasar componentes'),
  tarea('2', 'Comprar pan', false, 'baja'),
  tarea('3', 'Crear el proyecto', true, 'media', 'Proyecto con Expo'),
];

describe('filtrado y búsqueda', () => {
  test('filtra por estado y por prioridad sin modificar la lista original', () => {
    expect(filtrarTareas(LISTA, 'todas')).toHaveLength(3);
    expect(filtrarTareas(LISTA, 'pendientes').map((t) => t.id)).toEqual(['1', '2']);
    expect(filtrarTareas(LISTA, 'completadas').map((t) => t.id)).toEqual(['3']);

    expect(filtrarPorPrioridad(LISTA, 'todas')).toHaveLength(3);
    expect(filtrarPorPrioridad(LISTA, 'alta').map((t) => t.id)).toEqual(['1']);
    expect(filtrarPorPrioridad(LISTA, 'baja').map((t) => t.id)).toEqual(['2']);

    // La lista original queda intacta (estado inmutable).
    expect(LISTA).toHaveLength(3);
    expect(filtrarTareas(LISTA, 'todas')).not.toBe(LISTA);
  });

  test('busca por título o descripción sin distinguir mayúsculas', () => {
    expect(buscarTareas(LISTA, 'estudiar').map((t) => t.id)).toEqual(['1']);
    expect(buscarTareas(LISTA, 'EXPO').map((t) => t.id)).toEqual(['3']);
    expect(buscarTareas(LISTA, '  pan  ').map((t) => t.id)).toEqual(['2']);
    expect(buscarTareas(LISTA, '')).toHaveLength(3);
    expect(buscarTareas(LISTA, 'zzz')).toEqual([]);
  });
});
