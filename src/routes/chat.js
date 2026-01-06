import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();

// ===============================
// WEBHOOK PRINCIPAL (TWILIO)
// ===============================
router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const msg = (req.body.Body || "").trim().toLowerCase();

    let state = await getState(from);
    if (!state) state = {};

    // ===============================
    // 1️⃣ DETECTAR SERVICIO (solo una vez)
    // ===============================
    if (!state.service) {
      const detected = detectService(msg);

      if (detected) {
        state.service = detected.service;
        state.step = "inicio";
        await saveState(from, state);
      }
    }

    let reply = "Perfecto, cuéntame un poco más para ayudarte mejor.";

    // ===============================
    // 2️⃣ FLUJO POR SERVICIO
    // ===============================
    if (state.service === "lona") {
      if (state.step === "inicio") {
        reply =
          "Perfecto. Para ayudarte mejor, ¿la lona es para fachada, evento o promoción temporal?";
        state.step = "uso";
      }

      else if (state.step === "uso") {
        reply =
          "Gracias. ¿Podrías compartirme las medidas aproximadas de la lona?";
        state.step = "medidas";
      }

      else if (state.step === "medidas") {
        reply =
          "Excelente. ¿Ya cuentas con diseño o logotipo, o prefieres algo sencillo?";
        state.step = "diseno";
      }

      else if (state.step === "diseno") {
        reply =
          "Perfecto. Con esa información puedo ofrecerte opciones profesionales de material y acabado según lo que buscas.";
        state.step = "listo";
      }
    }

    // ===============================
    // 3️⃣ GUARDAR ESTADO
    // ===============================
    await saveState(from, state);

    // ===============================
    // 4️⃣ RESPUESTA OBLIGATORIA TWILIO
    // ===============================
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);
  } catch (err) {
    console.error("❌ Error en /chat:", err);

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Ocurrió un error, intenta nuevamente.</Message>
      </Response>
    `);
  }
});

export default router;
