// ============================================================
// COMPONENTE: BarraSesion
// ------------------------------------------------------------
// Es la fila superior de la pantalla: saluda al usuario que
// inició sesión y ofrece cerrar la sesión. Es PRESENTACIONAL:
// recibe el nombre y avisa hacia arriba con onSalir; el
// cierre real (borrar el token) lo hace el hook useSesion.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciados, radios, tipografia } from '../tema';

interface PropiedadesBarraSesion {
  /** Nombre del usuario con sesión activa. */
  nombre: string;
  /** Se llama al tocar "Salir" (la pantalla confirma antes de cerrar). */
  onSalir: () => void;
}

export default function BarraSesion({ nombre, onSalir }: PropiedadesBarraSesion) {
  return (
    <View style={estilos.contenedor}>
      <Ionicons name="person-circle-outline" size={24} color={colores.primario} />
      <Text style={estilos.texto}>Hola, {nombre}</Text>
      <Pressable
        style={estilos.botonSalir}
        onPress={onSalir}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        hitSlop={6}
      >
        <Ionicons name="log-out-outline" size={16} color={colores.peligro} />
        <Text style={estilos.textoSalir}>Salir</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    marginBottom: espaciados.sm,
  },
  texto: {
    flex: 1,
    color: colores.texto,
    fontSize: tipografia.base,
    fontWeight: '600',
  },
  botonSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    paddingHorizontal: espaciados.sm + 2,
    paddingVertical: espaciados.xs + 2,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.pildora,
  },
  textoSalir: {
    color: colores.peligro,
    fontSize: tipografia.pequena,
    fontWeight: '700',
  },
});
