router.post("/", (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message("🟢 TEST OK — Twilio sí llega al backend");
  res.type("text/xml");
  res.send(twiml.toString());
});
