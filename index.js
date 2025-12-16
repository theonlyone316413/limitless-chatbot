import express from "express";
import OpenAI from "openai";
import axios from "axios";

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
// BASIC VALIDATION
// ======================
function requireEnv(name, value) {
  if (!value) {
    console.error(`❌ Missing env var: ${name}`);
    throw new Error(`Missing env var: ${name}`);
  }
}

requireEnv("OPENAI_API_KEY", OPENAI_API_KEY);
requireEnv("WHATSAPP_TOKEN", WHATSAPP_TOKEN);
requireEnv("WHATSAPP_PHONE_NUMBER_ID", WHATSAPP_PHONE_NUMBER_ID);
requireEnv("WHATSAPP_VERIFY_TOKEN", WHATSAPP_VERIFY_TOKEN);

// ======================
// OPENAI CLIENT
// ======================
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

  const tokenClean = (token ?? "").toString().trim();
  const envClean = (WHATSAPP_VERIFY_TOKEN ?? "").toString().trim();

  console.log("🔎 VERIFY:", { mode, tokenClean, envClean });

  if (mode === "subscribe" && tokenClean === envClean) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).type("text/plain").send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ======================
// WEBHOOK RECEIVE
// ======================
app.post("/webhook", async (req, res) => {
  // Always ACK Meta fast
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // ✅ Ignorar statuses (entregado/leído/etc.)
    if (value?.statuses?.length) {
      return;
    }

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
    console.error("🔥 Webhook error:", err?.response?.data || err?.message || err);
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
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userText },
    ],
    temperature: 0.6,
    max_tokens: 250,
  });

  return (
    response.choices?.[0]?.message?.content?.trim() ||
    "¿Me repites por favor?"
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

  try {
    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    console.log("✅ WhatsApp message sent:", resp.data?.messages?.[0]?.id || resp.data);
  } catch (err) {
    console.error(
      "❌ WhatsApp send failed:",
      err?.response?.status,
      err?.response?.data || err?.message
    );
  }
}

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("📡 Webhook endpoint: /webhook");
});
