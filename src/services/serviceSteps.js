// ===========================================================
// Limitless AI — Service Steps Engine (FULL VERSION)
// Maneja el flujo paso a paso por servicio SIN romper estados
// ===========================================================

export const serviceSteps = {
  // =========================
  // LONAS PUBLICITARIAS
  // =========================
  lona: {
    uso: {
      question:
        "Perfecto 👌 ¿La lona sería para fachada, evento o promoción temporal?",
      next: "medidas",
    },

    medidas: {
      question:
        "Gracias 🙌 ¿Podrías compartirme las medidas aproximadas de la lona?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Con esas medidas puedo recomendarte una lona reforzada de 18 oz con alta resistencia al sol y la lluvia, ideal para exteriores. En el siguiente mensaje te explico opciones de acabado y tiempos de entrega.",
      next: null,
    },
  },

  // =========================
  // TOLDOS / CANOPY
  // =========================
  toldo: {
    tipo: {
      question:
        "Perfecto 👌 ¿El toldo lo necesitas fijo para fachada o desmontable tipo canopy?",
      next: "medidas",
    },

    medidas: {
      question:
        "Gracias 🙌 ¿Tienes medidas aproximadas del ancho y la salida del toldo?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Con esas medidas podemos trabajar un toldo con estructura PTR y lona personalizada, ideal para protección solar y presencia profesional.",
      next: null,
    },
  },

  // =========================
  // ROTULACIÓN VEHICULAR
  // =========================
  rotulacion: {
    tipo_vehiculo: {
      question:
        "Perfecto 👌 ¿La rotulación es para un vehículo particular, comercial o una flotilla?",
      next: "diseno",
    },

    diseno: {
      question:
        "Gracias 🙌 ¿Cuentas con un diseño o logotipo, o deseas que lo desarrollemos?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 La rotulación con vinil polimérico y laminado UV ofrece alta durabilidad y gran impacto visual. Puedo explicarte las opciones según el tipo de vehículo.",
      next: null,
    },
  },

  // =========================
  // LETREROS / CAJAS LUMINOSAS
  // =========================
  letrero: {
    tipo_letrero: {
      question:
        "Perfecto 👌 ¿Buscas un letrero iluminado, caja luminosa o letras 3D?",
      next: "ubicacion",
    },

    ubicacion: {
      question:
        "Gracias 🙌 ¿El letrero sería para interior o fachada exterior?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Podemos trabajar iluminación LED de bajo consumo con materiales resistentes para una visibilidad profesional día y noche.",
      next: null,
    },
  },

  // =========================
  // STICKERS / CALCOMANÍAS
  // =========================
  stickers: {
    cantidad: {
      question:
        "Perfecto 👌 ¿Qué cantidad aproximada de stickers necesitas?",
      next: "tamano",
    },

    tamano: {
      question:
        "Gracias 🙌 ¿Qué tamaño aproximado te gustaría para los stickers?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Podemos producir stickers en vinil resistente al agua y al sol, con acabado brillante o mate según tu marca.",
      next: null,
    },
  },

  // =========================
  // ESTAMPADOS (PLAYERAS / TAZAS)
  // =========================
  estampados: {
    producto: {
      question:
        "Perfecto 👌 ¿Buscas estampar playeras, tazas o ambos?",
      next: "cantidad",
    },

    cantidad: {
      question:
        "Gracias 🙌 ¿Cuántas piezas deseas personalizar?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Podemos trabajar sublimado, vinil textil o DTF según el producto y el diseño que tengas en mente.",
      next: null,
    },
  },

  // =========================
  // POLARIZADOS
  // =========================
  polarizado: {
    tipo: {
      question:
        "Perfecto 👌 ¿El polarizado es para vehículo o para ventanas de local/oficina?",
      next: "detalle",
    },

    detalle: {
      question:
        "Gracias 🙌 ¿Podrías indicarme marca y modelo del vehículo o el tipo de ventana?",
      next: "cierre",
    },

    cierre: {
      question:
        "Excelente 👍 Contamos con polarizado de control solar y seguridad, con protección UV y garantía profesional.",
      next: null,
    },
  },
};
