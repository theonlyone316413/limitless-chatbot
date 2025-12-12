import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// =======================
// CONFIGURACIÓN
// =======================
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =======================
// VERIFICACIÓN WEBHOOK (META)
// =======================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// =======================
// RECEPCIÓN DE MENSAJES
// =======================
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from; // número del cliente
    const userMessage = message.text?.body;

    console.log("📩 Mensaje recibido:", userMessage);

    // =======================
    // MENSAJE A OPENAI
    // =======================
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: `
Eres el asistente oficial de ventas de:
"Limitless Design Studio"
Ubicación: Querétaro, México 🇲🇽

Estilo:
- Profesional
- Claro
- Cercano
- Orientado a cerrar ventas

Servicios que ofreces:
- Sublimación (playeras, tazas, termos)
- Vinil textil y vinil adhesivo
- Rotulación vehicular y comercial
- Lonas, banners, espectaculares
- Cajas de luz
- Señalética
- Diseño gráfico y branding

Reglas:
- SIEMPRE pregunta datos clave para cotizar:
  • qué producto
  • cantidad
  • medidas
  • uso (interior/exterior)
  • ciudad
- Da rangos de precios cuando falten datos
- NO inventes precios exactos sin info
- Usa español neutro mexicano
- Sé claro y ordenado
`
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content;

    // =======================
    // RESPONDER EN WHATSAPP
    // =======================
    await fetch(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          text: { body: reply }
        })
      }
    );

    console.log("✅ Respuesta enviada");
    res.sendStatus(200);

  } catch (error) {
    console.error("❌ Error:", error);
    res.sendStatus(200);
  }
});

// =======================
// SERVER
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Limitless WhatsApp Bot activo");
});

app.listen(PORT, () => {
  console.log(`🔥 Bot corriendo en puerto ${PORT}`);
});
