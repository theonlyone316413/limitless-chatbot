import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// ===== OpenAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== Health check =====
app.get('/', (req, res) => {
  res.send('Chatbot de Limitless está activo 🔥');
});

// =====================================================
// ✅ 1) TIDIO WEBHOOK (sencillo)
// Tidio te manda { "message": "..." } y espera { "reply": "..." }
// =====================================================
app.post('/webhook', async (req, res) => {
  try {
    const message = (req.body?.message || '').toString().trim() || 'Hola';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente profesional para Limitless Design Studio. Responde claro, breve y amable. Responde en el idioma del cliente.',
        },
        { role: 'user', content: message },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      '¡Hola! ¿En qué te puedo ayudar hoy?';

    return res.json({ reply });
  } catch (err) {
    console.error('Error en /webhook (Tidio):', err);
    return res.json({
      reply: 'Hubo un error procesando tu mensaje. Intenta nuevamente.',
    });
  }
});

// =====================================================
// ✅ 2) WHATSAPP CLOUD API (META) WEBHOOK
// - GET  /whatsapp/webhook  (verificación)
// - POST /whatsapp/webhook  (mensajes entrantes)
// =====================================================

// 2.1) Verificación (Meta hace GET)
app.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2.2) Mensajes entrantes (Meta hace POST)
app.post('/whatsapp/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // A veces llegan status updates; mensajes vienen aquí:
    const messageObj = value?.messages?.[0];
    const from = messageObj?.from; // wa_id del cliente
    const text = messageObj?.text?.body;

    // Si no hay texto, salimos (puede ser imagen/estado/etc.)
    if (!from || !text) {
      return res.sendStatus(200);
    }

    // 1) Generar respuesta con OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente profesional para Limitless Design Studio. Responde claro, breve y amable. Si faltan datos, pregunta por medidas, cantidades, ubicación y tiempo de entrega. Responde en el idioma del cliente.',
        },
        { role: 'user', content: text },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      '¡Gracias! ¿Me das más detalles para ayudarte mejor?';

    // 2) Enviar respuesta por WhatsApp Cloud API
    await sendWhatsAppText(from, reply);

    // WhatsApp necesita 200 siempre para confirmar recepción
    return res.sendStatus(200);
  } catch (err) {
    console.error('Error en /whatsapp/webhook:', err);
    return res.sendStatus(200);
  }
});

// ===== Enviar texto por WhatsApp Cloud API =====
async function sendWhatsAppText(to, body) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error(
      'Faltan variables WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_TOKEN en Render.'
    );
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    console.error('WhatsApp send error:', data);
  }
  return data;
}

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor funcionando en el puerto ' + PORT);
});
