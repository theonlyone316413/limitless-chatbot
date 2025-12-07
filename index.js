import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ruta principal solo para probar que está vivo
app.get('/', (req, res) => {
  res.send('Chatbot de Limitless está activo 🔥');
});

// Webhook principal: aquí va a llegar el mensaje de Tidio / WhatsApp
app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message || 'Hola';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente de atención al cliente para Limitless Design Studio.
Respondes corto, claro y amable. Hablas en el mismo idioma que el cliente.
Solo hablas de: diseño gráfico, impresión, lonas, vinil, sublimación, DTF, playeras, tazas, tarjetas de presentación, logotipos y publicidad.`,
        },
        { role: 'user', content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'Gracias por tu mensaje.';

    // Formato simple de respuesta
    return res.json({ reply });
  } catch (error) {
    console.error('Error en /webhook:', error);
    return res.json({
      reply: 'Tuvimos un problema al responder, intenta nuevamente más tarde.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de chatbot escuchando en el puerto ${PORT}`);
});
