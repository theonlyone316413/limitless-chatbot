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
    // SALUDO
    // ======================
    if (GREETINGS.some(g => lower.startsWith(g))) {
      state = { step: "uso", data: {} };
      await saveState(from, state);
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
        `Para ${area} m² puedo ofrecerte:\n\n🟢 Lona 13 oz (económica)\n🔵 Lona 18 oz (exterior reforzada)\n\n¿Cuál opción prefieres?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 3 — MATERIAL
    // ======================
    if (state.step === "material") {
      state.data.material = lower.includes("18") ? "18 oz" : "13 oz";
      state.step = "diseno";
      await saveState(from, state);

      twiml.message(
        "Perfecto 👍 ¿Ya cuentas con diseño o deseas que lo desarrollemos?\n\nTambién dime el nombre de tu negocio y a qué se dedica."
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 4 — DISEÑO
    // ======================
    if (state.step === "diseno") {
      state.data.disenoInfo = msg;
      state.step = "precio";
      await saveState(from, state);

      const precio =
        state.data.material === "18 oz"
          ? state.data.area * 160
          : state.data.area * 120;

      state.data.precio = precio;

      twiml.message(
        `Cotización de impresión:\n\n` +
        `${state.data.ancho} x ${state.data.alto} m\n` +
        `Lona ${state.data.material}\n` +
        `💵 Precio impresión: $${precio} MXN\n\n` +
        `¿Deseas agregar instalación?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ======================
    // PASO 5 — INSTALACIÓN
    // ======================
    if (state.step === "precio") {
      if (lower.includes("si")) {
        state.step = "altura";
        await saveState(from, state);
        twiml.message("Perfecto 👍 ¿A qué altura aproximada va instalada la lona?");
        return res.type("text/xml").send(twiml.toString());
      } else {
        await saveState(from, {});
        twiml.message("Excelente 👍 Te preparo la cotización formal de impresión.");
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ======================
    // PASO 6 — ALTURA
    // ======================
    if (state.step === "altura") {
      state.data.altura = msg;
      await saveState(from, {});
      twiml.message(
        "Perfecto 👍 Con esa información te preparo la cotización final con instalación incluida."
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
