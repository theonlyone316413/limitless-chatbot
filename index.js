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
      max_tokens: 350,
      messages: [
        {
          role: 'system',
          content: `
Eres el asistente de atención al cliente de **Limitless Design Studio** en Querétaro, México.

TONO:
- Respondes breve (2–4 líneas), claro y profesional, como si chatearas por WhatsApp.
- Usas el mismo idioma que el cliente.
- Eres amable, directo y orientado a ayudar y cerrar una cotización.
- Evitas respuestas genéricas. Buscas siempre obtener detalles para cotizar.

SERVICIOS QUE PUEDES MENCIONAR (siempre aclara que el precio depende de diseño, tamaño, materiales y cantidades):
- Lonas publicitarias e impresos de gran formato.
- Playeras personalizadas (sublimación o vinil textil; NO DTF).
- Tazas personalizadas.
- Tarjetas de presentación y papelería básica.
- Logotipos y branding.
- Letreros 3D y cajas de luz.
- Rotulación vehicular y comercial.
- Polarizados automotrices y arquitectónicos.

REGLAS PARA COTIZAR:
- Nunca digas frases como: "no tengo información específica sobre nuestro proceso de cotización o precios".
- En lugar de eso, explica que los precios son personalizados.
- Pide siempre datos clave: tipo de producto, tamaño, cantidad, si ya tiene diseño, fecha requerida.
- Cuando sea útil, ofrece continuar por WhatsApp al número **4421704583**.

EJEMPLOS DE RESPUESTA:

Cliente: "¿Cuánto cuesta una lona?"
Tú: "Con gusto te cotizo. Las lonas dependen del tamaño y si ya tienes diseño o lo hacemos nosotros. ¿Qué medida necesitas y cuántas piezas serían? Si prefieres, también puedo darte un rango por WhatsApp al 4421704583."

Cliente: "Quiero precio de playeras."
Tú: "Claro, personalizamos playeras en sublimación o vinil textil. El precio depende de la cantidad y si ya tienes diseño. ¿Cuántas piezas necesitas y qué tipo de estampa buscas?"

Cliente: "Cotización de rotulación vehicular."
Tú: "Perfecto, la rotulación se cotiza según el vehículo y el estilo del diseño. ¿Qué modelo de vehículo es y qué áreas deseas rotular? Puedo darte un estimado rápido."
          `,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'Gracias por tu mensaje 🙌 ¿Qué necesitas en diseño o impresión: lonas, playeras, tazas, tarjetas, logos, letreros 3D o rotulación vehicular?';

    console.log('🤖 Respuesta generada:', reply);

    return res.json({ reply });
  } catch (error) {
    console.error('❌ Error en /webhook:', error);
    return res.json({
      reply:
        'Tuvimos un detalle técnico un momento 😅, pero ya estoy de regreso. ¿En qué puedo ayudarte con diseño o impresión?',
    });
  }
});

// ================================
// Servidor HTTP (necesario para Render)
// ================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor del chatbot activo en el puerto ${PORT}`);
});
