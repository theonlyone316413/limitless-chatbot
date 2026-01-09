import express from "express";
import twilio from "twilio";
import { getState, saveState } from "../memory/stateManager.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

// =============================
// CONFIGURACIÓN COMERCIAL (MXN)
// =============================
const PRICE_M2 = {
  "13": 120, // lona 13 oz
  "18": 160, // lona 18 oz
};

const INSTALL_BY_HEIGHT = [
  { max: 2.5, price: 450 },
  { max: 4.0, price: 750 },
  { max: 6.0, price: 1100 },
];

const ADDONS = {
  uv: 35,        // barniz UV por m2
  ptr: 650,      // bastidor PTR base (hasta 5 m2)
  ptrExtra: 120, // PTR extra por m2 adicional
};

const GREETINGS = ["hola", "hola!", "buenas", "hello", "hi"];

// =============================
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim();
    const lower = msg.toLowerCase();

    let state = (await getState(from)) || {
      flow: null,
      step: null,
      data: {},
    };

    // =============================
    // SALUDO ÚNICO (RESET REAL)
    // =============================
    if (GREETINGS.includes(lower)) {
      await saveState(from, { flow: null, step: null, data: {} });
      return send(twiml, res, "¡Hola! 👋 Cuéntame qué proyecto tienes en mente.");
    }

    // =============================
    // DETECCIÓN DIRECTA LONA
    // =============================
    if (!state.flow && lower.includes("lona")) {
      state.flow = "lona";
      state.step = "uso";
      await saveState(from, state);
      return send(twiml, res, "Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?");
    }

    // =============================
    // FLUJO LONA (CONTROL TOTAL)
    // =============================
    if (state.flow === "lona") {

      // PASO 1 — USO
      if (state.step === "uso") {
        state.data.uso = msg;
        state.step = "medidas";
        await saveState(from, state);
        return send(twiml, res, "Gracias. ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)");
      }

      // PASO 2 — MEDIDAS
      if (state.step === "medidas") {
        const m = lower.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
        if (!m) {
          return send(twiml, res, "Indícame las medidas en formato ancho x alto (ejemplo: 3 x 1).");
        }
        const ancho = parseFloat(m[1]);
        const alto = parseFloat(m[2]);
        const area = +(ancho * alto).toFixed(2);

        state.data = { ...state.data, ancho, alto, area };
        state.step = "material";
        await saveState(from, state);

        return send(
          twiml,
          res,
          `🧾 Para *${area} m²*:\n\n` +
          `🟢 Lona 13 oz — $${area * PRICE_M2["13"]} MXN\n` +
          `🔵 Lona 18 oz — $${area * PRICE_M2["18"]} MXN\n\n` +
          `¿Cuál opción prefieres?`
        );
      }

      // PASO 3 — MATERIAL
      if (state.step === "material") {
        const mat = lower.includes("18") ? "18" : lower.includes("13") ? "13" : null;
        if (!mat) {
          return send(twiml, res, "¿Prefieres lona 13 oz (económica) o 18 oz (reforzada)?");
        }
        const pricePrint = state.data.area * PRICE_M2[mat];
        state.data.material = mat;
        state.data.pricePrint = pricePrint;
        state.step = "extras";
        await saveState(from, state);

        return send(
          twiml,
          res,
          `💰 *Impresión:* $${pricePrint} MXN\n` +
          `Opcionales:\n` +
          `• Barniz UV (+$${ADDONS.uv}/m²)\n` +
          `• Bastidor PTR (estructura metálica)\n\n` +
          `¿Deseas agregar algún extra? (UV / PTR / ninguno)`
        );
      }

      // PASO 4 — EXTRAS
      if (state.step === "extras") {
        let extrasText = "Sin extras";
        let extrasPrice = 0;

        if (lower.includes("uv")) {
          extrasPrice += Math.round(state.data.area * ADDONS.uv);
          extrasText = "Barniz UV";
        }

        if (lower.includes("ptr")) {
          const base = ADDONS.ptr;
          const extraM2 = Math.max(0, state.data.area - 5);
          extrasPrice += base + Math.round(extraM2 * ADDONS.ptrExtra);
          extrasText = extrasText === "Sin extras" ? "Bastidor PTR" : extrasText + " + PTR";
        }

        state.data.extrasText = extrasText;
        state.data.extrasPrice = extrasPrice;
        state.step = "instalacion";
        await saveState(from, state);

        return send(
          twiml,
          res,
          `Extras: *${extrasText}* ${extrasPrice ? `(+ $${extrasPrice} MXN)` : ""}\n\n` +
          `¿Deseas agregar instalación?`
        );
      }

      // PASO 5 — INSTALACIÓN
      if (state.step === "instalacion") {
        if (lower.includes("no")) {
          const total = state.data.pricePrint + (state.data.extrasPrice || 0);
          await saveState(from, {});
          return send(
            twiml,
            res,
            `✅ *Total impresión:* $${total} MXN\n` +
            `¿A nombre de quién preparo la cotización formal?`
          );
        }
        if (lower.includes("si") || lower.includes("sí")) {
          state.step = "altura";
          await saveState(from, state);
          return send(twiml, res, "¿A qué altura aproximada se instalaría la lona?");
        }
        return send(twiml, res, "¿Deseas agregar instalación? (sí / no)");
      }

      // PASO 6 — ALTURA
      if (state.step === "altura") {
        const hMatch = lower.match(/(\d+(?:\.\d+)?)/);
        if (!hMatch) {
          return send(twiml, res, "Indícame la altura aproximada en metros.");
        }
        const h = parseFloat(hMatch[1]);
        const install = INSTALL_BY_HEIGHT.find(x => h <= x.max) || INSTALL_BY_HEIGHT.at(-1);

        const total =
          state.data.pricePrint +
          (state.data.extrasPrice || 0) +
          install.price;

        await saveState(from, {});
        return send(
          twiml,
          res,
          `🧾 *Resumen final*\n` +
          `• Impresión: $${state.data.pricePrint} MXN\n` +
          `• Extras: $${state.data.extrasPrice || 0} MXN\n` +
          `• Instalación: $${install.price} MXN\n\n` +
          `💵 *Total:* $${total} MXN\n\n` +
          `¿A nombre de quién preparo la cotización formal?`
        );
      }
    }

    // =============================
    // FALLBACK
    // =============================
    return send(twiml, res, "Perfecto 👍 dime un poco más sobre lo que necesitas.");

  } catch (err) {
    console.error("❌ CHAT ERROR:", err);
    return send(twiml, res, "Ocurrió un error 🙏 intentemos nuevamente.");
  }
});

// =============================
function send(twiml, res, text) {
  twiml.message(text);
  res.type("text/xml");
  res.send(twiml.toString());
}

export default router;
