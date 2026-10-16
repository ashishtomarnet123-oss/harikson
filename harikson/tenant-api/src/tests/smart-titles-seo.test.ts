import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { TitleService } from '../services/titleService.js';

describe('Smart Conversation Titles & Technical SEO Test Suite', () => {
  // ============================================================================
  // 1. INTELLIGENT CONVERSATION TITLE GENERATION
  // ============================================================================
  describe('1. Title Generation: Specific User Prompt Requirements', () => {
    it('1.1 Generates "Xarwiz Mobile Chat UI" from redesign prompt', () => {
      const prompt = 'Help me redesign the Xarwiz mobile chat interface';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Xarwiz Mobile Chat UI');
    });

    it('1.2 Generates "Digital Marketing Launch Plan" from launch prompt', () => {
      const prompt = 'Develop a complete digital marketing launch plan';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Digital Marketing Launch Plan');
    });

    it('1.3 Generates "Financial Report Analysis" from analysis prompt', () => {
      const prompt = 'Analyze this financial report';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Financial Report Analysis');
    });

    it('1.4 Generates "Code Error Troubleshooting" from error explanation prompt', () => {
      const prompt = 'Explain this code error';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Code Error Troubleshooting');
    });

    it('1.5 Generates "Code Security Audit" from audit prompt', () => {
      const prompt = 'Audit my code for security and vulnerabilities';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Code Security Audit');
    });

    it('1.6 Generates "Understanding Quantum Computing" from quantum computing prompt', () => {
      const prompt = 'Can you explain quantum computing and qubit states?';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'Understanding Quantum Computing');
    });
  });

  // ============================================================================
  // 2. HINDI, DEVANAGARI & UNICODE PRESERVATION
  // ============================================================================
  describe('2. Multilingual & Unicode Script Preservation', () => {
    it('2.1 Generates "कुंडली विश्लेषण" for birth chart consultation in Hindi', () => {
      const prompt = 'मेरी कुंडली का विश्लेषण करें और ग्रह स्थिति बताएं';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'कुंडली विश्लेषण');
    });

    it('2.2 Generates "अलविदा संदेश" for farewell message in Hindi', () => {
      const prompt = 'टीम के लिए एक सुंदर अलविदा संदेश लिखें';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'अलविदा संदेश');
    });

    it('2.3 Generates "दैनिक योजना" for daily schedule in Hindi', () => {
      const prompt = 'दैनिक योजना और वर्कफ़्लो तैयार करें';
      const title = TitleService.generateDeterministicTitle(prompt);
      assert.strictEqual(title, 'दैनिक योजना');
    });
  });

  // ============================================================================
  // 3. ATTACHMENT-AWARE TITLE GENERATION
  // ============================================================================
  describe('3. Attachment-Aware Intent Processing', () => {
    it('3.1 Generates "Presentation Review" for presentation attachment with review request', () => {
      const raw = '<uploaded_file name="pitch_deck_q4.pptx" type="application/vnd.openxmlformats-officedocument.presentationml.presentation"></uploaded_file> Please review these slides and give feedback';
      const title = TitleService.generateDeterministicTitle(raw);
      assert.strictEqual(title, 'Presentation Review');
    });

    it('3.2 Generates "Code Debugging" for code attachment with debug request', () => {
      const raw = '<uploaded_file name="server_worker.ts" type="text/typescript"></uploaded_file> Help me debug this async error';
      const title = TitleService.generateDeterministicTitle(raw);
      assert.strictEqual(title, 'Code Debugging');
    });

    it('3.3 Generates "Financial Report Analysis" for financial spreadsheet attachment with summary request', () => {
      const raw = '<uploaded_file name="quarterly_financial_report.xlsx" type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></uploaded_file> Summarize this financial report data';
      const title = TitleService.generateDeterministicTitle(raw);
      assert.strictEqual(title, 'Financial Report Analysis');
    });

    it('3.4 Generates clean category fallback for attachment-only uploads', () => {
      const pdfOnly = '<uploaded_file name="annual_contract.pdf"></uploaded_file>';
      const title = TitleService.generateDeterministicTitle(pdfOnly);
      assert.strictEqual(title, 'Annual Contract');
    });
  });

  // ============================================================================
  // 4. MARKUP STRIPPING & INVALID TITLE DETECTION
  // ============================================================================
  describe('4. Markup Stripping & Corruption Prevention', () => {
    it('4.1 Identifies raw XML / attachment markup as invalid', () => {
      assert.strictEqual(TitleService.isInvalidTitle('<uploaded_file name="test.pdf">'), true);
      assert.strictEqual(TitleService.isInvalidTitle('<uploaded_file name="test.pdf">...'), true);
      assert.strictEqual(TitleService.isInvalidTitle('[Attached Image: "screenshot.png"]'), true);
      assert.strictEqual(TitleService.isInvalidTitle('undefined'), true);
      assert.strictEqual(TitleService.isInvalidTitle('null'), true);
      assert.strictEqual(TitleService.isInvalidTitle('{"error":"bad request"}'), true);
    });

    it('4.2 Identifies clean human titles as valid', () => {
      assert.strictEqual(TitleService.isInvalidTitle('Xarwiz Mobile Chat UI'), false);
      assert.strictEqual(TitleService.isInvalidTitle('कुंडली विश्लेषण'), false);
      assert.strictEqual(TitleService.isInvalidTitle('Financial Report Analysis'), false);
      assert.strictEqual(TitleService.isInvalidTitle('New Conversation'), false);
    });

    it('4.3 Strips preamble like "can you please explain" cleanly', () => {
      const raw = 'Can you please explain how to configure cloud DNS records';
      const title = TitleService.generateDeterministicTitle(raw);
      assert.ok(!title.toLowerCase().startsWith('can you please'));
      assert.ok(title.includes('Configure Cloud DNS'));
    });
  });

  // ============================================================================
  // 5. TECHNICAL SEO: ROBOTS.TXT VALIDATION
  // ============================================================================
  describe('5. Technical SEO: robots.txt Verification', () => {
    it('5.1 robots.txt exists and specifies canonical sitemap location', () => {
      const robotsPath = path.resolve(process.cwd(), '../../user-portal/public/robots.txt');
      assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
      const content = fs.readFileSync(robotsPath, 'utf-8');

      assert.ok(content.includes('User-agent: *'), 'Must declare User-agent');
      assert.ok(content.includes('Sitemap: https://xarwiz.com/sitemap.xml'), 'Must declare sitemap location');
    });

    it('5.2 robots.txt permits public pages and protects private routes', () => {
      const robotsPath = path.resolve(process.cwd(), '../../user-portal/public/robots.txt');
      const content = fs.readFileSync(robotsPath, 'utf-8');

      // Public allowed routes
      assert.ok(content.includes('Allow: /'), 'Must allow root');
      assert.ok(content.includes('Allow: /pricing'), 'Must allow /pricing');
      assert.ok(content.includes('Allow: /privacy-policy'), 'Must allow /privacy-policy');
      assert.ok(content.includes('Allow: /terms'), 'Must allow /terms');

      // Private disallowed routes
      assert.ok(content.includes('Disallow: /api/'), 'Must disallow /api/');
      assert.ok(content.includes('Disallow: /chat'), 'Must disallow /chat');
      assert.ok(content.includes('Disallow: /dashboard'), 'Must disallow /dashboard');
      assert.ok(content.includes('Disallow: /admin/'), 'Must disallow /admin/');
      assert.ok(content.includes('Disallow: /workflows'), 'Must disallow /workflows');
      assert.ok(content.includes('Disallow: /documents'), 'Must disallow /documents');
    });
  });

  // ============================================================================
  // 6. TECHNICAL SEO: SITEMAP.XML VALIDATION
  // ============================================================================
  describe('6. Technical SEO: sitemap.xml Verification', () => {
    it('6.1 sitemap.xml exists and is well-formed XML', () => {
      const sitemapPath = path.resolve(process.cwd(), '../../user-portal/public/sitemap.xml');
      assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
      const content = fs.readFileSync(sitemapPath, 'utf-8');

      assert.ok(content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Must have XML declaration');
      assert.ok(content.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Must have valid urlset');
      assert.ok(content.endsWith('</urlset>\n') || content.endsWith('</urlset>'), 'Must close urlset');
    });

    it('6.2 sitemap.xml includes all public canonical URLs and NO private routes', () => {
      const sitemapPath = path.resolve(process.cwd(), '../../user-portal/public/sitemap.xml');
      const content = fs.readFileSync(sitemapPath, 'utf-8');

      // Must include public canonical URLs
      const requiredPublicUrls = [
        'https://xarwiz.com/',
        'https://xarwiz.com/about',
        'https://xarwiz.com/pricing',
        'https://xarwiz.com/signup',
        'https://xarwiz.com/privacy-policy',
        'https://xarwiz.com/terms',
        'https://xarwiz.com/cookie-policy',
        'https://xarwiz.com/data-processing',
        'https://xarwiz.com/security-policy',
        'https://xarwiz.com/aup',
        'https://xarwiz.com/data-rights',
        'https://xarwiz.com/grievance',
      ];

      for (const url of requiredPublicUrls) {
        assert.ok(content.includes(`<loc>${url}</loc>`), `Sitemap must include ${url}`);
      }

      // Must strictly exclude private routes
      const prohibitedUrls = [
        'https://xarwiz.com/chat',
        'https://xarwiz.com/dashboard',
        'https://xarwiz.com/documents',
        'https://xarwiz.com/workflows',
        'https://xarwiz.com/agents',
        'https://xarwiz.com/studio',
        'https://xarwiz.com/admin',
        'https://xarwiz.com/privacy-settings',
      ];

      for (const url of prohibitedUrls) {
        assert.ok(!content.includes(url), `Sitemap must NOT expose private route ${url}`);
      }
    });
  });
});
