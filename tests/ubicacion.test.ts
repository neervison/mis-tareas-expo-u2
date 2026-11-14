// ============================================================
// PRUEBAS: ubicación GPS (servicio de ubicación)
// ------------------------------------------------------------
// expo-location se reemplaza por un doble: las pruebas
// controlan qué responde el GPS (éxito, demora infinita,
// denegación, datos inválidos) sin depender del hardware.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as Location from 'expo-location';
import {
  enlaceMapas,
  obtenerUbicacionActual,
  textoUbicacion,
} from '../src/servicios/ubicacion';

jest.mock('expo-location', () => ({
  __esModule: true,
  getCurrentPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  Accuracy: { High: 'high' },
}));

const leerPosicion = jest.mocked(Location.getCurrentPositionAsync);

function posicionValida() {
  return {
    coords: {
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 12.5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1700000000000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ubicación GPS', () => {
  test('devuelve latitud, longitud, precisión y fecha de la medición', async () => {
    leerPosicion.mockResolvedValue(posicionValida() as never);

    const resultado = await obtenerUbicacionActual();

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.ubicacion.latitud).toBe(-33.4489);
      expect(resultado.ubicacion.longitud).toBe(-70.6693);
      expect(resultado.ubicacion.precision).toBe(12.5);
      expect(resultado.ubicacion.fecha).toBe(new Date(1700000000000).toISOString());
    }
    expect(leerPosicion).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
  });

  test('abandona con "tiempo-agotado" si el GPS no responde a tiempo', async () => {
    leerPosicion.mockImplementation(() => new Promise(() => {}) as never);

    const resultado = await obtenerUbicacionActual(20);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('tiempo-agotado');
  });

  test('clasifica la denegación de permiso como "denegada"', async () => {
    leerPosicion.mockRejectedValue(new Error('Location permission denied'));

    const resultado = await obtenerUbicacionActual();

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('denegada');
  });

  test('rechaza datos inválidos del GPS y genera enlace y texto correctos', async () => {
    const invalida = posicionValida();
    invalida.coords.accuracy = Number.NaN;
    leerPosicion.mockResolvedValue(invalida as never);

    const resultado = await obtenerUbicacionActual();

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('error');

    const ubicacion = { latitud: -33.4489, longitud: -70.6693, precision: 12.5, fecha: '2026-11-14T00:00:00.000Z' };
    expect(enlaceMapas(ubicacion)).toBe('https://www.google.com/maps?q=-33.4489,-70.6693');
    expect(textoUbicacion(ubicacion)).toBe('-33.4489, -70.6693 · ±13 m');
  });
});
