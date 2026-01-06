import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();

    let state = (await getState(from)) || {};

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.stepIndex = 0;
        state.answers = {};

        await saveState(from, state);

        twiml.message(
          serviceSteps[state.service][0].question
        );

        return sendTwiml(res, twiml);
      }

      twiml.message(
        "Perfecto 👍 dime un poco más sobre lo que necesitas."
      );
      return sendTwiml(res, twiml);
    }

    // =============================
    // 2️⃣ FLUJO POR STEPS
    // =============================
    const steps = serviceSteps[state.service];

    if (!steps) {
      await saveState(from, {});
      twiml.message(
        "Reiniciemos 😊 ¿qué tipo de servicio estás buscando?"
      );
      return sendTwiml(res, twiml);
    }

    const currentStep = steps[state.stepIndex];

    if (!currentStep) {
      await saveState(from, {});
      twiml.message(
        "Excelente 👍 Con esta información puedo prepararte una propuesta completa."
      );
      return sendTwiml(res, twiml);
    }

    // Guardar respuesta
    state.answers = state.answers || {};
    state.answers[currentStep.key] = incomingMsg;

    // Avanzar step
    state.stepIndex += 1;
    await saveState(from, state);

    // =============================
    // 3️⃣ SIGUIENTE PASO O CIERRE
    // =============================
    if (state.stepIndex < steps.length) {
      twiml.message(
        steps[state.stepIndex].question
      );
      return sendTwiml(res, twiml);
    }

    await saveState(from, {});
    twiml.message(
      "Excelente 👍 Con esta información puedo recomendarte materiales y rangos de precio según tu proyecto."
    );
    return sendTwiml(res, twiml);

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
    twiml.message(
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
    return sendTwiml(res, twiml);
  }
});

// =============================
// 🔒 RESPUESTA SEGURA TWILIO
// =============================
function sendTwiml(res, twiml) {
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
