// ============================================================
// PRUEBAS: autenticación básica multiusuario (local)
// ------------------------------------------------------------
// AsyncStorage se reemplaza por un doble en memoria y
// expo-crypto por un doble que calcula el SHA-256 REAL con
// el módulo de Node: las pruebas verifican registro, inicio
// de sesión, claves incorrectas y cierre de sesión sin tocar
// el dispositivo ni la criptografía real de la plataforma.
// ============================================================

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cerrarSesion,
  iniciarSesion,
  leerUsuarios,
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_NOMBRE_EN_USO,
  obtenerSesion,
  registrarUsuario,
} from '../src/servicios/autenticacion';

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

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('node:crypto');
  return {
    __esModule: true,
    getRandomBytes: jest.fn(
      (cantidad: number) => new Uint8Array(nodeCrypto.randomBytes(cantidad)),
    ),
    digestStringAsync: jest.fn(async (_algoritmo: string, datos: string) =>
      nodeCrypto.createHash('sha256').update(datos).digest('hex'),
    ),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  };
});

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
});

describe('autenticación local', () => {
  test('registrar crea el usuario con hash (nunca la clave) y deja la sesión iniciada', async () => {
    const sesion = await registrarUsuario('Ana', 'clave123');

    expect(sesion.nombre).toBe('Ana');
    expect(sesion.token).not.toBe('');
    const usuarios = await leerUsuarios();
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].nombre).toBe('Ana');
    expect(usuarios[0].hashClave).not.toBe('clave123');
    expect(usuarios[0].hashClave).not.toBe('');
    expect(usuarios[0].sal).not.toBe('');
    await expect(obtenerSesion()).resolves.toEqual(sesion);
  });

  test('rechaza un nombre de usuario ya registrado (sin distinguir mayúsculas)', async () => {
    await registrarUsuario('Ana', 'clave123');

    await expect(registrarUsuario('ana', 'otraclave')).rejects.toThrow(MENSAJE_NOMBRE_EN_USO);
  });

  test('valida el largo mínimo de nombre y clave al registrar', async () => {
    await expect(registrarUsuario('An', 'clave123')).rejects.toThrow('al menos 3 caracteres');
    await expect(registrarUsuario('Ana', 'abc')).rejects.toThrow('al menos 4 caracteres');
  });

  test('inicia sesión con la clave correcta (nombre sin distinguir mayúsculas)', async () => {
    await registrarUsuario('Ana', 'clave123');

    const sesion = await iniciarSesion('ana', 'clave123');

    expect(sesion.nombre).toBe('Ana');
    expect(sesion.usuarioId).toBe((await leerUsuarios())[0].id);
  });

  test('rechaza la clave incorrecta y el usuario inexistente con el mismo mensaje', async () => {
    await registrarUsuario('Ana', 'clave123');

    await expect(iniciarSesion('Ana', 'clave-mala')).rejects.toThrow(
      MENSAJE_CREDENCIALES_INVALIDAS,
    );
    await expect(iniciarSesion('Nadie', 'clave123')).rejects.toThrow(
      MENSAJE_CREDENCIALES_INVALIDAS,
    );
  });

  test('cerrar sesión borra la sesión guardada', async () => {
    await registrarUsuario('Ana', 'clave123');
    await expect(obtenerSesion()).resolves.not.toBeNull();

    await cerrarSesion();

    await expect(obtenerSesion()).resolves.toBeNull();
  });
});
