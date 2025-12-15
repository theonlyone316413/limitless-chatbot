import express from "express";
import OpenAI from "openai";

const app = express();

// --- ENV ---
const PORT = process.env.PORT || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Cloud API temp/permanent token
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // Phone Number ID (no WABA)
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; // the string you typed in Meta webhook verify

// --- Basic checks (fail fast) ---
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

// --- Middleware ---
app.use(express.json({ limit: "2mb" }));

// --- OpenAI client ---
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Health check ---
app.get("/", (req, res) => {
  res.status(200).send("✅ Limitless WhatsApp bot is running");
});

// =======================================================
// 1) WEBHOOK VERIFY (Meta calls this with GET)
// Callback URL MUST point here: /webhook
// =======================================================
app.get("/webhook", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Meta expects: mode=subscribe & token matches
    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ Webhook verified!");
      return res.status(200).send(challenge);
    }

    console.warn("❌ Webhook verify failed:", { mode, token });
    return res.sendStatus(403);
  } catch (err) {
    console.error("❌ Webhook verify error:", err);
    return res.sendStatus(500);
  }
});

// =======================================================
// 2) WEBHOOK RECEIVE (Meta sends messages with POST)
// =======================================================
app.post("/webhook", async (req, res) => {
  // Always ACK fast so Meta doesn’t retry
  res.sendStatus(200);

  try {
    const body = req.body;

    // WhatsApp Cloud webhook structure
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const message = value?.messages?.[0];
    if (!message) return;

    const from = message.from; // user's WhatsApp number (wa_id)
    const msgType = message.type;

    let userText = "";

    if (msgType === "text") {
      userText = message.text?.body || "";
    } else if (msgType === "button") {
      userText = message.button?.text || "";
    } else if (msgType === "interactive") {
      // list reply / button reply
      const ir = message.interactive;
      userText =
        ir?.button_reply?.title ||
        ir?.list_reply?.title ||
        ir?.list_reply?.description ||
        "";
    } else {
      userText = `[${msgType}]`;
    }

    console.log("📩 Incoming:", { from, msgType, userText });

    // (Optional) ignore empty
    if (!userText.trim()) return;

    // Generate reply with OpenAI
    const reply = await generateAssistantReply(userText);

    // Send back to WhatsApp
    await sendWhatsAppText(from, reply);
  } catch (err) {
    console.error("❌ Error handling webhook:", err?.message || err);
  }
});

// =======================================================
// OpenAI Reply
// =======================================================
async function generateAssistantReply(userText) {
  const system =
    "Eres el asistente de Limitless Design Studio. Responde en español (y si el usuario mezcla inglés, puedes mezclar). Sé claro, rápido y útil. Pide datos mínimos si hace falta para cotizar o entender (tipo de producto, medidas, cantidad, urgencia, ubicación).";

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    temperature: 0.4,
    max_tokens: 220,
  });

  return resp.choices?.[0]?.message?.content?.trim() || "¿Me repites eso, porfa?";
}

// =======================================================
// WhatsApp Send
// Uses PHONE_NUMBER_ID (the one that looks like 8734...)
// =======================================================
async function sendWhatsAppText(to, text) {
  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    console.error("❌ WhatsApp send failed:", r.status, data);
  } else {
    console.log("✅ WhatsApp sent:", data?.messages?.[0]?.id || data);
  }
}

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Webhook: /webhook`);
});
