// ============================================================
// PRUEBAS: comunicación con la API externa
// ------------------------------------------------------------
// fetch se reemplaza por un doble controlable: las pruebas
// verifican el mapeo de importación, los verbos de
// sincronización (POST/PUT/DELETE), los errores HTTP, el
// tiempo de espera y la falta de conexión, sin llamar a la
// API real por la red.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  actualizarTareaRemota,
  crearTareaRemota,
  eliminarTareaRemota,
  ErrorApi,
  importarTareas,
} from '../src/servicios/apiTareas';
import { Tarea } from '../src/modelos/tarea';

const mockFetch = jest.fn<typeof fetch>();

/** Respuesta HTTP falsa con la forma mínima que usa el servicio. */
function respuestaJson(datos: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => datos } as Response;
}

function tareaLocal(): Tarea {
  return {
    id: 'local-1',
    usuarioId: 'u1',
    titulo: 'Estudiar React',
    descripcion: '',
    prioridad: 'alta',
    completada: false,
    fechaCreacion: 1,
    actualizadaEn: 1,
    fotoUri: null,
    ubicacion: null,
    idRemoto: 5,
    pendienteSync: true,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

describe('API externa', () => {
  test('importa y mapea las tareas al modelo de la app, con límite', async () => {
    mockFetch.mockResolvedValue(
      respuestaJson([
        { id: 1, title: 'Tarea remota 1', completed: false, userId: 1 },
        { id: 2, title: 'Tarea remota 2', completed: true, userId: 1 },
      ]),
    );

    const { importadas, omitidas } = await importarTareas('u1');

    expect(omitidas).toBe(0);
    expect(importadas).toHaveLength(2);
    expect(importadas[0]).toMatchObject({
      id: 'remota-1',
      usuarioId: 'u1',
      titulo: 'Tarea remota 1',
      completada: false,
      idRemoto: 1,
      pendienteSync: false,
    });
    expect(importadas[1].completada).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos?_limit=20'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('omite los elementos con forma inválida y los cuenta', async () => {
    mockFetch.mockResolvedValue(
      respuestaJson([
        { id: 1, title: 'Válida', completed: false, userId: 1 },
        { id: 'x', title: 'Id no numérico', completed: false },
        { title: 'Sin id', completed: false },
        null,
        'texto',
      ]),
    );

    const { importadas, omitidas } = await importarTareas('u1');

    expect(importadas).toHaveLength(1);
    expect(omitidas).toBe(4);
  });

  test('sincroniza con POST al crear, PUT al actualizar y DELETE al eliminar', async () => {
    mockFetch.mockResolvedValue(respuestaJson({ id: 201 }));
    const tarea = tareaLocal();

    const idRemoto = await crearTareaRemota({ ...tarea, idRemoto: null });
    expect(idRemoto).toBe(201);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Estudiar React'),
      }),
    );

    mockFetch.mockResolvedValue(respuestaJson({}));
    await actualizarTareaRemota(tarea);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos/5'),
      expect.objectContaining({ method: 'PUT' }),
    );

    await eliminarTareaRemota(5);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos/5'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('convierte una respuesta no-2xx en ErrorApi con el estado HTTP', async () => {
    mockFetch.mockResolvedValue(respuestaJson({ error: 'falla' }, false, 500));

    const error = await importarTareas('u1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).estado).toBe(500);
  });

  test('abandona con ErrorApi si la API no responde dentro del tiempo límite', async () => {
    mockFetch.mockImplementation(
      (_entrada: string | URL | Request, opciones?: RequestInit) =>
        new Promise((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () => {
            const error = new Error('La operación fue cancelada.');
            error.name = 'AbortError';
            rechazar(error);
          });
        }),
    );

    await expect(importarTareas('u1', 30)).rejects.toThrow('Tiempo de espera');
  });

  test('propaga el error de red tal cual cuando no hay conexión', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    const error = await importarTareas('u1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(ErrorApi);
  });
});
