// ============================================================
// COMPONENTE: BarraBusqueda
// ------------------------------------------------------------
// Es el campo de búsqueda de la lista: un TextInput
// CONTROLADO (su valor vive en la pantalla) con icono de
// lupa y botón para limpiar el texto. Es PRESENTACIONAL:
// no filtra nada; avisa hacia arriba con onCambiar y la
// pantalla aplica el servicio buscarTareas.
//
// La búsqueda compara título y descripción sin distinguir
// mayúsculas (ver src/servicios/filtradoTareas.ts).
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colores, espaciados, radios, tipografia } from '../tema';

interface PropiedadesBarraBusqueda {
  /** Texto actual de la búsqueda (lo guarda la pantalla). */
  valor: string;
  /** Se llama con cada cambio de texto. */
  onCambiar: (texto: string) => void;
}

export default function BarraBusqueda({ valor, onCambiar }: PropiedadesBarraBusqueda) {
  return (
    <View style={estilos.contenedor}>
      <Ionicons name="search-outline" size={18} color={colores.textoSecundario} />
      <TextInput
        style={estilos.input}
        placeholder="Buscar por título o descripción"
        placeholderTextColor={colores.textoSecundario}
        value={valor}
        onChangeText={onCambiar}
        accessibilityLabel="Buscar tareas"
        returnKeyType="search"
      />
      {valor !== '' ? (
        <Pressable
          onPress={() => onCambiar('')}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={6}
        >
          <Ionicons name="close-circle" size={20} color={colores.textoSecundario} />
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.md,
    paddingVertical: espaciados.sm + 2,
    marginBottom: espaciados.md,
    shadowColor: colores.sombra,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: tipografia.base,
    color: colores.texto,
  },
});
