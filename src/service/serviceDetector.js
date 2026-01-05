export function detectService(text = "") {
  const msg = text.toLowerCase();

  if (msg.includes("lona") || msg.includes("banner")) {
    return { service: "lona", step: "uso" };
  }

  if (msg.includes("toldo") || msg.includes("canopy")) {
    return { service: "toldo", step: "tipo" };
  }

  if (
    msg.includes("rotul") ||
    msg.includes("vinil") ||
    msg.includes("vehiculo") ||
    msg.includes("carro")
  ) {
    return { service: "rotulacion", step: "tipo_vehiculo" };
  }

  if (
    msg.includes("letrero") ||
    msg.includes("caja luminosa") ||
    msg.includes("letras")
  ) {
    return { service: "letrero", step: "tipo_letrero" };
  }

  if (
    msg.includes("sticker") ||
    msg.includes("calcomania") ||
    msg.includes("etiqueta")
  ) {
    return { service: "stickers", step: "cantidad" };
  }

  if (
    msg.includes("playera") ||
    msg.includes("taza") ||
    msg.includes("estampado")
  ) {
    return { service: "estampados", step: "producto" };
  }

  if (msg.includes("polarizado")) {
    return { service: "polarizado", step: "tipo_polarizado" };
  }

  return null;
}
