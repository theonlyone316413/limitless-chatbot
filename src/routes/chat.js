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
const VISIT_REGEX = /\b(si|sí|ok|esta bien|está bien|prefiero visita|quiero visita|pueden venir|visita tecnica|visita técnica|no tengo medidas)\b/i;
const PRICE_REGEX = /\b(precio|cuanto cuesta|cuánto cuesta|costo|valor|cuanto sale)\b/i;
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

    // TTL
    if (state.lastInteraction && Date.now() - state.lastInteraction > TTL_24H) {
      state = {};
    }

    state.answers = state.answers || {};
    state.step = state.step || 0;

    const isGreeting = GREETING_REGEX.test(lowerMsg);
    const isEnglish = ENGLISH_REGEX.test(lowerMsg);

    // =============================
    // SALUDO (REINICIA SIEMPRE)
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
    // APOYO SI DUDA
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

      if (detected?.service) {
        state.service = detected.service;
        state.step = 1;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        // pregunta inicial genérica
        if (state.service === "toldo") {
          return reply(
            res,
            twiml,
            "Perfecto 👍 ¿El toldo lo necesitas fijo o desmontable?"
          );
        }

        if (serviceSteps[state.service]) {
          return reply(res, twiml, serviceSteps[state.service][0].question);
        }
      }

      return reply(
        res,
        twiml,
        "Perfecto 👍 dime un poco más para ayudarte."
      );
    }

    // =============================
    // FLUJO TOLDOS COMPLETO
    // =============================
    if (state.service === "toldo") {

      // PASO 1 — TIPO DE TOLDO
      if (state.step === 1) {
        state.answers.tipoToldo = incomingMsg;
        state.step = 2;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Gracias 👍\n¿Podrías indicarme las medidas aproximadas?\n(ancho y salida desde la pared)\n\nSi no cuentas con ellas, podemos agendar una visita técnica."
        );
      }

      // PASO 2 — PREGUNTA PRECIO (ESCALA)
      if (PRICE_REGEX.test(lowerMsg)) {
        await saveState(from, {});
        return reply(
          res,
          twiml,
          "Excelente pregunta 👍\n\nPara darte un costo específico, un asesor de producción revisará los materiales, estructura y condiciones de instalación.\n\nEn breve uno de nuestros asesores se pondrá en contacto contigo."
        );
      }

      // PASO 3 — ACEPTA VISITA
      if (VISIT_REGEX.test(lowerMsg)) {
        state.step = 3;
        state.lastInteraction = Date.now();
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Perfecto 👍 Para agendar la visita técnica, ¿podrías enviarnos tu ubicación o la dirección del lugar?"
        );
      }

      // PASO 4 — RECIBE UBICACIÓN
      if (state.step === 3) {
        state.answers.ubicacion = incomingMsg;
        await saveState(from, {});

        return reply(
          res,
          twiml,
          "Gracias 👍 Ya recibimos la ubicación.\nUn asesor de producción se pondrá en contacto contigo en breve para confirmar la visita técnica."
        );
      }

      // SI MANDA MEDIDAS
      return reply(
        res,
        twiml,
        "Perfecto 👍 Con esas medidas un asesor de producción revisará materiales y estructura para brindarte una cotización precisa."
      );
    }

    // =============================
    // FLUJO LONA (SE MANTIENE)
    // =============================
    if (state.service === "lona") {
      // (tu flujo de lona permanece intacto aquí)
      return reply(res, twiml, "Perfecto 👍 Continuamos con la cotización de tu lona.");
    }

    // =============================
    // FALLBACK
    // =============================
    return reply(
      res,
      twiml,
      "¿Podrías darme un poco más de detalle o escribir *hola* para comenzar de nuevo?"
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
