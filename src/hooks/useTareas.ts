// ============================================================
// HOOK useTareas: TODA la lógica de las tareas vive aquí
// ------------------------------------------------------------
// Patrones aplicados en este archivo:
// 1) SEPARACIÓN DE RESPONSABILIDADES: las pantallas y
//    componentes solo dibujan (presentación); este hook
//    concentra el estado y las operaciones (lógica),
//    apoyándose en los servicios (persistencia, cola de
//    sincronización y dispositivo).
// 2) ESTADO INMUTABLE: nunca se modifica el arreglo original;
//    cada cambio crea uno nuevo ([...tareas, nueva],
//    tareas.map(...), tareas.filter(...)). React detecta el
//    cambio por la nueva referencia y vuelve a dibujar.
// 3) PATRÓN OBSERVADOR (versión React): los componentes que
//    usan este hook quedan "suscritos" al estado; cuando el
//    estado cambia, React los re-renderiza automáticamente.
// 4) ENCAPSULAMIENTO: el estado solo se cambia a través de
//    las funciones que este hook expone (agregar, actualizar,
//    eliminar, alternarCompletada, sincronizar, importar).
//
// EVOLUCIÓN (Unidad 2): la lista ya no vive solo en memoria:
// al entrar se carga desde el almacenamiento local del
// usuario, cada cambio se guarda ahí mismo (funciona sin
// conexión) y además se anota en la cola de sincronización
// para subirlo a la API cuando haya red. La pantalla no
// nota la diferencia: sigue usando las mismas funciones.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatosTarea, Tarea } from '../modelos/tarea';
import { Sesion } from '../modelos/usuario';
import { vibrarAlCompletar } from '../servicios/dispositivo';
import { encolar, importarYSincronizar, vaciarCola } from '../servicios/sincronizacion';
import {
  aplicarCambios,
  cargarTareasIniciales,
  construirTarea,
  guardarTareas,
  leerTareas,
  marcarCompletada,
} from '../servicios/tareas';

/**
 * Tareas de ejemplo para que la app nunca parta vacía al
 * evaluarla: los mismos textos de la Unidad 1, ahora con
 * dueño, prioridad y los campos de sincronización. Solo se
 * siembran la PRIMERA vez que un usuario entra (ver
 * cargarTareasIniciales en el servicio de tareas).
 */
function crearEjemplos(usuarioId: string): Tarea[] {
  const ahora = Date.now();
  const base = {
    usuarioId,
    fotoUri: null,
    ubicacion: null,
    idRemoto: null,
    pendienteSync: true,
  };
  return [
    {
      ...base,
      id: 'ejemplo-1',
      titulo: 'Estudiar para la evaluación',
      descripcion: 'Repasar componentes de React Native y los patrones de diseño.',
      prioridad: 'alta',
      completada: false,
      fechaCreacion: ahora - 1000 * 60 * 60 * 5,
      actualizadaEn: ahora - 1000 * 60 * 60 * 5,
    },
    {
      ...base,
      id: 'ejemplo-2',
      titulo: 'Comprar materiales del proyecto',
      descripcion: 'Cotizar y dejar la lista lista en el teléfono.',
      prioridad: 'media',
      completada: false,
      fechaCreacion: ahora - 1000 * 60 * 60 * 2,
      actualizadaEn: ahora - 1000 * 60 * 60 * 2,
    },
    {
      ...base,
      id: 'ejemplo-3',
      titulo: 'Crear el proyecto con Expo',
      descripcion: 'Proyecto generado con create-expo-app (plantilla blank-typescript).',
      prioridad: 'baja',
      completada: true,
      fechaCreacion: ahora - 1000 * 60 * 60 * 26,
      actualizadaEn: ahora - 1000 * 60 * 60 * 26,
    },
  ];
}

