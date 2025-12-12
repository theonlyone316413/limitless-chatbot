import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// Inicializa OpenAI con la API Key desde Render
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===============================
// WEBHOOK PRINCIPAL (Tidio / WhatsApp futuro)
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    console.log("📩 Payload recibido:", req.body);

    // Mensaje que envía Tidio
    const userMessage = req.body.message || "Hola";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres el asistente virtual oficial de Limitless Design Studio en Querétaro, México.

Tu objetivo:
- Atender clientes de forma clara, profesional y amable.
- Ayudar con cotizaciones y servicios.

Servicios principales:
• Impresión digital
• Lonas y banners
• Playeras y textiles
• Tazas sublimadas
• Rotulación vehicular
• Vinil decorativo
• Diseño gráfico y branding
• Marketing digital

Reglas:
- Responde en español.
- Sé claro y directo.
- Si el cliente pide cotización, pregunta SOLO lo necesario:
  tipo de producto, medidas, cantidad y uso.
- No inventes precios exactos si no tienes datos.
- Mantén un tono humano y cercano.
`
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply = completion.choices[0].message.content;

    // 🔑 RESPUESTA CLAVE PARA TIDIO
    return res.json({
      reply: reply,
    });

  } catch (error) {
    console.error("❌ Error en webhook:", error);

    return res.json({
      reply:
        "⚠️ Hubo un problema técnico, pero con gusto puedo ayudarte. ¿Qué servicio te interesa?",
    });
  }
});

// ===============================
// RUTA RAÍZ (solo para ver que está vivo)
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Limitless WhatsApp Bot activo");
});

// ===============================
// INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor activo en puerto ${PORT}`);
});
