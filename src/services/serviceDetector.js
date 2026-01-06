// src/services/serviceDetector.js

export function detectService(text = "") {
  const msg = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos

  // ======================
  // LONAS
  // ======================
  if (msg.includes("lona") || msg.includes("banner")) {
    return {
      service: "lona",
      step: "uso", // ⚠️ ESTE STEP DEBE EXISTIR EN serviceSteps
    };
  }

  // ======================
  // TOLDOS
  // ======================
  if (msg.includes("toldo") || msg.includes("canopy")) {
    return {
      service: "toldo",
      step: "tipo",
    };
  }

  // ======================
  // ROTULACIÓN VEHICULAR
  // ======================
  if (
    msg.includes("rotul") ||
    msg.includes("vinil") ||
    msg.includes("vehiculo") ||
    msg.includes("carro") ||
    msg.includes("camioneta")
  ) {
    return {
      service: "rotulacion",
      step: "tipo_vehiculo",
    };
  }

  // ======================
  // LETREROS / CAJAS
  // ======================
  if (
    msg.includes("letrero") ||
    msg.includes("caja") ||
    msg.includes("luminosa") ||
    msg.includes("letras")
  ) {
    return {
      service: "letrero",
      step: "ubicacion",
    };
  }

  // ======================
  // STICKERS
  // ======================
  if (
    msg.includes("sticker") ||
    msg.includes("calcomania") ||
    msg.includes("etiqueta")
  ) {
    return {
      service: "stickers",
      step: "cantidad",
    };
  }

  // ======================
  // ESTAMPADOS
  // ======================
  if (
    msg.includes("playera") ||
    msg.includes("camiseta") ||
    msg.includes("taza") ||
    msg.includes("estampado")
  ) {
    return {
      service: "estampados",
      step: "producto",
    };
  }

  // ======================
  // POLARIZADO
  // ======================
  if (msg.includes("polarizado")) {
    return {
      service: "polarizado",
      step: "tipo",
    };
  }

  return null;
}
