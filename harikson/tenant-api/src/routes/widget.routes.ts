import { Router, Request, Response } from 'express';
import { pool, executeCachedQuery } from '../db/pool.js';
import logger from '../utils/logger.js';
import { OllamaService } from '../services/ollama.service.js';
import { Redis } from 'ioredis';

const router = Router();

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});
redis.connect().catch(() => {});

function extractRequestOrigin(req: Request): string {
  const origin = (req.headers.origin || req.headers.referer || '').toString().trim();
  if (!origin) return '';
  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return origin.replace(/\/$/, '');
  }
}

// Generate production-grade, self-executing vanilla JS chat widget bundle
function getWidgetClientScript(): string {
  return `(function() {
  if (window.__XARWIZ_WIDGET_LOADED__) return;
  window.__XARWIZ_WIDGET_LOADED__ = true;

  // 1. Locate current script element and extract configuration attributes
  var scriptTag = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('/api/widget/embed.js') !== -1 || src.indexOf('/api/widget/script.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  var scriptUrl = scriptTag ? scriptTag.src : '';
  var urlParams = {};
  if (scriptUrl && scriptUrl.indexOf('?') !== -1) {
    var query = scriptUrl.split('?')[1];
    var pairs = query.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      urlParams[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
  }

  var tenantKey = (scriptTag && (scriptTag.getAttribute('data-tenant') || scriptTag.getAttribute('data-key'))) || urlParams.key || urlParams.tenant || 'default';
  var scriptOrigin = '';
  if (scriptUrl) {
    try {
      var parsed = new URL(scriptUrl);
      scriptOrigin = parsed.origin;
    } catch(e) {}
  }
  var apiBase = (scriptTag && scriptTag.getAttribute('data-api-base')) || urlParams.apiBase || scriptOrigin || window.location.origin;
  var primaryColor = (scriptTag && scriptTag.getAttribute('data-color')) || urlParams.color || '#4f46e5';
  var widgetTitle = (scriptTag && scriptTag.getAttribute('data-title')) || urlParams.title || 'Xarwiz AI Support';
  var greeting = (scriptTag && scriptTag.getAttribute('data-greeting')) || urlParams.greeting || 'Hello! How can I assist you today?';
  var position = (scriptTag && scriptTag.getAttribute('data-position')) || urlParams.position || 'bottom-right';

  // 2. Storage keys for session & conversation history
  var sessionKey = 'xarwiz_widget_session_' + tenantKey;
  var historyKey = 'xarwiz_widget_msgs_' + tenantKey;
  var sessionId = localStorage.getItem(sessionKey) || ('guest_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now());
  localStorage.setItem(sessionKey, sessionId);

  var messages = [];
  try {
    var saved = sessionStorage.getItem(historyKey);
    if (saved) messages = JSON.parse(saved);
  } catch(e) {}

  if (messages.length === 0) {
    messages.push({ role: 'assistant', text: greeting, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  }

  // 3. Inject CSS
  var style = document.createElement('style');
  style.id = 'xarwiz-widget-styles';
  style.textContent = [
    '#xarwiz-widget-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; position: fixed; bottom: 24px; ' + (position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;') + ' z-index: 2147483647; display: flex; flex-direction: column; align-items: ' + (position === 'bottom-left' ? 'flex-start;' : 'flex-end;') + ' }',
    '#xarwiz-widget-btn { width: 56px; height: 56px; border-radius: 28px; background: ' + primaryColor + '; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); outline: none; }',
    '#xarwiz-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }',
    '#xarwiz-widget-box { width: 380px; height: 540px; max-height: calc(100vh - 110px); background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.08); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }',
    '#xarwiz-widget-box.open { display: flex; animation: xarwizWidgetFadeIn 0.25s ease-out; }',
    '@keyframes xarwizWidgetFadeIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }',
    '#xarwiz-widget-header { background: ' + primaryColor + '; color: #ffffff; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }',
    '.xarwiz-header-title { font-size: 15px; font-weight: 700; margin: 0; }',
    '.xarwiz-header-status { font-size: 11px; opacity: 0.9; display: flex; align-items: center; gap: 5px; margin-top: 2px; }',
    '.xarwiz-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; }',
    '#xarwiz-widget-close { background: transparent; border: none; color: #ffffff; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; opacity: 0.8; font-size: 20px; outline: none; }',
    '#xarwiz-widget-close:hover { opacity: 1; }',
    '#xarwiz-widget-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }',
    '.xarwiz-msg { max-width: 82%; padding: 10px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.45; word-wrap: break-word; }',
    '.xarwiz-msg.user { align-self: flex-end; background: ' + primaryColor + '; color: #ffffff; border-bottom-right-radius: 4px; }',
    '.xarwiz-msg.assistant { align-self: flex-start; background: #ffffff; color: #1e293b; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }',
    '.xarwiz-msg-time { font-size: 10px; opacity: 0.65; margin-top: 4px; text-align: right; }',
    '#xarwiz-widget-inputbar { padding: 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }',
    '#xarwiz-widget-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 20px; padding: 9px 14px; font-size: 13.5px; outline: none; font-family: inherit; }',
    '#xarwiz-widget-input:focus { border-color: ' + primaryColor + '; }',
    '#xarwiz-widget-send { width: 36px; height: 36px; border-radius: 18px; background: ' + primaryColor + '; color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; outline: none; }',
    '#xarwiz-widget-send:disabled { opacity: 0.5; cursor: not-allowed; }',
    '#xarwiz-widget-footer { padding: 4px 0 8px 0; text-align: center; font-size: 11px; color: #94a3b8; background: #ffffff; }',
    '#xarwiz-widget-footer a { color: #64748b; text-decoration: none; font-weight: 500; }',
    '.xarwiz-typing { display: flex; gap: 4px; padding: 10px 14px; background: #ffffff; border-radius: 14px; border-bottom-left-radius: 4px; width: fit-content; border: 1px solid #e2e8f0; }',
    '.xarwiz-typing-dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: xarwizBounce 1.4s infinite ease-in-out both; }',
    '.xarwiz-typing-dot:nth-child(1) { animation-delay: -0.32s; }',
    '.xarwiz-typing-dot:nth-child(2) { animation-delay: -0.16s; }',
    '@keyframes xarwizBounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }',
    '@media (max-width: 480px) { #xarwiz-widget-box { width: calc(100vw - 32px); height: calc(100vh - 100px); right: 16px; bottom: 80px; } }'
  ].join('\\n');
  document.head.appendChild(style);

  // 4. Construct DOM Elements
  var root = document.createElement('div');
  root.id = 'xarwiz-widget-container';
  root.innerHTML = [
    '<div id="xarwiz-widget-box">',
    '  <div id="xarwiz-widget-header">',
    '    <div>',
    '      <div class="xarwiz-header-title" id="xarwiz-title">' + widgetTitle + '</div>',
    '      <div class="xarwiz-header-status"><span class="xarwiz-status-dot"></span> Online &bull; Instant AI Support</div>',
    '    </div>',
    '    <button id="xarwiz-widget-close" aria-label="Close chat">&times;</button>',
    '  </div>',
    '  <div id="xarwiz-widget-messages"></div>',
    '  <div id="xarwiz-widget-inputbar">',
    '    <input type="text" id="xarwiz-widget-input" placeholder="Type your message..." autocomplete="off" />',
    '    <button id="xarwiz-widget-send" aria-label="Send message">',
    '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
    '    </button>',
    '  </div>',
    '  <div id="xarwiz-widget-footer">Powered by <a href="https://xarwiz.com" target="_blank" rel="noopener">Xarwiz AI</a></div>',
    '</div>',
    '<button id="xarwiz-widget-btn" aria-label="Open chat">',
    '  <svg id="xarwiz-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    '  <svg id="xarwiz-icon-close" style="display:none;" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    '</button>'
  ].join('\\n');
  document.body.appendChild(root);

  var widgetBox = document.getElementById('xarwiz-widget-box');
  var widgetBtn = document.getElementById('xarwiz-widget-btn');
  var closeBtn = document.getElementById('xarwiz-widget-close');
  var msgContainer = document.getElementById('xarwiz-widget-messages');
  var inputEl = document.getElementById('xarwiz-widget-input');
  var sendBtn = document.getElementById('xarwiz-widget-send');
  var iconOpen = document.getElementById('xarwiz-icon-open');
  var iconClose = document.getElementById('xarwiz-icon-close');

  function renderMessages() {
    msgContainer.innerHTML = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var div = document.createElement('div');
      div.className = 'xarwiz-msg ' + m.role;
      div.innerHTML = m.text.replace(/\\n/g, '<br/>') + '<div class="xarwiz-msg-time">' + (m.time || '') + '</div>';
      msgContainer.appendChild(div);
    }
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }
  renderMessages();

  function toggleWidget() {
    var isOpen = widgetBox.classList.contains('open');
    if (isOpen) {
      widgetBox.classList.remove('open');
      iconOpen.style.display = 'block';
      iconClose.style.display = 'none';
    } else {
      widgetBox.classList.add('open');
      iconOpen.style.display = 'none';
      iconClose.style.display = 'block';
      msgContainer.scrollTop = msgContainer.scrollHeight;
      inputEl.focus();
    }
  }

  widgetBtn.addEventListener('click', toggleWidget);
  closeBtn.addEventListener('click', toggleWidget);

  // 5. Query remote tenant configuration
  fetch(apiBase + '/api/widget/config?key=' + encodeURIComponent(tenantKey))
    .then(function(res) {
      if (res.status === 403) {
        console.warn('⚠️ [Xarwiz Widget] Origin unauthorized for tenant embedding.');
        return null;
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || !data.config) return;
      if (data.config.color) {
        primaryColor = data.config.color;
        widgetBtn.style.background = primaryColor;
        document.getElementById('xarwiz-widget-header').style.background = primaryColor;
        sendBtn.style.background = primaryColor;
      }
      if (data.config.title) {
        document.getElementById('xarwiz-title').textContent = data.config.title;
      }
    })
    .catch(function(err) {
      console.warn('⚠️ [Xarwiz Widget] Config sync error:', err);
    });

  // 6. Send message handler
  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    sendBtn.disabled = true;

    var now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messages.push({ role: 'user', text: text, time: now });
    renderMessages();

    // Append typing indicator
    var typingDiv = document.createElement('div');
    typingDiv.className = 'xarwiz-typing';
    typingDiv.id = 'xarwiz-typing-indicator';
    typingDiv.innerHTML = '<span class="xarwiz-typing-dot"></span><span class="xarwiz-typing-dot"></span><span class="xarwiz-typing-dot"></span>';
    msgContainer.appendChild(typingDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    fetch(apiBase + '/api/widget/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-slug': tenantKey
      },
      body: JSON.stringify({
        tenantSlug: tenantKey,
        message: text,
        origin: window.location.origin,
        sessionId: sessionId
      })
    })
    .then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) throw new Error(data.message || data.error || 'Server error');
        return data;
      });
    })
    .then(function(data) {
      var typing = document.getElementById('xarwiz-typing-indicator');
      if (typing) typing.remove();

      var botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      messages.push({ role: 'assistant', text: data.response || 'Thank you for reaching out.', time: botNow });
      try { sessionStorage.setItem(historyKey, JSON.stringify(messages)); } catch(e) {}
      renderMessages();
    })
    .catch(function(err) {
      var typing = document.getElementById('xarwiz-typing-indicator');
      if (typing) typing.remove();

      var botNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      messages.push({ role: 'assistant', text: 'Error: ' + (err.message || 'Unable to connect to support assistant.'), time: botNow });
      renderMessages();
    })
    .finally(function() {
      sendBtn.disabled = false;
      inputEl.focus();
    });
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 7. Global API
  window.XarwizWidget = {
    open: function() { if (!widgetBox.classList.contains('open')) toggleWidget(); },
    close: function() { if (widgetBox.classList.contains('open')) toggleWidget(); },
    toggle: toggleWidget,
    sendMessage: function(txt) { inputEl.value = txt; sendMessage(); },
    isReady: true
  };
})();`;
}

