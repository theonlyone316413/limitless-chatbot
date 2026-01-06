/**
 * Define los pasos por servicio
 * Cada servicio tiene su propio flujo conversacional
 */

export const serviceSteps = {
  lona: [
    "uso",
    "medidas",
    "material",
    "diseno",
    "cotizacion",
  ],

  toldo: [
    "tipo",
    "medidas",
    "estructura",
    "diseno",
    "cotizacion",
  ],

  rotulacion: [
    "tipo_vehiculo",
    "cantidad",
    "diseno",
    "instalacion",
    "cotizacion",
  ],

  letrero: [
    "ubicacion",
    "medidas",
    "material",
    "iluminacion",
    "cotizacion",
  ],

  stickers: [
    "uso",
    "tamano",
    "cantidad",
    "acabado",
    "cotizacion",
  ],

  estampados: [
    "producto",
    "cantidad",
    "tecnica",
    "diseno",
    "cotizacion",
  ],

  polarizado: [
    "tipo",
    "vehiculo",
    "porcentaje",
    "cotizacion",
  ],
};

export function getNextStep(service, currentStep) {
  const steps = serviceSteps[service];
  if (!steps) return null;

  if (!currentStep) return steps[0];

  const index = steps.indexOf(currentStep);
  if (index === -1) return steps[0];

  return steps[index + 1] || "cotizacion";
}
