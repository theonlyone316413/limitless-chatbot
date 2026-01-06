import client from "./openaiClient.js";
import SYSTEM_PROMPT from "../prompts/system_light.js";

export async function generateReply({ message, state }) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `
Servicio actual: ${state?.service || "no definido"}
Paso actual: ${state?.step || "inicio"}

Mensaje del cliente:
"${message}"
        `,
      },
    ],
    temperature: 0.6,
  });

  return response.output_text.trim();
}
