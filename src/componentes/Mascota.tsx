// ============================================================
// COMPONENTE: Mascota (el personaje que reacciona a tu avance)
// ------------------------------------------------------------
// La mascota de la app es una IMAGEN (assets/mascota.png): un
// personaje redondo verde azulado con un check blanco,
// saludando y con su portapapeles, sobre fondo crema. Se
// carga con require() (la forma estándar de Expo para
// recursos locales) y se muestra dentro de una INSIGNIA
// CIRCULAR: el fondo crema de la imagen queda recortado en
// círculo con un anillo blanco, así el crema se ve
// intencional —como una medalla— y no como un cuadrado
// pegado sobre la pantalla.
//
// ANIMACIÓN solo con Animated de React Native (sin librerías
// extra). La imagen es una sola, así que el estado se
// expresa con MOVIMIENTO, no con expresiones distintas:
// - FLOTACIÓN suave en loop (sube y baja 3 px, infinito):
//   la mascota siempre está viva y saludando.
// - SALTITO (spring en scale) cada vez que el % cambia.
// - CELEBRACIÓN al llegar a 100% con al menos 1 tarea: se
//   inclina de lado a lado (rotate ±8°) tres veces.
//
// La mascota REFUERZA el estado, nunca lo reemplaza: el
// porcentaje sigue escrito en la BarraProgreso y el resumen
// en el Encabezado, por eso va oculta para lectores de
// pantalla.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { colores } from '../tema';

/** La imagen de la mascota: recurso local cargado con require(). */
const IMAGEN_MASCOTA = require('../../assets/mascota.png');

interface PropiedadesMascota {
  /** Porcentaje de avance 0–100 (lo calcula la BarraProgreso igual). */
  progreso: number;
  /** Total de tareas: con 0 tareas nunca se celebra. */
  totalTareas: number;
  /** Tamaño del dibujo en px (cuadrado). */
  tamano?: number;
}

export default function Mascota({ progreso, totalTareas, tamano = 84 }: PropiedadesMascota) {
  // Celebrar solo existe con tareas y el 100% completado.
  const celebrando = totalTareas > 0 && progreso >= 100;

  // Animaciones persistentes: flotación (Y), saltito (escala) e
  // inclinación. Se crean UNA vez con el inicializador de
  // useState (patrón recomendado para valores Animated).
  const [flotacion] = useState(() => new Animated.Value(0));
  const [escala] = useState(() => new Animated.Value(1));
  const [inclinacion] = useState(() => new Animated.Value(0));

  // FLOTACIÓN en loop: sube y baja suave para siempre.
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flotacion, { toValue: -3, duration: 1400, useNativeDriver: true }),
        Animated.timing(flotacion, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [flotacion]);

  // SALTITO + CELEBRACIÓN cuando cambia el porcentaje.
  const esPrimeraVez = useRef(true);
  useEffect(() => {
    if (esPrimeraVez.current) {
      esPrimeraVez.current = false;
      return;
    }
    Animated.spring(escala, { toValue: 1.12, friction: 4, useNativeDriver: true }).start(() => {
      Animated.spring(escala, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    });
    if (celebrando) {
      Animated.sequence([
        Animated.timing(inclinacion, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(inclinacion, { toValue: -1, duration: 200, useNativeDriver: true }),
        Animated.timing(inclinacion, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(inclinacion, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [celebrando, escala, inclinacion, progreso]);

  const rotacion = inclinacion.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  // La insignia es un círculo del tamaño pedido: el anillo
  // blanco y la sombra suave la separan de cualquier fondo.
  const radio = tamano / 2;

  return (
    <Animated.View
      style={[
        estilos.insignia,
        {
          width: tamano,
          height: tamano,
          borderRadius: radio,
          transform: [{ translateY: flotacion }, { scale: escala }, { rotate: rotacion }],
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Image
        source={IMAGEN_MASCOTA}
        style={{ width: tamano, height: tamano, borderRadius: radio }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  insignia: {
    alignSelf: 'center',
    // El crema es el fondo de la propia imagen: el círculo lo
    // vuelve insignia y el anillo blanco lo despega del fondo.
    backgroundColor: colores.fondoCrema,
    borderWidth: 3,
    borderColor: colores.sobrePrimario,
    overflow: 'hidden',
    shadowColor: colores.sombra,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
