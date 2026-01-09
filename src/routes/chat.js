import express from "express";
import twilio from "twilio";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

router.post("/", (req, res) => {
  try {
    const twiml = new MessagingResponse();
    twiml.message("🟢 TEST OK — respuesta TwiML válida");

    res.status(200);
    res.set("Content-Type", "text/xml");
    res.end(twiml.toString());
  } catch (err) {
    console.error("❌ TEST ERROR:", err);
    res.status(500).send("error");
  }
});

export default router;
