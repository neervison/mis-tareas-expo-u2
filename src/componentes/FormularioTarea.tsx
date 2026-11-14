// ============================================================
// COMPONENTE: FormularioTarea
// ------------------------------------------------------------
// Es el formulario de la app: campos de texto (TextInput),
// chips de prioridad, foto, ubicación y botones (Pressable)
// para crear o editar una tarea.
//
// Patrones aplicados:
// 1) COMPONENTE CONTROLADO: el valor de cada TextInput vive
//    en el estado de React (value + onChangeText). React es
//    la fuente única de verdad de lo que el usuario escribe.
// 2) UN SOLO FORMULARIO, DOS MODOS: si recibe `tareaEnEdicion`
//    trabaja en modo EDITAR (carga los datos y el botón dice
//    "Actualizar tarea" + aparece "Cancelar"); si no, crea.
// 3) VALIDACIÓN SIMPLE Y VISIBLE: el título es obligatorio.
//    Sin título, el botón se ve deshabilitado y al tocarlo se
//    muestra el mensaje de error bajo el campo. La REGLA y su
//    mensaje viven en el servicio de validación
//    (src/servicios/validacionTarea.ts): este componente solo
//    la USA, no la inventa (separación de responsabilidades).
// 4) LÍMITES CON NOMBRE: cada campo acepta como máximo los
//    caracteres de src/constantes/limites.ts (maxLength), sin
//    números mágicos escritos en el componente.
// 5) PERMISOS INCREMENTALES CON CONTEXTO: la cámara y la
//    ubicación se piden SOLO cuando el usuario toca su botón,
//    mostrando ANTES la explicación de para qué se usará el
//    permiso (los textos viven en
//    src/constantes/mensajes.ts). Si el usuario no acepta, la
//    tarea se guarda igual, sin foto o sin ubicación.
// Al guardar con éxito, el formulario se LIMPIA solo, como
// del proyecto.
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LARGO_MAX_DESCRIPCION, LARGO_MAX_TITULO } from '../constantes/limites';
import {
  EXPLICACION_PERMISO_CAMARA,
  EXPLICACION_PERMISO_UBICACION,
  ExplicacionPermiso,
} from '../constantes/mensajes';
import {
  DatosTarea,
  ETIQUETAS_PRIORIDAD,
  Prioridad,
  Tarea,
  UbicacionTarea,
} from '../modelos/tarea';
import PantallaCamara from '../pantallas/PantallaCamara';
import { asegurarPermiso, verificarPermisoUbicacion } from '../servicios/permisos';
import { obtenerUbicacionActual, textoUbicacion } from '../servicios/ubicacion';
import { esTituloValido, validarTitulo } from '../servicios/validacionTarea';
import { colores, espaciados, radios, tipografia } from '../tema';

/** Color de cada prioridad (el mismo de la insignia de la tarjeta). */
const COLORES_PRIORIDAD: Record<Prioridad, string> = {
  baja: colores.prioridadBaja,
  media: colores.prioridadMedia,
  alta: colores.prioridadAlta,
};

/** Opciones de prioridad en el orden en que se muestran. */
const OPCIONES_PRIORIDAD: Prioridad[] = ['baja', 'media', 'alta'];

/**
 * Muestra la explicación de un permiso ANTES de pedirlo y
 * devuelve true solo si el usuario acepta ver la solicitud
 * del sistema. Es la pieza de "permiso con contexto": sin
 * este paso, el sistema pediría el permiso de sorpresa.
 */
function mostrarExplicacionPermiso(explicacion: ExplicacionPermiso): Promise<boolean> {
  return new Promise((resolver) => {
    Alert.alert(explicacion.titulo, explicacion.mensaje, [
      { text: 'Ahora no', style: 'cancel', onPress: () => resolver(false) },
      { text: explicacion.textoAceptar, onPress: () => resolver(true) },
    ]);
  });
}

interface PropiedadesFormulario {
  /** Tarea que se está editando, o null si se está creando una nueva. */
  tareaEnEdicion: Tarea | null;
  /** Se llama al guardar (sirve tanto para crear como para actualizar). */
  onGuardar: (datos: DatosTarea) => void;
  /** Se llama al cancelar la edición y volver a modo crear. */
  onCancelarEdicion: () => void;
}

