// ============================================================
// HOOK useSesion: la sesión activa de la app
// ------------------------------------------------------------
// Patrones aplicados (los mismos de useTareas):
// 1) SEPARACIÓN DE RESPONSABILIDADES: la pantalla de
//    autenticación solo dibuja el formulario; este hook
//    concentra el estado de la sesión y las operaciones
//    (entrar, registrar, salir) apoyándose en el servicio
//    de autenticación.
// 2) ENCAPSULAMIENTO: la sesión solo cambia a través de las
//    funciones que este hook expone.
// 3) PATRÓN OBSERVADOR (versión React): App.tsx queda
//    "suscrito" a este estado y muestra la pantalla de
//    autenticación o la lista según haya sesión o no.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { Sesion } from '../modelos/usuario';
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  registrarUsuario,
} from '../servicios/autenticacion';

export function useSesion() {
  /** Sesión activa, o null si nadie ha entrado todavía. */
  const [sesion, setSesion] = useState<Sesion | null>(null);
  /** true mientras se busca la sesión guardada al abrir la app. */
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Al montar: recuperar la sesión guardada (si el usuario no
  // cerró sesión, entra directo a su lista).
  useEffect(() => {
    let activa = true;
    obtenerSesion()
      .then((guardada) => {
        if (activa) setSesion(guardada);
      })
      .catch(() => {
        if (activa) setSesion(null);
      })
      .finally(() => {
        if (activa) setCargandoSesion(false);
      });
    return () => {
      activa = false;
    };
  }, []);

  /** Inicia sesión y guarda el resultado en el estado. */
  const entrar = useCallback(async (nombre: string, clave: string): Promise<Sesion> => {
    const nueva = await iniciarSesion(nombre, clave);
    setSesion(nueva);
    return nueva;
  }, []);

  /** Registra un usuario nuevo y deja su sesión iniciada. */
  const registrar = useCallback(async (nombre: string, clave: string): Promise<Sesion> => {
    const nueva = await registrarUsuario(nombre, clave);
    setSesion(nueva);
    return nueva;
  }, []);

  /** Cierra la sesión: borra el token y vuelve a la pantalla de entrada. */
  const salir = useCallback(async (): Promise<void> => {
    await cerrarSesion();
    setSesion(null);
  }, []);

  return { sesion, cargandoSesion, entrar, registrar, salir };
}
