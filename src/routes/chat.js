import express from "express";
import twilio from "twilio";

const router = express.Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

router.post("/", (req, res) => {
  const twiml = new MessagingResponse();
  twiml.message("🟢 TEST OK — Twilio sí llega al backend");
  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

export default router;
