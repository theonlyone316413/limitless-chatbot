import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
import { serviceSteps } from "../services/serviceSteps.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

// =============================
// UTIL: RESPUESTA SEGURA
// =============================
function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.status(200).send(twiml.toString());
}

// =============================
// CONSTANTES
// =============================
const GREETING_REGEX = /\b(hola|buenas|hello|hi|hey)\b/i;
const ENGLISH_REGEX = /\b(hello|hi|please|price|how much|banner|sign)\b/i;
const UNSURE_REGEX = /\b(no se|no sé|que hacen|qué hacen|que servicios|qué servicios|me orientas|me puedes orientar|no estoy seguro)\b/i;
const TTL_24H = 24 * 60 * 60 * 1000;

// =============================
// ROUTE
// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From || "anonymous";
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};

    // =============================
    // TTL: RESET SI PASARON 24H
    // =============================
    if (state.lastInteraction && Date.now() - state.lastInteraction > TTL_24H) {
      state = {};
    }

    state.answers = state.answers || {};
    state.step = state.step || 0;

    const isGreeting = GREETING_REGEX.test(lowerMsg);
    const isEnglish = ENGLISH_REGEX.test(lowerMsg);

    // =============================
    // SALUDO SIEMPRE REINICIA
    // =============================
    if (isGreeting) {
      state = {
        language: isEnglish ? "en" : "es",
        step: 1,
        answers: {},
        lastInteraction: Date.now()
      };
      await saveState(from, state);

      return reply(
        res,
        twiml,
        state.language === "en"
          ? "Hello 👋 Welcome to *Limitless Studio*.\n\nWe’ll be happy to help you with your project. Tell me, what do you have in mind?"
          : "¡Hola! 👋 Bienvenido a *Limitless Studio*.\n\nSerá un gusto ayudarte con tu proyecto.\nCuéntame, ¿qué tienes en mente o qué te gustaría realizar?"
      );
    }

    // =============================
    // APOYO SI EL CLIENTE DUDA
    // =============================
    if (UNSURE_REGEX.test(lowerMsg)) {
      state.lastInteraction = Date.now();
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "Con gusto 😊\n" +
        "Trabajamos con diseño gráfico, impresión (lona y vinil), rotulación, " +
        "toldos para fachada, rótulos luminosos, polarizado, estampados y marketing digital.\n\n" +
        "Cuéntame cuál te interesa o qué proyecto tienes en mente."
      );
    }

    // =============================
    // DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected?.service && serviceSteps[detected.service]) {
        state.service = detected.service;
        state.step = 1;
        state.lastInteraction = Date.now();
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
        state.language === "en"
          ? "Great 👍 tell me a bit more so I can help you."
          : "Perfecto 👍 dime un poco más para ayudarte."
      );
    }

    // =============================
    // FLUJO: LONA
    // =============================
    if (state.service === "lona") {
      // PASO 1 — USO
      if (state.step === 1) {
        state.answers.uso = incomingMsg;
        state.step = 2;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        return reply(
          res,
          twiml,
          state.language === "en"
            ? "Thanks 👍 What are the approximate measurements? (example: 3 x 1)"
            : "Gracias 👍 ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)"
        );
      }

      // PASO 2 — MEDIDAS
      if (state.step === 2) {
        const match = lowerMsg.match(
          /(\d+(?:\.\d+)?)\s*(?:x|por|\*)\s*(\d+(?:\.\d+)?)/i
        );

        if (!match) {
          return reply(
            res,
            twiml,
            state.language === "en"
              ? "Please provide measurements as width x height (example: 3 x 1)."
              : "Por favor indícame las medidas en formato ancho x alto (ejemplo: 3 x 1)."
          );
        }

        state.answers.ancho = Number(match[1]);
        state.answers.alto = Number(match[2]);
        state.step = 3;
        state.lastInteraction = Date.now();
        await saveState(from, state);
      }

      const { ancho, alto } = state.answers;
      const area = ancho * alto;

      // PASO 3 — MATERIAL
      if (state.step === 3) {
        if (lowerMsg.includes("13")) {
          state.answers.material = "13";
        } else if (lowerMsg.includes("18")) {
          state.answers.material = "18";
        } else {
          return reply(
            res,
            twiml,
            state.language === "en"
              ? `For a ${area} m² banner I offer:\n\n🟢 13 oz banner (economy)\n🔵 18 oz banner (outdoor)\n\nWhich do you prefer?`
              : `Para una lona de ${area} m² te ofrezco:\n\n🟢 Lona 13 oz (económica)\n🔵 Lona 18 oz (exterior)\n\n¿Cuál prefieres?`
          );
        }

        state.step = 4;
        state.lastInteraction = Date.now();
        await saveState(from, state);
      }

      // PASO 4 — PRECIO
      if (state.step === 4) {
        const material = state.answers.material;
        const price = material === "13" ? area * 120 : area * 160;

        state.step = 5;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        return reply(
          res,
          twiml,
          state.language === "en"
            ? `Quote:\n\nSize: ${ancho} x ${alto} m\nMaterial: ${material} oz banner\n💰 Price: $${price} MXN\n\nWould you like installation?`
            : `Cotización:\n\nMedidas: ${ancho} x ${alto} m\nMaterial: Lona ${material} oz\n💰 Precio: $${price} MXN\n\n¿Deseas agregar instalación?`
        );
      }

      // PASO 5 — DISEÑO
      if (state.step === 5) {
        state.answers.instalacion = incomingMsg;
        state.step = 6;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        return reply(
          res,
          twiml,
          state.language === "en"
            ? "Do you already have a design or would you like us to create it? Please tell me your business name."
            : "¿Cuentas con diseño o deseas que lo desarrollemos? Dime también el nombre de tu negocio."
        );
      }

      // CIERRE
      if (state.step === 6) {
        await saveState(from, {});
        return reply(
          res,
          twiml,
          state.language === "en"
            ? "Perfect 👍 With this information I’ll prepare your formal quote."
            : "Excelente 👍 Con esta información te preparo la cotización formal."
        );
      }
    }

    // =============================
    // FALLBACK SEGURO
    // =============================
    return reply(
      res,
      twiml,
      state.language === "en"
        ? "Could you give me more details or type *hi* to start again?"
        : "¿Podrías darme un poco más de detalle o escribir *hola* para comenzar de nuevo?"
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

export default router;
