import pdf from "pdf-parse";

interface MemoryChunk {
  text: string;
  source: string;
}

export class RagService {
  private static inMemoryStore: MemoryChunk[] = [];

  // Parse uploaded file buffers based on file type
  static async indexFile(name: string, buffer: Buffer, type: string): Promise<number> {
    let text = "";

    try {
      if (type.toLowerCase() === "pdf") {
        const parsed = await pdf(buffer);
        text = parsed.text;
      } else {
        // Fallback to text parsing (Markdown, plain text, txt, json)
        text = buffer.toString("utf-8");
      }

      if (!text.trim()) {
        throw new Error("Extracted document content is empty");
      }

      // Chunk the text
      const chunks = this.chunkText(text, 1000, 200);
      
      // Store in memory (fallback database)
      chunks.forEach((chunk) => {
        this.inMemoryStore.push({ text: chunk, source: name });
      });

      console.log(`📂 [Harikson RAG] Indexed document ${name}: created ${chunks.length} chunks.`);
      return chunks.length;
    } catch (error) {
      console.error(`❌ [Harikson RAG] Ingestion error on document ${name}:`, error);
      throw error;
    }
  }

  // Crawl and index URL content
  static async indexUrl(url: string): Promise<number> {
    try {
      // Mock crawler fetching content from remote webpage
      const text = `Neuravolt AI agent documentation for ${url}. This page details configuration, setup, widget integration, billing subscriptions, support guidelines, and deployment metrics. The platform executes on isolated VPS nodes using Qwen3-Coder models.`;
      
      const chunks = this.chunkText(text, 1000, 200);
      chunks.forEach((chunk) => {
        this.inMemoryStore.push({ text: chunk, source: url });
      });

      console.log(`📂 [Harikson RAG] Indexed URL ${url}: created ${chunks.length} chunks.`);
      return chunks.length;
    } catch (error) {
      console.error(`❌ [Harikson RAG] Crawl error on ${url}:`, error);
      throw error;
    }
  }

  // Semantic/Keyword search to find relevant context
  static queryContext(query: string, maxResults = 3): string {
    const lowercaseQuery = query.toLowerCase();
    
    // Score chunks based on keyword matching
    const scored = this.inMemoryStore.map((chunk) => {
      let score = 0;
      const terms = lowercaseQuery.split(" ");
      terms.forEach((term) => {
        if (chunk.text.toLowerCase().includes(term)) {
          score++;
        }
      });
      return { chunk, score };
    });

    // Filter and sort
    const matched = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((item) => `[Source: ${item.chunk.source}]: ${item.chunk.text}`);

    if (matched.length === 0) {
      return "No matching context found in knowledge base.";
    }

    return matched.join("\n\n");
  }

  // Split text into sliding chunks
  private static chunkText(text: string, size: number, overlap: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + size);
      if (chunkWords.length > 0) {
        chunks.push(chunkWords.join(" "));
      }
      i += (size - overlap);
    }

    return chunks;
  }
}
