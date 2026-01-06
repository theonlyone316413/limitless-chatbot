import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

// saludos humanos
const GREETINGS = [
  "hola",
  "hola!",
  "buenas",
  "buenos dias",
  "buenos días",
  "hey",
  "hello",
  "hi"
];

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};

    // =============================
    // 👋 SALUDO HUMANO
    // =============================
    if (GREETINGS.includes(lowerMsg) && !state.service) {
      const reply =
        "¡Hola! 👋 Cuéntame, ¿qué necesitas cotizar hoy? Puedo ayudarte con lonas, vinil, toldos, rótulos y más.";

      return sendOnce(res, twiml, reply, from, state);
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.stepIndex = 0;
        state.answers = {};
        state.lastReply = null;

        await saveState(from, state);

        return sendOnce(
          res,
          twiml,
          serviceSteps[state.service][0].question,
          from,
          state
        );
      }

      return sendOnce(
        res,
        twiml,
        "Perfecto 👍 dime un poco más sobre lo que necesitas.",
        from,
        state
      );
    }

    // =============================
    // 2️⃣ FLUJO POR PASOS
    // =============================
    const steps = serviceSteps[state.service];

    if (!steps) {
      await saveState(from, {});
      return sendOnce(
        res,
        twiml,
        "Empecemos de nuevo 😊 ¿qué servicio estás buscando?",
        from,
        {}
      );
    }

    const currentStep = steps[state.stepIndex];

    if (!currentStep) {
      await saveState(from, {});
      return sendOnce(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte una propuesta completa.",
        from,
        {}
      );
    }

    // Guardar respuesta del usuario
    state.answers = state.answers || {};
    state.answers[currentStep.key] = incomingMsg;
    state.stepIndex += 1;

    await saveState(from, state);

    // =============================
    // 3️⃣ SIGUIENTE PASO O CIERRE
    // =============================
    if (state.stepIndex < steps.length) {
      return sendOnce(
        res,
        twiml,
        steps[state.stepIndex].question,
        from,
        state
      );
    }

    // cierre final
    await saveState(from, {});
    return sendOnce(
      res,
      twiml,
      "Perfecto 👍 Con esto puedo recomendarte materiales, precios y tiempos de entrega.",
      from,
      {}
    );

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
    return sendOnce(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente.",
      null,
      {}
    );
  }
});

// =============================
// 🔒 ENVÍO SEGURO (NO REPITE)
// =============================
async function sendOnce(res, twiml, message, from, state) {
  if (state?.lastReply === message) {
    res.type("text/xml");
    return res.send(twiml.toString());
  }

  twiml.message(message);

  if (from) {
    state.lastReply = message;
    await saveState(from, state);
  }

  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
