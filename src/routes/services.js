import express from "express";
const router = express.Router();

router.post("/", (req, res) => {
  res.json({
    reply: "We offer graphic design, printing, signage, branding and marketing services."
  });
});

export default router;
