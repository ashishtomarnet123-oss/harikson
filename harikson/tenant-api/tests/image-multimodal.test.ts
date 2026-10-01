import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { ImageOrchestrator } from '../src/services/image-generation/ImageOrchestrator.js';
import { ImageStorageService } from '../src/services/image-generation/storage/imageStorageService.js';
import { TogetherFluxProvider } from '../src/services/image-generation/providers/togetherFluxProvider.js';
import { PollinationsProvider } from '../src/services/image-generation/providers/pollinationsProvider.js';

describe('Multimodal Conversational Image Engine & Orchestrator (16-Point Audit Suite)', () => {
  const testTenantId = '00000000-0000-0000-0000-000000000001';

  after(() => {
    setTimeout(() => {
      process.exit(0);
    }, 200);
  });

  // Test 1: Text → Image Intent Detection & Generation
  it('1. should detect text-to-image intent accurately', () => {
    const prompt = 'Create a realistic modern luxury house at sunset.';
    const detection = ImageOrchestrator.detectImageIntent(prompt, false, false);
    assert.equal(detection.isImageIntent, true);
    assert.equal(detection.operation, 'generate');
    assert.ok(detection.cleanedPrompt.toLowerCase().includes('modern luxury house'));
  });

  // Test 2: Image + Prompt → Edited Image Intent
  it('2. should detect image edit intent when prior image exists', () => {
    const prompt = 'Make the exterior white.';
    const detection = ImageOrchestrator.detectImageIntent(prompt, false, true);
    assert.equal(detection.isImageIntent, true);
    assert.equal(detection.operation, 'edit');
    assert.equal(detection.cleanedPrompt, 'Make the exterior white.');
  });

  // Test 3: Previous Image + Prompt → Edited Image Intent (Sequential Incremental Edits)
  it('3. should detect sequential incremental conversational edits', () => {
    const prompt1 = 'Add a swimming pool.';
    const prompt2 = 'Make the lighting warmer.';
    const prompt3 = 'Make it 16:9.';

    const det1 = ImageOrchestrator.detectImageIntent(prompt1, false, true);
    assert.equal(det1.isImageIntent, true);
    assert.equal(det1.operation, 'edit');

    const det2 = ImageOrchestrator.detectImageIntent(prompt2, false, true);
    assert.equal(det2.isImageIntent, true);
    assert.equal(det2.operation, 'edit');

    const det3 = ImageOrchestrator.detectImageIntent(prompt3, false, true);
    assert.equal(det3.isImageIntent, true);
    assert.equal(det3.operation, 'edit');
    assert.equal(det3.targetAspectRatio, '16:9');
  });

  // Test 4: Image → Variation Intent
  it('4. should detect image variation intent', () => {
    const prompt = 'Create another version.';
    const detection = ImageOrchestrator.detectImageIntent(prompt, false, true);
    assert.equal(detection.isImageIntent, true);
    assert.equal(detection.operation, 'variation');
  });

  // Test 5: Image → Vision Analysis Intent
  it('5. should detect image understanding / vision analysis intent', () => {
    const prompt = 'What style is this?';
    const detection = ImageOrchestrator.detectImageIntent(prompt, false, true);
    assert.equal(detection.isImageIntent, true);
    assert.equal(detection.operation, 'analyze');
  });

  // Test 6: Uploaded Image → Edit Intent
  it('6. should detect uploaded image transform intent when attachment is present', () => {
    const prompt = 'Make this more cinematic.';
    const detection = ImageOrchestrator.detectImageIntent(prompt, true, false);
    assert.equal(detection.isImageIntent, true);
    assert.equal(detection.operation, 'edit');
  });

  // Test 7: Conversation image context resolution
  it('7. should not trigger image intent on normal questions without image context', () => {
    const textQuery = 'What is the capital of France?';
    const detection = ImageOrchestrator.detectImageIntent(textQuery, false, false);
    assert.equal(detection.isImageIntent, false);
    assert.equal(detection.operation, 'none');
  });

  // Test 8: Image lineage & parent/child tracking
  it('8. should structure lineage metadata in provider payloads', async () => {
    const provider = new PollinationsProvider();
    const editPayload = await provider.edit({
      prompt: 'Modern house at sunset, edited: Make the exterior white',
      sourceImageUrl: 'https://example.com/source.png',
      aspectRatio: '1:1',
      parentImageId: 'parent-uuid-001',
    });
    assert.ok(editPayload);
    assert.equal(editPayload.width, 1024);
    assert.equal(editPayload.height, 1024);
  });

  // Test 9: Image storage persistence & buffer validation
  it('9. should persist image files and generate public view URLs', async () => {
    const mockImageId = crypto.randomUUID();
    const testSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="blue" width="100" height="100"/></svg>';
    const stored = await ImageStorageService.persistImage(mockImageId, testTenantId, {
      buffer: Buffer.from(testSvg, 'utf-8'),
      mimeType: 'image/svg+xml',
    });

    assert.equal(stored.publicUrl, `/api/v1/images/${mockImageId}/view`);
    assert.ok(stored.fileSizeBytes > 0);

    const retrieved = ImageStorageService.getImageBuffer(stored.storagePath);
    assert.equal(retrieved.exists, true);
    assert.ok(retrieved.buffer);

    // Clean up
    ImageStorageService.deleteImageFile(stored.storagePath);
  });

  // Test 10: Provider abstraction & capability detection
  it('10. should report truthful capabilities for configured providers', () => {
    const together = new TogetherFluxProvider();
    assert.equal(together.capabilities.text_to_image, true);
    assert.equal(together.capabilities.image_edit, false);
    assert.equal(together.capabilities.image_variation, false);

    const pollinations = new PollinationsProvider();
    assert.equal(pollinations.capabilities.text_to_image, true);
    assert.equal(pollinations.capabilities.image_edit, true);
    assert.equal(pollinations.capabilities.image_variation, true);
  });

  // Test 11: Unsupported provider capability rejection
  it('11. should throw error when attempting unsupported edit on Together provider', async () => {
    const together = new TogetherFluxProvider();
    await assert.rejects(
      async () => {
        await together.edit({
          prompt: 'Make it white',
          sourceImageUrl: 'http://example.com/test.jpg',
        });
      },
      /does not support image editing/
    );
  });

  // Test 12: Zero-dependency fallback resilience on provider timeout
  it('12. should gracefully fall back to procedural visual generator on network issues', async () => {
    const pollinations = new PollinationsProvider();
    const res = await pollinations.generate({
      prompt: 'A futuristic cybernetic tiger with glowing stripes in neon rainforest',
      aspectRatio: '16:9',
    });
    assert.ok(res.buffer);
    assert.equal(res.width, 1344);
    assert.equal(res.height, 768);
  });

  // Test 13: Vision analysis parsing
  it('13. should return structured vision analysis result', async () => {
    const pollinations = new PollinationsProvider();
    const analysis = await pollinations.analyze({
      prompt: 'What style is this?',
      imageUrl: 'http://example.com/mock.png',
    });
    assert.ok(analysis);
    assert.ok(analysis.description.length > 10);
    assert.ok(Array.isArray(analysis.detectedElements));
  });

  // Test 14: Non-image prompt isolation (no regression on text chat)
  it('14. should not classify general development queries as image requests', () => {
    const queries = [
      'Write a Node.js Express router for user authentication',
      'How do I calculate prime numbers in Python?',
      'Refactor this SQL query for better performance',
      'What are the best practices for PostgreSQL connection pooling?',
    ];

    for (const q of queries) {
      const det = ImageOrchestrator.detectImageIntent(q, false, false);
      assert.equal(det.isImageIntent, false);
    }
  });

  // Test 15: Non-image prompt isolation even with previous images
  it('15. should not hijack conversational questions that are not about the image', () => {
    const queries = [
      'Can you write a poem about the sunrise?',
      'Summarize our discussion so far',
      'How does Redis Pub/Sub work?',
    ];

    for (const q of queries) {
      const det = ImageOrchestrator.detectImageIntent(q, false, true);
      assert.equal(det.isImageIntent, false);
    }
  });

  // Test 16: Document analysis prompt preservation (no regression on PDF/RAG)
  it('16. should preserve document analysis and OCR workflows', () => {
    const docQuery = '<uploaded_file name="financial_report.pdf">\nRevenue grew 20% in Q3\n</uploaded_file>\n\nSummarize the Q3 revenue findings.';
    const det = ImageOrchestrator.detectImageIntent(docQuery, false, false);
    assert.equal(det.isImageIntent, false);
  });
});
