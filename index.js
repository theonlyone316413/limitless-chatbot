import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

// ================================
// Configuración básica
// ================================
const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================
// Webhook principal: aquí llega el mensaje de Tidio
// ================================
app.post('/webhook', async (req, res) => {
  const userMessage = (req.body.message || '').toString().trim();

  console.log('📩 Mensaje recibido de Tidio:', userMessage);

  // Si viene vacío, mandamos un saludo básico
  if (!userMessage) {
    return res.json({
      reply:
        'Hola 👋 Soy el asistente de Limitless Design Studio. Cuéntame qué necesitas en diseño o impresión y con gusto te ayudo.',
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `Eres el asistente de atención al cliente de **Limitless Design Studio** en Querétaro, México.

TONO:
- Respondes breve (2–4 líneas), claro y profesional, como si chatearas por WhatsApp.
- Usas el mismo idioma que el cliente (si escribe en inglés, respondes en inglés).
- Eres amable, directo y siempre orientado a ayudar y cerrar una cotización.

SERVICIOS QUE PUEDES MENCIONAR (explica siempre que el precio depende del diseño, tamaño, materiales y cantidades):
- Lonas publicitarias e impresos de gran formato.
- Playeras personalizadas (sublimación / vinil textil, NO DTF).
- Tazas personalizadas.
- Tarjetas de presentación y papelería básica.
- Diseño de logotipos y branding básico.
- Letreros 3D y cajas de luz.
- Rotulación vehicular y comercial.
- Polarizados (película para cristales).

POLÍTICA SOBRE PRECIOS:
- Nunca inventes precios exactos.
- Siempre aclara que el costo final depende del diseño, tamaño, cantidad y acabados.
- Invita a mandar referencia o idea para cotizar mejor.

DATOS DE CONTACTO:
- WhatsApp directo para cotizaciones: 4421704583.
- Invita a continuar por WhatsApp si el cliente quiere algo más específico o rápido.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      'Gracias por tu mensaje 🙌 ¿Qué necesitas en diseño o impresión?';

    console.log('🤖 Respuesta generada:', reply);

    return res.json({ reply });
  } catch (error) {
    console.error('❌ Error en /webhook:', error);

    return res.json({
      reply:
        'Tuvimos un detalle técnico un momento 🛠️, pero ya estoy de regreso. ¿Me cuentas otra vez qué necesitas en diseño o impresión?',
    });
  }
});

// ================================
// Servidor HTTP (necesario para Render)
// ================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor del chatbot activo en el puerto ${PORT}`);
});
