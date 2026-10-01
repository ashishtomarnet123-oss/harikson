import axios from 'axios';
import {
  IImageProvider,
  ImageGenerationOptions,
  ImageEditOptions,
  ImageVariationOptions,
  GeneratedImagePayload,
  ImageProviderCapabilities,
  ASPECT_RATIO_DIMENSIONS,
  STYLE_PROMPTS,
} from '../types.js';
import logger from '../../../utils/logger.js';

export class TogetherFluxProvider implements IImageProvider {
  public readonly name = 'together';
  public readonly defaultModel = 'black-forest-labs/FLUX.1-schnell';
  public readonly capabilities: ImageProviderCapabilities = {
    text_to_image: true,
    image_input: false,
    image_edit: false,
    image_variation: false,
    mask_edit: false,
    multiple_reference_images: false,
    aspect_ratio: true,
    high_resolution: true,
  };

  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY || process.env.TOGETHER_KEY;
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
        steps: 4,
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
    if (!imageItem?.b64_json) {
      throw new Error('Together AI did not return image data.');
    }

    const buffer = Buffer.from(imageItem.b64_json, 'base64');

    return {
      buffer,
      width,
      height,
      provider: this.name,
      model,
      mimeType: 'image/jpeg',
    };
  }

  async edit(options: ImageEditOptions): Promise<GeneratedImagePayload> {
    throw new Error('This model supports image generation but does not support image editing. Configure an image-editing capable model to enable this feature.');
  }

  async variation(options: ImageVariationOptions): Promise<GeneratedImagePayload> {
    throw new Error('This model supports image generation but does not support image variations.');
  }
}
