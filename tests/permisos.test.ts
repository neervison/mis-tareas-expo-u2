// ============================================================
// PRUEBAS: permisos del dispositivo (cámara y ubicación)
// ------------------------------------------------------------
// Los módulos de permisos se reemplazan por dobles: las
// pruebas verifican el FLUJO incremental (verificar antes
// de pedir, explicar antes de solicitar, respetar la
// denegación) sin mostrar ningún diálogo del sistema.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { asegurarPermiso, traducirEstado } from '../src/servicios/permisos';

jest.mock('expo-camera', () => ({
  __esModule: true,
  Camera: {
    getCameraPermissionsAsync: jest.fn(),
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  Accuracy: { High: 'high' },
}));

type RespuestaPermiso = Awaited<ReturnType<typeof Camera.getCameraPermissionsAsync>>;

/** Respuesta de permiso con la forma que entrega el sistema. */
function respuesta(status: string): RespuestaPermiso {
  return {
    status,
    granted: status === 'granted',
    canAskAgain: true,
    expires: 'never',
  } as unknown as RespuestaPermiso;
}

const verificarCamara = jest.mocked(Camera.getCameraPermissionsAsync);
const solicitarCamara = jest.mocked(Camera.requestCameraPermissionsAsync);
const verificarUbicacion = jest.mocked(Location.getForegroundPermissionsAsync);
const solicitarUbicacion = jest.mocked(Location.requestForegroundPermissionsAsync);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('permisos del dispositivo', () => {
  test('traduce los estados del sistema al vocabulario de la app', () => {
    expect(traducirEstado('granted')).toBe('otorgado');
    expect(traducirEstado('denied')).toBe('denegado');
    expect(traducirEstado('undetermined')).toBe('sin-responder');
  });

  test('si el permiso ya está otorgado, no pide nada ni muestra la explicación', async () => {
    verificarCamara.mockResolvedValue(respuesta('granted'));
    const mostrarExplicacion = jest.fn(async () => true);

    const resultado = await asegurarPermiso('camara', mostrarExplicacion);

    expect(resultado).toBe(true);
    expect(solicitarCamara).not.toHaveBeenCalled();
    expect(mostrarExplicacion).not.toHaveBeenCalled();
  });

  test('si el permiso está denegado, respeta la denegación sin insistir', async () => {
    verificarUbicacion.mockResolvedValue(respuesta('denied'));
    const mostrarExplicacion = jest.fn(async () => true);

    const resultado = await asegurarPermiso('ubicacion', mostrarExplicacion);

    expect(resultado).toBe(false);
    expect(solicitarUbicacion).not.toHaveBeenCalled();
    expect(mostrarExplicacion).not.toHaveBeenCalled();
  });

  test('si aún no se responde, explica, pide y respeta el resultado de la solicitud', async () => {
    // Caso 1: el usuario acepta ver la solicitud y el sistema otorga el permiso.
    verificarCamara.mockResolvedValue(respuesta('undetermined'));
    solicitarCamara.mockResolvedValue(respuesta('granted'));
    const explicacionAceptada = jest.fn(async () => true);
    await expect(asegurarPermiso('camara', explicacionAceptada)).resolves.toBe(true);
    expect(explicacionAceptada).toHaveBeenCalledTimes(1);
    expect(solicitarCamara).toHaveBeenCalledTimes(1);

    // Caso 2: el usuario acepta ver la solicitud pero el sistema deniega.
    jest.clearAllMocks();
    verificarCamara.mockResolvedValue(respuesta('undetermined'));
    solicitarCamara.mockResolvedValue(respuesta('denied'));
    await expect(asegurarPermiso('camara', explicacionAceptada)).resolves.toBe(false);

    // Caso 3: el usuario rechaza la explicación: no se pide nada al sistema.
    jest.clearAllMocks();
    verificarUbicacion.mockResolvedValue(respuesta('undetermined'));
    const explicacionRechazada = jest.fn(async () => false);
    await expect(asegurarPermiso('ubicacion', explicacionRechazada)).resolves.toBe(false);
    expect(solicitarUbicacion).not.toHaveBeenCalled();
  });
});
