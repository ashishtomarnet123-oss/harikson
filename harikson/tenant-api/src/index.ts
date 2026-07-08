import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Imports Routers
import chatRouter from "./routes/chat.js";
import documentsRouter from "./routes/documents.js";
import widgetRouter from "./routes/widget.js";
import memoryRouter from "./api/routes/memory.js";
import indexerRouter from "./api/routes/indexer.js";
import searchRouter from "./api/routes/search.js";
import contextRouter from "./api/routes/context.js";
import toolsRouter from "./api/routes/tools.js";
import orchestratorRouter from "./api/routes/orchestrator-routes.js";
import { HariksonScheduler } from "./workers/scheduler.js";

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
app.use("/memories", memoryRouter);
app.use("/workspace", indexerRouter);
app.use("/search", searchRouter);
app.use("/context", contextRouter);
app.use("/tools", toolsRouter);
app.use("/", orchestratorRouter);
app.use("/", widgetRouter); // Serves /widget.js at the root domain namespace

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  HariksonScheduler.startAll("00000000-0000-0000-0000-000000000000", "./", "00000000-0000-0000-0000-000000000001");
});
