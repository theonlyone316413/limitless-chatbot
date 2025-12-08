import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

// Inicializar Express
const app = express();
app.use(express.json());

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Puerto para Render / local
const PORT = process.env.PORT || 3000;

// Ruta simple para probar que el servidor está vivo
app.get('/', (req, res) => {
  res.send('Chatbot de Limitless está activo 🔥');
});
// Webhook principal: aquí llega el mensaje de Tidio
app.post('/webhook', async (req, res) => {
  const userMessage = (req.body.message || '').toString().trim();

  console.log('💬 Mensaje recibido del usuario:', userMessage);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `
Eres el asistente de atención al cliente de **Limitless Design Studio** en Querétaro, México.

TONO:
- Respondes breve (2–4 líneas), claro y profesional, como si chatearas por WhatsApp.
- Usas el mismo idioma que el cliente (si escribe en inglés, respondes en inglés).
- Eres amable, directo y siempre orientado a ayudar y cerrar una cotización.

SERVICIOS QUE PUEDES MENCIONAR:
- Lonas publicitarias e impresos de gran formato.
- Playeras personalizadas (sublimación / vinil textil, NO DTF).
- Tazas personalizadas.
- Tarjetas de presentación y papelería básica.
- Logotipos e imagen de marca.
- Letreros 3D y rótulos comerciales.
- Rotulación vehicular y comercial (autos, camionetas, locales).
- Polarizados.

PRECIOS:
- Los precios SIEMPRE dependen de:
  - Medidas aproximadas.
  - Cantidad de piezas.
  - Si el cliente ya tiene diseño o hay que diseñarlo.
  - Tipo de material y acabados.
  - Si requiere instalación y en qué zona.
- Nunca inventes precios exactos.
- Si el cliente insiste, puedes usar frases tipo:
  - "Manejamos precios desde X, pero el costo final depende de medidas y cantidad."
  - "Para darte un precio real necesito medidas aproximadas y cuántas piezas necesitas."

OBJETIVO EN CADA RESPUESTA:
1. Entender qué quiere el cliente (lona, playeras, tazas, tarjetas, logo, letrero 3D, rotulación, polarizado).
2. Pedir 1–3 datos clave:
   - Medidas aproximadas.
   - Cantidad.
   - Si ya tiene diseño listo o hay que crear el diseño.
3. Ofrecer siguiente paso:
   - Preparar una cotización.
   - Proponer ideas rápidas de diseño si lo pide.

WHATSAPP:
- Cuando el cliente ya muestra interés real o pide cotización:
  - Invítalo a escribir a WhatsApp 👉 +52 442 170 4583
  - Dile que puede mandar fotos, ejemplos y medidas por ahí.

REGLAS:
- Si el mensaje es muy corto o confuso ("hola", "info", "cotización", "precio"), responde con saludo y 1–2 preguntas para aclarar lo que necesita.
- No hables de DTF (aún no ofrecemos ese servicio).
- Si preguntan algo fuera de diseño/impresión, responde muy breve y regresa la conversación a cómo Limitless puede ayudar con diseño, lonas, playeras, tazas, etc.

EJEMPLOS DE ESTILO:
- "¡Hola! 🙌 Claro que sí, ¿para qué tipo de trabajo lo necesitas: lona, playeras, tazas, logo, letrero o rotulación?"
- "Perfecto, para esa lona necesito saber medidas aproximadas y si ya tienes diseño o te lo hacemos."
- "Te puedo orientar por aquí, y si gustas afinamos detalles por WhatsApp al +52 442 170 4583 😉".
          `.trim(),
        },
        {
          role: 'user',
          content: userMessage || 'Cliente envió un mensaje vacío.',
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'Gracias por tu mensaje 🙌 ¿Qué necesitas en diseño o impresión: lona, playeras, tazas, tarjetas, logo, letrero 3D, rotulación o polarizado?';

    console.log('🤖 Respuesta generada:', reply);

    return res.json({ reply });
  } catch (error) {
    console.error('❌ Error en /webhook:', error);

    return res.json({
      reply:
        'Tuvimos un detalle técnico un momento 😅, pero con gusto te atendemos por WhatsApp en el +52 442 170 4583.',
    });
  }
});
// ===============================
// Servidor HTTP (necesario para Render)
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor del chatbot activo en el puerto ${PORT}`);
});
