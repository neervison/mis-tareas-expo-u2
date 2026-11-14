// ============================================================
// App.tsx — RAÍZ DE COMPOSICIÓN de la aplicación
// ------------------------------------------------------------
// Buena práctica aplicada en este archivo: App.tsx es SOLO el
// punto de entrada y la PUERTA DE SESIÓN. No contiene lógica
// de tareas, ni listas, ni estilos de pantalla: únicamente
// pregunta al hook useSesion si hay alguien conectado y
// MUESTRA la pantalla que corresponde:
// - Sin sesión → PantallaAutenticacion (entrar o registrarse).
// - Con sesión → PantallaTareas (la lista de ESE usuario).
// - Mientras busca la sesión guardada → un indicador de carga.
// Además envuelve todo en SafeAreaProvider: las pantallas
// usan SafeAreaView y el proveedor es obligatorio (sin él,
// el build web no arranca).
//
// Así, cada pieza tiene su lugar profesional:
// - Las pantallas completas viven en src/pantallas/.
// - Los componentes reutilizables, en src/componentes/.
// - La lógica, en src/hooks/ y src/servicios/.
// - El modelo de datos, en src/modelos/.
//
// index.ts registra este componente con registerRootComponent
// para que Expo lo abra en Expo Go, en la web o en un emulador.
// ============================================================

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSesion } from './src/hooks/useSesion';
import PantallaAutenticacion from './src/pantallas/PantallaAutenticacion';
import PantallaTareas from './src/pantallas/PantallaTareas';
import { colores, espaciados, tipografia } from './src/tema';

export default function App() {
  const { sesion, cargandoSesion, entrar, registrar, salir } = useSesion();

  let contenido: React.ReactNode;
  if (cargandoSesion) {
    contenido = (
      <SafeAreaView style={[estilos.pantalla, estilos.centrado]}>
        <ActivityIndicator size="large" color={colores.primario} />
        <Text style={estilos.textoCargando}>Cargando…</Text>
      </SafeAreaView>
    );
  } else if (!sesion) {
    contenido = <PantallaAutenticacion onEntrar={entrar} onRegistrar={registrar} />;
  } else {
    contenido = (
      <PantallaTareas
        sesion={sesion}
        onSalir={() => {
          void salir();
        }}
      />
    );
  }

  return <SafeAreaProvider>{contenido}</SafeAreaProvider>;
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
});