// CORS Middleware for widget routes
router.use((req: Request, res: Response, next) => {
  const origin = extractRequestOrigin(req) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-slug, x-idempotency-key');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// GET /api/widget/config - Fetch widget embed configuration for tenant domain
router.get('/config', async (req: any, res: Response) => {
  const origin = extractRequestOrigin(req);
  const tenantKey = (req.query.key as string) || '';

  if (!tenantKey) {
    return res.status(400).json({ error: 'Tenant key required' });
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantKey);
    const tenantRes = isUuid
      ? await executeCachedQuery(
          'SELECT id, name, slug, widget_config, widget_allowed_origins FROM tenants WHERE id = $1',
          [tenantKey],
          60
        )
      : await executeCachedQuery(
          'SELECT id, name, slug, widget_config, widget_allowed_origins FROM tenants WHERE slug = $1',
          [tenantKey],
          60
        );

    const tenant = tenantRes.rows?.[0];
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant configuration not found for key' });
    }

    const allowedOrigins: string[] = tenant.widget_allowed_origins || [];
    const isAllowed = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin));

    if (allowedOrigins.length > 0 && !isAllowed && origin) {
      return res.status(403).json({
        error: 'WIDGET_ORIGIN_NOT_ALLOWED',
        message: 'Origin domain not authorized for widget embedding.',
      });
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.json({
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      config: tenant.widget_config || {
        title: 'Xarwiz AI Support',
        color: '#4f46e5',
        greeting: 'Hello! How can I assist you today?',
      },
    });
  } catch (err: any) {
    logger.error('Widget config error:', err);
    res.status(500).json({ error: 'Failed to fetch widget configuration' });
  }
});

