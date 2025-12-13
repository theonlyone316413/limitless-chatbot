import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔍 Ruta simple para verificar que Render está vivo
app.get("/", (req, res) => {
  res.send("🚀 Limitless WhatsApp Bot activo");
});

// 🤖 Webhook para Tidio
app.post("/webhook", async (req, res) => {
  try {
    const userMessage =
      req.body.message ||
      req.body.visitorMessage ||
      "Hola";

    console.log("📩 Mensaje recibido:", userMessage);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres el asistente virtual de Limitless Design Studio (Querétaro, México).

Tu trabajo:
- Atender clientes de diseño, impresión y publicidad.
- Ayudar con cotizaciones preliminares.
- Pedir datos claros: producto, medidas, cantidad y ciudad.
- Responder corto, profesional y amable.
- Si faltan datos, pregúntalos.
- No inventes precios exactos, da rangos aproximados.
Servicios:
- Lonas
- Vinil
- Rotulación vehicular
- Sublimación
- Tarjetas
- Flyers
- Letreros
          `,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const reply =
      completion.choices[0].message.content ||
      "¿En qué puedo ayudarte con tu diseño o impresión?";

    console.log("🤖 Respuesta:", reply);

    // 👇 ESTO ES LO CLAVE PARA TIDIO
    res.json({
      reply: reply,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.json({
      reply:
        "Ups 😅 hubo un problema técnico. ¿Podrías repetir tu mensaje?",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot escuchando en puerto ${PORT}`);
});
