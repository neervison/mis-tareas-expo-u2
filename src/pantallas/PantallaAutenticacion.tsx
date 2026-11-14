// ============================================================
// PANTALLA: PantallaAutenticacion (entrada y registro)
// ------------------------------------------------------------
// Es la primera pantalla que ve quien abre la app sin sesión:
// un solo formulario con DOS MODOS (entrar / registrarse) que
// comparten los campos. Es PRESENTACIONAL con estado local:
// valida los datos con el SERVICIO de autenticación
// (validarCredenciales) y avisa hacia arriba con onEntrar u
// onRegistrar; el registro, el hash y la sesión los hace el
// hook useSesion, no esta pantalla.
//
// La clave se escribe oculta (secureTextEntry) y nunca se
// muestra ni se guarda tal cual: el servicio solo guarda su
// hash con sal (ver src/servicios/autenticacion.ts).
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LARGO_MAX_CLAVE, LARGO_MAX_NOMBRE_USUARIO } from '../constantes/limites';
import Mascota from '../componentes/Mascota';
import { Sesion } from '../modelos/usuario';
import { validarCredenciales } from '../servicios/autenticacion';
import { colores, espaciados, radios, tipografia } from '../tema';

/** Modo del formulario: entrar con una cuenta o crear una nueva. */
type ModoAutenticacion = 'entrar' | 'registrar';

interface PropiedadesAutenticacion {
  /** Inicia sesión; falla si los datos no corresponden a una cuenta. */
  onEntrar: (nombre: string, clave: string) => Promise<Sesion>;
  /** Registra un usuario nuevo; falla si el nombre ya está en uso. */
  onRegistrar: (nombre: string, clave: string) => Promise<Sesion>;
}

export default function PantallaAutenticacion({
  onEntrar,
  onRegistrar,
}: PropiedadesAutenticacion) {
  const [modo, setModo] = useState<ModoAutenticacion>('entrar');
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  const enModoEntrar = modo === 'entrar';

  /** Cambia de modo limpiando el error (los campos se conservan). */
  const cambiarModo = (nuevoModo: ModoAutenticacion) => {
    setModo(nuevoModo);
    setError('');
  };

  const manejarAccion = async () => {
    // La regla de validación es del SERVICIO, no de esta pantalla.
    const problema = validarCredenciales(nombre, clave);
    if (problema !== '') {
      setError(problema);
      return;
    }
    setProcesando(true);
    setError('');
    try {
      if (enModoEntrar) {
        await onEntrar(nombre, clave);
      } else {
        await onRegistrar(nombre, clave);
      }
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={estilos.contenido}>
          {/* La mascota saluda en su insignia circular sobre el título */}
          <Mascota progreso={0} totalTareas={0} tamano={124} />
          <Text style={estilos.titulo}>Mis Tareas</Text>
          <Text style={estilos.subtitulo}>
            Tus tareas, con foto, ubicación y sincronización.
          </Text>

          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>
              {enModoEntrar ? 'Iniciar sesión' : 'Crear cuenta'}
            </Text>

            <View style={estilos.filaEtiqueta}>
              <Ionicons name="person-outline" size={15} color={colores.texto} />
              <Text style={estilos.etiqueta}>Nombre de usuario</Text>
            </View>
            <TextInput
              style={estilos.input}
              placeholder="Ej.: neervison"
              placeholderTextColor={colores.textoSecundario}
              value={nombre}
              maxLength={LARGO_MAX_NOMBRE_USUARIO}
              onChangeText={(texto) => {
                setNombre(texto);
                if (error) setError('');
              }}
              accessibilityLabel="Nombre de usuario"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <View style={estilos.filaEtiqueta}>
              <Ionicons name="lock-closed-outline" size={15} color={colores.texto} />
              <Text style={estilos.etiqueta}>Clave</Text>
            </View>
            <TextInput
              style={estilos.input}
              placeholder="Tu clave"
              placeholderTextColor={colores.textoSecundario}
              value={clave}
              maxLength={LARGO_MAX_CLAVE}
              onChangeText={(texto) => {
                setClave(texto);
                if (error) setError('');
              }}
              accessibilityLabel="Clave"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => {
                void manejarAccion();
              }}
            />
            {error ? <Text style={estilos.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                estilos.botonAccion,
                pressed && estilos.botonPresionado,
              ]}
              onPress={() => {
                void manejarAccion();
              }}
              disabled={procesando}
              accessibilityRole="button"
              accessibilityLabel={enModoEntrar ? 'Iniciar sesión' : 'Crear cuenta'}
            >
              {procesando ? (
                <ActivityIndicator size="small" color={colores.sobrePrimario} />
              ) : (
                <Ionicons
                  name={enModoEntrar ? 'log-in-outline' : 'person-add-outline'}
                  size={19}
                  color={colores.sobrePrimario}
                />
              )}
              <Text style={estilos.textoBotonAccion}>
                {enModoEntrar ? 'Iniciar sesión' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <Pressable
              style={estilos.botonCambiarModo}
              onPress={() => cambiarModo(enModoEntrar ? 'registrar' : 'entrar')}
              accessibilityRole="button"
              accessibilityLabel={
                enModoEntrar ? 'Cambiar a crear cuenta' : 'Cambiar a iniciar sesión'
              }
            >
              <Text style={estilos.textoCambiarModo}>
                {enModoEntrar
                  ? '¿No tienes cuenta? Regístrate'
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </Text>
            </Pressable>
          </View>

          <Text style={estilos.nota}>
            Las cuentas se guardan en este dispositivo y cada usuario ve solo sus tareas.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  flex: {
    flex: 1,
  },
  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciados.md,
  },
  titulo: {
    color: colores.primarioOscuro,
    fontSize: tipografia.display,
    fontWeight: 'bold',
    marginTop: espaciados.sm,
  },
  subtitulo: {
    color: colores.textoSecundario,
    fontSize: tipografia.mediana,
    textAlign: 'center',
    marginTop: espaciados.xs,
    marginBottom: espaciados.lg,
  },
  tarjeta: {
    width: '100%',
    backgroundColor: colores.superficie,
    borderRadius: radios.xl,
    padding: espaciados.md,
    shadowColor: colores.sombra,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tituloTarjeta: {
    color: colores.primarioOscuro,
    fontSize: tipografia.subtitulo,
    fontWeight: 'bold',
    marginBottom: espaciados.sm,
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
  error: {
    color: colores.peligro,
    fontSize: tipografia.mini,
    marginTop: espaciados.xs,
  },
  botonAccion: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaciados.xs + 2,
    backgroundColor: colores.primario,
    borderRadius: radios.pildora,
    paddingVertical: espaciados.md - 2,
    alignItems: 'center',
    marginTop: espaciados.md,
  },
  botonPresionado: {
    opacity: 0.85,
  },
  textoBotonAccion: {
    color: colores.sobrePrimario,
    fontSize: tipografia.base,
    fontWeight: 'bold',
  },
  botonCambiarModo: {
    alignItems: 'center',
    paddingVertical: espaciados.sm + 2,
    marginTop: espaciados.xs,
  },
  textoCambiarModo: {
    color: colores.primario,
    fontSize: tipografia.mediana,
    fontWeight: '600',
  },
  nota: {
    color: colores.textoSecundario,
    fontSize: tipografia.pequena,
    textAlign: 'center',
    marginTop: espaciados.md,
    paddingHorizontal: espaciados.md,
  },
});
