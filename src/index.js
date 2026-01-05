import express from "express";
import cors from "cors";
import OpenAI from "openai";

import SYSTEM_FULL from "./prompts/system_full.js";
import redis from "./utils/redisClient.js";

const app = express();

/* =========================
   MIDDLEWARES
========================= */
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/* =========================
   OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   HELPERS
========================= */
const isVagueMessage = (text = "") => {
  const vague = ["hola", "buenas", "info", "precio", "hey", "hi", "hello"];
  return vague.includes(text.trim().toLowerCase());
};

/* =========================
   WEBHOOK — TWILIO
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const from = req.body.From;
    const userMsg = (req.body.Body || "").trim();

    console.log("📩 FROM:", from);
    console.log("💬 MSG:", userMsg);

    /* -------- Re*
