// ============================================================
// SERVICIO: sincronización con la API externa (offline-first)
// ------------------------------------------------------------
// Buena práctica aplicada: SEPARACIÓN DE RESPONSABILIDADES +
// PATRÓN COLA (offline-first). La app funciona SIN conexión
// porque cada cambio se guarda primero en el almacenamiento
// local y ADEMÁS se anota en una cola persistente. Cuando
// hay conexión, la cola se vacía en orden: cada elemento
// sube con el verbo HTTP correcto (POST crear, PUT
// actualizar, DELETE eliminar). Si un elemento falla (la
// red se corta a mitad de camino), queda en la cola para el
// próximo intento: ningún cambio se pierde.
//
// OPTIMIZACIONES:
// 1) COMBINACIÓN AL ENCOLAR: si una tarea ya tiene un cambio
//    pendiente, el nuevo se combina con el anterior en vez
//    de agregar otro viaje a la API. Crear y luego borrar
//    una tarea sin conexión no genera NINGUNA petición: la
//    tarea nunca existió en la API.
// 2) MEZCLA POR FECHA: al importar, una tarea local con
//    cambios sin subir GANA sobre la versión remota (su
//    cambio es más reciente que la última sincronización);
//    si no tiene cambios pendientes, la versión remota
//    actualiza título y estado. La API de pruebas no
//    entrega marcas de tiempo, así que la fecha de
//    importación se usa como marca de la versión remota y
//    la marca pendienteSync + actualizadaEn decide el
//    ganador. La foto y la ubicación locales nunca se
//    pierden: la API no las conoce y la mezcla las
//    conserva.
// ============================================================

import { ElementoCola, OperacionCola } from '../modelos/usuario';
import { Tarea } from '../modelos/tarea';
import { generarId } from '../utilidades/ids';
import { claveCola, guardarJson, leerJson } from './almacenamiento';
import {
  actualizarTareaRemota,
  crearTareaRemota,
  eliminarTareaRemota,
  importarTareas,
} from './apiTareas';
import { obtenerEstadoRed } from './dispositivo';
import { guardarTareas, leerTareas } from './tareas';

/** Lee la cola de sincronización de un usuario. */
export async function leerCola(usuarioId: string): Promise<ElementoCola[]> {
  return (await leerJson<ElementoCola[]>(claveCola(usuarioId))) ?? [];
}

/** Guarda la cola completa de un usuario. */
async function guardarCola(usuarioId: string, cola: ElementoCola[]): Promise<void> {
  await guardarJson(claveCola(usuarioId), cola);
}

/**
 * Anota un cambio en la cola, combinándolo con un cambio
 * previo de la misma tarea cuando lo hay:
 * - crear + eliminar = nada (la tarea nunca llegó a la API).
 * - crear + actualizar = crear con los datos nuevos.
 * - actualizar + eliminar = eliminar (el cambio previo ya no importa).
 * - eliminar de una tarea que nunca se subió = nada.
 */
export async function encolar(
  usuarioId: string,
  operacion: OperacionCola,
  tarea: Tarea,
): Promise<void> {
  const cola = await leerCola(usuarioId);
  const indicePrevio = cola.findIndex((elemento) => elemento.tareaId === tarea.id);

  if (indicePrevio === -1) {
    // Sin cambio previo: un borrado de algo que nunca se
    // subió no necesita viajar a la API.
    if (operacion === 'eliminar' && tarea.idRemoto === null) return;
    cola.push({
      id: generarId(),
      usuarioId,
      operacion,
      tareaId: tarea.id,
      idRemoto: tarea.idRemoto,
      datos: operacion === 'eliminar' ? null : tarea,
      creadaEn: Date.now(),
    });
    await guardarCola(usuarioId, cola);
    return;
  }

  const previo = cola[indicePrevio];
  if (operacion === 'eliminar' && previo.operacion === 'crear') {
    cola.splice(indicePrevio, 1);
  } else if (operacion === 'eliminar') {
    cola[indicePrevio] = {
      ...previo,
      operacion: 'eliminar',
      datos: null,
      idRemoto: tarea.idRemoto,
      creadaEn: Date.now(),
    };
  } else {
    // 'crear' o 'actualizar': se conserva la operación
    // previa (crear sigue siendo crear) con los datos nuevos.
    cola[indicePrevio] = { ...previo, datos: tarea, creadaEn: Date.now() };
  }
  await guardarCola(usuarioId, cola);
}

/** Resultado de vaciar la cola: qué subió y qué quedó pendiente. */
export interface ResumenVaciado {
  /** Elementos subidos con éxito en este intento. */
  procesadas: number;
  /** Elementos que fallaron y quedan en la cola. */
  fallidas: number;
  /** true = no se intentó nada porque no había conexión. */
  sinConexion: boolean;
}

/**
 * Sube la cola en orden. Para cada elemento se usa la
 * versión ACTUAL de la tarea local (no la copia guardada
 * al encolar), para no subir datos viejos: si la tarea ya
 * tiene id remoto se actualiza (PUT), si no se crea (POST)
 * y se guarda el id que devuelve la API. Un elemento que
 * falla queda en la cola; los demás se siguen intentando.
 */
