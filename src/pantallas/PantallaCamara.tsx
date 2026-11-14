// ============================================================
// PANTALLA: PantallaCamara (visor de cámara en modal)
// ------------------------------------------------------------
// Es la pantalla modal que muestra el visor de la cámara
// (CameraView de expo-camera) con un botón grande para
// capturar. Es PRESENTACIONAL: no decide permisos ni guarda
// nada; la TOMA de la foto la hace el servicio
// src/servicios/foto.ts con la referencia del visor, y el
// resultado vuelve al formulario con onFotoTomada.
//
// El permiso ya se gestionó en el formulario (con
// explicación previa), pero el visor igual verifica el
// estado con useCameraPermissions: si el permiso se revocó
// entremedio, muestra cómo otorgarlo en vez de una pantalla
// negra sin explicación.
// ============================================================

import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { capturarFoto } from '../servicios/foto';
import { colores, espaciados, radios, tipografia } from '../tema';

interface PropiedadesCamara {
  /** true = el modal está abierto mostrando el visor. */
  visible: boolean;
  /** Se llama con la foto capturada (data URI lista para guardar). */
  onFotoTomada: (fotoUri: string) => void;
  /** Se llama al cerrar sin tomar foto. */
  onCancelar: () => void;
}

export default function PantallaCamara({
  visible,
  onFotoTomada,
  onCancelar,
}: PropiedadesCamara) {
  // Referencia al visor: es lo que el servicio de foto usa
  // para tomar la imagen (inyección de dependencias).
  const refCamara = useRef<CameraView>(null);
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [capturando, setCapturando] = useState(false);

  /** Toma la foto con el servicio y devuelve el resultado al formulario. */
  const manejarCapturar = async () => {
    const camara = refCamara.current;
    if (!camara || capturando) return;
    setCapturando(true);
    const resultado = await capturarFoto(camara);
    setCapturando(false);
    if (resultado.ok) {
      onFotoTomada(resultado.fotoUri);
    } else {
      Alert.alert('No se pudo tomar la foto', resultado.mensaje);
    }
  };

  const permisoOtorgado = permiso?.status === 'granted';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      <View style={estilos.pantalla}>
        {!permisoOtorgado ? (
          <View style={estilos.centrado}>
            <Text style={estilos.textoPermiso}>
              Para adjuntar una foto, la app necesita permiso para usar la cámara.
            </Text>
            <Pressable
              style={estilos.botonPermiso}
              onPress={() => {
                void solicitarPermiso();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dar permiso de cámara"
            >
              <Text style={estilos.textoBotonPermiso}>Dar permiso de cámara</Text>
            </Pressable>
            <Pressable
              style={estilos.botonVolver}
              onPress={onCancelar}
              accessibilityRole="button"
              accessibilityLabel="Volver sin tomar foto"
            >
              <Text style={estilos.textoBotonVolver}>Volver</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView ref={refCamara} style={estilos.camara} facing="back" />
            <Pressable
              style={estilos.botonCerrar}
              onPress={onCancelar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar cámara sin tomar foto"
              hitSlop={8}
            >
              <Text style={estilos.textoCerrar}>✕</Text>
            </Pressable>
            <View style={estilos.barraInferior}>
              <Pressable
                style={estilos.botonCaptura}
                onPress={() => {
                  void manejarCapturar();
                }}
                disabled={capturando}
                accessibilityRole="button"
                accessibilityLabel="Tomar foto"
              >
                {capturando ? (
                  <ActivityIndicator size="large" color={colores.sobrePrimario} />
                ) : (
                  <View style={estilos.circuloCaptura} />
                )}
              </Pressable>
              <Text style={estilos.ayudaCaptura}>Toca el botón para tomar la foto</Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camara: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciados.lg,
    gap: espaciados.md,
  },
  textoPermiso: {
    color: colores.sobrePrimario,
    fontSize: tipografia.base,
    textAlign: 'center',
  },
  botonPermiso: {
    backgroundColor: colores.primario,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciados.lg,
    paddingVertical: espaciados.md - 2,
  },
  textoBotonPermiso: {
    color: colores.sobrePrimario,
    fontSize: tipografia.base,
    fontWeight: 'bold',
  },
  botonVolver: {
    paddingHorizontal: espaciados.lg,
    paddingVertical: espaciados.sm + 2,
  },
  textoBotonVolver: {
    color: colores.sobrePrimario,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
  botonCerrar: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCerrar: {
    color: colores.sobrePrimario,
    fontSize: tipografia.subtitulo,
    fontWeight: 'bold',
  },
  barraInferior: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: espaciados.sm,
  },
  botonCaptura: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colores.sobrePrimario,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  circuloCaptura: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colores.sobrePrimario,
  },
  ayudaCaptura: {
    color: colores.sobrePrimario,
    fontSize: tipografia.pequena,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: espaciados.sm + 2,
    paddingVertical: espaciados.xs,
    borderRadius: radios.md,
  },
});
