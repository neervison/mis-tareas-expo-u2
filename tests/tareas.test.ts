// ============================================================
// PRUEBAS: tareas — persistencia y construcción
// ------------------------------------------------------------
// AsyncStorage se reemplaza por un doble en memoria: las
// pruebas verifican la siembra de ejemplos, la separación
// por usuario y que construir/actualizar/marcar devuelvan
// tareas nuevas sin modificar la original (inmutabilidad).
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatosTarea, Tarea } from '../src/modelos/tarea';
import {
  aplicarCambios,
  cargarTareasIniciales,
  construirTarea,
  guardarTareas,
  leerTareas,
  marcarCompletada,
} from '../src/servicios/tareas';

jest.mock('@react-native-async-storage/async-storage', () => {
  const tienda = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (clave: string) => tienda.get(clave) ?? null),
      setItem: jest.fn(async (clave: string, valor: string) => {
        tienda.set(clave, valor);
      }),
      removeItem: jest.fn(async (clave: string) => {
        tienda.delete(clave);
      }),
      __reset: () => tienda.clear(),
    },
  };
});

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
});

const DATOS: DatosTarea = {
  titulo: '  Estudiar  ',
  descripcion: 'Repasar',
  prioridad: 'alta',
  fotoUri: null,
  ubicacion: null,
};

function ejemplos(usuarioId: string): Tarea[] {
  return [construirTarea(usuarioId, DATOS)];
}

describe('persistencia y construcción de tareas', () => {
  test('siembra los ejemplos la primera vez que entra un usuario', async () => {
    const sembradas = await cargarTareasIniciales('u1', ejemplos('u1'));

    expect(sembradas).toHaveLength(1);
    expect(sembradas[0].titulo).toBe('Estudiar');
    await expect(leerTareas('u1')).resolves.toHaveLength(1);
  });

  test('no re-siembra si el usuario borró todo, y separa las listas por usuario', async () => {
    await cargarTareasIniciales('u1', ejemplos('u1'));
    await guardarTareas('u1', []);

    // Aunque la lista quedó vacía, los ejemplos NO vuelven: ya se sembró.
    await expect(cargarTareasIniciales('u1', ejemplos('u1'))).resolves.toEqual([]);

    // Otro usuario sí recibe sus propios ejemplos, sin ver los de u1.
    const deU2 = await cargarTareasIniciales('u2', ejemplos('u2'));
    expect(deU2).toHaveLength(1);
    expect(deU2[0].usuarioId).toBe('u2');
    await expect(leerTareas('u1')).resolves.toEqual([]);
  });

  test('construirTarea genera id, normaliza textos y marca pendiente de sincronizar', () => {
    const tarea = construirTarea('u1', DATOS);

    expect(tarea.id).not.toBe('');
    expect(tarea.usuarioId).toBe('u1');
    expect(tarea.titulo).toBe('Estudiar');
    expect(tarea.completada).toBe(false);
    expect(tarea.prioridad).toBe('alta');
    expect(tarea.idRemoto).toBeNull();
    expect(tarea.pendienteSync).toBe(true);
    expect(tarea.fechaCreacion).toBe(tarea.actualizadaEn);
  });

  test('aplicarCambios y marcarCompletada no modifican la tarea original', () => {
    const original = construirTarea('u1', DATOS);

    const editada = aplicarCambios(original, { ...DATOS, titulo: 'Nuevo título' });
    expect(editada.titulo).toBe('Nuevo título');
    expect(editada.pendienteSync).toBe(true);
    expect(original.titulo).toBe('Estudiar');

    const completada = marcarCompletada(original, true);
    expect(completada.completada).toBe(true);
    expect(completada.pendienteSync).toBe(true);
    expect(original.completada).toBe(false);
  });
});
