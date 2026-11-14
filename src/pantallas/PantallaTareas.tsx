// ============================================================
// PANTALLA: PantallaTareas (la pantalla completa de la app)
// ------------------------------------------------------------
// Buena práctica aplicada: las PANTALLAS viven en su propia
// carpeta (src/pantallas/) y App.tsx queda solo como raíz de
// composición y puerta de sesión. Esta pantalla es el
// "contenedor":
//
// Patrones aplicados en este archivo:
// 1) CONTENEDOR / PRESENTACIONAL: la pantalla usa los hooks
//    useTareas (la lógica) y useEstadoRed (la conexión) y
//    reparte datos y funciones a los componentes
//    "presentacionales" (BarraSesion, IndicadorConexion,
//    Encabezado, BarraProgreso, FiltrosTareas,
//    FiltroPrioridad, BarraBusqueda, FormularioTarea,
//    TareaItem, EstadoVacio), que solo dibujan.
// 2) LISTA VIRTUALIZADA con FlatList: solo dibuja en pantalla
//    las tareas visibles, así la lista rinde bien aunque crezca.
// 3) COMPOSICIÓN: la pantalla se arma juntando componentes
//    pequeños y reutilizables, cada uno en su propio archivo
//    dentro de src/componentes/.
//
// Interfaz DINÁMICA (pedido del usuario):
// - FILTRO de la lista (todas / pendientes / completadas) con
//   chips + filtro de PRIORIDAD + BÚSQUEDA por texto: el
//   estado vive en esta pantalla y el filtrado real lo hacen
//   los servicios de filtrado con useMemo (solo se recalcula
//   si cambian las tareas o los filtros). El estado vacío
//   cambia según el filtro activo y la búsqueda.
// - SINCRONIZACIÓN: botones para subir los cambios pendientes
//   y para importar desde la API, con resumen en un diálogo. Al
//   VOLVER la conexión, la cola se vacía sola (offline-first).
// - ANIMACIONES con LayoutAnimation: al agregar, eliminar,
//   completar o cambiar de filtro, la lista se reordena con
//   una transición suave en vez de un salto brusco. En
//   Android hay que habilitarlo una vez con UIManager (abajo).
// - Sobre la lista van, en orden: sesión, conexión, Encabezado
//   (saludo según la hora), BarraProgreso (avance animado +
//   mensaje dinámico), el formulario, la búsqueda, los chips
//   de filtro y los botones de sincronización.
//
// La estructura de la pantalla, de arriba hacia abajo:
//   sesion      -> <BarraSesion />
//   conexion    -> <IndicadorConexion />
//   encabezado  -> <Encabezado />
//   contenido   -> <SafeAreaView> + <KeyboardAvoidingView>
//   lista       -> <FlatList />
//   cada tarea  -> <TareaItem />
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarraBusqueda,
  BarraProgreso,
  BarraSesion,
  Encabezado,
  EstadoVacio,
  FiltroPrioridad,
  FiltrosTareas,
  FormularioTarea,
  IndicadorConexion,
  TareaItem,
} from '../componentes';
import { useEstadoRed } from '../hooks/useEstadoRed';
import { useTareas } from '../hooks/useTareas';
import { DatosTarea, FiltroPrioridad as TipoFiltroPrioridad, FiltroTareas, Tarea } from '../modelos/tarea';
import { Sesion } from '../modelos/usuario';
import { mostrarMensaje, pedirConfirmacion } from '../servicios/dialogos';
import { vibrarAlConfirmar } from '../servicios/dispositivo';
import {
  buscarTareas,
  filtrarPorPrioridad,
  filtrarTareas,
} from '../servicios/filtradoTareas';
import { colores, espaciados, radios, tipografia } from '../tema';

// En Android, LayoutAnimation viene desactivado de fábrica:
// se habilita UNA vez al cargar este módulo, si la API existe.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Pide la animación de transición para el PRÓXIMO cambio de la
 * lista (agregar, eliminar, completar, filtrar). Sin este
 * llamado, los cambios de estado se dibujan de golpe.
 */
function animarSiguienteCambio() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

interface PropiedadesPantallaTareas {
  /** Sesión activa: el dueño de las tareas que se muestran. */
  sesion: Sesion;
  /** Se llama al confirmar el cierre de sesión. */
  onSalir: () => void;
}

