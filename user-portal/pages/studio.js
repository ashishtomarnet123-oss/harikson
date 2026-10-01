import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { withAuth } from '../components/withAuth';
import DashboardShell from '../components/layout/DashboardShell';
import { authenticatedFetch, getApiConfig } from '../components/settings/apiHelper';
import { useToast } from '../context/ToastContext';
import GeneratedImageCard from '../components/chat/GeneratedImageCard';
import {
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Download,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  Trash2,
  Layers,
  Wand2,
  AlertCircle,
  Eye,
} from 'lucide-react';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', desc: '1024 × 1024' },
  { id: '16:9', label: '16:9 Landscape', desc: '1344 × 768' },
  { id: '9:16', label: '9:16 Story/Reel', desc: '768 × 1344' },
  { id: '4:3', label: '4:3 Standard', desc: '1152 × 864' },
  { id: '3:2', label: '3:2 Classic', desc: '1216 × 832' },
];

const STYLE_PRESETS = [
  { id: 'none', label: 'Default / None', icon: '🎨' },
  { id: 'photorealistic', label: 'Photorealistic', icon: '📷' },
  { id: 'cinematic', label: 'Cinematic Movie', icon: '🎬' },
  { id: '3d-render', label: '3D Octane Render', icon: '💎' },
  { id: 'anime', label: 'Anime Studio', icon: '⛩️' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', icon: '⚡' },
  { id: 'digital-art', label: 'Digital Concept Art', icon: '🖌️' },
  { id: 'vector', label: 'Minimalist Vector', icon: '📐' },
  { id: 'oil-painting', label: 'Classic Oil Canvas', icon: '🖼️' },
];

const PROMPT_SUGGESTIONS = [
  'A sleek glass futuristic smartphone displaying holographic 3D data in a minimalist laboratory',
  'Cinematic shot of an astronaut drinking coffee on Mars looking out over red sand dunes, dramatic golden hour',
  'Modern luxury electric sports car driving on a rainy neon-lit Tokyo highway at night',
  'A cozy cyberpunk coffee shop with plants, warm lighting, rain on the windows, highly detailed',
];

function ImageStudioPage() {
  const router = useRouter();
  const toast = useToast();

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [stylePreset, setStylePreset] = useState('none');
  const [model, setModel] = useState('fal-ai/flux/schnell');

  const [generating, setGenerating] = useState(false);
  const [latestImage, setLatestImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [quota, setQuota] = useState({ limit: 10, used: 0, remaining: 10 });
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  useEffect(() => {
    fetchQuota();
    fetchGallery();
  }, []);

  const fetchQuota = async () => {
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/images/quota`);
      if (res?.ok) {
        const data = await res.json();
        if (data.quota) setQuota(data.quota);
      }
    } catch (e) {
      console.error('Failed to load quota', e);
    }
  };

  const fetchGallery = async () => {
    setLoadingGallery(true);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/images?limit=30`);
      if (res?.ok) {
        const data = await res.json();
        setGallery(data.images || []);
        if (data.images && data.images.length > 0 && !latestImage) {
          setLatestImage(data.images[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load gallery', e);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          aspectRatio,
          stylePreset,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setLatestImage(data.image);
      setGallery((prev) => [data.image, ...prev]);
      fetchQuota();
      toast?.showToast?.('Visual asset generated successfully!', 'success');
    } catch (err) {
      console.error('Generation error:', err);
      toast?.showToast?.(err.message || 'Image generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this generated image?')) return;
    try {
      const { apiBase } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/images/${imageId}`, {
        method: 'DELETE',
      });
      if (res?.ok) {
        setGallery((prev) => prev.filter((img) => img.id !== imageId));
        if (latestImage?.id === imageId) {
          setLatestImage(gallery.find((img) => img.id !== imageId) || null);
        }
        fetchQuota();
        toast?.showToast?.('Image removed', 'info');
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const enhancePromptWithAI = () => {
    if (!prompt.trim()) return;
    const enhancements = [
      ', ultra-detailed 8k resolution, cinematic lighting, photorealistic textures, award-winning composition',
      ', dramatic atmospheric lighting, high octane 3D render, octane render, vivid colors',
      ', masterwork, highly detailed digital illustration, trending on ArtStation',
    ];
    const picked = enhancements[Math.floor(Math.random() * enhancements.length)];
    setPrompt((prev) => prev.trim() + picked);
  };

  return (
    <DashboardShell title="AI Image Studio">
      <Head>
        <title>AI Image Studio | Xarwiz AI</title>
      </Head>

      <div className="studio-container">
        {/* Top Header / Stats */}
        <div className="studio-header">
          <div>
            <h2 className="studio-title">Generative Visual Studio</h2>
            <p className="studio-subtitle">
              Transform concepts, logos, and marketing visions into production-grade visuals powered by Flux.1 AI.
            </p>
          </div>
          <div className="quota-pill">
            <Sparkles size={15} color="#818cf8" />
            <span>
              Monthly Allowance:{' '}
              <strong>{quota.limit === -1 ? 'Unlimited' : `${quota.remaining} / ${quota.limit} remaining`}</strong>
            </span>
          </div>
        </div>

        {/* Main Grid: Controls + Preview */}
        <div className="studio-workspace-grid">
          {/* Controls Panel */}
          <div className="controls-card">
            <form onSubmit={handleGenerate}>
              {/* Prompt Area */}
              <div className="form-group">
                <div className="label-row">
                  <label>Creative Prompt</label>
                  <button
                    type="button"
                    onClick={enhancePromptWithAI}
                    className="enhance-btn"
                    title="Expand prompt with cinematic detail modifiers"
                  >
                    <Wand2 size={13} /> Enhance
                  </button>
                </div>
                <textarea
                  className="studio-textarea"
                  rows={4}
                  placeholder="Describe your scene in detail, e.g. A futuristic robot reading an ancient glowing leather book..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
              </div>

              {/* Suggestions */}
              <div className="suggestions-row">
                <span className="suggestions-label">Ideas:</span>
                {PROMPT_SUGGESTIONS.slice(0, 2).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => setPrompt(sugg)}
                  >
                    {sugg.slice(0, 36)}...
                  </button>
                ))}
              </div>

              {/* Aspect Ratio */}
              <div className="form-group">
                <label>Aspect Ratio</label>
                <div className="aspect-grid">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      className={`aspect-option ${aspectRatio === ratio.id ? 'active' : ''}`}
                      onClick={() => setAspectRatio(ratio.id)}
                    >
                      <span className="aspect-name">{ratio.label}</span>
                      <span className="aspect-desc">{ratio.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets */}
              <div className="form-group">
                <label>Style Preset</label>
                <div className="style-presets-grid">
                  {STYLE_PRESETS.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      className={`style-chip ${stylePreset === style.id ? 'active' : ''}`}
                      onClick={() => setStylePreset(style.id)}
                    >
                      <span>{style.icon}</span>
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="generate-submit-btn"
              >
                {generating ? (
                  <>
                    <RefreshCw size={18} className="spin-icon" />
                    <span>Rendering Visual Asset...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate Visual Asset</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Canvas / Preview */}
          <div className="preview-card">
            {latestImage ? (
              <div className="preview-content">
                <div className="preview-badge">Active Render</div>
                <div className="preview-image-wrapper">
                  <img
                    src={latestImage.publicUrl}
                    alt={latestImage.prompt}
                    className="preview-img"
                  />
                </div>
                <div className="preview-info">
                  <p className="preview-prompt">“{latestImage.prompt}”</p>
                  <div className="preview-meta">
                    <span>Aspect: {latestImage.aspectRatio}</span>
                    <span>Model: {latestImage.model}</span>
                    <span>Speed: {(latestImage.generationTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="preview-actions">
                    <a
                      href={latestImage.publicUrl.replace('/view', '/download')}
                      className="preview-btn"
                      download
                    >
                      <Download size={15} /> Download Full Res
                    </a>
                    <button
                      type="button"
                      className="preview-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText(latestImage.publicUrl);
                        toast?.showToast?.('Image link copied to clipboard', 'info');
                      }}
                    >
                      <Copy size={15} /> Copy URL
                    </button>
                    <button
                      type="button"
                      className="preview-btn delete"
                      onClick={() => handleDeleteImage(latestImage.id)}
                    >
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="preview-empty">
                <ImageIcon size={48} className="empty-icon" />
                <h3>Your Canvas Awaits</h3>
                <p>Enter a prompt on the left to synthesize high-resolution images with Flux AI.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gallery / History */}
        <div className="gallery-section">
          <div className="gallery-header">
            <div className="gallery-title-row">
              <Layers size={20} color="#818cf8" />
              <h3>Tenant Asset Gallery</h3>
            </div>
            <span className="gallery-count">{gallery.length} Generated Assets</span>
          </div>

          {loadingGallery ? (
            <div className="gallery-loading">Loading studio history...</div>
          ) : gallery.length === 0 ? (
            <div className="gallery-empty">No generated images found in this workspace yet.</div>
          ) : (
            <div className="gallery-grid">
              {gallery.map((img) => (
                <div
                  key={img.id}
                  className={`gallery-card ${latestImage?.id === img.id ? 'active-thumb' : ''}`}
                  onClick={() => setLatestImage(img)}
                >
                  <img src={img.publicUrl} alt={img.prompt} loading="lazy" />
                  <div className="gallery-hover-overlay">
                    <p className="thumb-prompt">“{img.prompt}”</p>
                    <div className="thumb-actions">
                      <a
                        href={img.publicUrl.replace('/view', '/download')}
                        download
                        onClick={(e) => e.stopPropagation()}
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(img.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .studio-container {
          padding: 24px 32px;
          max-width: 1440px;
          margin: 0 auto;
        }
        .studio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }
        .studio-title {
          font-size: 24px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 6px 0;
        }
        .studio-subtitle {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }
        .quota-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          font-size: 13px;
          color: #cbd5e1;
        }
        .studio-workspace-grid {
          display: grid;
          grid-template-columns: 460px 1fr;
          gap: 24px;
          margin-bottom: 36px;
        }
        @media (max-width: 1024px) {
          .studio-workspace-grid {
            grid-template-columns: 1fr;
          }
        }
        .controls-card, .preview-card {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        label {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .enhance-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #a5b4fc;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .enhance-btn:hover {
          background: rgba(99, 102, 241, 0.35);
        }
        .studio-textarea {
          width: 100%;
          background: #0b0f17;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 12px 14px;
          color: #f8fafc;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
        }
        .studio-textarea:focus {
          border-color: #6366f1;
        }
        .suggestions-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: -12px;
          margin-bottom: 18px;
          overflow-x: auto;
        }
        .suggestions-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }
        .suggestion-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        .suggestion-chip:hover {
          color: #f1f5f9;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .aspect-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .aspect-option {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: all 0.15s;
        }
        .aspect-option.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.15);
        }
        .aspect-name {
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .aspect-desc {
          font-size: 10px;
          color: #64748b;
        }
        .style-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .style-chip {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #cbd5e1;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .style-chip.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
        }
        .generate-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
          transition: opacity 0.2s, transform 0.15s;
        }
        .generate-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .generate-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Preview Canvas */
        .preview-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 480px;
          position: relative;
        }
        .preview-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .preview-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(99, 102, 241, 0.4);
          text-transform: uppercase;
        }
        .preview-image-wrapper {
          max-height: 380px;
          max-width: 100%;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .preview-img {
          max-height: 380px;
          max-width: 100%;
          display: block;
          object-fit: contain;
        }
        .preview-info {
          margin-top: 16px;
          width: 100%;
          text-align: center;
        }
        .preview-prompt {
          color: #e2e8f0;
          font-size: 14px;
          font-style: italic;
          margin: 0 0 8px 0;
        }
        .preview-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 16px;
        }
        .preview-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .preview-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .preview-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .preview-btn.delete:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.4);
        }
        .preview-empty {
          text-align: center;
          color: #64748b;
        }
        .empty-icon {
          margin-bottom: 12px;
          opacity: 0.5;
        }

        /* Gallery Grid */
        .gallery-section {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 24px;
        }
        .gallery-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .gallery-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gallery-title-row h3 {
          font-size: 18px;
          color: #f8fafc;
          margin: 0;
        }
        .gallery-count {
          font-size: 12px;
          color: #94a3b8;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .gallery-card {
          position: relative;
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          background: #0b0f17;
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .gallery-card.active-thumb {
          border-color: #6366f1;
        }
        .gallery-card:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.5);
        }
        .gallery-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-hover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 60%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .gallery-card:hover .gallery-hover-overlay {
          opacity: 1;
        }
        .thumb-prompt {
          color: #f1f5f9;
          font-size: 11px;
          margin: 0 0 6px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .thumb-actions {
          display: flex;
          gap: 6px;
        }
        .thumb-actions a, .thumb-actions button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: #fff;
          border-radius: 4px;
          padding: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </DashboardShell>
  );
}

export default withAuth(ImageStudioPage);
