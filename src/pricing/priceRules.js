// src/pricing/priceRules.js
// Reglas de precios puras (sin Express, sin Twilio)

export const priceRules = {
  lona: ({ areaM2 }) => {
    const options = {
      "13oz": {
        label: "Lona 13 oz (económica)",
        minM2: 120,
        maxM2: 180,
        notes: "La más usada para fachadas y promociones estándar."
      },
      "18oz": {
        label: "Lona 18 oz (alta resistencia)",
        minM2: 180,
        maxM2: 260,
        notes: "Mayor durabilidad al sol y la lluvia."
      }
    };

    return {
      options: {
        "13oz": {
          label: options["13oz"].label,
          min: Math.round(options["13oz"].minM2 * areaM2),
          max: Math.round(options["13oz"].maxM2 * areaM2),
          notes: options["13oz"].notes
        },
        "18oz": {
          label: options["18oz"].label,
          min: Math.round(options["18oz"].minM2 * areaM2),
          max: Math.round(options["18oz"].maxM2 * areaM2),
          notes: options["18oz"].notes
        }
      },
      commonNotes:
        "Incluye impresión en alta resolución. Ojillos y refuerzo perimetral se cotizan según necesidad."
    };
  },

  toldo: ({ areaM2, tipo }) => {
    const base =
      tipo === "fijo"
        ? { min: 1200, max: 2200 }
        : { min: 700, max: 1300 };

    return {
      min: Math.round(base.min * areaM2),
      max: Math.round(base.max * areaM2),
      notes: "Estructura y anclajes pueden modificar el rango."
    };
  },

  rotulacion: ({ alcance }) => {
    const map = {
      parcial: { min: 2500, max: 6000 },
      completa: { min: 9000, max: 18000 },
      flotilla: { min: 2200, max: 5200 }
    };

    return map[alcance] || { min: 3000, max: 8000 };
  }
};
