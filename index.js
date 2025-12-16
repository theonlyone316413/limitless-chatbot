import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// ======================
// ENV VARS
// ======================
const PORT = process.env.PORT || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ======================
// VALIDATION
// ======================
function requireEnv(name, value) {
  if (!value) {
    console.error(`❌ Missing env var: ${name}`);
    process.exit(1);
  }
}

requireEnv("OPENAI_API_KEY", OPENAI_API_KEY);
requireEnv("WHATSAPP_TOKEN", WHATSAPP_TOKEN);
requireEnv("WHATSAPP_PHONE_NUMBER_ID", WHATSAPP_PHONE_NUMBER_ID);
requireEnv("WHATSAPP_VERIFY_TOKEN", WHATSAPP_VERIFY_TOKEN);

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
  res.status(200).send("✅ Limitless WhatsApp Bot is running");
});

// ======================
// META WEBHOOK VERIFY
// ======================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const tokenClean = (token ?? "").trim();
  const envClean = (WHATSAPP_VERIFY_TOKEN ?? "").trim();

  console.log("🔐 VERIFY:", { mode, tokenClean, envClean });

  if (mode === "subscribe" && tokenClean === envClean) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).type("text/plain").send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ======================
// RECEIVE WHATSAPP MSG
// ======================
app.post("/webhook", async (req, res) => {
  // Respond fast to Meta
  res.sendStatus(200);

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

    if (!text.trim()) return;

    console.log("📩 Incoming:", { from, text });

    const reply = await generateAssistantReply(text);
    await sendWhatsAppMessage(from, reply);
  } catch (err) {
    console.error("🔥 Webhook error:", err);
  }
});

// ======================
// OPENAI RESPONSE
// ======================
async function generateAssistantReply(userText) {
  const systemPrompt = `
Eres el asistente oficial de Limitless Design Studio.
Responde en español, claro y profesional.
Pregunta solo lo necesario para cotizar.
Servicios: diseño gráfico, impresión, lonas, rótulos, vinil, herrería y publicidad.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userText },
    ],
    temperature: 0.6,
    max_tokens: 250,
  });

  return (
    response.choices?.[0]?.message?.content?.trim() ||
    "¿Podrías darme un poco más de información, por favor?"
  );
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

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error("❌ WhatsApp send failed:", resp.status, data);
  } else {
    console.log("✅ WhatsApp sent:", data?.messages?.[0]?.id);
  }
}

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📡 Webhook endpoint: /webhook");
});
