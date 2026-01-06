// Rangos base en MXN (ajusta a tu mercado)
export const priceRules = {
  lona: ({ areaM2 }) => {
    const options = {
      basic13oz: {
        label: "Lona 13 oz (económica)",
        minM2: 120,
        maxM2: 180,
        description: "Ideal para fachadas y promociones estándar."
      },
      premium18oz: {
        label: "Lona 18 oz (alta resistencia)",
        minM2: 180,
        maxM2: 260,
        description: "Mayor durabilidad, recomendada para exteriores prolongados."
      }
    };

    return {
      options: {
        "13oz": {
          label: options.basic13oz.label,
          min: Math.round(options.basic13oz.minM2 * areaM2),
          max: Math.round(options.basic13oz.maxM2 * areaM2),
          notes: options.basic13oz.description
        },
        "18oz": {
          label: options.premium18oz.label,
          min: Math.round(options.premium18oz.minM2 * areaM2),
          max: Math.round(options.premium18oz.maxM2 * areaM2),
          notes: options.premium18oz.description
        }
      },
      commonNotes:
        "Incluye impresión alta resolución. Ojillos y refuerzo perimetral se cotizan según necesidad."
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
      notes: "Estructura y anclajes pueden modificar el rango.",
    };
  },

  rotulacion: ({ alcance }) => {
    const map = {
      parcial: { min: 2500, max: 6000 },
      completa: { min: 9000, max: 18000 },
      flotilla: { min: 2200, max: 5200 },
    };

    return map[alcance] || { min: 3000, max: 8000 };
  },

  letrero: ({ tipo }) => {
    const map = {
      lona: { min: 1800, max: 4500 },
      caja: { min: 4200, max: 9800 },
      letras: { min: 6500, max: 16000 },
    };
    return map[tipo] || { min: 2500, max: 7000 };
  },

  stickers: ({ cantidad }) => {
    if (cantidad >= 1000) return { min: 900, max: 1800 };
    if (cantidad >= 500) return { min: 600, max: 1200 };
    return { min: 300, max: 700 };
  },

  estampados: ({ cantidad }) => {
    if (cantidad >= 50) return { min: 250, max: 420 };
    if (cantidad >= 10) return { min: 300, max: 520 };
    return { min: 350, max: 650 };
  },

  polarizado: ({ tipo }) => {
    const map = {
      vehiculo: { min: 1800, max: 4200 },
      local: { min: 1200, max: 3800 },
    };
    return map[tipo] || { min: 1500, max: 4000 };
  },
};
