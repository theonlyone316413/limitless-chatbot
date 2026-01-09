import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

/* =========================================================
   UTILIDADES
========================================================= */

const GREETINGS = ["hola", "buenas", "hello", "hi", "hey"];
const PRICE_WORDS = ["precio", "cuanto", "cuánto", "costo", "vale"];

function detectLanguage(text) {
  return /[a-z]/i.test(text) && !/[áéíóúñ¿¡]/i.test(text) ? "en" : "es";
}

function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

function extractMeasures(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { ancho: Number(match[1]), alto: Number(match[2]) };
}

/* =========================================================
   RUTA PRINCIPAL
========================================================= */

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim();
    const lower = msg.toLowerCase();
    const lang = detectLanguage(msg);

    let state = (await getState(from)) || {
      service: null,
      step: 0,
      answers: {},
    };

    /* ================= SALUDO ================= */
    if (GREETINGS.includes(lower) && msg.split(" ").length <= 2) {
      await saveState(from, {
        service: null,
        step: 0,
        answers: {},
      });

      return reply(
        res,
        twiml,
        lang === "en"
          ? "Perfect, tell me a bit about what you need."
          : "Perfecto 👋 cuéntame qué necesitas."
      );
    }

    /* ================= DETECTAR SERVICIO ================= */
    if (!state.service) {
      const detected = detectService(msg);
      if (!detected?.service) {
        return reply(
          res,
          twiml,
          lang === "en"
            ? "Got it. Tell me a bit more about your project."
            : "Entendido 👍 dime un poco más sobre tu proyecto."
        );
      }

      state.service = detected.service;
      state.step = 0;
      state.answers = {};
      await saveState(from, state);
    }

    /* ================= SOLO LONA ================= */
    if (state.service !== "lona") {
      await saveState(from, {});
      return reply(
        res,
        twiml,
        "Este flujo está optimizado para lonas. Seguimos pronto con los demás 😉"
      );
    }

    /* ================= EXTRAER MEDIDAS ================= */
    const measures = extractMeasures(msg);
    if (measures) {
      state.answers.ancho = measures.ancho;
      state.answers.alto = measures.alto;
      await saveState(from, state);
    }

    /* ================= PASO 0: USO ================= */
    if (state.step === 0) {
      state.answers.uso = msg;
      state.step = 1;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        lang === "en"
          ? "What are the approximate measurements? (example: 5 x 1)"
          : "Gracias. ¿Cuáles son las medidas aproximadas? (ejemplo: 5 x 1)"
      );
    }

    /* ================= PASO 1: MEDIDAS ================= */
    if (state.step === 1) {
      if (!state.answers.ancho || !state.answers.alto) {
        return reply(
          res,
          twiml,
          "Necesito las medidas en formato ancho x alto (ejemplo: 5 x 1)."
        );
      }

      state.step = 2;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "Perfecto 👍 ¿Prefieres lona 13 oz (económica) o 18 oz (exterior reforzada)?"
      );
    }

    /* ================= PASO 2: MATERIAL ================= */
    if (state.step === 2) {
      if (lower.includes("13")) state.answers.material = "13";
      if (lower.includes("18")) state.answers.material = "18";

      if (!state.answers.material) {
        return reply(
          res,
          twiml,
          "Indícame si prefieres 13 oz o 18 oz."
        );
      }

      const area = state.answers.ancho * state.answers.alto;

      const pricePrint =
        state.answers.material === "13"
          ? Math.round(area * 180)
          : Math.round(area * 240);

      state.answers.precioImpresion = pricePrint;
      state.step = 3;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        `🧾 Cotización de impresión:\n` +
        `📐 ${state.answers.ancho} x ${state.answers.alto} m\n` +
        `🧵 Lona ${state.answers.material} oz\n` +
        `💰 Precio impresión: $${pricePrint} MXN\n\n` +
        `¿Deseas que también diseñemos la lona?`
      );
    }

    /* ================= PASO 3: DISEÑO ================= */
    if (state.step === 3) {
      state.answers.diseno =
        lower.includes("si") || lower.includes("sí");

      state.step = 4;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        state.answers.diseno
          ? "Perfecto 👍 dime el nombre del negocio y qué vende u ofrece."
          : "Entendido 👍 ¿Deseas agregar instalación?"
      );
    }

    /* ================= PASO 4: INFO NEGOCIO ================= */
    if (state.step === 4 && state.answers.diseno) {
      state.answers.negocio = msg;
      state.step = 5;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "Excelente 👌 ¿Deseas agregar instalación?"
      );
    }

    /* ================= PASO 5: INSTALACIÓN ================= */
    if (state.step === 5) {
      state.answers.instalacion =
        lower.includes("si") || lower.includes("sí");

      if (!state.answers.instalacion) {
        await saveState(from, {});
        return reply(
          res,
          twiml,
          "Perfecto 👍 Te preparo la cotización formal de impresión."
        );
      }

      state.step = 6;
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "¿A qué altura aproximada irá instalada la lona?"
      );
    }

    /* ================= PASO 6: ALTURA ================= */
    if (state.step === 6) {
      state.answers.altura = msg;

      const installPrice = 600; // base ajustable
      const total =
        state.answers.precioImpresion + installPrice;

      await saveState(from, {});

      return reply(
        res,
        twiml,
        `🧾 Cotización final:\n` +
        `💰 Impresión: $${state.answers.precioImpresion} MXN\n` +
        `🛠 Instalación: $${installPrice} MXN\n` +
        `✅ TOTAL: $${total} MXN\n\n` +
        `¿Deseas que te envíe la cotización formal en PDF?`
      );
    }

    await saveState(from, {});
    return reply(res, twiml, "Seguimos 👍");

  } catch (err) {
    console.error("CHAT ERROR:", err);
    await saveState(req.body.From, {});
    return reply(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

export default router;
