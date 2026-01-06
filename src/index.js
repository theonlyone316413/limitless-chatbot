import express from "express";
import cors from "cors";

import { getState, saveState } from "./memory/stateManager.js";
import { detectService } from "./services/serviceDetector.js";
import { serviceSteps } from "./services/serviceSteps.js";

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const from = req.body.From;
  const msg = (req.body.Body || "").trim();

  let state = await getState(from);

  // 1️⃣ Detectar servicio si no existe
  if (!state.service) {
    const detected = detectService(msg);

    if (detected) {
      state.service = detected.service;
      state.stepIndex = 0;

      await saveState(from, state);

      const firstQuestion =
        serviceSteps[state.service][0].question;

      return res.send(
        `<Response><Message>${firstQuestion}</Message></Response>`
      );
    }
  }

  // 2️⃣ Avanzar pasos si ya hay servicio
  if (state.service && serviceSteps[state.service]) {
    const steps = serviceSteps[state.service];

    // Guardamos la respuesta anterior
    if (state.stepIndex !== undefined) {
      const currentStep = steps[state.stepIndex];
      state[currentStep.step] = msg;
      state.stepIndex += 1;
    }

    // Si hay más pasos, preguntar siguiente
    if (state.stepIndex < steps.length) {
      await saveState(from, state);

      const nextQuestion = steps[state.stepIndex].question;
      return res.send(
        `<Response><Message>${nextQuestion}</Message></Response>`
      );
    }

    // 3️⃣ Todos los pasos completos → cierre humano
    state.completed = true;
    await saveState(from, state);

    return res.send(
      `<Response><Message>
        Perfecto 😊 con esta información ya puedo ayudarte a preparar la cotización.
        Si deseas, te paso con un asesor para afinar detalles y tiempos de entrega.
      </Message></Response>`
    );
  }

  // 4️⃣ Fallback humano inicial
  const fallback =
    "Perfecto 😊 ¿Qué tipo de proyecto estás buscando?";
  await saveState(from, state);

  res.send(`<Response><Message>${fallback}</Message></Response>`);
});

app.get("/", (req, res) => {
  res.send("Limitless AI running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("SERVER UP"));