export function useTareas(sesion: Sesion) {
  // Estado principal: la lista completa de tareas del usuario.
  const [tareas, setTareas] = useState<Tarea[]>([]);
  /** true mientras se cargan las tareas guardadas al entrar. */
  const [cargando, setCargando] = useState(true);
  /** true mientras se sincroniza o importa (la interfaz lo muestra). */
  const [sincronizando, setSincronizando] = useState(false);

  // Al entrar (o al cambiar de usuario): cargar las tareas
  // guardadas de ESTE usuario, sembrando los ejemplos solo
  // la primera vez.
  useEffect(() => {
    let activa = true;
    setCargando(true);
    cargarTareasIniciales(sesion.usuarioId, crearEjemplos(sesion.usuarioId))
      .then((iniciales) => {
        if (activa) setTareas(iniciales);
      })
      .catch(() => {
        if (activa) setTareas([]);
      })
      .finally(() => {
        if (activa) setCargando(false);
      });
    return () => {
      activa = false;
    };
  }, [sesion.usuarioId]);

  /**
   * Actualiza el estado Y el almacenamiento local en un solo
   * paso: cada operación pasa por aquí para que la lista en
   * pantalla y la guardada nunca se desfasen.
   */
  const persistir = useCallback(
    async (siguiente: Tarea[]): Promise<void> => {
      setTareas(siguiente);
      await guardarTareas(sesion.usuarioId, siguiente);
    },
    [sesion.usuarioId],
  );

  /** Agrega una tarea nueva al FINAL de la lista y la encola para subir. */
  const agregarTarea = useCallback(
    async (datos: DatosTarea): Promise<void> => {
      const nueva = construirTarea(sesion.usuarioId, datos);
      await persistir([...tareas, nueva]);
      await encolar(sesion.usuarioId, 'crear', nueva);
    },
    [tareas, persistir, sesion.usuarioId],
  );

  /** Reemplaza los datos editables de la tarea con ese id y encola el cambio. */
  const actualizarTarea = useCallback(
    async (id: string, datos: DatosTarea): Promise<void> => {
      const tarea = tareas.find((candidata) => candidata.id === id);
      if (!tarea) return;
      const actualizada = aplicarCambios(tarea, datos);
      await persistir(tareas.map((candidata) => (candidata.id === id ? actualizada : candidata)));
      await encolar(sesion.usuarioId, 'actualizar', actualizada);
    },
    [tareas, persistir, sesion.usuarioId],
  );

  /** Elimina la tarea con ese id y encola el borrado remoto. */
  const eliminarTarea = useCallback(
    async (id: string): Promise<void> => {
      const tarea = tareas.find((candidata) => candidata.id === id);
      if (!tarea) return;
      await persistir(tareas.filter((candidata) => candidata.id !== id));
      await encolar(sesion.usuarioId, 'eliminar', tarea);
    },
    [tareas, persistir, sesion.usuarioId],
  );

  /**
   * Marca o desmarca una tarea como completada. Al completar
   * (no al desmarcar) el teléfono vibra levemente: es la
   * interacción háptica con el dispositivo.
   */
  const alternarCompletada = useCallback(
    async (id: string): Promise<void> => {
      const tarea = tareas.find((candidata) => candidata.id === id);
      if (!tarea) return;
      const actualizada = marcarCompletada(tarea, !tarea.completada);
      await persistir(tareas.map((candidata) => (candidata.id === id ? actualizada : candidata)));
      await encolar(sesion.usuarioId, 'actualizar', actualizada);
      if (!tarea.completada) {
        void vibrarAlCompletar();
      }
    },
    [tareas, persistir, sesion.usuarioId],
  );

  /**
   * Sube los cambios pendientes de la cola y recarga la lista
   * (las tareas subidas traen su id remoto y ya no quedan
   * marcadas como pendientes).
   */
  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const resumen = await vaciarCola(sesion.usuarioId);
      setTareas(await leerTareas(sesion.usuarioId));
      return resumen;
    } finally {
      setSincronizando(false);
    }
  }, [sesion.usuarioId]);

  /**
   * Importa tareas desde la API, mezcla con las locales y
   * sube la cola. Devuelve el resumen para que la pantalla
   * informe cuántas llegaron y cuántas se subieron.
   */
  const importar = useCallback(async () => {
    setSincronizando(true);
    try {
      const resumen = await importarYSincronizar(sesion.usuarioId);
      setTareas(await leerTareas(sesion.usuarioId));
      return resumen;
    } finally {
      setSincronizando(false);
    }
  }, [sesion.usuarioId]);

  // Contadores derivados: se recalculan solo si cambia la lista.
  const totalPendientes = useMemo(
    () => tareas.filter((tarea) => !tarea.completada).length,
    [tareas],
  );
  const totalCompletadas = tareas.length - totalPendientes;

  return {
    tareas,
    cargando,
    sincronizando,
    totalPendientes,
    totalCompletadas,
    agregarTarea,
    actualizarTarea,
    eliminarTarea,
    alternarCompletada,
    sincronizar,
    importar,
  };
}
