import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// =====================
// Health check
// =====================
app.get("/", (req, res) => {
  res.send("Limitless WhatsApp bot is running 🚀");
});

// =====================
// WEBHOOK VERIFY (GET)
// =====================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    return res.status(200).send(challenge);
  }

  console.error("❌ Webhook verification failed", { mode, token });
  return res.sendStatus(403);
});

// =====================
// WEBHOOK RECEIVE (POST)
// =====================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = message.text?.body;

    if (!text) return;

    console.log("📩 Incoming:", from, text);

    const reply = await generateAssistantReply(text);
    await sendWhatsAppText(from, reply);

  } catch (err) {
    console.error("❌ Error handling webhook:", err);
  }
});

// =====================
// OpenAI
// =====================
async function generateAssistantReply(userText) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres el asistente de Limitless Design Studio. Responde claro, rápido y profesional. Pide datos si faltan.",
        },
        { role: "user", content: userText },
      ],
      temperature: 0.6,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "¿Me repites por favor?";
}

// =====================
// WhatsApp Send
// =====================
async function sendWhatsAppText(to, text) {
  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("❌ WhatsApp send failed:", data);
  } else {
    console.log("✅ WhatsApp message sent");
  }
}

// =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
