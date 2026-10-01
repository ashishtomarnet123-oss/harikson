import axios from 'axios';
import FormData from 'form-data';
import {
  IImageProvider,
  ImageGenerationOptions,
  ImageEditOptions,
  ImageVariationOptions,
  ImageAnalysisOptions,
  GeneratedImagePayload,
  VisionAnalysisResult,
  ImageProviderCapabilities,
  STYLE_PROMPTS,
} from '../types.js';
import logger from '../../../utils/logger.js';

export class OpenAIImageProvider implements IImageProvider {
  public readonly name = 'openai';
  public readonly defaultModel = 'dall-e-3';
  public readonly capabilities: ImageProviderCapabilities = {
    text_to_image: true,
    image_input: true,
    image_edit: true,
    image_variation: true,
    mask_edit: true,
    multiple_reference_images: false,
    aspect_ratio: true,
    high_resolution: true,
  };

  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.startsWith('sk-'));
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    const aspectRatio = options.aspectRatio || '1:1';
    let size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024';
    let width = 1024;
    let height = 1024;

    if (aspectRatio === '16:9' || aspectRatio === '3:2') {
      size = '1792x1024';
      width = 1792;
      height = 1024;
    } else if (aspectRatio === '9:16') {
      size = '1024x1792';
      width = 1024;
      height = 1792;
    }

    let fullPrompt = options.prompt.trim();
    if (options.stylePreset && options.stylePreset !== 'none' && STYLE_PROMPTS[options.stylePreset]) {
      fullPrompt = `${fullPrompt}, ${STYLE_PROMPTS[options.stylePreset]}`;
    }

    const model = options.model || this.defaultModel;

    logger.info({ provider: this.name, model, size }, 'Generating image with OpenAI DALL-E 3');

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model,
        prompt: fullPrompt,
        n: 1,
        size,
        response_format: 'b64_json',
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const imageItem = response.data?.data?.[0];
    if (!imageItem?.b64_json) {
      throw new Error('OpenAI did not return image data.');
    }

    const buffer = Buffer.from(imageItem.b64_json, 'base64');

    return {
      buffer,
      width,
      height,
      revisedPrompt: imageItem.revised_prompt,
      provider: this.name,
      model,
      mimeType: 'image/png',
    };
  }

  async edit(options: ImageEditOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    logger.info({ provider: this.name, prompt: options.prompt }, 'Executing image edit via OpenAI');

    let imageBuffer = options.sourceImageBuffer;
    if (!imageBuffer && options.sourceImageUrl) {
      const imgRes = await axios.get(options.sourceImageUrl, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(imgRes.data);
    }

    if (!imageBuffer) {
      throw new Error('Source image buffer or valid URL is required for image editing.');
    }

    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'source.png', contentType: 'image/png' });
    form.append('prompt', options.prompt);
    form.append('n', 1);
    form.append('size', '1024x1024');
    form.append('response_format', 'b64_json');

    if (options.maskBuffer) {
      form.append('mask', options.maskBuffer, { filename: 'mask.png', contentType: 'image/png' });
    }

    const response = await axios.post('https://api.openai.com/v1/images/edits', form, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    });

    const imageItem = response.data?.data?.[0];
    if (!imageItem?.b64_json) {
      throw new Error('OpenAI did not return edited image data.');
    }

    const buffer = Buffer.from(imageItem.b64_json, 'base64');

    return {
      buffer,
      width: 1024,
      height: 1024,
      provider: this.name,
      model: 'dall-e-2',
      mimeType: 'image/png',
    };
  }

  async variation(options: ImageVariationOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured.');
    }

    let imageBuffer = options.sourceImageBuffer;
    if (!imageBuffer && options.sourceImageUrl) {
      const imgRes = await axios.get(options.sourceImageUrl, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(imgRes.data);
    }

    if (!imageBuffer) {
      throw new Error('Source image buffer or URL required for variations.');
    }

    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'source.png', contentType: 'image/png' });
    form.append('n', 1);
    form.append('size', '1024x1024');
    form.append('response_format', 'b64_json');

    const response = await axios.post('https://api.openai.com/v1/images/variations', form, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
    });

    const imageItem = response.data?.data?.[0];
    if (!imageItem?.b64_json) {
      throw new Error('OpenAI did not return variation image data.');
    }

    return {
      buffer: Buffer.from(imageItem.b64_json, 'base64'),
      width: 1024,
      height: 1024,
      provider: this.name,
      model: 'dall-e-2',
      mimeType: 'image/png',
    };
  }

  async analyze(options: ImageAnalysisOptions): Promise<VisionAnalysisResult> {
    if (!this.apiKey) throw new Error('OpenAI API key not set');

    let base64Image = '';
    if (options.imageBuffer) {
      base64Image = options.imageBuffer.toString('base64');
    } else if (options.imageUrl) {
      const res = await axios.get(options.imageUrl, { responseType: 'arraybuffer' });
      base64Image = Buffer.from(res.data).toString('base64');
    }

    const mime = options.mimeType || 'image/png';
    const dataUri = `data:${mime};base64,${base64Image}`;

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a multimodal vision assistant. Provide accurate visual understanding of the image: objects, style, lighting, composition, architecture, colors, and layout.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: options.prompt || 'Describe the style, composition, objects, lighting, and details in this image.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        max_tokens: 1000,
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
