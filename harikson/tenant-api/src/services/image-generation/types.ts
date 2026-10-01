export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:2';

export type ImageStylePreset =
  | 'none'
  | 'photorealistic'
  | 'cinematic'
  | 'anime'
  | '3d-render'
  | 'cyberpunk'
  | 'digital-art'
  | 'vector'
  | 'oil-painting';

export interface ImageDimension {
  width: number;
  height: number;
}

export const ASPECT_RATIO_DIMENSIONS: Record<ImageAspectRatio, ImageDimension> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:3': { width: 1152, height: 864 },
  '3:2': { width: 1216, height: 832 },
};

export const STYLE_PROMPTS: Record<Exclude<ImageStylePreset, 'none'>, string> = {
  photorealistic: 'photorealistic, hyperrealistic 8k resolution, raw photography, natural lighting, highly detailed',
  cinematic: 'cinematic film still, 35mm photograph, dramatic dynamic lighting, atmospheric, depth of field',
  anime: 'modern anime illustration, crisp clean line art, vibrant colors, detailed studio anime style',
  '3d-render': 'octane 3D render, glossy subsurface scattering, unreal engine 5 aesthetic, volumetric lighting',
  cyberpunk: 'cyberpunk aesthetic, neon glow, reflective surfaces, high-tech aesthetic, vivid magenta and cyan',
  'digital-art': 'concept art, digital painting, vibrant brushstrokes, artstation trending, award winning',
  vector: 'flat vector graphic, minimalist, clean geometric shapes, modern branding aesthetic',
  'oil-painting': 'classic oil on canvas, textured brushwork, rich impasto, museum masterpiece',
};

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: ImageAspectRatio;
  width?: number;
  height?: number;
  stylePreset?: ImageStylePreset;
  model?: string;
  provider?: string;
  seed?: number;
}

export interface GeneratedImagePayload {
  buffer?: Buffer;
  remoteUrl?: string;
  width: number;
  height: number;
  revisedPrompt?: string;
  seed?: number;
  provider: string;
  model: string;
  mimeType: string;
}

export interface StoredImageResult {
  id: string;
  tenantId: string;
  userId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  prompt: string;
  revisedPrompt?: string | null;
  negativePrompt?: string | null;
  provider: string;
  model: string;
  aspectRatio: string;
  width: number;
  height: number;
  storagePath: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  fileSizeBytes: number;
  costCredits: number;
  generationTimeMs: number;
  status: string;
  createdAt: Date;
}

export interface IImageProvider {
  readonly name: string;
  readonly defaultModel: string;
  isAvailable(): Promise<boolean>;
  generate(options: ImageGenerationOptions): Promise<GeneratedImagePayload>;
}
