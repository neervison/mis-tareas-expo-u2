// ============================================================
// HOOK useEstadoRed: ¿hay conexión a internet?
// ------------------------------------------------------------
// Este hook mantiene el estado de la red actualizado: lee
// el estado actual al montar y se suscribe a los cambios
// (el usuario entra a un túnel, activa el modo avión, vuelve
// el wifi...). Al desmontar, cancela la suscripción para no
// dejar escuchas activas.
//
// La pantalla lo usa para dos cosas: mostrar el indicador
// "En línea / Sin conexión" y disparar la sincronización
// automática cuando la conexión VUELVE.
// ============================================================

import { useEffect, useState } from 'react';
import {
  EstadoRed,
  obtenerEstadoRed,
  suscribirseACambiosRed,
} from '../servicios/dispositivo';

export function useEstadoRed(): EstadoRed {
  // Se parte asumiendo conexión: la primera lectura real
  // llega en milisegundos y corrige el estado si hace falta.
  const [estado, setEstado] = useState<EstadoRed>({ conectada: true, tipo: null });

  useEffect(() => {
    let activo = true;
    obtenerEstadoRed().then((actual) => {
      if (activo) setEstado(actual);
    });
    const cancelar = suscribirseACambiosRed((actual) => {
      if (activo) setEstado(actual);
    });
    return () => {
      activo = false;
      cancelar();
    };
  }, []);

  return estado;
}
