import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { RagService } from "../services/rag.service.js";

const router = Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

const crawlSchema = z.object({
  url: z.string().url(),
});

// POST /documents/upload - Upload file and parse/index for RAG search
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, buffer } = req.file;
    const extension = originalname.split(".").pop() || "";

    const chunks = await RagService.indexFile(originalname, buffer, extension);

    return res.status(200).json({
      message: `File ${originalname} parsed and indexed successfully.`,
      chunksCreated: chunks,
      status: "INDEXED",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /documents/crawl - Crawl web page and index contents
router.post("/crawl", async (req: Request, res: Response) => {
  try {
    const check = crawlSchema.safeParse(req.body);
    if (!check.success) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const { url } = check.data;
    const chunks = await RagService.indexUrl(url);

    return res.status(200).json({
      message: `Website content from ${url} crawled and indexed.`,
      chunksCreated: chunks,
      status: "INDEXED",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