export default function FormularioTarea({
  tareaEnEdicion,
  onGuardar,
  onCancelarEdicion,
}: PropiedadesFormulario) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<UbicacionTarea | null>(null);
  const [error, setError] = useState('');
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [camaraVisible, setCamaraVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const enEdicion = tareaEnEdicion !== null;

  /** Deja el formulario vacío y listo para una tarea nueva. */
  const limpiarFormulario = () => {
    setTitulo('');
    setDescripcion('');
    setPrioridad('media');
    setFotoUri(null);
    setUbicacion(null);
    setError('');
  };

  // Al entrar en modo edición, el formulario se llena con los
  // datos de la tarea elegida; al salir, queda vacío.
  useEffect(() => {
    if (tareaEnEdicion) {
      setTitulo(tareaEnEdicion.titulo);
      setDescripcion(tareaEnEdicion.descripcion);
      setPrioridad(tareaEnEdicion.prioridad);
      setFotoUri(tareaEnEdicion.fotoUri);
      setUbicacion(tareaEnEdicion.ubicacion);
      setError('');
    } else {
      limpiarFormulario();
    }
  }, [tareaEnEdicion]);

  // La regla de validación es del SERVICIO, no de este componente.
  const tituloValido = esTituloValido(titulo);

  /** Abre la cámara solo si el permiso está otorgado (con explicación previa). */
  const manejarTomarFoto = async () => {
    const permitido = await asegurarPermiso('camara', () =>
      mostrarExplicacionPermiso(EXPLICACION_PERMISO_CAMARA),
    );
    if (!permitido) {
      Alert.alert(
        'Sin permiso de cámara',
        'La tarea se guardará sin foto. Puedes otorgar el permiso desde los ajustes del teléfono.',
      );
      return;
    }
    setCamaraVisible(true);
  };

  /** Registra la ubicación actual del GPS en el borrador de la tarea. */
  const manejarRegistrarUbicacion = async () => {
    const permitido = await asegurarPermiso('ubicacion', () =>
      mostrarExplicacionPermiso(EXPLICACION_PERMISO_UBICACION),
    );
    if (!permitido) {
      Alert.alert(
        'Sin permiso de ubicación',
        'La tarea se guardará sin ubicación. Puedes otorgar el permiso desde los ajustes del teléfono.',
      );
      return;
    }
    setObteniendoUbicacion(true);
    const resultado = await obtenerUbicacionActual();
    setObteniendoUbicacion(false);
    if (resultado.ok) {
      setUbicacion(resultado.ubicacion);
    } else {
      Alert.alert('Ubicación no disponible', resultado.mensaje);
    }
  };

  const manejarGuardar = async () => {
    if (!tituloValido) {
      // El mensaje también viene del servicio: un solo lugar lo define.
      setError(validarTitulo(titulo));
      return;
    }
    if (guardando) return;
    setGuardando(true);

    let ubicacionFinal = ubicacion;
    // Al CREAR (no al editar), si todavía no hay ubicación y
    // el permiso YA está otorgado, se intenta registrar el GPS
    // automáticamente, con una espera corta (3 s): guardar
    // nunca debe sorprender con una solicitud de permiso ni
    // quedarse esperando al GPS.
    if (!enEdicion && ubicacionFinal === null) {
      const estado = await verificarPermisoUbicacion();
      if (estado === 'otorgado') {
        const resultado = await obtenerUbicacionActual(3000);
        if (resultado.ok) ubicacionFinal = resultado.ubicacion;
      }
    }

    onGuardar({ titulo, descripcion, prioridad, fotoUri, ubicacion: ubicacionFinal });
    // El formulario se limpia después de agregar (así queda listo para la siguiente tarea).
    limpiarFormulario();
    setGuardando(false);
  };

  return (
    <>
      <View style={estilos.tarjeta}>
        <View style={estilos.filaTitulo}>
          <Ionicons
            name={enEdicion ? 'create-outline' : 'add-circle-outline'}
            size={20}
            color={colores.primario}
          />
          <Text style={estilos.tituloTarjeta}>{enEdicion ? 'Editar tarea' : 'Nueva tarea'}</Text>
        </View>

        <View style={estilos.filaEtiqueta}>
          <Ionicons name="text-outline" size={15} color={colores.texto} />
          <Text style={estilos.etiqueta}>Título *</Text>
        </View>
        <TextInput
          style={estilos.input}
          placeholder="Ej.: Estudiar para la prueba"
          placeholderTextColor={colores.textoSecundario}
          value={titulo}
          maxLength={LARGO_MAX_TITULO}
          onChangeText={(texto) => {
            setTitulo(texto);
            if (error) setError('');
          }}
          accessibilityLabel="Título de la tarea"
          returnKeyType="next"
        />
        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <View style={estilos.filaEtiqueta}>
          <Ionicons name="document-text-outline" size={15} color={colores.texto} />
          <Text style={estilos.etiqueta}>Descripción</Text>
        </View>
        <TextInput
          style={[estilos.input, estilos.inputDescripcion]}
          placeholder="Detalle opcional de la tarea"
          placeholderTextColor={colores.textoSecundario}
          value={descripcion}
          maxLength={LARGO_MAX_DESCRIPCION}
          onChangeText={setDescripcion}
          accessibilityLabel="Descripción de la tarea"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={estilos.filaEtiqueta}>
          <Ionicons name="flag-outline" size={15} color={colores.texto} />
          <Text style={estilos.etiqueta}>Prioridad</Text>
        </View>
        <View style={estilos.filaPrioridad}>
          {OPCIONES_PRIORIDAD.map((opcion) => {
            const activa = opcion === prioridad;
            const color = COLORES_PRIORIDAD[opcion];
            return (
              <Pressable
                key={opcion}
                style={[
                  estilos.chipPrioridad,
                  activa
                    ? { backgroundColor: color, borderColor: color }
                    : estilos.chipPrioridadInactivo,
                ]}
                onPress={() => setPrioridad(opcion)}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={`Prioridad ${ETIQUETAS_PRIORIDAD[opcion]}`}
              >
                <Text
                  style={[estilos.textoChip, activa ? estilos.textoChipActivo : { color }]}
                >
                  {ETIQUETAS_PRIORIDAD[opcion]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={estilos.filaEtiqueta}>
          <Ionicons name="camera-outline" size={15} color={colores.texto} />
          <Text style={estilos.etiqueta}>Foto (opcional)</Text>
        </View>
        {fotoUri ? (
          <>
            <Image
              source={{ uri: fotoUri }}
              style={estilos.vistaPrevia}
              accessibilityLabel="Vista previa de la foto adjunta"
            />
            <Pressable
              style={estilos.botonSecundario}
              onPress={() => setFotoUri(null)}
              accessibilityRole="button"
              accessibilityLabel="Quitar foto"
            >
              <Ionicons name="trash-outline" size={16} color={colores.peligro} />
              <Text style={estilos.textoBotonSecundarioPeligro}>Quitar foto</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={estilos.botonSecundario}
            onPress={() => {
              void manejarTomarFoto();
            }}
            accessibilityRole="button"
            accessibilityLabel="Tomar foto con la cámara"
          >
            <Ionicons name="camera-outline" size={17} color={colores.primario} />
            <Text style={estilos.textoBotonSecundario}>Tomar foto</Text>
          </Pressable>
        )}

        <View style={estilos.filaEtiqueta}>
          <Ionicons name="location-outline" size={15} color={colores.texto} />
          <Text style={estilos.etiqueta}>Ubicación (opcional)</Text>
        </View>
        {ubicacion ? (
          <View style={estilos.filaUbicacion}>
            <Ionicons name="location" size={16} color={colores.primario} />
            <Text style={estilos.textoUbicacion}>{textoUbicacion(ubicacion)}</Text>
            <Pressable
              onPress={() => setUbicacion(null)}
              accessibilityRole="button"
              accessibilityLabel="Quitar ubicación"
              hitSlop={6}
            >
              <Text style={estilos.textoQuitar}>Quitar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={estilos.botonSecundario}
            onPress={() => {
              void manejarRegistrarUbicacion();
            }}
            disabled={obteniendoUbicacion}
            accessibilityRole="button"
            accessibilityLabel="Registrar ubicación actual"
          >
            {obteniendoUbicacion ? (
              <ActivityIndicator size="small" color={colores.primario} />
            ) : (
              <Ionicons name="locate-outline" size={17} color={colores.primario} />
            )}
            <Text style={estilos.textoBotonSecundario}>
              {obteniendoUbicacion ? 'Obteniendo ubicación…' : 'Registrar ubicación'}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            estilos.botonGuardar,
            !tituloValido && estilos.botonDeshabilitado,
            pressed && tituloValido && estilos.botonPresionado,
          ]}
          onPress={() => {
            void manejarGuardar();
          }}
          accessibilityRole="button"
          accessibilityLabel={enEdicion ? 'Actualizar tarea' : 'Guardar tarea'}
          accessibilityState={{ disabled: !tituloValido }}
        >
          {guardando ? (
            <ActivityIndicator size="small" color={colores.sobrePrimario} />
          ) : (
            <Ionicons
              name={enEdicion ? 'checkmark-done-outline' : 'save-outline'}
              size={19}
              color={colores.sobrePrimario}
            />
          )}
          <Text style={estilos.textoBotonGuardar}>
            {guardando ? 'Guardando…' : enEdicion ? 'Actualizar tarea' : 'Guardar tarea'}
          </Text>
        </Pressable>

        {enEdicion ? (
          <Pressable
            style={estilos.botonCancelar}
            onPress={onCancelarEdicion}
            accessibilityRole="button"
            accessibilityLabel="Cancelar edición"
          >
            <Ionicons name="close-outline" size={18} color={colores.peligro} />
            <Text style={estilos.textoBotonCancelar}>Cancelar</Text>
          </Pressable>
        ) : null}
      </View>

      {/* La cámara es una pantalla modal: al tomar la foto, la imagen vuelve aquí. */}
      <PantallaCamara
        visible={camaraVisible}
        onFotoTomada={(uri) => {
          setFotoUri(uri);
          setCamaraVisible(false);
        }}
        onCancelar={() => setCamaraVisible(false)}
      />
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radios.xl,
    padding: espaciados.md,
    marginBottom: espaciados.md,
    // Sombra suave: diferencia el formulario del fondo (jerarquía).
    shadowColor: colores.sombra,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    marginBottom: espaciados.sm,
  },
  tituloTarjeta: {
    color: colores.primarioOscuro,
    fontSize: tipografia.subtitulo,
    fontWeight: 'bold',
  },
  filaEtiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    marginTop: espaciados.sm,
    marginBottom: espaciados.xs,
  },
  etiqueta: {
    color: colores.texto,
    fontSize: tipografia.pequena,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colores.fondoInput,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radios.md,
    paddingHorizontal: espaciados.md,
    paddingVertical: espaciados.sm + 4,
    fontSize: tipografia.base,
    color: colores.texto,
  },
  inputDescripcion: {
    minHeight: 72,
  },
  error: {
    color: colores.peligro,
    fontSize: tipografia.mini,
    marginTop: espaciados.xs,
  },
  filaPrioridad: {
    flexDirection: 'row',
    gap: espaciados.sm,
  },
  chipPrioridad: {
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.md,
    paddingVertical: espaciados.sm + 2,
    borderWidth: 1,
  },
  chipPrioridadInactivo: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
  },
  textoChip: {
    fontSize: tipografia.pequena,
    fontWeight: '600',
  },
  textoChipActivo: {
    color: colores.sobrePrimario,
  },
  vistaPrevia: {
    width: '100%',
    height: 160,
    borderRadius: radios.lg,
  },
  botonSecundario: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    borderColor: colores.primario,
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingVertical: espaciados.sm + 2,
    marginTop: espaciados.xs,
  },
  textoBotonSecundario: {
    color: colores.primario,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
  textoBotonSecundarioPeligro: {
    color: colores.peligro,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
  filaUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciados.xs + 2,
    backgroundColor: colores.fondoInput,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radios.md,
    paddingHorizontal: espaciados.md,
    paddingVertical: espaciados.sm + 2,
  },
  textoUbicacion: {
    flex: 1,
    color: colores.texto,
    fontSize: tipografia.pequena,
  },
  textoQuitar: {
    color: colores.peligro,
    fontSize: tipografia.pequena,
    fontWeight: '700',
  },
  botonGuardar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciados.xs + 2,
    backgroundColor: colores.primario,
    borderRadius: radios.pildora,
    paddingVertical: espaciados.md - 2,
    alignItems: 'center',
    marginTop: espaciados.md,
  },
  botonDeshabilitado: {
    opacity: 0.45,
  },
  botonPresionado: {
    opacity: 0.85,
  },
  textoBotonGuardar: {
    color: colores.sobrePrimario,
    fontSize: tipografia.base,
    fontWeight: 'bold',
  },
  botonCancelar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciados.xs + 2,
    paddingVertical: espaciados.sm + 2,
    alignItems: 'center',
    marginTop: espaciados.xs,
  },
  textoBotonCancelar: {
    color: colores.peligro,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
});
