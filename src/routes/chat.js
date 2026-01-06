
import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";
console.log("🚨🚨🚨 CHAT.JS NUEVO — VERSION FINAL 🚨🚨🚨");


const router = express.Router();

/**
 * ⚠️ CRÍTICO PARA TWILIO
 * Twilio envía application/x-www-form-urlencoded
 */
router.use(express.urlencoded({ extended: false }));

router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();
    const msgLower = incomingMsg.toLowerCase();

    // 1️⃣ Obtener estado (siempre objeto)
    let state = await getState(from);

    // 2️⃣ RESET INTELIGENTE POR SALUDO
    const isGreeting =
      msgLower === "hola" ||
      msgLower === "hello" ||
      msgLower === "hi" ||
      msgLower === "buenas";

    if (isGreeting) {
      state = {};
    }

    // 3️⃣ Detectar servicio SOLO si no existe
    if (!state.service) {
      const detected = detectService(incomingMsg);
      if (detected) {
        state.service = detected.service;
        state.step = "inicio";
      }
    }

    let reply = "Perfecto, cuéntame un poco más para ayudarte mejor.";

    // 4️⃣ FLUJO LONA
    if (state.service === "lona") {
      if (state.step === "inicio") {
        reply =
          "Perfecto. Para ayudarte mejor, ¿la lona es para fachada, evento o promoción temporal?";
        state.step = "uso";
      } else if (state.step === "uso") {
        reply =
          "Gracias. ¿Podrías compartirme las medidas aproximadas de la lona?";
        state.step = "medidas";
      } else if (state.step === "medidas") {
        reply =
          "Excelente. ¿Ya cuentas con diseño o logotipo, o prefieres algo sencillo?";
        state.step = "diseno";
      } else if (state.step === "diseno") {
        reply =
          "Perfecto. Con esa información puedo ofrecerte opciones profesionales de material y acabado según lo que buscas.";
        state.step = "listo";
      }
    }

    // 5️⃣ Guardar estado
    await saveState(from, state);

    // 6️⃣ Respuesta Twilio
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${reply}</Message>
      </Response>
    `);
  } catch (error) {
    console.error("❌ Error en chat.js:", error);
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Ocurrió un error, intenta nuevamente.</Message>
      </Response>
    `);
  }
});

export default router;
