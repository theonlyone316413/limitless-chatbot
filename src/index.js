import express from "express";
import cors from "cors";

import chatRoute from "./routes/chat.js";

const app = express();

app.use(cors());

// ⚠️ MUY IMPORTANTE para Twilio
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ✅ ESTA ES LA LÍNEA QUE PREGUNTAS
app.use("/chat", chatRoute);

// Ruta raíz solo para verificar que el server vive
app.get("/", (req, res) => {
  res.send("🚀 Limitless AI backend running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🔥 Limitless AI ONLINE on port", PORT);
});
