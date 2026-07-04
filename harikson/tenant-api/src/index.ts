import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Imports Routers
import chatRouter from "./routes/chat.js";
import documentsRouter from "./routes/documents.js";
import widgetRouter from "./routes/widget.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Logger
app.use((req, _res, next) => {
  console.log(`📡 [Tenant API] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  return res.status(200).json({ status: "healthy", tenant: process.env.TENANT_NAME || "local" });
});

// Map routes
app.use("/chat", chatRouter);
app.use("/documents", documentsRouter);
app.use("/", widgetRouter); // Serves /widget.js at the root domain namespace

app.listen(port, () => {
  console.log(`⚡ [Tenant API Engine] Deployed successfully on port ${port}`);
});
