// ============================================================
// PRUEBAS: almacenamiento local (AsyncStorage)
// ------------------------------------------------------------
// AsyncStorage se reemplaza por un doble en memoria (un Map):
// las pruebas verifican el COMPORTAMIENTO del servicio
// (guardar, leer, borrar, tolerar datos dañados) sin tocar
// el almacenamiento real del dispositivo.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { eliminarClave, guardarJson, leerJson } from '../src/servicios/almacenamiento';

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
      // Gancho solo para las pruebas: vacía la tienda entre pruebas.
      __reset: () => tienda.clear(),
    },
  };
});

function resetearTienda(): void {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
}

beforeEach(() => {
  resetearTienda();
  jest.clearAllMocks();
});

describe('almacenamiento local', () => {
  test('guarda y lee un valor JSON, y lo borra con eliminarClave', async () => {
    await guardarJson('prueba:valor', { titulo: 'Estudiar', n: 3 });
    await expect(leerJson('prueba:valor')).resolves.toEqual({ titulo: 'Estudiar', n: 3 });

    await eliminarClave('prueba:valor');
    await expect(leerJson('prueba:valor')).resolves.toBeNull();
  });

  test('devuelve null cuando la clave no existe', async () => {
    await expect(leerJson('prueba:inexistente')).resolves.toBeNull();
  });

  test('devuelve null cuando el contenido no es JSON válido (no se rompe)', async () => {
    await AsyncStorage.setItem('prueba:danado', '{esto no es json');
    await expect(leerJson('prueba:danado')).resolves.toBeNull();
  });
});
