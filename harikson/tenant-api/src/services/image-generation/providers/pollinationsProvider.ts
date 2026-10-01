import axios from 'axios';
import { IImageProvider, ImageGenerationOptions, GeneratedImagePayload, ASPECT_RATIO_DIMENSIONS, STYLE_PROMPTS } from '../types.js';
import logger from '../../../utils/logger.js';

export class PollinationsProvider implements IImageProvider {
  public readonly name = 'pollinations';
  public readonly defaultModel = 'flux';

  async isAvailable(): Promise<boolean> {
    return true; // Zero-key fallback is always available
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImagePayload> {
    const aspectRatio = options.aspectRatio || '1:1';
    const dim = ASPECT_RATIO_DIMENSIONS[aspectRatio] || { width: 1024, height: 1024 };
    const width = options.width || dim.width;
    const height = options.height || dim.height;

    let fullPrompt = options.prompt.trim();
    if (options.stylePreset && options.stylePreset !== 'none' && STYLE_PROMPTS[options.stylePreset]) {
      fullPrompt = `${fullPrompt}, ${STYLE_PROMPTS[options.stylePreset]}`;
    }

    const model = options.model || this.defaultModel;
    const seed = options.seed || Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(fullPrompt);

    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${seed}`;

    logger.info({ provider: this.name, model, width, height }, 'Generating image via Pollinations fallback');

    // Fetch the image buffer directly
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 35000,
      headers: {
        'User-Agent': 'Xarwiz-AI-Platform/1.0',
      },
    });

    const buffer = Buffer.from(response.data);
    const contentType = String(response.headers['content-type'] || 'image/jpeg');

    return {
      buffer,
      width,
      height,
      seed,
      provider: this.name,
      model,
      mimeType: contentType,
    };
  }
}
