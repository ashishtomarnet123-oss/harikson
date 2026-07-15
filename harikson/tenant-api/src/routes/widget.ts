import { Router, Request, Response } from 'express';

const router = Router();

// GET /widget.js - Returns dynamic script tag to inject chat widget on host websites
router.get('/widget.js', (req: Request, res: Response) => {
  const color = (req.query.color as string) || '#8b5cf6';
  const tenant = (req.query.tenant as string) || 'default-agent';
  const welcome =
    (req.query.welcome as string) || 'Hello! How can I help you today?';

  const jsScript = `
(function() {
  console.log("⚡ [Neuravolt Chat] Initializing widget for tenant: ${tenant}");

  // Create widget launcher icon
  const launcher = document.createElement("div");
  launcher.id = "nv-chat-launcher";
  launcher.style.position = "fixed";
  launcher.style.bottom = "20px";
  launcher.style.right = "20px";
  launcher.style.width = "60px";
  launcher.style.height = "60px";
  launcher.style.borderRadius = "50%";
  launcher.style.background = "${color}";
  launcher.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
  launcher.style.cursor = "pointer";
  launcher.style.display = "flex";
  launcher.style.alignItems = "center";
  launcher.style.justifyContent = "center";
  launcher.style.zIndex = "999999";
  launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  document.body.appendChild(launcher);

  // Create chat container panel
  const chatFrame = document.createElement("div");
  chatFrame.id = "nv-chat-container";
  chatFrame.style.position = "fixed";
  chatFrame.style.bottom = "90px";
  chatFrame.style.right = "20px";
  chatFrame.style.width = "340px";
  chatFrame.style.height = "460px";
  chatFrame.style.borderRadius = "16px";
  chatFrame.style.border = "1px solid rgba(255,255,255,0.1)";
  chatFrame.style.background = "rgba(10, 10, 10, 0.95)";
  chatFrame.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
  chatFrame.style.zIndex = "999999";
  chatFrame.style.display = "none";
  chatFrame.style.flexDirection = "column";
  chatFrame.style.overflow = "hidden";
  chatFrame.style.fontFamily = "system-ui, -apple-system, sans-serif";
  
  chatFrame.innerHTML = \`
    <div style="padding: 16px; background: ${color}; color: white; display: flex; gap: 10px; align-items: center; font-size: 0.9rem; font-weight: bold;">
      <div style="width: 8px; height: 8px; borderRadius: 50%; background: #10b981;"></div>
      <span>Support Helper</span>
    </div>
    <div id="nv-messages-box" style="flex: 1; padding: 15px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto;">
      <div style="background: rgba(255,255,255,0.06); color: white; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 0.8rem; line-height: 1.4;">
        ${welcome}
      </div>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding: 10px 15px; display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.2);">
      <input type="text" id="nv-chat-input" placeholder="Type a message..." style="flex: 1; height: 32px; font-size: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding-inline: 8px; color: white; outline: none;" />
      <button id="nv-chat-send" style="background: ${color}; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>
  \`;
  document.body.appendChild(chatFrame);

  // Toggle open
  launcher.addEventListener("click", function() {
    if (chatFrame.style.display === "none") {
      chatFrame.style.display = "flex";
    } else {
      chatFrame.style.display = "none";
    }
  });

  // Action listeners
  const sendBtn = chatFrame.querySelector("#nv-chat-send");
  const inputEl = chatFrame.querySelector("#nv-chat-input");
  const msgBox = chatFrame.querySelector("#nv-messages-box");

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";

    // Append user message
    const userMsg = document.createElement("div");
    userMsg.style.cssText = "align-self: flex-end; background: ${color}; color: white; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 0.8rem; line-height: 1.4;";
    userMsg.innerText = text;
    msgBox.appendChild(userMsg);
    msgBox.scrollTop = msgBox.scrollHeight;

    // Send backend request
    try {
      const res = await fetch("https://${tenant}.neuravolt.cloud/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      
      const botMsg = document.createElement("div");
      botMsg.style.cssText = "align-self: flex-start; background: rgba(255,255,255,0.06); color: white; padding: 8px 12px; border-radius: 8px; max-width: 80%; font-size: 0.8rem; line-height: 1.4;";
      botMsg.innerText = data.response || data.error || "Sorry, I encountered an issue processing your request.";
      msgBox.appendChild(botMsg);
      msgBox.scrollTop = msgBox.scrollHeight;
    } catch(err) {
      console.error(err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter") sendMessage();
  });
})();
  `;

  res.setHeader('Content-Type', 'application/javascript');
  return res.status(200).send(jsScript);
});

export default router;
