import express from "express";
import twilio from "twilio";

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

// 🔧 helper seguro para medidas tipo "3 x 1.5"
function extractMeasures(text) {
  const match = text.match(/(\d+(\.\d+)?)\s*[xX*]\s*(\d+(\.\d+)?)/);
  if (!match) return null;
  return {
    ancho: parseFloat(match[1]),
    alto: parseFloat(match[3])
  };
}

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
    // 👋 SALUDO HUMANO
    // =============================
    if (isGreeting && !state.service) {
      twiml.message(
        "¡Hola! 👋 Cuéntame, ¿qué necesitas cotizar hoy? Puedo ayudarte con lonas, vinil, toldos y rótulos."
      );
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // =============================
    // 📐 EXTRAER MEDIDAS SI VIENEN EN EL TEXTO
    // =============================
    const measures = extractMeasures(lowerMsg);
    if (measures) {
      state.answers.ancho = measures.ancho;
      state.answers.alto = measures.alto;
      await saveState(from, state);
    }

    // =============================
    // 💰 INTENCIÓN DE PRECIO (LONA)
    // =============================
    if (wantsPrice && state.service === "lona") {
      const { ancho, alto, uso } = state.answers;

      if (ancho && alto && uso) {
        const areaM2 = ancho * alto;
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
        twiml.message(reply);
        res.type("text/xml");
        return res.send(twiml.toString());
      }

      if (!uso) {
        twiml.message(
          "¿La lona sería para fachada, evento o promoción temporal?"
        );
        res.type("text/xml");
        return res.send(twiml.toString());
      }

      if (!ancho || !alto) {
        twiml.message(
          "¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 3 x 1.5)"
        );
        res.type("text/xml");
        return res.send(twiml.toString());
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

        twiml.message(serviceSteps[state.service][0].question);
        res.type("text/xml");
        return res.send(twiml.toString());
      }

      twiml.message(
        "Perfecto 👍 dime un poco más sobre lo que necesitas."
      );
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // =============================
    // 2️⃣ FLUJO NORMAL
    // =============================
    const steps = serviceSteps[state.service];
    const step = steps[state.stepIndex];

    if (!step) {
      await saveState(from, {});
      twiml.message(
        "Perfecto 👍 ¿Deseas que te prepare la cotización formal?"
      );
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    state.answers[step.key] = incomingMsg;
    state.stepIndex += 1;
    await saveState(from, state);

    twiml.message(
      steps[state.stepIndex]?.question ||
        "Perfecto 👍 dime si deseas cotización formal o agregar instalación."
    );
    res.type("text/xml");
    return res.send(twiml.toString());

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
    twiml.message(
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
    res.type("text/xml");
    return res.send(twiml.toString());
  }
});

export default router;
