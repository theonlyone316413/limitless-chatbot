import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// ====== ENV (usa tus nombres actuales) ======
const PORT = process.env.PORT || 10000;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Bearer token (Cloud API)
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // 8734...
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; // texto que tú eliges
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function requireEnv(name, value) {
  if (!value) throw new Error(`Missing env var: ${name}`);
}

requireEnv("WHATSAPP_TOKEN", WHATSAPP_TOKEN);
requireEnv("WHATSAPP_PHONE_NUMBER_ID", PHONE_NUMBER_ID);
requireEnv("WHATSAPP_VERIFY_TOKEN", VERIFY_TOKEN);
requireEnv("OPENAI_API_KEY", OPENAI_API_KEY);

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ====== HEALTH ======
app.get("/", (req, res) => {
  res.status(200).send("OK - Limitless WhatsApp bot is running");
});

// ====== WEBHOOK VERIFY (Meta llama esto al configurar Webhook) ======
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ====== WEBHOOK RECEIVE (Meta manda mensajes aquí) ======
app.post("/webhook", async (req, res) => {
  try {
    // Responder rápido a Meta
    res.sendStatus(200);

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    if (!message) return;

    const from = message.from; // wa_id del usuario
    const text =
      message?.text?.body ||
      message?.button?.text ||
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title ||
      "";

    if (!text) return;

    // Respuesta con OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres el asistente de Limitless Design Studio. Responde en español claro, amable y directo. Pregunta lo mínimo para cotizar: tipo de producto (lona/rotulación/etc), medidas, cantidad, ubicación y urgencia.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "¡Listo! ¿Qué necesitas cotizar y de qué medidas?";

    await sendWhatsAppText(from, reply);
  } catch (err) {
    console.error("Webhook error:", err?.message || err);
  }
});

// ====== SEND MESSAGE (Cloud API) ======
async function sendWhatsAppText(to, body) {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("WhatsApp send failed:", resp.status, data);
  }
}

app.listen(PORT, () => {
  console.log(`Servidor funcionando en el puerto ${PORT}`);
});