// GET /api/widget/embed.js - Deliver full production self-executing chat widget bundle
router.get('/embed.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(getWidgetClientScript());
});

// GET /api/widget/script.js - Backward-compatible alias for embed.js
router.get('/script.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(getWidgetClientScript());
});

// POST /api/widget/chat - Process visitor message with strict origin verification & rate limits
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req.headers['x-tenant-slug'] as string) || req.body?.tenantSlug || 'default';
    const { message, origin: clientOrigin } = req.body || {};
    const requestOrigin = extractRequestOrigin(req) || clientOrigin || 'unknown';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantSlug);
    const tenantRes = isUuid
      ? await pool.query('SELECT id, slug, widget_allowed_origins FROM tenants WHERE id = $1', [tenantSlug])
      : await pool.query('SELECT id, slug, widget_allowed_origins FROM tenants WHERE slug = $1', [tenantSlug]);

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantRes.rows[0];
    const allowedOrigins: string[] = tenant.widget_allowed_origins || [];

    // Origin Check
    const isAllowed = allowedOrigins.includes('*') || (requestOrigin && allowedOrigins.includes(requestOrigin));
    if (allowedOrigins.length > 0 && !isAllowed && requestOrigin !== 'unknown') {
      return res.status(403).json({
        error: 'WIDGET_ORIGIN_NOT_ALLOWED',
        message: 'This domain origin is not authorized to execute chat requests.',
      });
    }

    if (requestOrigin && requestOrigin !== 'unknown') {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }

    // Rate Limiting (100 messages/hr)
    try {
      const rateKey = `ratelimit:widget:msg:${tenant.id}:${requestOrigin}`;
      const attempts = await redis.incr(rateKey);
      if (attempts === 1) await redis.expire(rateKey, 3600);
      if (attempts > 100) {
        return res.status(429).json({
          error: 'WIDGET_RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded: Maximum 100 widget messages per hour for this origin domain.',
        });
      }
    } catch (_) {}

    let aiResponse: string;
    try {
      aiResponse = await OllamaService.generate(
        message.trim(),
        'You are a helpful customer support assistant. Keep responses concise and professional.'
      );
    } catch (llmErr) {
      logger.warn('Widget chat LLM fallback:', llmErr);
      aiResponse = 'Thank you for contacting support! Our team will get back to you shortly.';
    }

    res.json({
      success: true,
      response: aiResponse,
    });
  } catch (err: any) {
    logger.error('Widget chat error:', err);
    res.status(500).json({ error: 'Failed to process widget message' });
  }
});

