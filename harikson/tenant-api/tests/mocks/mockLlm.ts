import { Readable } from 'stream';

export interface MockChatChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class MockLlmProvider {
  public defaultModel: string;
  constructor(defaultModel: string = 'llama3') {
    this.defaultModel = defaultModel;
  }

  generateEmbedding(text: string, dimensions: number = 384): number[] {
    // Generate deterministic mock vector embedding based on string hash
    const vector: number[] = new Array(dimensions).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < dimensions; i++) {
      const val = Math.sin(hash + i);
      vector[i] = parseFloat(val.toFixed(6));
    }
    // Normalize vector to unit length
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((v) => parseFloat((v / (norm || 1)).toFixed(6)));
  }

  createStreamingChatResponse(tokens: string[]): Readable {
    const stream = new Readable({
      read() {},
    });

    tokens.forEach((token, index) => {
      const isLast = index === tokens.length - 1;
      const chunk: MockChatChunk = {
        model: this.defaultModel,
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: token,
        },
        done: isLast,
      };
      stream.push(JSON.stringify(chunk) + '\n');
    });

    stream.push(null);
    return stream;
  }

  async completeChat(messages: Array<{ role: string; content: string }>): Promise<{
    message: { role: string; content: string };
    totalTokens: number;
  }> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const responseContent = `[Mock AI Response to: ${lastUserMessage}] Processed securely with tenant isolation.`;
    const totalTokens = Math.ceil((lastUserMessage.length + responseContent.length) / 4);

    return {
      message: {
        role: 'assistant',
        content: responseContent,
      },
      totalTokens,
    };
  }
}