export default function PantallaTareas({ sesion, onSalir }: PropiedadesPantallaTareas) {
  // Toda la lógica de tareas vive en el hook (separación de responsabilidades).
  const {
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
  } = useTareas(sesion);

  // Estado de la red: alimenta el indicador y la sincronización automática.
  const estadoRed = useEstadoRed();

  // Qué tarea se está editando ahora (null = se está creando una nueva).
  const [tareaEnEdicion, setTareaEnEdicion] = useState<Tarea | null>(null);

  // Filtro activo de la lista: parte mostrando todas las tareas.
  const [filtro, setFiltro] = useState<FiltroTareas>('todas');
  const [filtroPrioridad, setFiltroPrioridad] = useState<TipoFiltroPrioridad>('todas');
  const [busqueda, setBusqueda] = useState('');

  // Sincronización AUTOMÁTICA al volver la conexión: se
  // compara con el estado anterior para disparar solo en la
  // transición "sin conexión → en línea", no en cada cambio.
  const conectadaAntes = useRef(estadoRed.conectada);
  useEffect(() => {
    if (estadoRed.conectada && !conectadaAntes.current) {
      void sincronizar();
    }
    conectadaAntes.current = estadoRed.conectada;
  }, [estadoRed.conectada, sincronizar]);

  // La lista visible se calcula con los SERVICIOS de filtrado
  // y useMemo: estado → prioridad → búsqueda, en ese orden.
  const tareasVisibles = useMemo(
    () => buscarTareas(filtrarPorPrioridad(filtrarTareas(tareas, filtro), filtroPrioridad), busqueda),
    [tareas, filtro, filtroPrioridad, busqueda],
  );

  // Conteos para los chips de prioridad (sobre la lista completa).
  const totalBaja = useMemo(() => tareas.filter((t) => t.prioridad === 'baja').length, [tareas]);
  const totalMedia = useMemo(
    () => tareas.filter((t) => t.prioridad === 'media').length,
    [tareas],
  );
  const totalAlta = useMemo(() => tareas.filter((t) => t.prioridad === 'alta').length, [tareas]);

  /** Cambia el filtro con su animación de transición. */
  const manejarCambiarFiltro = (nuevoFiltro: FiltroTareas) => {
    animarSiguienteCambio();
    setFiltro(nuevoFiltro);
  };

  /** Cambia el filtro de prioridad con su animación de transición. */
  const manejarCambiarFiltroPrioridad = (nuevoFiltro: TipoFiltroPrioridad) => {
    animarSiguienteCambio();
    setFiltroPrioridad(nuevoFiltro);
  };

  /** El formulario llama aquí al guardar: crea o actualiza según el modo. */
  const manejarGuardar = async (datos: DatosTarea) => {
    animarSiguienteCambio();
    if (tareaEnEdicion) {
      await actualizarTarea(tareaEnEdicion.id, datos);
      setTareaEnEdicion(null);
    } else {
      await agregarTarea(datos);
    }
  };

  /** Completar o descompletar una tarea, con animación. */
  const manejarAlternar = (id: string) => {
    animarSiguienteCambio();
    void alternarCompletada(id);
  };

  /** Eliminar pide confirmación simple con un diálogo (evita borrados por error). */
  const manejarEliminar = async (tarea: Tarea) => {
    const confirmado = await pedirConfirmacion(
      'Eliminar tarea',
      `¿Seguro que quieres eliminar "${tarea.titulo}"?`,
      'Eliminar',
      'Cancelar',
      true,
    );
    if (!confirmado) return;
    animarSiguienteCambio();
    void eliminarTarea(tarea.id);
    // Si se estaba editando esa misma tarea, se sale del modo edición.
    if (tareaEnEdicion?.id === tarea.id) setTareaEnEdicion(null);
  };

  /** Cerrar sesión pide confirmación: la lista queda guardada en el teléfono. */
  const manejarSalir = async () => {
    const confirmado = await pedirConfirmacion(
      'Cerrar sesión',
      `¿Seguro que quieres salir, ${sesion.nombre}?`,
      'Salir',
      'Cancelar',
      true,
    );
    if (confirmado) onSalir();
  };

  /** Sube la cola y resume el resultado para el usuario. */
  const manejarSincronizar = async () => {
    const resumen = await sincronizar();
    if (resumen.sinConexion) {
      mostrarMensaje(
        'Sin conexión',
        'Los cambios quedan guardados en la cola y se subirán cuando vuelva internet.',
      );
      return;
    }
    if (resumen.procesadas === 0 && resumen.fallidas === 0) {
      mostrarMensaje('Al día', 'No había cambios pendientes de sincronizar.');
      return;
    }
    if (resumen.fallidas > 0) {
      mostrarMensaje(
        'Sincronización parcial',
        `Se subieron ${resumen.procesadas} cambios y ${resumen.fallidas} quedaron pendientes. Inténtalo de nuevo con mejor conexión.`,
      );
      return;
    }
    void vibrarAlConfirmar();
    mostrarMensaje(
      'Sincronización completa',
      `Se subieron ${resumen.procesadas} cambios a la API.`,
    );
  };

  /** Importa desde la API y resume cuántas tareas llegaron. */
  const manejarImportar = async () => {
    const resumen = await importar();
    if (resumen.sinConexion) {
      mostrarMensaje(
        'Sin conexión',
        'No se pudo importar: revisa tu conexión e inténtalo de nuevo.',
      );
      return;
    }
    let mensaje = `Se importaron ${resumen.importadas} tareas nuevas de la API.`;
    if (resumen.omitidas > 0) {
      mensaje += ` Se omitieron ${resumen.omitidas} por datos inválidos.`;
    }
    if (resumen.sincronizadas > 0) {
      mensaje += ` Además se subieron ${resumen.sincronizadas} cambios pendientes.`;
    }
    if (resumen.fallidas > 0) {
      mensaje += ` ${resumen.fallidas} cambios no se pudieron subir.`;
    }
    if (resumen.fallidas === 0) {
      void vibrarAlConfirmar();
    }
    mostrarMensaje('Importación completa', mensaje);
  };

  // Mientras se cargan las tareas guardadas, un indicador centrado.
  if (cargando) {
    return (
      <SafeAreaView style={[estilos.pantalla, estilos.centrado]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colores.primario} />
        <Text style={estilos.textoCargando}>Cargando tus tareas…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar style="dark" />
      {/* El formulario sube sobre el teclado en vez de quedar tapado por él */}
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          style={estilos.flex}
          contentContainerStyle={estilos.contenidoLista}
          data={tareasVisibles}
          keyExtractor={(tarea) => tarea.id}
          renderItem={({ item }) => (
            <TareaItem
              tarea={item}
              onAlternar={manejarAlternar}
              onEditar={setTareaEnEdicion}
              onEliminar={manejarEliminar}
            />
          )}
          // Todo lo que va SOBRE la lista: sesión, conexión, encabezado,
          // progreso, formulario, búsqueda, filtros y sincronización.
          ListHeaderComponent={
            <>
              <BarraSesion nombre={sesion.nombre} onSalir={manejarSalir} />
              <IndicadorConexion conectada={estadoRed.conectada} />
              <Encabezado totalPendientes={totalPendientes} totalCompletadas={totalCompletadas} />
              <BarraProgreso totalTareas={tareas.length} totalCompletadas={totalCompletadas} />
              <FormularioTarea
                tareaEnEdicion={tareaEnEdicion}
                onGuardar={manejarGuardar}
                onCancelarEdicion={() => setTareaEnEdicion(null)}
              />
              <BarraBusqueda valor={busqueda} onCambiar={setBusqueda} />
              <View style={estilos.filaTituloLista}>
                <Ionicons name="list-outline" size={20} color={colores.texto} />
                <Text style={estilos.tituloLista} accessibilityRole="header">
                  Lista de tareas
                </Text>
              </View>
              <FiltrosTareas
                filtroActivo={filtro}
                totalTodas={tareas.length}
                totalPendientes={totalPendientes}
                totalCompletadas={totalCompletadas}
                onCambiarFiltro={manejarCambiarFiltro}
              />
              <FiltroPrioridad
                filtroActivo={filtroPrioridad}
                totalTodas={tareas.length}
                totalBaja={totalBaja}
                totalMedia={totalMedia}
                totalAlta={totalAlta}
                onCambiarFiltro={manejarCambiarFiltroPrioridad}
              />
              <View style={estilos.filaSincronizacion}>
                <Pressable
                  style={[estilos.botonSync, sincronizando && estilos.botonSyncDeshabilitado]}
                  onPress={() => {
                    void manejarSincronizar();
                  }}
                  disabled={sincronizando}
                  accessibilityRole="button"
                  accessibilityLabel="Sincronizar cambios pendientes"
                >
                  {sincronizando ? (
                    <ActivityIndicator size="small" color={colores.primario} />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={17} color={colores.primario} />
                  )}
                  <Text style={estilos.textoBotonSync}>Sincronizar</Text>
                </Pressable>
                <Pressable
                  style={[estilos.botonSync, sincronizando && estilos.botonSyncDeshabilitado]}
                  onPress={() => {
                    void manejarImportar();
                  }}
                  disabled={sincronizando}
                  accessibilityRole="button"
                  accessibilityLabel="Importar tareas desde la API"
                >
                  {sincronizando ? (
                    <ActivityIndicator size="small" color={colores.primario} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={17} color={colores.primario} />
                  )}
                  <Text style={estilos.textoBotonSync}>Importar de la API</Text>
                </Pressable>
              </View>
            </>
          }
          // ESTADO VACÍO: componente propio; su mensaje depende del filtro
          // activo y de si hay una búsqueda en curso.
          ListEmptyComponent={<EstadoVacio filtro={filtro} buscando={busqueda.trim() !== ''} />}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciados.sm,
  },
  textoCargando: {
    color: colores.textoSecundario,
    fontSize: tipografia.mediana,
  },
  flex: {
    flex: 1,
  },
  contenidoLista: {
    padding: espaciados.md,
    paddingBottom: espaciados.xl,
  },
  filaTituloLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    marginBottom: espaciados.sm,
  },
  tituloLista: {
    color: colores.texto,
    fontSize: tipografia.subtitulo,
    fontWeight: 'bold',
  },
  filaSincronizacion: {
    flexDirection: 'row',
    gap: espaciados.sm,
    marginBottom: espaciados.md,
  },
  botonSync: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    borderColor: colores.primario,
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingVertical: espaciados.sm + 2,
    backgroundColor: colores.superficie,
  },
  botonSyncDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonSync: {
    color: colores.primario,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
});
