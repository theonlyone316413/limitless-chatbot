import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/', (req, res) => {
  res.send('Chatbot de Limitless está activo 🔥');
});

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message || "Hola";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Eres un asistente para Limitless Design Studio. Responde claro, amable y profesional."
        },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Hubo un error procesando tu mensaje." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor funcionando en el puerto " + PORT);
});
