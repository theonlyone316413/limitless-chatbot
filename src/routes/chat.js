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
// RUTA PRINCIPAL
// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    // =============================
    // 🧱 BLINDAJE ABSOLUTO DE ESTADO
    // =============================
    let state = (await getState(from)) || {};
    state.phase = state.phase || "inicio";
    state.service = state.service || null;
    state.stepIndex = state.stepIndex ?? 0;
    state.answers = state.answers || {};

    const isGreeting =
      GREETINGS.includes(lowerMsg) && lowerMsg.split(" ").length <= 2;

    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // 👋 SALUDO (REINICIO LIMPIO)
    // =============================
    if (isGreeting) {
      const cleanState = {
        phase: "inicio",
        service: null,
        stepIndex: 0,
        answers: {},
      };

      await saveState(from, cleanState);

      return reply(
        res,
        twiml,
        "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? (lona, toldo, vinil, rótulo)"
      );
    }

    // =============================
    // 📐 EXTRAER MEDIDAS DESDE TEXTO
    // =============================
    const measureMatch = lowerMsg.match(
      /(\d+(?:\.\d+)?)\s*(?:m|metro|metros)?\s*(?:x|por)?\s*(\d+(?:\.\d+)?)/i
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
        state.phase = "flujo";
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
    // 💰 PRECIO EXACTO PARA LONA
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

      // precios unitarios
      const precio13 = Math.round(area * 120);
      const precio18 = Math.round(area * 160);

      state.phase = "material";
      await saveState(from, state);

      return reply(
        res,
        twiml,
        `💰 *Cotización de impresión*\n\n` +
        `📐 Medidas: ${ancho} x ${alto} m (${area} m²)\n\n` +
        `🟢 *Lona 13 oz* (económica): $${precio13} MXN\n` +
        `🔵 *Lona 18 oz* (exterior reforzada): $${precio18} MXN\n\n` +
        `👉 ¿Cuál opción eliges?`
      );
    }

    // =============================
    // 2️⃣ FLUJO POR PASOS
    // =============================
    const steps = serviceSteps[state.service];
    const currentStep = steps?.[state.stepIndex];

    if (!currentStep) {
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte la cotización formal."
      );
    }

    // guardar respuesta
    state.answers[currentStep.key] = incomingMsg;
    state.stepIndex += 1;
    await saveState(from, state);

    return reply(
      res,
      twiml,
      steps[state.stepIndex]?.question ||
        "Perfecto 👍 seguimos con la cotización."
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
