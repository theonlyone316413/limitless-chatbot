import express from "express";
import { getState, saveState } from "../memory/stateManager.js";
import { detectService } from "../services/serviceDetector.js";

const router = express.Router();

/**
 * Webhook principal para WhatsApp (Twilio)
 */
router.post("/", async (req, res) => {
  try {
    const from = req.body.From;
    const incomingMsg = (req.body.Body || "").trim();

    // Recuperar estado del usuario
    let state = await getState(from);

    // ===============================
    // 1️⃣ PRIMER MENSAJE (SIN ASESOR)
    // ===============================
    if (!state) {
      await saveState(from, {
        step: "INIT",
        lastMessage: incomingMsg,
        updatedAt: Date.now(),
      });

      return twilioReply(
        res,
        "¡Hola! ¿En qué puedo ayudarte hoy? ¿Buscas información sobre alguno de nuestros servicios?"
      );
    }

    // ===============================
    // 2️⃣ DETECTAR SERVICIO (si no existe)
    // ===============================
    if (!state.service) {
      const detected = detectService(incomingMsg);

      if (detected) {
        state.service = detected.service;
        state.step = "ASK_MEASURES";

        await saveState(from, state);

        // ❌ SIN asesor aquí
        return twilioReply(
          res,
          "Perfecto. Para ayudarte mejor, ¿qué medidas aproximadas necesitas para la lona?"
        );
      }

      return twilioReply(
        res,
        "Entendido. Cuéntame un poco más sobre lo que necesitas y con gusto te ayudo."
      );
    }

    // ===============================
    // 3️⃣ FLUJO LONA – PEDIR MEDIDAS
    // ===============================
    if (state.service === "lona" && state.step === "ASK_MEASURES") {
      state.measures = incomingMsg;
      state.step = "ASK_DESIGN";

      await saveState(from, state);

      return twilioReply(
        res,
        "Gracias. ¿Ya cuentas con diseño o logotipo, o prefieres algo sencillo?"
      );
    }

    // ===============================
    // 4️⃣ DESPUÉS DE INFO → AHORA SÍ OPCIONAL ASESOR
    // ===============================
    if (state.service === "lona" && state.step === "ASK_DESIGN") {
      state.design = incomingMsg;
      state.step = "READY_TO_QUOTE";

      await saveState(from, state);

      return twilioReply(
        res,
        "Excelente. Con esa información puedo orientarte mejor. Si deseas, puedo pasarte con un asesor para afinar materiales, tiempos y cotización."
      );
    }

    // ===============================
    // FALLBACK SEGURO
    // ===============================
    return twilioReply(
      res,
      "Perfecto, dime un poco más y continuamos."
    );
  } catch (error) {
    console.error("❌ Error en /chat:", error);
    return twilioReply(res, "Ocurrió un error, intenta nuevamente.");
  }
});

/**
 * Respuesta Twilio (TwiML)
 */
function twilioReply(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${message}</Message>
    </Response>
  `);
}

export default router;
