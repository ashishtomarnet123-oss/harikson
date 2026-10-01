import { DocumentProcessor } from './baseProcessor.js';
import { DocumentMetadata, DocumentStructure } from '../types.js';
import { VisionProviderFactory } from '../vision/visionProvider.js';

export class ImageProcessor implements DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean {
    const exts = ['png', 'jpg', 'jpeg', 'webp'];
    return (
      exts.includes(extension.toLowerCase()) ||
      (mimeType ? mimeType.startsWith('image/') : false)
    );
  }

  async process(
    buffer: Buffer,
    filename: string,
    mimeType: string = 'image/png'
  ): Promise<{
    fullText: string;
    structure: DocumentStructure;
    metadata: Partial<DocumentMetadata>;
  }> {
    const visionProvider = await VisionProviderFactory.getProvider();
    const visionResult = await visionProvider.analyzeImage(buffer, mimeType);

    const fullText = [
      `# Image Document: ${filename}`,
      `Category: ${visionResult.visualCategory.toUpperCase()}`,
      `Confidence: ${visionResult.confidence}`,
      `Detected Visual Features: ${visionResult.detectedElements.join(', ')}`,
      '',
      '## Visual Understanding & Content Description:',
      visionResult.description,
    ].join('\n');

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      fullText,
      structure: {
        visualSummary: visionResult.description,
        sections: [
          {
            title: `Visual Analysis (${visionResult.visualCategory})`,
            level: 1,
            content: visionResult.description,
          },
        ],
      },
      metadata: {
        pageCount: 1,
        wordCount,
        tablesCount: visionResult.detectedElements.includes('Tabular Data') ? 1 : 0,
        imagesCount: 1,
        documentType: 'image',
        hasVision: true,
        title: filename,
      },
    };
  }
}
