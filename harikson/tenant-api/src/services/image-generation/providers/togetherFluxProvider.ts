import axios from 'axios';
import { IImageProvider, ImageGenerationOptions, GeneratedImagePayload, ASPECT_RATIO_DIMENSIONS, STYLE_PROMPTS } from '../types.js';
import logger from '../../../utils/logger.js';

export class TogetherFluxProvider implements IImageProvider {
  public readonly name = 'together';
  public readonly defaultModel = 'black-forest-labs/FLUX.1-schnell';
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('Together AI API key is not configured.');
    }

    const aspectRatio = options.aspectRatio || '1:1';
    const dim = ASPECT_RATIO_DIMENSIONS[aspectRatio] || { width: 1024, height: 1024 };
    const width = options.width || dim.width;
    const height = options.height || dim.height;

    let fullPrompt = options.prompt.trim();
    if (options.stylePreset && options.stylePreset !== 'none' && STYLE_PROMPTS[options.stylePreset]) {
      fullPrompt = `${fullPrompt}, ${STYLE_PROMPTS[options.stylePreset]}`;
    }

    const model = options.model || this.defaultModel;

    logger.info({ provider: this.name, model, width, height }, 'Generating image with Together AI Flux');

    const response = await axios.post(
      'https://api.together.xyz/v1/images/generations',
      {
        model,
        prompt: fullPrompt,
        width,
        height,
        steps: model.includes('dev') ? 28 : 4,
        n: 1,
        response_format: 'b64_json',
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const imageItem = response.data?.data?.[0];
    if (!imageItem) {
      throw new Error('Together AI did not return image data.');
    }

    if (imageItem.b64_json) {
      return {
        buffer: Buffer.from(imageItem.b64_json, 'base64'),
        width,
        height,
        provider: this.name,
        model,
        mimeType: 'image/jpeg',
      };
    }

    if (imageItem.url) {
      return {
        remoteUrl: imageItem.url,
        width,
        height,
        provider: this.name,
        model,
        mimeType: 'image/jpeg',
      };
    }

    throw new Error('No image payload returned by Together AI');
  }
}
