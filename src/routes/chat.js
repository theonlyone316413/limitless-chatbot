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

    let state = (await getState(from)) || {};
    state.answers = state.answers || {};

  const isGreeting = GREETINGS.some(g => lowerMsg.startsWith(g));

// SOLO saludo puro → reset
if (isGreeting && lowerMsg.split(" ").length <= 2) {
  await saveState(from, {});
  return reply(
    res,
    twiml,
    "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? (lona, toldo, vinil, rótulo)"
  );
}

      );
    }

    // =============================
    // 📐 EXTRAER MEDIDAS AUTOMÁTICAMENTE
    // =============================
    const measureMatch = lowerMsg.match(
      /(\d+(?:\.\d+)?)\s*(?:m|metro|metros)?\s*(?:x|por|de ancho)?\s*(\d+(?:\.\d+)?)/i
    );

    if (measureMatch) {
      state.answers.ancho = Number(measureMatch[1]);
      state.answers.alto = Number(measureMatch[2]);
      await saveState(from, state);
    }

    // =============================
    // 1️⃣ DETECTAR SERVICIO
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
    // 💰 LONA – OFRECER OPCIONES (UNA SOLA VEZ)
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
        `💰 Para una lona de *${area} m²* te ofrezco:\n\n` +
        `🟢 *Lona 13 oz* (opción económica)\n` +
        `🔵 *Lona 18 oz* (más resistente al sol y lluvia)\n\n` +
        `👉 ¿Cuál opción te interesa cotizar?`
      );
    }

    // =============================
    // 🧵 SELECCIÓN DE MATERIAL → PRECIO FINAL
    // =============================
    if (state.service === "lona") {
      const material18 = lowerMsg.includes("18");
      const material13 =
        lowerMsg.includes("13") ||
        lowerMsg.includes("económica") ||
        lowerMsg.includes("economica");

      if (material18 || material13) {
        state.answers.material = material18 ? "18" : "13";
        await saveState(from, state);

        const { ancho, alto } = state.answers;
        const area = ancho * alto;

        const pricePerM2 =
          state.answers.material === "18"
            ? { min: 180, max: 260 }
            : { min: 120, max: 180 };

        const min = area * pricePerM2.min;
        const max = area * pricePerM2.max;

        await saveState(from, {}); // 🔒 cerrar conversación

        return reply(
          res,
          twiml,
          `💰 *Cotización final*\n\n` +
          `📐 Medidas: ${ancho} x ${alto} m (${area} m²)\n` +
          `🧵 Material: Lona ${state.answers.material} oz\n\n` +
          `💵 *Precio estimado:* $${min} – $${max} MXN\n\n` +
          `Incluye impresión en alta resolución.\n` +
          `👉 ¿Deseas agregar instalación o te preparo cotización formal?`
        );
      }
    }

    // =============================
    // 2️⃣ FLUJO NORMAL POR PASOS
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
    console.error("❌ CHAT ERROR:", err);
    return reply(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

// =============================
// RESPUESTA TWILIO
// =============================
function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
