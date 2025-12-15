import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Health check
app.get("/", (req, res) => {
  res.status(200).send("Limitless webhook is running ✅");
});

// ✅ Webhook verification (Meta calls this GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Log helpful info (no secrets)
  console.log("Webhook verify attempt:", { mode, tokenReceived: token });

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    // IMPORTANT: must return the challenge as plain text
    return res.status(200).type("text/plain").send(challenge);
  }

  console.log("❌ Webhook verify failed", {
    mode,
    tokenReceived: token,
    expectedToken: WHATSAPP_VERIFY_TOKEN,
  });
  return res.sendStatus(403);
});

// ✅ Webhook receiver (Meta sends events here POST)
app.post("/webhook", (req, res) => {
  // Always respond quickly so Meta doesn't retry
  res.sendStatus(200);

  try {
    console.log("Incoming webhook:", JSON.stringify(req.body));
    // Aquí ya luego procesas mensajes y respondes con tu lógica
  } catch (err) {
    console.error("Webhook POST error:", err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Webhook: /webhook");
});
