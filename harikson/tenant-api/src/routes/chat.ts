import { Router, Request, Response } from "express";
import { z } from "zod";
import { RagService } from "../services/rag.service.js";
import { OllamaService } from "../services/ollama.service.js";
import { ValidationService } from "../services/validation.service.js";

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1),
  useRag: z.boolean().default(true),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const check = chatSchema.safeParse(req.body);
    if (!check.success) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const { message, useRag } = check.data;
    let context = "";

    if (useRag) {
      context = RagService.queryContext(message);
    }

    const enrichedPrompt = context 
      ? `Use the following context to answer the user request:\n\n[CONTEXT]\n${context}\n\n[USER REQUEST]\n${message}`
      : message;

    const systemPrompt = "You are a professional, white-labeled AI support agent deployed via Neuravolt Cloud. Help customers with their requests.";
    const response = await OllamaService.generate(enrichedPrompt, systemPrompt);

    // Run response through toxicity and PII validation gates
    const validation = ValidationService.validateChat(response);
    if (!validation.isValid) {
      console.warn("⚠️ [Chat Router] Blocked unsafe generated output:", validation.reason);
      return res.status(400).json({ 
        error: "Generation Blocked", 
        reason: validation.reason || "Output failed safety checks (potential toxicity or PII leak detected)" 
      });
    }

    return res.status(200).json({ response });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
