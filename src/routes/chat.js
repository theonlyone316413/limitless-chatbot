import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

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

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

    const isGreeting = GREETINGS.includes(lowerMsg);
    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // SALUDO (RESET TOTAL)
    // =============================
    if (isGreeting) {
      await saveState(from, {});
      return reply(res, twiml,
        "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? (lona, toldo, vinil, rótulo)",
      );
    }

    // =============================
    // EXTRAER MEDIDAS DESDE TEXTO
    // =============================
    const match = lowerMsg.match(
      /(\d+(?:\.\d+)?)\s*(?:m|metro|metros)?\s*(?:x|por|de ancho)?\s*(\d+(?:\.\d+)?)/i
    );

    if (match) {
      state.answers.ancho = Number(match[1]);
      state.answers.alto = Number(match[2]);
      await saveState(from, state);
    }

    // =============================
    // DETECTAR SERVICIO
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
    // PRECIO PARA LONA
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
        `💰 Para una lona de *${area} m²*:\n\n` +
        `🟢 Lona 13 oz (económica)\n` +
        `🔵 Lona 18 oz (más resistente)\n\n` +
        `¿Cuál opción te interesa cotizar?`
      );
    }

    // =============================
    // FLUJO NORMAL
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
    console.error("❌ CHAT ERROR REAL:", err);
    return reply(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
