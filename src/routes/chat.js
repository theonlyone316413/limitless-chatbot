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
const GREETINGS = [
  "hola",
  "hola!",
  "buenas",
  "buenos dias",
  "buenos días",
  "hey",
  "hello",
  "hi",
];

const PRICE_INTENT = [
  "cuanto cuesta",
  "cuánto cuesta",
  "precio",
  "cuanto me cuesta",
  "cuánto me cuesta",
  "costo",
  "vale",
];

// =============================
// UTILIDAD: PARSEAR MEDIDAS
// =============================
function parseMedidas(text) {
  const match = text
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(\.\d+)?)\s*(m|mt|metro|metros)?\s*[x×]\s*(\d+(\.\d+)?)/);

  if (!match) return null;

  return {
    ancho: parseFloat(match[1]),
    alto: parseFloat(match[4]),
  };
}

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

    const isGreeting =
      GREETINGS.includes(lowerMsg) && lowerMsg.split(" ").length <= 2;

    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // 👋 SALUDO → RESET LIMPIO
    // =============================
    if (isGreeting) {
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? (lona, toldo, vinil, rótulo)"
      );
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected?.service && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.stepIndex = 0;
        state.answers = {};
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
        "Perfecto 👍 dime un poco más sobre lo que necesitas."
      );
    }

    // =============================
    // 2️⃣ FLUJO LONA (CONTROLADO)
    // =============================
    if (state.service === "lona") {
      const parsed = parseMedidas(incomingMsg);
      if (parsed) {
        state.answers.ancho = parsed.ancho;
        state.answers.alto = parsed.alto;
        await saveState(from, state);
      }

      const { uso, ancho, alto } = state.answers;

      // Falta uso
      if (!uso) {
        return reply(
          res,
          twiml,
          "Perfecto. ¿La lona es para fachada, evento o promoción temporal?"
        );
      }

      // Falta medidas
      if (!ancho || !alto) {
        return reply(
          res,
          twiml,
          "Gracias. ¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 5 x 1)"
        );
      }

      // Ya tengo TODO → opciones
      if (!state.answers.material) {
        const area = ancho * alto;
        state.answers.area = area;
        await saveState(from, state);

        return reply(
          res,
          twiml,
          `💰 Para una lona de *${area} m²* te ofrezco:\n\n` +
          `🟢 *Lona 13 oz* (opción económica)\n` +
          `🔵 *Lona 18 oz* (más resistente al sol y lluvia)\n\n` +
          `👉 ¿Cuál opción te interesa cotizar?`
        );
      }
    }

    // =============================
    // 3️⃣ FLUJO GENÉRICO POR PASOS
    // =============================
    const steps = serviceSteps[state.service];
    const step = steps[state.stepIndex];

    if (!step) {
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte una propuesta completa."
      );
    }

    state.answers[step.key] = incomingMsg;
    state.stepIndex += 1;
    await saveState(from, state);

    return reply(
      res,
      twiml,
      steps[state.stepIndex]?.question ||
      "Perfecto 👍 seguimos con la cotización."
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
