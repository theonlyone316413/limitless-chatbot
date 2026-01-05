import express from "express";
import cors from "cors";
import OpenAI from "openai";

import SYSTEM_FULL from "./prompts/system_full.js";
import SYSTEM_LIGHT from "./prompts/system_light.js";

import chatRoute from "./routes/chat.js";
import quoteRoute from "./routes/quotes.js";
import servicesRoute from "./routes/services.js";

import redis from "./utils/redisClient.js";

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.urlencoded({ extended: false })); // Twilio
app.use(express.json());

/* =========================
   HELPERS
========================= */
const isVagueMessage = (text = "") => {
  const vague = [
    "hola",
    "buenas",
    "info",
    "precio",
    "cotizacion",
    "cotización",
    "hey",
    "hi",
    "hello",
  ];
  return vague.includes(text.trim().toLowerCase());
};

const needsClarification = (te
