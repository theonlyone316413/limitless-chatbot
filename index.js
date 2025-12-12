import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Limitless WhatsApp Bot activo");
});

// Webhook para Tidio / WhatsApp / futuro
app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.json({
        reply: "¿Me puedes escribir tu consulta para ayudarte mejor? 😊"
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres el asistente oficial de Limitless Design Studio (Querétaro, México).

Servicios:
- Lonas publicitarias
- Rotulación vehicular
- Vinil (corte y full color)
- Sublimación
- Playeras personalizadas
- Tarjetas, volantes, etiquetas
- Señalética y anuncios

Reglas:
- Español claro y profesional
- Tono amable y cercano
- Guía al cliente paso a paso
- Pide datos solo cuando sea necesario
`
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    // 🔑 ESTO ES LO QUE TIDIO NECESITA
    res.json({ reply });

  } catch (error) {
    console.error("❌ Error:", error);
    res.json({
      reply: "Hubo un error técnico 😅, intenta nuevamente en unos segundos."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot corriendo en puerto ${PORT}`);
});
