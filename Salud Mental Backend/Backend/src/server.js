import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import emotionRoutes from "./routes/emotion.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import gamificationRoutes from "./routes/gamification.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Backend salud mental funcionando"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/emotions", emotionRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/gamification", gamificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada"
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});