import { OllamaClient } from "../../llm/ollama.js";
import { MemoryStore } from "./store.js";

export class MemoryExtractor {
  static async extractAndSave(
    tenantId: string,
    userId: string,
    message: string,
    conversationContextText: string
  ): Promise<void> {
    try {
      const systemPrompt = `You are the Harikson Memory Service. Your job is to extract important, permanent facts about the user (their preferences, their tech stack, their name, their project, their company) from the user's message.
Do NOT extract transient information like greetings, temporary states, weather, or conversational filler.
Always write extracted facts in the third person (e.g., 'User's company uses Laravel' instead of 'My company uses Laravel').
Rate the importance on a scale of 0.0 to 1.0.

Respond ONLY with a JSON object. No other text, no markdown backticks. Example:
{"should_remember": true, "fact": "User's company uses Laravel", "importance": 0.9}
or
{"should_remember": false, "fact": "", "importance": 0.0}`;

      const prompt = `User Message: "${message}"\nContext:\n${conversationContextText}`;
      const response = await OllamaClient.generate(prompt, systemPrompt);

      let text = response.trim();
      if (text.startsWith("```")) {
        text = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();
      }

      const parsed = JSON.parse(text) as {
        should_remember: boolean;
        fact: string;
        importance: number;
      };

      if (parsed.should_remember && parsed.fact && parsed.fact.trim()) {
        console.log(`🧠 [Harikson Memory] Extracted fact: "${parsed.fact}" (Importance: ${parsed.importance})`);
        const embedding = await OllamaClient.embed(parsed.fact);
        await MemoryStore.save(tenantId, userId, parsed.fact.trim(), parsed.importance, embedding);
      } else {
        console.log(`🧠 [Harikson Memory] Message not deemed worthy of permanent memory.`);
      }
    } catch (error) {
      console.error("❌ [Harikson Memory] Extraction failed:", error);
    }
  }
}
