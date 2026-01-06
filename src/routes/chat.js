import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();

/**
 * WhatsApp / Twilio entry point
 */
router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const incoming = (req.body.Body || "").trim();

    if (!from || !incoming) {
      return send(res, "¿Podrías repetir tu mensaje?");
    }

    let state = await getState(from);

    // ===============================
    // 1️⃣ DETECTAR SERVICIO (solo 1 vez)
    // ===============================
    if (!state.service) {
      const detected = detectService(incoming);

      if (detected) {
        state = {
          service: detected.service,
          step: detected.step,
        };
        await saveState(from, state);

        return send(res, serviceSteps[state.service][state.step].question);
      }

      return send(
        res,
        "Perfecto, cuéntame un poco más para ayudarte mejor."
      );
    }

    // ===============================
    // 2️⃣ AVANZAR PASOS DEL SERVICIO
    // ===============================
    const flow = serviceSteps[state.service];
    const currentStep = flow[state.step];

    if (!currentStep) {
      // reset de seguridad
      await saveState(from, {});
      return send(
        res,
        "Perfecto, cuéntame nuevamente qué servicio necesitas."
      );
    }

    // Guardar respuesta del usuario
    state.answers = state.answers || {};
    state.answers[state.step] = incoming;

    // Determinar siguiente paso
    const nextStep = currentStep.next;

    if (nextStep && flow[nextStep]) {
      state.step = nextStep;
      await saveState(from, state);

      return send(res, flow[nextStep].question);
    }

    // ===============================
    // 3️⃣ RESPUESTA FINAL (sin asesor automático)
    // ===============================
    await saveState(from, state);

    return send(
      res,
      "Excelente 👍 Con esta información puedo prepararte una propuesta adecuada. En el siguiente mensaje te explico materiales y opciones recomendadas."
    );
  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    return send(res, "Ocurrió un error. Intentemos nuevamente 🙏");
  }
});

/**
 * Respuesta obligatoria para Twilio
 */
function send(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

export default router;