// POST /api/widget/chat/stream - Server-Sent Events (SSE) streaming for real-time widget response
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req.headers['x-tenant-slug'] as string) || req.body?.tenantSlug || 'default';
    const { message, origin: clientOrigin } = req.body || {};
    const requestOrigin = extractRequestOrigin(req) || clientOrigin || 'unknown';

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantSlug);
    const tenantRes = isUuid
      ? await pool.query('SELECT id, slug, widget_allowed_origins FROM tenants WHERE id = $1', [tenantSlug])
      : await pool.query('SELECT id, slug, widget_allowed_origins FROM tenants WHERE slug = $1', [tenantSlug]);

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantRes.rows[0];
    const allowedOrigins: string[] = tenant.widget_allowed_origins || [];

    const isAllowed = allowedOrigins.includes('*') || (requestOrigin && allowedOrigins.includes(requestOrigin));
    if (allowedOrigins.length > 0 && !isAllowed && requestOrigin !== 'unknown') {
      return res.status(403).json({
        error: 'WIDGET_ORIGIN_NOT_ALLOWED',
        message: 'This domain origin is not authorized to execute chat requests.',
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (requestOrigin && requestOrigin !== 'unknown') {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }

    res.write(`data: ${JSON.stringify({ event: 'connected', tenantId: tenant.id })}\n\n`);

    let aiResponse = '';
    try {
      aiResponse = await OllamaService.generate(
        message.trim(),
        'You are a helpful customer support assistant. Keep responses concise and professional.'
      );
    } catch {
      aiResponse = 'Thank you for contacting support! Our team will get back to you shortly.';
    }

    res.write(`data: ${JSON.stringify({ event: 'chunk', text: aiResponse })}\n\n`);
    res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.error('Widget chat stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process widget stream' });
    } else {
      res.end();
    }
  }
});

export default router;
