import express from "express";
import twilio from "twilio";

import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

// =============================
// CONSTANTES
// =============================
const GREETINGS = [
  "hola", "hola!", "buenas", "buenos dias", "buenos días",
  "hey", "hello", "hi"
];

const PRICE_INTENT = [
  "cuanto cuesta", "cuánto cuesta", "precio",
  "cuanto me cuesta", "cuánto me cuesta",
  "costo", "vale"
];

// precios base MXN (IMPRESIÓN)
const PRICE_TABLE = {
  lona13: 120, // por m2
  lona18: 160  // por m2
};

// =============================
// ROUTE
// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim();
    const lower = msg.toLowerCase();

    let state = (await getState(from)) || {
      phase: "inicio",
      service: null,
      answers: {}
    };

    // =============================
    // SALUDO (RESET CONTROLADO)
    // =============================
    if (GREETINGS.includes(lower) && lower.split(" ").length <= 2) {
      await saveState(from, {
        phase: "inicio",
        service: null,
        answers: {}
      });

      return send(res, twiml,
        "¡Hola! 👋 Cuéntame qué proyecto tienes en mente."
      );
    }

    // =============================
    // DETECTAR SERVICIO
    // =============================
    if (!state.service) {
      const detected = detectService(msg);
      if (detected?.service) {
        state.service = detected.service;
        state.phase = "uso";
        await saveState(from, state);

        if (state.service === "lona") {
          return send(res, twiml,
            "Perfecto. ¿La lona es para fachada, evento o promoción temporal?"
          );
        }
      }

      return send(res, twiml,
        "Perfecto 👍 dime un poco más sobre lo que necesitas."
      );
    }

    // =============================
    // FLUJO LONA (CONTROLADO POR FASE)
    // =============================
    if (state.service === "lona") {

      // ---------- USO ----------
      if (state.phase === "uso") {
        state.answers.uso = msg;
        state.phase = "medidas";
        await saveState(from, state);

        return send(res, twiml,
          "Gracias. ¿Cuáles son las medidas aproximadas de la lona? (ejemplo: 5 x 1)"
        );
      }

      // ---------- MEDIDAS ----------
      if (state.phase === "medidas") {
        const match = lower.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);

        if (!match) {
          return send(res, twiml,
            "¿Podrías indicarme las medidas en formato ancho x alto? (ejemplo: 5 x 1)"
          );
        }

        const ancho = Number(match[1]);
        const alto = Number(match[2]);
        const area = ancho * alto;

        state.answers.ancho = ancho;
        state.answers.alto = alto;
        state.answers.area = area;
        state.phase = "material";

        await saveState(from, state);

        return send(res, twiml,
          `Perfecto 👍 Con ${area} m² puedo ofrecerte:\n\n` +
          `🟢 Lona 13 oz (opción económica)\n` +
          `🔵 Lona 18 oz (más resistente al sol y lluvia)\n\n` +
          `¿Cuál opción prefieres?`
        );
      }

      // ---------- MATERIAL ----------
      if (state.phase === "material") {
        if (lower.includes("13")) state.answers.material = "13";
        if (lower.includes("18")) state.answers.material = "18";

        if (!state.answers.material) {
          return send(res, twiml,
            "¿Prefieres lona 13 oz (económica) o 18 oz (alta resistencia)?"
          );
        }

        const pricePerM2 =
          state.answers.material === "18"
            ? PRICE_TABLE.lona18
            : PRICE_TABLE.lona13;

        const total = state.answers.area * pricePerM2;

        state.answers.precioImpresion = total;
        state.phase = "instalacion";

        await saveState(from, state);

        return send(res, twiml,
          `💰 Precio de impresión:\n` +
          `Lona ${state.answers.material} oz — *$${total} MXN*\n\n` +
          `¿Deseas agregar instalación?`
        );
      }

      // ---------- INSTALACIÓN ----------
      if (state.phase === "instalacion") {
        if (lower.includes("no")) {
          state.phase = "cierre";
          await saveState(from, state);

          return send(res, twiml,
            "Perfecto 👍 Si deseas, puedo prepararte la cotización formal con estos datos."
          );
        }

        if (lower.includes("si")) {
          state.phase = "altura";
          await saveState(from, state);

          return send(res, twiml,
            "Entendido. ¿A qué altura aproximada se instalaría la lona?"
          );
        }

        return send(res, twiml,
          "¿Deseas agregar instalación? (sí / no)"
        );
      }

      // ---------- ALTURA ----------
      if (state.phase === "altura") {
        state.answers.alturaInstalacion = msg;
        state.phase = "cierre";
        await saveState(from, state);

        return send(res, twiml,
          "Perfecto 👍 Con eso puedo calcular instalación y prepararte la cotización final."
        );
      }

      // ---------- CIERRE ----------
      if (state.phase === "cierre") {
        return send(res, twiml,
          "Excelente 👍 ¿Deseas que te prepare la cotización formal o incluir estructura PTR para un acabado más profesional?"
        );
      }
    }

    // =============================
    // FALLBACK
    // =============================
    return send(res, twiml,
      "Perfecto 👍 dime un poco más para ayudarte mejor."
    );

  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    return send(res, twiml,
      "Ocurrió un error 🙏 intentemos nuevamente."
    );
  }
});

// =============================
// SEND
// =============================
function send(res, twiml, text) {
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

export default router;
