import express from "express";
import twilio from "twilio";
import { getState, saveState } from "../memory/stateManager.js";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

const GREETINGS = ["hola", "hola!", "buenas", "hello", "hi"];

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim();
    const lower = msg.toLowerCase();

    let state = (await getState(from)) || { step: null, data: {} };

    // ======================
    // SALUDO (RESET TOTAL)
    // ======================
    if (GREETINGS.some(g => lower.startsWith(g))) {
      await saveState(from, { step: "uso", data: {} });
      twiml.message("Perfecto 👍 ¿La lona es para fachada, evento o promoción temporal?");
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 1 — USO
    // ======================
    if (state.step === "uso") {
      state.data.uso = msg;
      state.step = "medidas";
      await saveState(from, state);

      twiml.message("Gracias. ¿Cuáles son las medidas aproximadas? (ejemplo: 3 x 1)");
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 2 — MEDIDAS
    // ======================
    if (state.step === "medidas") {
      const m = lower.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
      if (!m) {
        twiml.message("Indícame las medidas en formato ancho x alto (ejemplo: 3 x 1).");
        return res.type("text/xml").send(twiml.toString());
      }

      const ancho = parseFloat(m[1]);
      const alto = parseFloat(m[2]);
      const area = +(ancho * alto).toFixed(2);

      state.data = { ...state.data, ancho, alto, area };
      state.step = "material";
      await saveState(from, state);

      twiml.message(
        `Para ${area} m²:\n\n🟢 Lona 13 oz (económica)\n🔵 Lona 18 oz (exterior reforzada)\n\n¿Cuál opción prefieres?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 3 — MATERIAL
    // ======================
    if (state.step === "material") {
      const mat = lower.includes("18") ? "18" : "13";
      const price = mat === "18" ? state.data.area * 160 : state.data.area * 120;

      await saveState(from, {});
      twiml.message(
        `Cotización de impresión:\n\n${state.data.ancho} x ${state.data.alto} m\nLona ${mat} oz\n\n💵 Precio: $${price} MXN\n\n¿Deseas agregar instalación?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // FALLBACK
    // ======================
    twiml.message("Perfecto 👍 dime un poco más sobre lo que necesitas.");
    return res.type("text/xml").send(twiml.toString());

  } catch (err) {
    console.error("CHAT ERROR:", err);
    twiml.message("Ocurrió un error 🙏 intentemos nuevamente.");
    return res.type("text/xml").send(twiml.toString());
  }
});

export default router;
