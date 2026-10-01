import axios from 'axios';
import logger from '../../../utils/logger.js';

export interface VisionAnalysisResult {
  description: string;
  detectedElements: string[];
  visualCategory: 'chart' | 'diagram' | 'screenshot' | 'invoice_receipt' | 'ui_design' | 'photo' | 'general';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IVisionProvider {
  isAvailable(): Promise<boolean>;
  analyzeImage(buffer: Buffer, mimeType: string, prompt?: string): Promise<VisionAnalysisResult>;
}

export class OllamaVisionProvider implements IVisionProvider {
  private baseUrl: string;
  private visionModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'moondream';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      if (res.data?.models) {
        return res.data.models.some((m: any) =>
          m.name.includes('vision') ||
          m.name.includes('moondream') ||
          m.name.includes('llava')
        );
      }
      return false;
    } catch {
      return false;
    }
  }

  async analyzeImage(buffer: Buffer, mimeType: string, prompt?: string): Promise<VisionAnalysisResult> {
    const base64Image = buffer.toString('base64');
    const systemPrompt = `You are a high-accuracy Document & Image Intelligence specialist.
Analyze this image thoroughly:
1. Identify if it is a chart, graph, diagram, UI screenshot, invoice, receipt, document, or photograph.
2. If it is a chart/graph: extract metrics, trends, axis titles, data points, and key changes.
3. If it is an invoice/receipt: extract vendor, line items, taxes, totals, and invoice numbers.
4. If it is a UI/screenshot: describe layout, buttons, forms, and workflows.
5. Provide a direct, factual explanation answering: ${prompt || 'Describe all details, data, and visual information in this image.'}`;

    const res = await axios.post(
      `${this.baseUrl}/api/generate`,
      {
        model: this.visionModel,
        prompt: systemPrompt,
        images: [base64Image],
        stream: false,
      },
      { timeout: 30000 }
    );

    const text = res.data?.response || '';
    const category = this.detectCategory(text);

    return {
      description: text,
      detectedElements: this.extractKeyElements(text),
      visualCategory: category,
      confidence: 'HIGH',
    };
  }

  private detectCategory(text: string): VisionAnalysisResult['visualCategory'] {
    const lower = text.toLowerCase();
    if (lower.includes('chart') || lower.includes('graph') || lower.includes('trend') || lower.includes('axis')) return 'chart';
    if (lower.includes('diagram') || lower.includes('flowchart') || lower.includes('architecture')) return 'diagram';
    if (lower.includes('invoice') || lower.includes('receipt') || lower.includes('total:')) return 'invoice_receipt';
    if (lower.includes('ui') || lower.includes('button') || lower.includes('screenshot') || lower.includes('modal')) return 'ui_design';
    return 'general';
  }

  private extractKeyElements(text: string): string[] {
    const elements: string[] = [];
    if (/chart|graph|plot/i.test(text)) elements.push('Data Visualization');
    if (/table|column|row/i.test(text)) elements.push('Tabular Data');
    if (/logo|brand/i.test(text)) elements.push('Brand Marks');
    if (/signature/i.test(text)) elements.push('Signature/Approval');
    if (/qr code|barcode/i.test(text)) elements.push('Machine Readable Code');
    return elements;
  }
}

export class OpenAIVisionProvider implements IVisionProvider {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk-'));
  }

  async analyzeImage(buffer: Buffer, mimeType: string, prompt?: string): Promise<VisionAnalysisResult> {
    if (!this.apiKey) throw new Error('OpenAI API key not set');

    const base64Image = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an enterprise document intelligence visual reasoning engine. Extract all data, tables, charts, numbers, and layout structures precisely.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Analyze this image and extract all visual structures, data, and information.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const description = res.data?.choices?.[0]?.message?.content || '';
    return {
      description,
      detectedElements: ['Multimodal Visual Ingestion'],
      visualCategory: 'general',
      confidence: 'HIGH',
    };
  }
}

export class FallbackVisionProvider implements IVisionProvider {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async analyzeImage(buffer: Buffer, mimeType: string, prompt?: string): Promise<VisionAnalysisResult> {
    const sizeKb = (buffer.length / 1024).toFixed(1);
    return {
      description: `Image asset (${mimeType}, ${sizeKb} KB). Text and layout processed via Document OCR. Visual structures ready for contextual Q&A.`,
      detectedElements: ['Raster Image', mimeType],
      visualCategory: 'general',
      confidence: 'MEDIUM',
    };
  }
}

export class VisionProviderFactory {
  private static cachedProvider: IVisionProvider | null = null;

  static async getProvider(): Promise<IVisionProvider> {
    if (this.cachedProvider) return this.cachedProvider;

    const openai = new OpenAIVisionProvider();
    if (await openai.isAvailable()) {
      this.cachedProvider = openai;
      return openai;
    }

    const ollama = new OllamaVisionProvider();
    if (await ollama.isAvailable()) {
      this.cachedProvider = ollama;
      return ollama;
    }

    const fallback = new FallbackVisionProvider();
    this.cachedProvider = fallback;
    return fallback;
  }
}
