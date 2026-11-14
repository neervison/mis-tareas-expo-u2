// ============================================================
// PRUEBAS: interacciones con el dispositivo (red y vibración)
// ------------------------------------------------------------
// expo-network y expo-haptics se reemplazan por dobles: las
// pruebas verifican la traducción del estado de red, la
// suscripción a sus cambios y las llamadas de vibración, sin
// hardware real.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import {
  obtenerEstadoRed,
  suscribirseACambiosRed,
  traducirEstadoRed,
  vibrarAlCompletar,
  vibrarAlConfirmar,
} from '../src/servicios/dispositivo';

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

const leerRed = jest.mocked(Network.getNetworkStateAsync);
const escucharRed = jest.mocked(Network.addNetworkStateListener);
const impacto = jest.mocked(Haptics.impactAsync);
const notificacion = jest.mocked(Haptics.notificationAsync);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dispositivo: red y vibración', () => {
  test('traduce el estado de red y lee el estado actual', async () => {
    expect(
      traducirEstadoRed({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
    ).toEqual({ conectada: true, tipo: 'wifi' });
    expect(
      traducirEstadoRed({ isConnected: false, isInternetReachable: false, type: 'none' }),
    ).toEqual({ conectada: false, tipo: 'none' });
    // Sin medición todavía (null), se asume conexión: la API fallará igual si no la hay.
    expect(traducirEstadoRed({})).toEqual({ conectada: true, tipo: null });

    leerRed.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    } as never);
    await expect(obtenerEstadoRed()).resolves.toEqual({ conectada: false, tipo: 'none' });
  });

  test('la suscripción avisa los cambios de red y se puede cancelar', () => {
    const alCambiar = jest.fn();
    const cancelar = suscribirseACambiosRed(alCambiar);

    // Se toma el oyente registrado y se simula un cambio a "sin conexión".
    const oyente = escucharRed.mock.calls[0][0];
    oyente({ isConnected: false, isInternetReachable: false, type: 'none' } as never);
    expect(alCambiar).toHaveBeenCalledWith({ conectada: false, tipo: 'none' });

    cancelar();
    const remover = (escucharRed.mock.results[0].value as { remove: jest.Mock }).remove;
    expect(remover).toHaveBeenCalledTimes(1);
  });

  test('vibrar usa los estilos hápticos correctos', async () => {
    await vibrarAlCompletar();
    expect(impacto).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    await vibrarAlConfirmar();
    expect(notificacion).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});
