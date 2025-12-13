import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check (opcional)
app.get("/", (req, res) => {
  res.send("🚀 Limitless WhatsApp Bot activo");
});

// Webhook para Tidio
app.post("/webhook", async (req, res) => {
  try {
    const visitorMessage =
      req.body?.message ||
      req.body?.visitorMessage ||
      "Hola";

    console.log("📩 Mensaje recibido:", visitorMessage);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres el asistente inteligente de Limitless Design Studio en Querétaro, México.

Servicios:
- Sublimación
- Lonas y viniles
- Rotulación vehicular
- Publicidad impresa
- Branding y diseño gráfico

Reglas:
- Responde claro, profesional y amable
- Haz preguntas para cotizar
- No inventes precios, solicita medidas y cantidades
          `,
        },
        {
          role: "user",
          content: visitorMessage,
        },
      ],
      temperature: 0.6,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Hola 👋 ¿en qué puedo ayudarte?";

    console.log("🤖 Respuesta:", reply);

    // 👇 ESTO ES LO CLAVE PARA TIDIO
    res.json({
      reply: reply,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.json({
      reply:
        "Ocurrió un problema técnico 😅 pero puedo ayudarte si intentas de nuevo.",
    });
  }
});

// Puerto Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Bot corriendo en puerto ${PORT}`);
});
