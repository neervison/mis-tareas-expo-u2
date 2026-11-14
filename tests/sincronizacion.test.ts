// ============================================================
// PRUEBAS: sincronización offline-first (cola + mezcla)
// ------------------------------------------------------------
// AsyncStorage y la red se reemplazan por dobles y fetch por
// un doble controlable: las pruebas verifican la combinación
// al encolar, el vaciado de la cola (éxito, sin conexión y
// fallo parcial) y la mezcla por fecha al importar, sin red
// real ni dispositivo.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { Tarea } from '../src/modelos/tarea';
import { mapearTareaImportada } from '../src/servicios/apiTareas';
import { encolar, leerCola, mezclarImportadas, vaciarCola } from '../src/servicios/sincronizacion';
import { construirTarea, guardarTareas, leerTareas } from '../src/servicios/tareas';

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

jest.mock('expo-network', () => ({
  __esModule: true,
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

const mockFetch = jest.fn<typeof fetch>();
const leerRed = jest.mocked(Network.getNetworkStateAsync);

function respuestaJson(datos: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => datos } as Response;
}

function tareaNueva(titulo: string): Tarea {
  return construirTarea('u1', {
    titulo,
    descripcion: '',
    prioridad: 'media',
    fotoUri: null,
    ubicacion: null,
  });
}

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  // Por defecto: en línea, y la API responde a todo con éxito.
  leerRed.mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  } as never);
  mockFetch.mockImplementation(async (entrada: string | URL | Request, opciones?: RequestInit) => {
    const metodo = opciones?.method ?? 'GET';
    const url = String(entrada);
    if (metodo === 'POST') return respuestaJson({ id: 201 });
    if (metodo === 'PUT' || metodo === 'DELETE') return respuestaJson({});
    if (url.includes('/todos')) return respuestaJson([]);
    return respuestaJson({}, false, 404);
  });
});

describe('sincronización offline-first', () => {
  test('encolar combina los cambios de la misma tarea y anula crear + eliminar', async () => {
    const tarea = tareaNueva('Primera versión');
    await encolar('u1', 'crear', tarea);
    await encolar('u1', 'actualizar', { ...tarea, titulo: 'Versión editada' });

    // Un solo elemento: sigue siendo una creación, con los datos nuevos.
    let cola = await leerCola('u1');
    expect(cola).toHaveLength(1);
    expect(cola[0].operacion).toBe('crear');
    expect(cola[0].datos?.titulo).toBe('Versión editada');

    // Crear y luego eliminar sin conexión no genera ninguna petición.
    await encolar('u1', 'eliminar', tarea);
    cola = await leerCola('u1');
    expect(cola).toHaveLength(0);
  });

  test('vaciar la cola sube con POST, guarda el id remoto y limpia la marca pendiente', async () => {
    const tarea = tareaNueva('Para subir');
    await guardarTareas('u1', [tarea]);
    await encolar('u1', 'crear', tarea);

    const resumen = await vaciarCola('u1');

    expect(resumen).toEqual({ procesadas: 1, fallidas: 0, sinConexion: false });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos'),
      expect.objectContaining({ method: 'POST' }),
    );
    const guardadas = await leerTareas('u1');
    expect(guardadas[0].idRemoto).toBe(201);
    expect(guardadas[0].pendienteSync).toBe(false);
    await expect(leerCola('u1')).resolves.toHaveLength(0);
  });

  test('sin conexión no se intenta nada y la cola queda intacta', async () => {
    leerRed.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    } as never);
    const tarea = tareaNueva('Sin red');
    await guardarTareas('u1', [tarea]);
    await encolar('u1', 'crear', tarea);

    const resumen = await vaciarCola('u1');

    expect(resumen.sinConexion).toBe(true);
    expect(resumen.procesadas).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
    await expect(leerCola('u1')).resolves.toHaveLength(1);
  });

  test('un elemento que falla queda en la cola y los demás se siguen intentando', async () => {
    const primera = tareaNueva('Primera');
    const segunda = tareaNueva('Segunda');
    await guardarTareas('u1', [primera, segunda]);
    await encolar('u1', 'crear', primera);
    await encolar('u1', 'crear', segunda);
    mockFetch
      .mockResolvedValueOnce(respuestaJson({ id: 201 }))
      .mockRejectedValueOnce(new Error('La red se cortó'));

    const resumen = await vaciarCola('u1');

    expect(resumen.procesadas).toBe(1);
    expect(resumen.fallidas).toBe(1);
    const cola = await leerCola('u1');
    expect(cola).toHaveLength(1);
    expect(cola[0].tareaId).toBe(segunda.id);
  });

  test('la mezcla agrega las nuevas, actualiza las viejas y respeta los cambios locales pendientes', () => {
    const haceUnaHora = Date.now() - 1000 * 60 * 60;
    const localPendiente: Tarea = {
      ...tareaNueva('Título local'),
      idRemoto: 1,
      pendienteSync: true,
      actualizadaEn: haceUnaHora,
    };
    const localVieja: Tarea = {
      ...tareaNueva('Título viejo'),
      idRemoto: 2,
      pendienteSync: false,
      actualizadaEn: haceUnaHora,
      fotoUri: 'data:image/jpeg;base64,XXX',
      ubicacion: { latitud: -33.4, longitud: -70.6, precision: 10, fecha: '2026-11-14T00:00:00.000Z' },
    };
    const importadas = [
      mapearTareaImportada({ id: 1, title: 'Título remoto', completed: true, userId: 1 }, 'u1')!,
      mapearTareaImportada({ id: 2, title: 'Título nuevo', completed: true, userId: 1 }, 'u1')!,
      mapearTareaImportada({ id: 3, title: 'Tarea agregada', completed: false, userId: 1 }, 'u1')!,
    ];

    const mezcladas = mezclarImportadas([localPendiente, localVieja], importadas);

    expect(mezcladas).toHaveLength(3);
    // La local con cambios pendientes GANA: conserva su título.
    expect(mezcladas[0].titulo).toBe('Título local');
    expect(mezcladas[0].pendienteSync).toBe(true);
    // La local sin pendientes se actualiza, pero conserva foto y ubicación.
    expect(mezcladas[1].titulo).toBe('Título nuevo');
    expect(mezcladas[1].completada).toBe(true);
    expect(mezcladas[1].fotoUri).toBe('data:image/jpeg;base64,XXX');
    expect(mezcladas[1].ubicacion).not.toBeNull();
    // La remota nueva se agrega.
    expect(mezcladas[2].titulo).toBe('Tarea agregada');
    expect(mezcladas[2].idRemoto).toBe(3);
  });
});
