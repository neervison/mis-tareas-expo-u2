// ============================================================
// COMPONENTE: TareaItem (la tarjeta de UNA tarea en la lista)
// ------------------------------------------------------------
// Es el elemento de la lista: una tarjeta por tarea. Es un componente PRESENTACIONAL y
// REUTILIZABLE: FlatList lo dibuja una vez por cada tarea,
// siempre con la misma estructura:
// [checkbox] Título + insignia de prioridad + descripción
//            + foto + ubicación + estado de sincronización
//            [Editar] [Eliminar]
// La tarea completada se muestra tachada y atenuada, para
// distinguirla de un vistazo (jerarquía y contraste).
// La tarjeta lleva un BORDE IZQUIERDO de color según estado
// (pendiente = primario, completada = verde de éxito) y las
// acciones llevan icono Ionicons profesional + palabra
// («Editar», «Eliminar»): el icono acompaña, la palabra
// comunica (los accessibilityLabel dicen la acción completa).
// La FOTO se muestra como miniatura; la UBICACIÓN como fila
// tocable que abre el lugar en mapas (Linking); y si la
// tarea tiene cambios sin subir, una etiqueta ámbar lo
// avisa ("Pendiente de sincronizar").
// No guarda estado: avisa hacia arriba con callbacks
// (onAlternar, onEditar, onEliminar) y la pantalla decide.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ETIQUETAS_PRIORIDAD, Prioridad, Tarea } from '../modelos/tarea';
import { enlaceMapas, textoUbicacion } from '../servicios/ubicacion';
import { colores, espaciados, radios, tipografia } from '../tema';

/** Color de cada prioridad (el mismo de los chips del formulario). */
const COLORES_PRIORIDAD: Record<Prioridad, string> = {
  baja: colores.prioridadBaja,
  media: colores.prioridadMedia,
  alta: colores.prioridadAlta,
};

interface PropiedadesTareaItem {
  tarea: Tarea;
  onAlternar: (id: string) => void;
  onEditar: (tarea: Tarea) => void;
  onEliminar: (tarea: Tarea) => void;
}

