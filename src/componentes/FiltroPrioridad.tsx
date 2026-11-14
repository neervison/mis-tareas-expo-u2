// ============================================================
// COMPONENTE: FiltroPrioridad (chips para filtrar por importancia)
// ------------------------------------------------------------
// Cuatro "chips" (píldoras tocables) que dejan mirar la lista
// por prioridad: Todas / Baja / Media / Alta, cada uno con
// su icono Ionicons y su CONTEO. El chip activo se pinta
// con el color de su prioridad (verde, ámbar o rojo) y el
// resto queda en blanco con borde: el usuario siempre sabe
// en qué vista está.
//
// Es PRESENTACIONAL, igual que FiltrosTareas: no filtra nada
// por su cuenta. Recibe el filtro activo y los conteos por
// props, y al tocar un chip avisa hacia arriba con
// onCambiarFiltro; el FILTRADO real lo hace el servicio
// src/servicios/filtradoTareas.ts y la pantalla decide.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FiltroPrioridad as TipoFiltroPrioridad } from '../modelos/tarea';
import { colores, espaciados, radios, tipografia } from '../tema';

interface PropiedadesFiltroPrioridad {
  filtroActivo: TipoFiltroPrioridad;
  totalTodas: number;
  totalBaja: number;
  totalMedia: number;
  totalAlta: number;
  onCambiarFiltro: (filtro: TipoFiltroPrioridad) => void;
}

type NombreIconoChip = 'list-outline' | 'arrow-down-outline' | 'remove-outline' | 'arrow-up-outline';

/** Configuración visual de cada chip: clave, icono, etiqueta y color. */
const CHIPS: { clave: TipoFiltroPrioridad; icono: NombreIconoChip; etiqueta: string; color: string }[] = [
  { clave: 'todas', icono: 'list-outline', etiqueta: 'Todas', color: colores.primario },
  { clave: 'baja', icono: 'arrow-down-outline', etiqueta: 'Baja', color: colores.prioridadBaja },
  { clave: 'media', icono: 'remove-outline', etiqueta: 'Media', color: colores.prioridadMedia },
  { clave: 'alta', icono: 'arrow-up-outline', etiqueta: 'Alta', color: colores.prioridadAlta },
];

export default function FiltroPrioridad({
  filtroActivo,
  totalTodas,
  totalBaja,
  totalMedia,
  totalAlta,
  onCambiarFiltro,
}: PropiedadesFiltroPrioridad) {
  const conteos: Record<TipoFiltroPrioridad, number> = {
    todas: totalTodas,
    baja: totalBaja,
    media: totalMedia,
    alta: totalAlta,
  };

  return (
    <View style={estilos.fila}>
      {CHIPS.map((chip) => {
        const activo = chip.clave === filtroActivo;
        const conteo = conteos[chip.clave];
        return (
          <Pressable
            key={chip.clave}
            style={({ pressed }) => [
              estilos.chip,
              activo
                ? { backgroundColor: chip.color, borderColor: chip.color }
                : estilos.chipInactivo,
              pressed && estilos.chipPresionado,
            ]}
            onPress={() => onCambiarFiltro(chip.clave)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`Ver tareas de prioridad ${chip.clave}, ${conteo} tareas`}
            hitSlop={4}
          >
            <Ionicons
              name={chip.icono}
              size={16}
              color={activo ? colores.sobrePrimario : chip.color}
            />
            <Text style={[estilos.textoChip, activo && estilos.textoChipActivo]}>
              {chip.etiqueta} ({conteo})
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciados.sm,
    marginBottom: espaciados.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.md,
    paddingVertical: espaciados.sm + 2,
    borderWidth: 1,
  },
  chipInactivo: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
  },
  chipPresionado: {
    opacity: 0.85,
  },
  textoChip: {
    color: colores.textoSecundario,
    fontSize: tipografia.pequena,
    fontWeight: '600',
  },
  textoChipActivo: {
    color: colores.sobrePrimario,
  },
});
