import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

// =============================
// CONSTANTES
// =============================
const GREETING_REGEX = /\b(hola|buenas|hello|hi|hey)\b/i;
const ENGLISH_REGEX = /\b(hello|hi|please|price|how much|banner|sign)\b/i;

const PRICE_INTENT = [
  "cuanto cuesta",
  "cuánto cuesta",
  "precio",
  "cuanto me cuesta",
  "cuánto me cuesta",
  "costo",
  "vale",
  "price",
  "how much"
];

// =============================
// ROUTE
// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

    const isGreeting = GREETING_REGEX.test(lowerMsg);
    const isEnglish = ENGLISH_REGEX.test(lowerMsg);
    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // 👋 SALUDO (SOLO UNA VEZ)
    // =============================
    if (isGreeting && !state.started) {
      state.started = true;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        isEnglish
          ? "Got it 👍 Tell me a bit about what you need."
          : "¡Hola! 👋 Cuéntame qué proyecto tienes en mente."
      );
    }

    // =============================
    // 📐 EXTRAER MEDIDAS
    // =============================
    const measureMatch = lowerMsg.match(
      /(\d+(?:\.\d+)?)\s*(?:x|por|\*)\s*(\d+(?:\.\d+)?)/i
    );

    if (measureMatch) {
      state.answers.ancho = Number(measureMatch[1]);
      state.answers.alto = Number(measureMatch[2]);
      await saveState(from, state);
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected?.service && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.stepIndex = 0;
        await saveState(from, state);

        return reply(
          res,
          twiml,
          serviceSteps[state.service][0].question
        );
      }

      return reply(
        res,
        twiml,
        isEnglish
          ? "Tell me a bit more so I can help you."
          : "Perfecto 👍 dime un poco más para poder ayudarte."
      );
    }

    // =============================
    // 💰 COTIZACIÓN LONA
    // =============================
    if (state.service === "lona") {
      const { ancho, alto, uso, materialElegido } = state.answers;

      // Paso 1: uso
      if (!uso) {
        state.answers.uso = incomingMsg;
        await saveState(from, state);
        return reply(
          res,
          twiml,
          "Gracias. ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)"
        );
      }

      // Paso 2: medidas
      if (!ancho || !alto) {
        return reply(
          res,
          twiml,
          "¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 3 x 1)"
        );
      }

      const area = ancho * alto;

      // Paso 3: elegir material
      if (!materialElegido) {
        return reply(
          res,
          twiml,
          `Para una lona de ${area} m² te ofrezco:\n\n` +
          `🟢 Lona 13 oz (opción económica)\n` +
          `🔵 Lona 18 oz (más resistente para exterior)\n\n` +
          `¿Cuál opción prefieres?`
        );
      }
if (!materialElegido) {
  if (lowerMsg.includes("13")) state.answers.materialElegido = "13";
  if (lowerMsg.includes("18")) state.answers.materialElegido = "18";

  if (state.answers.materialElegido) {
    await saveState(from, state);
  } else {
    return reply(
      res,
      twiml,
      "Por favor dime si prefieres lona 13 oz o 18 oz."
    );
  }
}
if (!state.answers.instalacionAltura) {
  state.answers.instalacionAltura = incomingMsg;
  await saveState(from, state);
  return reply(
    res,
    twiml,
    "Perfecto 👍 ¿Cuentas con diseño o deseas que lo desarrollemos?"
  );
}

      // Paso 4: PRECIO FIJO
      if (!state.priceSent) {
        let precio = 0;

        if (materialElegido === "13") precio = area * 120;
        if (materialElegido === "18") precio = area * 160;

        state.priceSent = true;
        await saveState(from, state);

        return reply(
          res,
          twiml,
          `Cotización de impresión:\n\n` +
          `Medidas: ${ancho} x ${alto} m\n` +
          `Material: Lona ${materialElegido} oz\n` +
          `💰 Precio: $${precio} MXN\n\n` +
          `¿Deseas agregar instalación?`
        );
      }

      // Paso 5: instalación
      if (!state.installationAsked) {
        state.installationAsked = true;
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Perfecto 👍 ¿A qué altura aproximada se instalará la lona?"
        );
      }

      // Paso 6: diseño
      if (!state.designAsked) {
        state.designAsked = true;
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "¿Cuentas con diseño o deseas que lo desarrollemos? Dime también el nombre de tu negocio y a qué se dedica."
        );
      }

      // CIERRE
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte la cotización formal."
      );
    }

    // =============================
    // FALLBACK
    // =============================
    return reply(
      res,
      twiml,
      "Perfecto 👍 dime un poco más para continuar."
    );

  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    return reply(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

// =============================
// RESPUESTA TWILIO
// =============================
function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
