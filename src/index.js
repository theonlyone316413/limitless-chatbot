import express from "express";
import cors from "cors";
import OpenAI from "openai";

// import SYSTEM_FULL from "./prompts/system_full.js";
const SYSTEM_FULL = "Test prompt";

import redis from "./utils/redisClient.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper
const isVagueMessage = (text = "") => {
  const vague = ["hola", "buenas", "info", "precio", "hey", "hi", "hello"];
  return vague.includes(text.trim().toLowerCase());
};

// Webhook
app.post("/webhook", async (req, res) => {
  try {
    const from = req.body.From;
    const userMsg = (req.body.Body || "").trim();

    const stateKey = `state:${from}`;
    const stateRaw = await redis.get(stateKey);
    const state = stateRaw ? JSON.parse(stateRaw) : {};

    if (!state.oriented && isVagueMessage(userMsg)) {
      state.oriented = true;
      await redis.set(stateKey, JSON.stringify(state), { EX: 86400 });

      return res.status(200).send(
        "<Response><Message>Perfecto. Buscas cotizar un producto o conocer alguno de nuestros servicios?</Message></Response>"
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_FULL },
        { role: "user", content: userMsg },
      ],
      temperature: 0.4,
    });

    const reply = completion.choices[0].message
