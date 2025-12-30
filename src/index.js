import express from "express";
import cors from "cors";

import chatRoute from "./routes/chat.js";
import quoteRoute from "./routes/quotes.js";
import servicesRoute from "./routes/services.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/chat", chatRoute);
app.use("/quote", quoteRoute);
app.use("/services", servicesRoute);

app.get("/", (req, res) => {
  res.send("Limitless AI backend running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🔥 Limitless AI ONLINE");
});
