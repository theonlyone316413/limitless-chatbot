export function detectService(text = "") {
  const msg = text.toLowerCase();

  // LONAS / BANNERS
  if (
    msg.includes("lona") ||
    msg.includes("banner") ||
    msg.includes("impresion") ||
    msg.includes("impresión")
  ) {
    return { service: "lona" };
  }

  // TOLDOS
  if (msg.includes("toldo") || msg.includes("canopy")) {
    return { service: "toldo" };
  }

  // ROTULACIÓN VEHICULAR
  if (
    msg.includes("rotul") ||
    msg.includes("vinil") ||
    msg.includes("vehiculo") ||
    msg.includes("vehículo") ||
    msg.includes("carro") ||
    msg.includes("camioneta")
  ) {
    return { service: "rotulacion" };
  }

  // LETREROS / CAJAS LUMINOSAS / LETRAS 3D
  if (
    msg.includes("letrero") ||
    msg.includes("caja luminosa") ||
    msg.includes("letras 3d") ||
    msg.includes("letras")
  ) {
    return { service: "letrero" };
  }

  // STICKERS / CALCOMANÍAS
  if (
    msg.includes("sticker") ||
    msg.includes("stickers") ||
    msg.includes("calcomania") ||
    msg.includes("calcomanía") ||
    msg.includes("etiqueta")
  ) {
    return { service: "stickers" };
  }

  // ESTAMPADOS
  if (
    msg.includes("playera") ||
    msg.includes("playeras") ||
    msg.includes("taza") ||
    msg.includes("tazas") ||
    msg.includes("estampado")
  ) {
    return { service: "estampados" };
  }

  // POLARIZADO
  if (msg.includes("polarizado")) {
    return { service: "polarizado" };
  }

  return null;
}
