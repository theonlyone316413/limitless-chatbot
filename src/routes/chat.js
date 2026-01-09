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
    // IDIOMA (SOLO UNA VEZ)
    // =============================
    if (!state.language) {
      state.language = isEnglish ? "en" : "es";
    }

    const t = (es, en) => (state.language === "en" ? en : es);

    // =============================
    // SALUDO / RESET
    // =============================
    if (isGreeting && state.step === 0) {
      state.step = 1;
      state.lastInteraction = Date.now();
      await saveState(from, state);

      return reply(
        res,
        twiml,
        t(
          "¡Hola! 👋 Cuéntame qué proyecto tienes en mente.",
          "Hi 👋 Tell me about the project you have in mind."
        )
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
        t(
          "Perfecto 👍 dime un poco más para ayudarte.",
          "Great 👍 tell me a bit more so I can help you."
        )
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
          t(
            "Gracias 👍 ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)",
            "Thanks 👍 What are the approximate measurements? (example: 3 x 1)"
          )
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
            t(
              "Por favor indícame las medidas en formato ancho x alto (ejemplo: 3 x 1).",
              "Please provide measurements as width x height (example: 3 x 1)."
            )
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
            t(
              `Para una lona de ${area} m² te ofrezco:\n\n🟢 Lona 13 oz (económica)\n🔵 Lona 18 oz (exterior)\n\n¿Cuál prefieres?`,
              `For a ${area} m² banner I offer:\n\n🟢 13 oz banner (economy)\n🔵 18 oz banner (outdoor)\n\nWhich do you prefer?`
            )
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
          t(
            `Cotización:\n\nMedidas: ${ancho} x ${alto} m\nMaterial: Lona ${material} oz\n💰 Precio: $${price} MXN\n\n¿Deseas agregar instalación?`,
            `Quote:\n\nSize: ${ancho} x ${alto} m\nMaterial: ${material} oz banner\n💰 Price: $${price} MXN\n\nWould you like installation?`
          )
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
          t(
            "¿Cuentas con diseño o deseas que lo desarrollemos? Dime también el nombre de tu negocio.",
            "Do you already have a design or would you like us to create it? Please tell me your business name."
          )
        );
      }

      // CIERRE
      if (state.step === 6) {
        await saveState(from, {});
        return reply(
          res,
          twiml,
          t(
            "Excelente 👍 Con esta información te preparo la cotización formal.",
            "Perfect 👍 With this information I’ll prepare your formal quote."
          )
        );
      }
    }

    // =============================
    // FALLBACK SEGURO
    // =============================
    return reply(
      res,
      twiml,
      t(
        "¿Podrías darme un poco más de detalle o escribir *hola* para comenzar de nuevo?",
        "Could you give me more details or type *hi* to start again?"
      )
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
