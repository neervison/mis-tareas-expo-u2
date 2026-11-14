// ============================================================
// PRUEBAS: captura de fotos (servicio de foto)
// ------------------------------------------------------------
// La cámara llega como PARÁMETRO al servicio (inyección de
// dependencias), así que las pruebas usan una cámara falsa
// controlable: no se abre la cámara real del dispositivo.
// Se cubren el éxito, la falta de base64, la denegación de
// permiso, la cancelación y el error técnico.
// ============================================================

import { describe, expect, jest, test } from '@jest/globals';
import { CALIDAD_FOTO, capturarFoto, ReferenciaCamara } from '../src/servicios/foto';

function camaraFalsa(foto: unknown): ReferenciaCamara {
  return {
    takePictureAsync: jest.fn(async () => foto as never),
  } as unknown as ReferenciaCamara;
}

describe('captura de fotos', () => {
  test('devuelve la foto como data URI en base64 con sus dimensiones', async () => {
    const camara = camaraFalsa({ uri: 'file://foto.jpg', base64: 'ABCD1234', width: 800, height: 600 });

    const resultado = await capturarFoto(camara);

    expect(resultado).toEqual({
      ok: true,
      fotoUri: 'data:image/jpeg;base64,ABCD1234',
      ancho: 800,
      alto: 600,
    });
    expect(camara.takePictureAsync).toHaveBeenCalledWith({
      quality: CALIDAD_FOTO,
      base64: true,
      exif: false,
    });
  });

  test('usa el base64 tal cual cuando ya es una data URI completa (build web)', async () => {
    const camara = camaraFalsa({
      uri: 'data:image/png;base64,XXXX',
      base64: 'data:image/png;base64,XXXX',
      width: 100,
      height: 100,
    });

    const resultado = await capturarFoto(camara);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.fotoUri).toBe('data:image/png;base64,XXXX');
  });

  test('usa la uri tal cual cuando la cámara no entrega base64', async () => {
    const camara = camaraFalsa({ uri: 'file://foto.jpg', width: 100, height: 100 });

    const resultado = await capturarFoto(camara);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.fotoUri).toBe('file://foto.jpg');
  });

  test('clasifica la denegación de permiso como "denegada"', async () => {
    const camara: ReferenciaCamara = {
      takePictureAsync: jest.fn(async () => {
        throw new Error('Camera permission denied');
      }),
    } as unknown as ReferenciaCamara;

    const resultado = await capturarFoto(camara);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.motivo).toBe('denegada');
      expect(resultado.mensaje).toContain('permiso');
    }
  });

  test('distingue una cancelación del usuario de un error técnico', async () => {
    const camaraCancelada: ReferenciaCamara = {
      takePictureAsync: jest.fn(async () => {
        throw new Error('User cancelled the capture');
      }),
    } as unknown as ReferenciaCamara;
    const cancelada = await capturarFoto(camaraCancelada);
    expect(cancelada.ok).toBe(false);
    if (!cancelada.ok) expect(cancelada.motivo).toBe('cancelada');

    const camaraRota: ReferenciaCamara = {
      takePictureAsync: jest.fn(async () => {
        throw new Error('Camera hardware failure');
      }),
    } as unknown as ReferenciaCamara;
    const erronea = await capturarFoto(camaraRota);
    expect(erronea.ok).toBe(false);
    if (!erronea.ok) expect(erronea.motivo).toBe('error');
  });
});
