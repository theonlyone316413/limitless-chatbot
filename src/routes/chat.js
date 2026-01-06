import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { getNextStep } from "../services/serviceSteps.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("🔥 WEBHOOK HIT FROM TWILIO");

    // Twilio envía estos campos
    const incomingMsg = req.body.Body?.trim();
    const from = req.body.From;

    console.log("📩 From:", from);
    console.log("📩 Message:", incomingMsg);

    // Seguridad básica
    if (!incomingMsg || !from) {
      res.set("Content-Type", "text/xml");
      return res.send(`<Response></Response>`);
    }

    // ===== MEMORIA =====
    const state = await getState(from);

    // ===== DETECCIÓN DE SERVICIO =====
    const service = state?.service || detectService(incomingMsg);

    // ===== PASO SIGUIENTE =====
    const nextStep = getNextStep(service, state?.step);

    // Guardamos estado actualizado
    await saveState(from, {
      service,
      step: nextStep,
      lastMessage: incomingMsg,
      updatedAt: Date.now(),
    });

    // ===== RESPUESTA (TEMPORAL, HUMANA) =====
    // Esto luego lo conectamos con OpenAI + prompt
    let reply;

    if (!state) {
      reply =
        "Hola, soy el asistente de Limitless Design Studio. ¿En qué puedo ayudarte hoy?";
    } else {
      reply = "Perfecto, cuéntame un poco más para ayudarte mejor.";
    }

    // ===== RESPUESTA OBLIGATORIA PARA TWILIO =====
    res.set("Content-Type", "text/xml");