export async function vaciarCola(usuarioId: string): Promise<ResumenVaciado> {
  const cola = await leerCola(usuarioId);
  if (cola.length === 0) return { procesadas: 0, fallidas: 0, sinConexion: false };

  const red = await obtenerEstadoRed();
  if (!red.conectada) return { procesadas: 0, fallidas: 0, sinConexion: true };

  const porId = new Map((await leerTareas(usuarioId)).map((tarea) => [tarea.id, tarea]));
  const restantes: ElementoCola[] = [];
  let procesadas = 0;
  let fallidas = 0;

  for (const elemento of cola) {
    try {
      if (elemento.operacion === 'eliminar') {
        if (elemento.idRemoto !== null) {
          await eliminarTareaRemota(elemento.idRemoto);
        }
      } else {
        const actual = porId.get(elemento.tareaId);
        if (actual) {
          if (actual.idRemoto === null) {
            const idRemoto = await crearTareaRemota(actual);
            porId.set(actual.id, { ...actual, idRemoto, pendienteSync: false });
          } else {
            await actualizarTareaRemota(actual);
            porId.set(actual.id, { ...actual, pendienteSync: false });
          }
        }
        // Si la tarea ya no existe localmente, el elemento
        // se da por procesado: no hay nada que subir.
      }
      procesadas += 1;
    } catch {
      fallidas += 1;
      restantes.push(elemento);
    }
  }

  await guardarCola(usuarioId, restantes);
  await guardarTareas(usuarioId, [...porId.values()]);
  return { procesadas, fallidas, sinConexion: false };
}

/**
 * Mezcla las tareas importadas con las locales (función
 * pura, sin almacenamiento ni red, para probarla sola):
 * - Una tarea importada con id remoto nuevo se AGREGA.
 * - Si el id remoto ya existe y la local tiene cambios sin
 *   subir o fue modificada después de la importación, la
 *   versión LOCAL gana (es más reciente).
 * - En los demás casos, la versión remota actualiza título
 *   y estado, conservando id local, foto y ubicación.
 */
export function mezclarImportadas(locales: Tarea[], importadas: Tarea[]): Tarea[] {
  const resultado = [...locales];
  const indicePorRemoto = new Map<number, number>();
  resultado.forEach((tarea, indice) => {
    if (tarea.idRemoto !== null) indicePorRemoto.set(tarea.idRemoto, indice);
  });

  for (const importada of importadas) {
    if (importada.idRemoto === null) continue;
    const indice = indicePorRemoto.get(importada.idRemoto);
    if (indice === undefined) {
      indicePorRemoto.set(importada.idRemoto, resultado.length);
      resultado.push(importada);
      continue;
    }
    const local = resultado[indice];
    if (local.pendienteSync || local.actualizadaEn > importada.actualizadaEn) {
      continue;
    }
    resultado[indice] = {
      ...local,
      titulo: importada.titulo,
      completada: importada.completada,
      actualizadaEn: importada.actualizadaEn,
      pendienteSync: false,
    };
  }
  return resultado;
}

/** Resultado de importar y sincronizar en un solo paso. */
export interface ResumenImportacion {
  /** Tareas nuevas que llegaron de la API. */
  importadas: number;
  /** Elementos recibidos que se omitieron por forma inválida. */
  omitidas: number;
  /** Cambios de la cola que se subieron con éxito. */
  sincronizadas: number;
  /** Cambios de la cola que fallaron y quedan pendientes. */
  fallidas: number;
  /** true = no se intentó nada porque no había conexión. */
  sinConexion: boolean;
}

/**
 * Importa desde la API, mezcla con las locales y vacía la
 * cola, en ese orden: primero se trae lo nuevo y después se
 * sube lo pendiente, para que la mezcla vea la lista local
 * completa antes de subir.
 */
export async function importarYSincronizar(usuarioId: string): Promise<ResumenImportacion> {
  const red = await obtenerEstadoRed();
  if (!red.conectada) {
    return { importadas: 0, omitidas: 0, sincronizadas: 0, fallidas: 0, sinConexion: true };
  }

  const { importadas, omitidas } = await importarTareas(usuarioId);
  const locales = await leerTareas(usuarioId);
  const remotosPrevios = new Set(
    locales.map((tarea) => tarea.idRemoto).filter((id) => id !== null),
  );
  const mezcladas = mezclarImportadas(locales, importadas);
  await guardarTareas(usuarioId, mezcladas);
  const agregadas = mezcladas.filter(
    (tarea) => tarea.idRemoto !== null && !remotosPrevios.has(tarea.idRemoto),
  ).length;

  const vaciado = await vaciarCola(usuarioId);
  return {
    importadas: agregadas,
    omitidas,
    sincronizadas: vaciado.procesadas,
    fallidas: vaciado.fallidas,
    sinConexion: false,
  };
}
