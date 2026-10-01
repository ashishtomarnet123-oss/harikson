import axios from 'axios';
import { IImageProvider, ImageGenerationOptions, GeneratedImagePayload, STYLE_PROMPTS } from '../types.js';
import logger from '../../../utils/logger.js';

export class OpenAIImageProvider implements IImageProvider {
  public readonly name = 'openai';
  public readonly defaultModel = 'dall-e-3';
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

    logger.info({ provider: this.name, model, size }, 'Generating image with OpenAI DALL-E');

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
}
