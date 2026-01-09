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
// ROUTE
// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const isEnglish = /\b(hello|hi|please|price|how much|banner|sign)\b/i.test(lowerMsg);

const isGreeting = /\b(hola|buenas|hello|hi|hey)\b/i.test(lowerMsg);


    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

    const isGreeting =
      GREETINGS.includes(lowerMsg) && lowerMsg.split(" ").length <= 2;

    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // 👋 SALUDO (RESET TOTAL)
    // =============================
    if (isGreeting) {
      await saveState(from, {});
      return reply(
        res,
        twiml,
    if (isEnglish) {
  return reply(res, twiml, "Got it 👍 Tell me a bit about what you need.");
}

return reply(res, twiml, "¡Hola! 👋 Cuéntame qué proyecto tienes en mente.");


    // =============================
    // 📐 EXTRAER MEDIDAS AUTOMÁTICAS
    // =============================
    const measureMatch = lowerMsg.match(
      /(\d+(?:\.\d+)?)\s*(?:m|metro|metros)?\s*(?:x|por)?\s*(\d+(?:\.\d+)?)/i
    );

    if (measureMatch) {
      state.answers.ancho = Number(measureMatch[1]);
      state.answers.alto = Number(measureMatch[2]);
      await saveState(from, state);
    }

    // ===================================================
    // 🔥 DETECCIÓN FORZADA DE LONA (ANTI-LOOPS)
    // ===================================================
    if (!state.service) {

      if (lowerMsg.includes("lona") || lowerMsg.includes("banner")) {
        state.service = "lona";
        state.step = "uso";
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?"
        );
      }

      const detected = detectService(incomingMsg);

      if (detected?.service) {
        state.service = detected.service;
        state.step = "uso";
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Perfecto 👍 ¿Podrías contarme un poco más del uso que le darás?"
        );
      }

      return reply(
        res,
        twiml,
        "Perfecto 👍 Cuéntame un poco más de lo que necesitas."
      );
    }

    // =============================
    // 💰 PRECIO LONA (SOLO CUANDO APLICA)
    // =============================
    if (state.service === "lona" && wantsPrice) {
      const { ancho, alto } = state.answers;

      if (!ancho || !alto) {
        return reply(
          res,
          twiml,
          "¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 5 x 1)"
        );
      }

      const area = ancho * alto;

      return reply(
        res,
        twiml,
        `💰 Para una lona de *${area} m²* puedo ofrecerte:\n\n` +
        `🟢 *Lona 13 oz* (opción económica)\n` +
        `🔵 *Lona 18 oz* (exterior reforzada)\n\n` +
        `👉 ¿Cuál opción prefieres cotizar?`
      );
    }

    // =============================
    // 🧭 FLUJO POR PASOS
    // =============================
    const steps = serviceSteps[state.service];
    const currentStep = steps?.[state.stepIndex ?? 0];

    if (!currentStep) {
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte la cotización final."
      );
    }

    state.answers[currentStep.key] = incomingMsg;
    state.stepIndex = (state.stepIndex ?? 0) + 1;
    await saveState(from, state);

    return reply(
      res,
      twiml,
      steps[state.stepIndex]?.question ||
      "Perfecto 👍 seguimos avanzando con la cotización."
    );

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
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
