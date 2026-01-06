import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();

console.log("🚨 CHAT.JS ACTIVO — LOGICA POR STEPS");

router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();

    let state = await getState(from);

    // 1️⃣ PRIMER MENSAJE (no hay estado)
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected) {
        state = {
          service: detected.service,
          step: detected.step,
        };
        await saveState(from, state);

        const stepConfig = serviceSteps[detected.service][detected.step];

        return sendTwilio(res, stepConfig.question);
      }

      // saludo genérico SOLO si no detecta servicio
      return sendTwilio(
        res,
        "Perfecto 😊 ¿Qué tipo de servicio estás buscando? Por ejemplo: lona, rotulación, stickers, toldo o letras 3D."
      );
    }

    // 2️⃣ FLUJO ACTIVO
    const currentService = state.service;
    const currentStep = state.step;

    const stepConfig = serviceSteps[currentService][currentStep];

    // Guardamos respuesta del usuario
    state[currentStep] = incomingMsg;

    // Avanzamos step
    state.step = stepConfig.next;
    await saveState(from, state);

    // Si ya no hay más pasos → cierre suave (NO asesor todavía)
    if (!state.step) {
      return sendTwilio(
        res,
        "Excelente 👍 Con esto ya tengo claro tu proyecto. En el siguiente mensaje puedo ayudarte a definir materiales y opciones profesionales."
      );
    }

    // Pregunta siguiente
    const nextStepConfig = serviceSteps[currentService][state.step];
    return sendTwilio(res, nextStepConfig.question);
  } catch (err) {
    console.error("❌ ERROR CHAT:", err);
    return sendTwilio(res, "Ocurrió un error. Intentemos nuevamente 🙏");
  }
});

function sendTwilio(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

export default router;
