import express from "express";

const app = express();
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  OPENAI_API_KEY,
  MODEL = "gpt-4o-mini",
  SYSTEM_PROMPT = "Eres un asistente amable y directo de Limitless Design Studio. Responde en el idioma del cliente. Haz preguntas cortas para cotizar (medidas, material, cantidad, ubicación).",
} = process.env;

function mustEnv(name) {
  if (!process.env[name]) throw new Error(`Missing env var: ${name}`);
}
mustEnv("WHATSAPP_TOKEN");
mustEnv("PHONE_NUMBER_ID");
mustEnv("VERIFY_TOKEN");
mustEnv("OPENAI_API_KEY");

// --- Health check ---
app.get("/", (req, res) => res.status(200).send("OK"));

// --- Meta webhook verification (GET) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- Receive messages (POST) ---
app.post("/webhook", async (req, res) => {
  try {
    // Always ack quickly
    res.sendStatus(200);

    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const msg = value?.messages?.[0];
    if (!msg) return; // not a message event

    const from = msg.from; // user's phone number (WhatsApp ID)
    const text =
      msg?.text?.body ||
      (msg?.type === "button" ? msg?.button?.text : "") ||
      "";

    if (!from || !text) return;

    // Ignore messages sent by your own business number (optional safety)
    if (msg.from === PHONE_NUMBER_ID) return;

    const reply = await getAIReply(text);

    await sendWhatsAppText(from, reply);
  } catch (err) {
    console.error("WEBHOOK_ERROR:", err?.message || err);
  }
});

async function getAIReply(userText) {
  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("OPENAI_ERR:", t);
    return "¡Gracias! ¿Me dices qué necesitas (tipo de trabajo, medidas y cantidad) para cotizarte?";
  }

  const data = await r.json();
  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    "¡Gracias! ¿Me dices medidas y cantidad para cotizarte?"
  );
}

async function sendWhatsAppText(to, body) {
  const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const t = await r.text();
    console.error("WHATSAPP_SEND_ERR:", t);
  }
}

const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server listening on", port));
