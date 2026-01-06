import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { getNextStep } from "../services/serviceSteps.js";

const router = express.Router();

router.post("/", async (req, res) => {
  console.log("🔥 WEBHOOK HIT FROM TWILIO");

  try {
    const incomingMsg = req.body.Body?.trim();
    const from = req.body.From;

    if (!incomingMsg || !from) {
      res.set("Content-Type", "text/xml");
      return res.send("<Response></Response>");
    }

    console.log("📩 From:", from);
    console.log("📩 Message:", incomingMsg);

    const state = (await getState(from)) || {};

    const service = state.service || detectService(incomingMsg);
    const nextStep = getNextStep(service, state.step);

    await saveState(from, {
      service,
      step: nextStep,
      lastMessage: incomingMsg,
      updatedAt: Date.now(),
    });

    const reply = state.step
      ? "Perfecto, cuéntame un poco más para ayudarte mejor."
      : "Hola, soy el asistente de Limitless Design Studio. ¿En qué puedo ayudarte hoy?";

    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);
  } catch (error) {
    console.error("❌ Error en /chat:", error);

    res.set("Content-Type", "text/xml");
    return res.send(`
      <Response>
        <Message>Ocurrió un error, intenta nuevamente.</Message>
      </Response>
    `);
  }
});

export default router;
