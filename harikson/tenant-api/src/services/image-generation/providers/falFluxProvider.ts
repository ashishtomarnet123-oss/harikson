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

export class FalFluxProvider implements IImageProvider {
  public readonly name = 'fal';
  public readonly defaultModel = 'fal-ai/flux/schnell';
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
    this.apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('Fal.ai API key is not configured.');
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
    const endpoint = `https://fal.run/${model}`;

    logger.info({ provider: this.name, model, width, height }, 'Generating image with Fal.ai Flux');

    const payload: any = {
      prompt: fullPrompt,
      image_size: { width, height },
      num_inference_steps: model.includes('dev') ? 28 : 4,
      enable_safety_checker: true,
    };

    if (options.seed) {
      payload.seed = options.seed;
    }

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    });

    const imageInfo = response.data?.images?.[0];
    if (!imageInfo?.url) {
      throw new Error('Fal.ai did not return a valid image URL in response');
    }

    return {
      remoteUrl: imageInfo.url,
      width: imageInfo.width || width,
      height: imageInfo.height || height,
      seed: response.data?.seed,
      provider: this.name,
      model,
      mimeType: imageInfo.content_type || 'image/jpeg',
    };
  }

  async edit(options: ImageEditOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('Fal.ai API key is not configured.');
    }

    logger.info({ provider: this.name, prompt: options.prompt }, 'Executing image edit via Fal.ai Flux img2img');

    const endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image';
    const payload: any = {
      image_url: options.sourceImageUrl,
      prompt: options.prompt,
      strength: options.strength ?? 0.75,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: true,
    };

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const imageInfo = response.data?.images?.[0];
    if (!imageInfo?.url) {
      throw new Error('Fal.ai did not return a valid image URL in edit response');
    }

    return {
      remoteUrl: imageInfo.url,
      width: imageInfo.width || 1024,
      height: imageInfo.height || 1024,
      provider: this.name,
      model: 'fal-ai/flux/dev/image-to-image',
      mimeType: imageInfo.content_type || 'image/jpeg',
    };
  }

  async variation(options: ImageVariationOptions): Promise<GeneratedImagePayload> {
    if (!this.apiKey) {
      throw new Error('Fal.ai API key is not configured.');
    }

    const endpoint = 'https://fal.run/fal-ai/flux/dev/image-to-image';
    const payload: any = {
      image_url: options.sourceImageUrl,
      prompt: 'Variation of source image with subtle creative variations, high fidelity, 8k',
      strength: 0.55,
      num_inference_steps: 24,
      enable_safety_checker: true,
      seed: options.seed || Math.floor(Math.random() * 1000000),
    };

    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const imageInfo = response.data?.images?.[0];
    if (!imageInfo?.url) {
      throw new Error('Fal.ai did not return a valid image URL in variation response');
    }

    return {
      remoteUrl: imageInfo.url,
      width: imageInfo.width || 1024,
      height: imageInfo.height || 1024,
      provider: this.name,
      model: 'fal-ai/flux/dev/variation',
      mimeType: imageInfo.content_type || 'image/jpeg',
    };
  }
}
