// ============================================================
// COMPONENTE: IndicadorConexion
// ------------------------------------------------------------
// Es la píldora que muestra el estado de la red: "En línea"
// (verde) o "Sin conexión" (ámbar, con la explicación de
// que los cambios se guardan y se suben después). Es
// PRESENTACIONAL: recibe el estado calculado por el hook
// useEstadoRed y solo lo dibuja con color e icono distintos
// según el caso, para que se entienda de un vistazo.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciados, radios, tipografia } from '../tema';

interface PropiedadesIndicadorConexion {
  /** true = hay conexión usable; false = modo sin conexión. */
  conectada: boolean;
}

export default function IndicadorConexion({ conectada }: PropiedadesIndicadorConexion) {
  return (
    <View
      style={[estilos.pildora, conectada ? estilos.enLinea : estilos.sinConexion]}
      accessibilityRole="text"
      accessibilityLabel={conectada ? 'En línea' : 'Sin conexión'}
    >
      <Ionicons
        name={conectada ? 'wifi-outline' : 'cloud-offline-outline'}
        size={15}
        color={conectada ? colores.exito : colores.aviso}
      />
      <Text style={[estilos.texto, conectada ? estilos.textoEnLinea : estilos.textoSinConexion]}>
        {conectada
          ? 'En línea'
          : 'Sin conexión: los cambios se guardan y se subirán después'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.sm + 2,
    paddingVertical: espaciados.xs + 2,
    marginBottom: espaciados.md,
    alignSelf: 'flex-start',
  },
  enLinea: {
    backgroundColor: colores.superficie,
    borderColor: colores.exito,
  },
  sinConexion: {
    backgroundColor: colores.fondoAviso,
    borderColor: colores.aviso,
  },
  texto: {
    fontSize: tipografia.pequena,
    fontWeight: '600',
  },
  textoEnLinea: {
    color: colores.exito,
  },
  textoSinConexion: {
    color: colores.aviso,
  },
});
