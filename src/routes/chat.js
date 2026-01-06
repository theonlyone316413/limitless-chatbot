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

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    // =============================
    // CARGAR ESTADO
    // =============================
    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

    const isGreeting = GREETINGS.includes(lowerMsg);
    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    // =============================
    // 🔄 SALUDO (SIEMPRE PRIORIDAD)
    // =============================
    if (isGreeting) {
      const cleanState = {};
      await saveState(from, cleanState);

      return send(
        res,
        twiml,
        "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? Puedo ayudarte con lonas, vinil, toldos, rótulos y más.",
        from,
        cleanState
      );
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (
        detected &&
        detected.service &&
        serviceSteps[detected.service] &&
        serviceSteps[detected.service].length
      ) {
        state.service = detected.service;
        state.stepIndex = 0;
        state.answers = {};

        await saveState(from, state);

        return send(
          res,
          twiml,
          serviceSteps[state.service][0].question,
          from,
          state
        );
      }

      return send(
        res,
        twiml,
        "Perfecto 👍 dime un poco más sobre lo que necesitas.",
        from,
        state
      );
    }

    // =============================
    // 💰 INTENCIÓN DE PRECIO (SIN ROMPER FLUJO)
    // =============================
    if (wantsPrice && state.service === "lona") {
      const { ancho, alto, uso } = state.answers;

      if (!uso) {
        return send(
          res,
          twiml,
          "¿La lona sería para fachada, evento o promoción temporal?",
          from,
          state
        );
      }

      if (!ancho || !alto) {
        return send(
          res,
          twiml,
          "¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 3 x 1.5)",
          from,
          state
        );
      }

      return send(
        res,
        twiml,
        "Perfecto 👍 Ya tengo la información. En el siguiente mensaje te doy el precio.",
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
      return send(
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
      return send(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte una propuesta completa.",
        from,
        {}
      );
    }

    // Guardar respuesta
    state.answers[currentStep.key] = incomingMsg;
    state.stepIndex += 1;

    await saveState(from, state);

    // =============================
    // 3️⃣ SIGUIENTE PASO O CIERRE
    // =============================
    if (state.stepIndex < steps.length) {
      return send(
        res,
        twiml,
        steps[state.stepIndex].question,
        from,
        state
      );
    }

    await saveState(from, {});
    return send(
      res,
      twiml,
      "Perfecto 👍 Con esto puedo recomendarte materiales, precios y tiempos de entrega.",
      from,
      {}
    );

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
    return send(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente.",
      null,
      {}
    );
  }
});

// =============================
// ENVÍO SIMPLE (UN SOLO HELPER)
// =============================
function send(res, twiml, message, from, state) {
  twiml.message(message);
  if (from) saveState(from, state);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
