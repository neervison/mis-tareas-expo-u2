// ============================================================
// TEMA VISUAL DE LA APP: paleta de colores
// ------------------------------------------------------------
// Patrón aplicado: FUENTE ÚNICA DE VERDAD para el diseño.
// Todos los componentes importan estos valores en vez de
// repetir colores sueltos. Si quieres cambiar el color
// principal de la app, lo cambias SOLO aquí.
//
// Este archivo es parte del TEMA (carpeta src/tema/):
// - colores.ts    → la paleta (este archivo)
// - espaciado.ts  → tokens de espaciados y radios
// - tipografia.ts → tokens de tamaños de fuente
// - index.ts      → re-exporta todo para importar desde '../tema'
//
// La paleta nace de LA MASCOTA (assets/mascota.png): el
// verde azulado profundo de su cuerpo es el color primario,
// el crema de su fondo es el fondo de la app y de su
// insignia, y el celeste claro de su portapapeles es el
// acento suave. Así la interfaz y el personaje se ven como
// una sola pieza, no como dos diseños pegados.
//
// Principios de diseño UI aplicados:
// - CONTRASTE: textos oscuros sobre fondos claros (nivel AA)
//   y blanco sobre el primario (más de 6:1).
// - El rojo se reserva para acciones destructivas (eliminar) y
//   el verde para el estado completado: color con significado.
// ============================================================

export const colores = {
  /** Fondo general de la pantalla: crema cálido, como el fondo de la mascota. */
  fondo: '#FBF6EC',
  /** Fondo de tarjetas y del formulario. */
  superficie: '#FFFFFF',
  /**
   * Color principal: encabezado, botón guardar y acentos.
   * Es el verde azulado del cuerpo de la mascota.
   */
  primario: '#13678F',
  /** Variante oscura del primario (títulos sobre fondo claro). */
  primarioOscuro: '#0D4A68',
  /**
   * Variante clara del primario: segunda capa del degradado del
   * encabezado y detalles decorativos sobre el color principal.
   */
  primarioClaro: '#2E86AD',
  /** Pista (fondo) de la barra de progreso sobre tarjetas claras. */
  pistaProgreso: '#DCEBF3',
  /** Fondo crema de la insignia circular de la mascota (el fondo de su imagen). */
  fondoCrema: '#FEEACA',
  /** Texto principal (contraste alto sobre blanco y sobre crema). */
  texto: '#22333C',
  /** Texto secundario: descripciones, contadores, ayudas. */
  textoSecundario: '#5A6E78',
  /** Bordes suaves de tarjetas e inputs, en tono arena. */
  borde: '#E6DECB',
  /** Fondo del input mientras se escribe. */
  fondoInput: '#FAF5EA',
  /** Acciones destructivas: botón eliminar. */
  peligro: '#B91C1C',
  /** Estado completado: check y acentos de éxito. */
  exito: '#2E7D5B',
  /** Blanco puro: textos sobre el color primario. */
  sobrePrimario: '#FFFFFF',
  /** Celeste claro: subtítulo sobre el encabezado primario. */
  sobrePrimarioSuave: '#DCEBF3',
  /** Color de las sombras suaves de las tarjetas. */
  sombra: '#1F2A30',
  /** Avisos: "pendiente de sincronizar" y estados que esperan acción. */
  aviso: '#B45309',
  /** Fondo suave de las etiquetas de aviso. */
  fondoAviso: '#FEF3C7',
  /** Prioridad alta: mismo rojo de las acciones importantes. */
  prioridadAlta: '#B91C1C',
  /** Prioridad media: ámbar, entre lo urgente y lo tranquilo. */
  prioridadMedia: '#B45309',
  /** Prioridad baja: verde tranquilo, igual que lo completado. */
  prioridadBaja: '#2E7D5B',
};
