import express from "express";
import cors from "cors";

import chatRoute from "./routes/chat.js";
import quoteRoute from "./routes/quotes.js";
import servicesRoute from "./routes/services.js";

const app = express();

/* =========================
   MIDDLEWARES (IMPORTANTES)
========================= */
app.use(cors());

// PARA TWILIO (MUY IMPORTANTE)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/* =========================
   ROUTES EXISTENTES
========================= */
app.use("/chat", chatRoute);
app.use("/quote", quoteRoute);
app.use("/services", servicesRoute);

/* =========================
   👉 WEBHOOK PARA TWILIO
========================= */
app.post("/webhook", (req, res) => {
  console.log("🔥 WEBHOOK HIT FROM TWILIO");
  console.log("BODY:", req.body);

  const incomingMsg = req.body.Body || "Mensaje vacío";

  // RESPUESTA SIMPLE (PRUEBA)
  res.status(200).send(`
    <Response>
      <Message>
        🤖 Limitless AI activo.
        Recibí: "${incomingMsg}"
      </Message>
    </Response>
  `);
});

/* =========================
   ROOT (TEST)
========================= */
app.get("/", (req, res) => {
  res.send("🚀 Limitless AI backend running");
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("🔥 Limitless AI ONLINE on port", PORT);
});
