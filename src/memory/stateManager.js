import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";
import { priceRules } from "../pricing/priceRules.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

const GREETINGS = ["hola", "hola!", "buenas", "hey", "hello", "hi"];
const PRICE_INTENT = [
  "cuanto cuesta",
  "cuánto cuesta",
  "cuanto me cuesta",
  "cuánto me cuesta",
  "precio",
  "costo",
  "vale"
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
    // 👋 SALUDO HUMANO (solo una vez)
    // =============================
    if (isGreeting && !state.service) {
      const reply =
        "¡Hola! 👋 Cuéntame, ¿qué necesitas cotizar hoy? Puedo ayudarte con lonas, vinil, toldos y rótulos.";
      return send(res, twiml, reply, from, state);
    }

    // =============================
    // 💰 INTENCIÓN DE PRECIO (ANTES DEL FLUJO)
    // =============================
    if (wantsPrice && state.service === "lona") {
      const { ancho, alto, uso } = state.answers;

      // Si ya tengo todo → COTIZO
      if (ancho && alto && uso) {
        const areaM2 = parseFloat(ancho) * parseFloat(alto);
        const pricing = priceRules.lona({ areaM2 });

        const reply =
          `💰 *Opciones para tu lona (${areaM2.toFixed(2)} m²)*\n\n` +
          `🟢 *Lona 13 oz (la más usada)*\n` +
          `$${pricing.options["13oz"].min} – $${pricing.options["13oz"].max} MXN\n` +
          `${pricing.options["13oz"].notes}\n\n` +
          `🔵 *Lona 18 oz (más resistente)*\n` +
          `$${pricing.options["18oz"].min} – $${pricing.options["18oz"].max} MXN\n` +
          `${pricing.options["18oz"].notes}\n\n` +
          `👉 ¿Cuál opción te gustaría cotizar?`;

        await saveState(from, {});
        return send(res, twiml, reply, from, {});
      }

      // Si falta algo → pedir SOLO lo que falta
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
          "¿Cuáles son las medidas aproximadas de la lona?",
          from,
          state
        );
      }
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.stepIndex = 0;
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
    // 2️⃣ FLUJO POR PASOS
    // =============================
    const steps = serviceSteps[state.service];
    const step = steps[state.stepIndex];

    if (!step) {
      await saveState(from, {});
      return send(
        res,
        twiml,
        "Perfecto 👍 ¿Deseas que te prepare la cotización formal?",
        from,
        {}
      );
    }

    // Guardar respuesta
    state.answers[step.key] = incomingMsg;
    state.stepIndex += 1;
    await saveState(from, state);

    return send(
      res,
      twiml,
      steps[state.stepIndex]?.question ||
        "Perfecto 👍 dime si deseas cotización formal o agregar instalación.",
      from,
      state
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
// 🔒 ENVÍO ÚNICO
// =============================
function send(res, twiml, message, from, state) {
  twiml.message(message);
  if (from) saveState(from, state);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
