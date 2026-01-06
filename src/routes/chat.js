import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();

    let state = (await getState(from)) || {};

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected) {
        state.service = detected.service;
        state.stepIndex = 0;

        await saveState(from, state);

        return respond(
          res,
          serviceSteps[state.service][0].question
        );
      }

      return respond(res, "Perfecto, dime un poco más para ayudarte mejor.");
    }

    // =============================
    // 2️⃣ FLUJO POR STEPS
    // =============================
    const steps = serviceSteps[state.service];
    const currentStep = steps[state.stepIndex];

    if (!currentStep) {
      await saveState(from, {});
      return respond(
        res,
        "Excelente 👍 Con esta información puedo prepararte una propuesta completa."
      );
    }

    // Guardar respuesta del usuario
    state.answers = state.answers || {};
    state.answers[currentStep.key] = incomingMsg;

    // ⬆️ AVANZAR STEP (ESTO ERA EL BUG)
    state.stepIndex += 1;

    await saveState(from, state);

    // =============================
    // 3️⃣ SIGUIENTE PASO O CIERRE
    // =============================
    if (state.stepIndex < steps.length) {
      return respond(
        res,
        steps[state.stepIndex].question
      );
    }

    return respond(
      res,
      "Excelente 👍 Con esta información puedo recomendarte materiales y rangos de precio según tu proyecto."
    );

  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    return respond(res, "Ocurrió un error, intentemos nuevamente 🙏");
  }
});

function respond(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

export default router;
