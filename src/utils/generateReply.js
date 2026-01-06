import client from "./openaiClient.js";
import SYSTEM_PROMPT from "../prompts/system_light.js";

export async function generateReply({ message, state }) {
  const userPrompt = `
Contexto actual:
Servicio: ${state?.service || "no definido"}
Paso: ${state?.step || "inicio"}

Mensaje del cliente:
"${message}"
`;

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    temperature: 0.6,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return completion.choices[0].message.content.trim();
}
