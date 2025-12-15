import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

// ===== ENV VARS (con trim para evitar espacios invisibles) =====
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_TOKEN || "").trim();
const WHATSAPP_PHONE_NUMBER_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
const WHATSAPP_VERIFY_TOKEN = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();

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

// ===== OpenAI client =====
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Healthcheck
app.get("/", (req, res) => {
  res.status(200).send("✅ Limitless WhatsApp bot is running");
});

// ===== WEBHOOK VERIFY (Meta llama por GET) =====
app.get("/webhook", (req, res) => {
  const mode = (req.query["hub.mode"] || "").toString().trim();
  const token = (req.query["hub.verify_token"] || "").toString().trim();
  const challenge = (req.query["hub.challenge"] || "").toString();

  // Debug útil (sin filtrar secretos)
  console.log("🔎 Verify attempt:", { mode, tokenLen: token.length });

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verify failed:", { mode, token });
  return res.sendStatus(403);
});

// ===== WEBHOOK RECEIVE (Meta manda mensajes por POST) =====
app.post("/webhook", async (req, res) => {
  // Responde rápido para que Meta no reintente
  res.sendStatus(200);

  try {
    const body = req.body;

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const msg = value?.messages?.[0];
    if (!msg) return;

    const from = msg.from; // wa_id del usuario
    const text =
      msg.text?.body ||
      msg.button?.text ||
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      "";

    if (!from || !text.trim()) return;

    console.log("📩 Incoming:", { from, text });

    const reply = await generateAssistantReply(text.trim());
    await sendWhatsAppText(from, reply);
  } catch (err) {
    console.error("❌ Error in webhook handler:", err?.message || err);
  }
});

// ===== OpenAI reply =====
async function generateAssistantReply(userText) {
  const system =
    "Eres el asistente de Limitless Design Studio. Responde en español (y si el usuario mezcla inglés, puedes mezclar). Sé claro, rápido y útil. Pide datos mínimos para cotizar o entender: tipo de producto, medidas, cantidad, ciudad/ubicación y urgencia.";

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    temperature: 0.4,
    max_tokens: 220,
  });

  return (resp.choices?.[0]?.message?.content || "¿Me repites eso, porfa?").trim();
}

// ===== WhatsApp send =====
async function sendWhatsAppText(to, text) {
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

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

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error("❌ WhatsApp send failed:", resp.status, data);
  } else {
    console.log("✅ WhatsApp sent:", data?.messages?.[0]?.id || data);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Webhook: /webhook`);
});
