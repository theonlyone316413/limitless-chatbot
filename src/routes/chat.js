import express from "express";
import twilio from "twilio";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

const GREETINGS = ["hola", "buenas", "hello", "hi", "hey"];
const PRICE_INTENT = [
  "cuanto cuesta",
  "cuánto cuesta",
  "precio",
  "cuanto me cuesta",
  "cuánto me cuesta",
  "costo",
];

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim();
    const text = msg.toLowerCase();

    let state = (await getState(from)) || { step: 0, answers: {} };

    const isGreetingOnly =
      GREETINGS.includes(text) && text.split(" ").length <= 2;

    const wantsPrice = PRICE_INTENT.some(p => text.includes(p));

    // 👋 SALUDO PURO
    if (isGreetingOnly) {
      await saveState(from, { step: 0, answers: {} });
      return sendMessage(
        twiml,
        res,
        "¡Hola! 👋 ¿Qué te gustaría cotizar hoy? (lona, toldo, vinil, rótulo)"
      );
    }

    // DETECTAR SERVICIO
    if (!state.service) {
      const detected = detectService(text);

      if (detected?.service === "lona") {
        state.service = "lona";
        state.step = 1;
        await saveState(from, state);

        return sendMessage(
          twiml,
          res,
          "Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?"
        );
      }

      return sendMessage(
        twiml,
        res,
        "Perfecto 👍 dime un poco más sobre lo que necesitas."
      );
    }

    // PASO 1: USO
    if (state.service === "lona" && state.step === 1) {
      state.answers.uso = text;
      state.step = 2;
      await saveState(from, state);

      return sendMessage(
        twiml,
        res,
        "Gracias. ¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 5 x 1)"
      );
    }

    // PASO 2: MEDIDAS
    if (state.service === "lona" && state.step === 2) {
      const match = text.match(/(\d+(?:\.\d+)?)\s*(?:x|por)\s*(\d+(?:\.\d+)?)/);

      if (!match) {
        return sendMessage(
          twiml,
          res,
          "¿Me confirmas las medidas? Ejemplo: 5 x 1"
        );
      }

      const ancho = Number(match[1]);
      const alto = Number(match[2]);
      const area = ancho * alto;

      state.answers.ancho = ancho;
      state.answers.alto = alto;
      state.step = 3;

      await saveState(from, state);

      return sendMessage(
        twiml,
        res,
        `💰 Para una lona de *${area} m²* te ofrezco:\n\n` +
          `🟢 *Lona 13 oz* (opción económica)\n` +
          `🔵 *Lona 18 oz* (más resistente al sol y la lluvia)\n\n` +
          `👉 ¿Cuál opción te interesa cotizar?`
      );
    }

    // PASO 3: MATERIAL + PRECIO
    if (state.service === "lona" && state.step === 3) {
      const area = state.answers.ancho * state.answers.alto;

      const is18 = text.includes("18");
      const is13 = text.includes("13") || text.includes("econ");

      if (!is18 && !is13) {
        return sendMessage(
          twiml,
          res,
          "¿Prefieres la lona 13 oz (económica) o 18 oz (más resistente)?"
        );
      }

      const price =
        is18
          ? { min: 180 * area, max: 260 * area }
          : { min: 120 * area, max: 180 * area };

      await saveState(from, {});

      return sendMessage(
        twiml,
        res,
        `💵 *Cotización estimada*\n\n` +
          `📐 ${state.answers.ancho} x ${state.answers.alto} m (${area} m²)\n` +
          `🧵 Lona ${is18 ? "18 oz" : "13 oz"}\n\n` +
          `💰 *Precio:* $${price.min} – $${price.max} MXN\n\n` +
          `Incluye impresión en alta resolución.\n` +
          `👉 ¿Deseas agregar instalación o te preparo cotización formal?`
      );
    }

    return sendMessage(
      twiml,
      res,
      "Perfecto 👍 ¿me das un poco más de detalle?"
    );

  } catch (error) {
    console.error("CHAT ERROR:", error);
    return sendMessage(
      twiml,
      res,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

// ✅ ÚNICA FUNCIÓN DE RESPUESTA
function sendMessage(twiml, res, text) {
  twiml.message(text);
  res.type("text/xml");
  res.send(twiml.toString());
}

export default router;
