import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// ======================
// ENV VARS
// ======================
const PORT = process.env.PORT || 10000;

const {
  OPENAI_API_KEY,
  WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
} = process.env;

// ======================
// BASIC VALIDATION
// ======================
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!WHATSAPP_TOKEN) throw new Error("Missing WHATSAPP_TOKEN");
if (!WHATSAPP_PHONE_NUMBER_ID) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID");
if (!WHATSAPP_VERIFY_TOKEN) throw new Error("Missing WHATSAPP_VERIFY_TOKEN");

// ======================
// OPENAI CLIENT
// ======================
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ======================
// ROOT
// ======================
app.get("/", (req, res) => {
  res.status(200).send("Limitless WhatsApp bot is running 🚀");
});

// ======================
// WEBHOOK VERIFY (META)
// ======================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔎 WEBHOOK VERIFY:", { mode, token, challenge });
  console.log("🔐 ENV TOKEN:", WHATSAPP_VERIFY_TOKEN);

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ======================
// WEBHOOK RECEIVE (MESSAGES)
// ======================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Always ACK Meta fast

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    if (!message) return;

    const from = message.from;
    const text =
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      "";

    if (!text) return;

    console.log("📩 Incoming:", from, text);

    const reply = await generateAssistantReply(text);
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("🔥 Webhook error:", err.message);
  }
});

// ======================
// OPENAI REPLY
// ======================
async function generateAssistantReply(userText) {
  const systemPrompt = `
Eres el asistente oficial de Limitless Design Studio.
Responde en español, claro, rápido y útil.
Pregunta lo mínimo necesario para cotizar o atender.
Servicios: diseño gráfico, impresión, lonas, rótulos, vinil, herrería, publicidad.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    temperature: 0.6,
    max_tokens: 250,
  });

  return response.choices[0].message.content || "¿Me repites por favor?";
}

// ======================
// SEND WHATSAPP MESSAGE
// ======================
async function sendWhatsAppMessage(to, body) {
  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

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

  const data = await resp.json();

  if (!resp.ok) {
    console.error("❌ WhatsApp send failed:", resp.status, data);
  } else {
    console.log("✅ WhatsApp message sent");
  }
}

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📡 Webhook endpoint: /webhook");
});
