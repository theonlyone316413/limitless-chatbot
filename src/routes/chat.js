import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

/* =============================
   CONFIGURACIÓN BÁSICA
============================= */

const GREETINGS = [
  "hola", "hola!", "buenas", "buenos dias", "buenos días",
  "hey", "hello", "hi"
];

const PRICE_INTENT = [
  "precio", "cuanto cuesta", "cuánto cuesta",
  "cuanto me cuesta", "cuánto me cuesta", "costo", "vale"
];

/* =============================
   DETECTOR DE IDIOMA (ROBUSTO)
============================= */
function detectLanguage(text) {
  const spanishWords = [
    "hola", "buenas", "necesito", "lona", "precio", "cuanto",
    "fachada", "negocio", "quiero", "medidas", "instalacion",
    "diseño", "cotizacion", "pesos", "mxn"
  ];

  const lower = text.toLowerCase();
  for (const word of spanishWords) {
    if (lower.includes(word)) return "es";
  }
  return "en";
}

/* =============================
   RESPUESTA TWILIO SEGURA
============================= */
function reply(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

/* =============================
   ENDPOINT PRINCIPAL
============================= */
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const lowerMsg = incomingMsg.toLowerCase();

    let state = (await getState(from)) || {};
    state.answers = state.answers || {};
    state.lang = state.lang || detectLanguage(incomingMsg);

    const isGreeting =
      GREETINGS.includes(lowerMsg) && lowerMsg.split(" ").length <= 2;

    const wantsPrice = PRICE_INTENT.some(p => lowerMsg.includes(p));

    /* =============================
       SALUDO → RESET CONTROLADO
    ============================= */
    if (isGreeting) {
      await saveState(from, { lang: state.lang });
      return reply(
        res,
        twiml,
        state.lang === "en"
          ? "Got it 👍 Tell me a bit about what you need."
          : "Perfecto 👍 Cuéntame un poco de lo que necesitas."
      );
    }

    /* =============================
       DETECTAR SERVICIO
    ============================= */
 

      if (detected?.service === "lona") {
        state.service = "lona";
        state.step = "uso";
        await saveState(from, state);

        return reply(
          res,
          twiml,
          "Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?"
        );
      }

      return reply(
        res,
        twiml,
        state.lang === "en"
          ? "Please tell me more about your project."
          : "Cuéntame un poco más sobre lo que necesitas."
      );
    }
if (!state.service) {

  // 🔒 FORZAR detección de lona por palabra clave
  if (lowerMsg.includes("lona") || lowerMsg.includes("banner")) {
    state.service = "lona";
    state.step = "uso";
    await saveState(from, state);

    return reply(
      res,
      twiml,
      "Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?"
    );
  }

  const detected = detectService(incomingMsg);

  if (detected?.service) {
    state.service = detected.service;
    state.step = "uso";
    await saveState(from, state);

    return reply(
      res,
      twiml,
      "Perfecto 👍 ¿Podrías contarme un poco más del uso que le darás?"
    );
  }

  return reply(
    res,
    twiml,
    "Perfecto 👍 Cuéntame un poco más de lo que necesitas."
  );
}

    /* =============================
       FLUJO LONA (LINEAL, SIN LOOP)
    ============================= */

    // 1️⃣ USO
    if (state.service === "lona" && state.step === "uso") {
      state.answers.uso = incomingMsg;
      state.step = "medidas";
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "Gracias. ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)"
      );
    }

    // 2️⃣ MEDIDAS
    if (state.service === "lona" && state.step === "medidas") {
      const match = incomingMsg.match(
        /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
      );

      if (!match) {
        return reply(
          res,
          twiml,
          "¿Podrías indicarme las medidas en formato ancho x alto? (ejemplo: 5 x 1)"
        );
      }

      state.answers.ancho = Number(match[1]);
      state.answers.alto = Number(match[2]);
      state.step = "material";
      await saveState(from, state);

      const area = state.answers.ancho * state.answers.alto;

      return reply(
        res,
        twiml,
        `Para una lona de *${area} m²* te ofrezco:\n\n` +
        `🟢 Lona 13 oz (opción económica)\n` +
        `🔵 Lona 18 oz (más resistente al sol y la lluvia)\n\n` +
        `👉 ¿Cuál opción prefieres?`
      );
    }

    // 3️⃣ MATERIAL → PRECIO IMPRESIÓN
    if (state.service === "lona" && state.step === "material") {
      const material =
        lowerMsg.includes("18") ? "18 oz" : "13 oz";

      state.answers.material = material;
      state.step = "diseno";
      await saveState(from, state);

      const area = state.answers.ancho * state.answers.alto;
      const precio =
        material === "18 oz"
          ? area * 160
          : area * 120;

      return reply(
        res,
        twiml,
        `🧾 Cotización de impresión:\n\n` +
        `• Medidas: ${state.answers.ancho} x ${state.answers.alto} m\n` +
        `• Material: Lona ${material}\n` +
        `• Precio impresión: *$${precio} MXN*\n\n` +
        `¿Cuentas con diseño o deseas que lo desarrollemos?`
      );
    }

    // 4️⃣ DISEÑO
    if (state.service === "lona" && state.step === "diseno") {
      state.answers.diseno = incomingMsg;
      state.step = "instalacion";
      await saveState(from, state);

      return reply(
        res,
        twiml,
        "Perfecto 👍 ¿Deseas agregar instalación?"
      );
    }

    // 5️⃣ INSTALACIÓN
    if (state.service === "lona" && state.step === "instalacion") {
      state.answers.instalacion = incomingMsg;

      await saveState(from, {});

      return reply(
        res,
        twiml,
        "Excelente 👍 Con esta información puedo prepararte la cotización formal y tiempos de entrega."
      );
    }

    // FALLBACK
    return reply(
      res,
      twiml,
      "Perfecto 👍 continuamos."
    );

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);
    return reply(
      res,
      twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

export default router;