export default function TareaItem({
  tarea,
  onAlternar,
  onEditar,
  onEliminar,
}: PropiedadesTareaItem) {
  const colorPrioridad = COLORES_PRIORIDAD[tarea.prioridad];
  const fotoUri = tarea.fotoUri;
  const ubicacion = tarea.ubicacion;

  return (
    <View
      style={[
        estilos.tarjeta,
        // Borde izquierdo con significado: color según el estado.
        tarea.completada ? estilos.bordeCompletada : estilos.bordePendiente,
      ]}
    >
      {/* Checkbox personalizado: círculo que se rellena al completar */}
      <Pressable
        style={[estilos.checkbox, tarea.completada && estilos.checkboxCompletado]}
        onPress={() => onAlternar(tarea.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarea.completada }}
        accessibilityLabel={
          tarea.completada
            ? `Marcar como pendiente: ${tarea.titulo}`
            : `Marcar como completada: ${tarea.titulo}`
        }
        hitSlop={8}
      >
        {tarea.completada ? <Text style={estilos.check}>✓</Text> : null}
      </Pressable>

      {/* Título, descripción, foto, ubicación y estado de sincronización */}
      <View style={estilos.contenido}>
        <View style={estilos.filaTitulo}>
          <Text style={[estilos.titulo, tarea.completada && estilos.textoCompletado]}>
            {tarea.titulo}
          </Text>
          <View style={[estilos.insignia, { borderColor: colorPrioridad }]}>
            <Text style={[estilos.textoInsignia, { color: colorPrioridad }]}>
              {ETIQUETAS_PRIORIDAD[tarea.prioridad]}
            </Text>
          </View>
        </View>
        {tarea.descripcion ? (
          <Text style={[estilos.descripcion, tarea.completada && estilos.textoCompletado]}>
            {tarea.descripcion}
          </Text>
        ) : null}
        {fotoUri ? (
          <Image
            source={{ uri: fotoUri }}
            style={estilos.foto}
            resizeMode="cover"
            accessibilityLabel={`Foto adjunta a: ${tarea.titulo}`}
          />
        ) : null}
        {ubicacion ? (
          <Pressable
            style={estilos.filaUbicacion}
            onPress={() => {
              void Linking.openURL(enlaceMapas(ubicacion));
            }}
            accessibilityRole="link"
            accessibilityLabel={`Ver ubicación en el mapa: ${textoUbicacion(ubicacion)}`}
            hitSlop={4}
          >
            <Ionicons name="location-outline" size={14} color={colores.primario} />
            <Text style={estilos.textoUbicacion}>{textoUbicacion(ubicacion)}</Text>
          </Pressable>
        ) : null}
        {tarea.pendienteSync ? (
          <View style={estilos.filaPendiente}>
            <Ionicons name="cloud-upload-outline" size={13} color={colores.aviso} />
            <Text style={estilos.textoPendiente}>Pendiente de sincronizar</Text>
          </View>
        ) : null}
      </View>

      {/* Acciones de la tarea: editar y eliminar */}
      <View style={estilos.acciones}>
        <Pressable
          style={estilos.botonEditar}
          onPress={() => onEditar(tarea)}
          accessibilityRole="button"
          accessibilityLabel={`Editar tarea: ${tarea.titulo}`}
          hitSlop={6}
        >
          <Ionicons name="create-outline" size={15} color={colores.primario} />
          <Text style={estilos.textoEditar}>Editar</Text>
        </Pressable>
        <Pressable
          style={estilos.botonEliminar}
          onPress={() => onEliminar(tarea)}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar tarea: ${tarea.titulo}`}
          hitSlop={6}
        >
          <Ionicons name="trash-outline" size={15} color={colores.peligro} />
          <Text style={estilos.textoEliminar}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colores.superficie,
    borderRadius: radios.xl,
    padding: espaciados.md,
    marginBottom: espaciados.sm + 4,
    shadowColor: colores.sombra,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    // Ancho del borde izquierdo de estado (el color va aparte).
    borderLeftWidth: 4,
  },
  bordePendiente: {
    borderLeftColor: colores.primario,
  },
  bordeCompletada: {
    borderLeftColor: colores.exito,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: espaciados.sm + 4,
  },
  checkboxCompletado: {
    backgroundColor: colores.exito,
    borderColor: colores.exito,
  },
  check: {
    color: colores.sobrePrimario,
    fontSize: tipografia.mediana,
    fontWeight: 'bold',
  },
  contenido: {
    flex: 1,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciados.xs + 2,
  },
  titulo: {
    flex: 1,
    color: colores.texto,
    fontSize: tipografia.base,
    fontWeight: '600',
  },
  insignia: {
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.sm,
    paddingVertical: 2,
  },
  textoInsignia: {
    fontSize: tipografia.mini,
    fontWeight: '700',
  },
  descripcion: {
    color: colores.textoSecundario,
    fontSize: tipografia.pequena,
    marginTop: 2,
  },
  foto: {
    width: 96,
    height: 96,
    borderRadius: radios.lg,
    marginTop: espaciados.sm,
  },
  filaUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    marginTop: espaciados.xs + 2,
  },
  textoUbicacion: {
    color: colores.primario,
    fontSize: tipografia.pequena,
    textDecorationLine: 'underline',
  },
  filaPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    marginTop: espaciados.xs + 2,
  },
  textoPendiente: {
    color: colores.aviso,
    fontSize: tipografia.mini,
    fontWeight: '600',
  },
  textoCompletado: {
    textDecorationLine: 'line-through',
    color: colores.textoSecundario,
  },
  acciones: {
    marginLeft: espaciados.sm,
    alignItems: 'flex-end',
    gap: espaciados.xs,
  },
  botonEditar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    paddingHorizontal: espaciados.sm + 2,
    paddingVertical: espaciados.xs + 2,
  },
  textoEditar: {
    color: colores.primario,
    fontSize: tipografia.pequena,
    fontWeight: '700',
  },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs,
    paddingHorizontal: espaciados.sm + 2,
    paddingVertical: espaciados.xs + 2,
  },
  textoEliminar: {
    color: colores.peligro,
    fontSize: tipografia.pequena,
    fontWeight: '700',
  },
});
