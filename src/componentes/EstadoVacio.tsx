// ============================================================
// COMPONENTE: EstadoVacio
// ------------------------------------------------------------
// Es el mensaje que muestra la lista cuando NO hay tareas que
// mostrar (el ListEmptyComponent de FlatList en la pantalla).
// Vive como componente propio —y no como un bloque suelto
// dentro de la pantalla— por la buena práctica de
// RESPONSABILIDAD ÚNICA: la pantalla compone piezas; cada
// pieza, incluida esta, tiene su archivo y su explicación.
//
// DINÁMICO SEGÚN EL MOTIVO: la lista puede verse vacía por
// cuatro motivos y cada uno muestra su propio mensaje. Dos
// motivos muestran a LA MASCOTA en su insignia circular
// (sin tareas todavía: la mascota espera; sin pendientes:
// la mascota celebra el 100%) y los otros dos conservan su
// ICONO Ionicons grande (reloj sin completadas, lupa sin
// resultados de búsqueda). Los textos e iconos viven en
// src/constantes/mensajes.ts: este componente recibe el
// filtro activo y si hay una búsqueda en curso, y solo elige
// y dibuja.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MENSAJE_BUSQUEDA_SIN_RESULTADOS, MENSAJES_VACIO } from '../constantes/mensajes';
import { FiltroTareas } from '../modelos/tarea';
import { colores, espaciados, tipografia } from '../tema';
import Mascota from './Mascota';

interface PropiedadesEstadoVacio {
  /** Filtro activo de la lista: decide qué mensaje se muestra. */
  filtro: FiltroTareas;
  /** true = hay una búsqueda activa: el vacío es "sin resultados". */
  buscando?: boolean;
}

export default function EstadoVacio({ filtro, buscando = false }: PropiedadesEstadoVacio) {
  const mensaje = buscando ? MENSAJE_BUSQUEDA_SIN_RESULTADOS : MENSAJES_VACIO[filtro];

  // La mascota protagoniza los dos vacíos "de estado": sin
  // tareas (espera) y sin pendientes (celebración del 100%).
  // Con búsqueda activa siempre se muestra la lupa.
  const mostrarMascota = !buscando && (filtro === 'todas' || filtro === 'pendientes');

  return (
    <View style={estilos.vacio}>
      {mostrarMascota ? (
        <View style={estilos.mascota}>
          <Mascota
            progreso={filtro === 'pendientes' ? 100 : 0}
            totalTareas={filtro === 'pendientes' ? 1 : 0}
            tamano={112}
          />
        </View>
      ) : (
        <Ionicons
          name={mensaje.icono}
          size={tipografia.iconoGrande}
          color={colores.primario}
          style={estilos.icono}
        />
      )}
      <Text style={estilos.vacioTitulo}>{mensaje.titulo}</Text>
      <Text style={estilos.vacioTexto}>{mensaje.texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  vacio: {
    alignItems: 'center',
    paddingVertical: espaciados.xl,
    paddingHorizontal: espaciados.md,
  },
  icono: {
    marginBottom: espaciados.sm,
  },
  mascota: {
    marginBottom: espaciados.sm,
  },
  vacioTitulo: {
    color: colores.texto,
    fontSize: tipografia.base,
    fontWeight: '600',
    marginBottom: espaciados.xs,
    textAlign: 'center',
  },
  vacioTexto: {
    color: colores.textoSecundario,
    fontSize: tipografia.pequena,
    textAlign: 'center',
  },
});
