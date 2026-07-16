import * as vscode from 'vscode';

export class ChatProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'harikson-chat-view';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Render Webview HTML layout
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Message listener
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this._handleSendMessage(data.value);
          break;
      }
    });
  }

  private async _handleSendMessage(message: string) {
    if (!this._view) return;

    const config = vscode.workspace.getConfiguration('harikson');
    const tenantUrl =
      config.get<string>('tenantUrl') || 'http://localhost:3000';
    const apiKey = config.get<string>('apiKey') || '';
    const model = config.get<string>('model') || 'harikson-plus';

    if (!apiKey) {
      this._view.webview.postMessage({
        type: 'addResponse',
        value:
          '⚠️ Config Error: API Key missing. Set "harikson.apiKey" in VS Code settings.',
      });
      return;
    }

    // Trigger loading spinner
    this._view.webview.postMessage({ type: 'showThinking' });

    try {
      const response = await fetch(`${tenantUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Tenant-Url': tenantUrl,
        },
        body: JSON.stringify({
          message: message,
          model:
            model === 'harikson-plus'
              ? 'harikson-chat-8b'
              : 'harikson-coder-14b',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Server returned ${response.status}`);
      }

      const data = (await response.json()) as any;
      this._view.webview.postMessage({
        type: 'addResponse',
        value: data.response || 'Empty response received.',
      });
    } catch (err: any) {
      this._view.webview.postMessage({
        type: 'addResponse',
        value: `❌ Fetch Error: ${err.message || err}`,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Harikson Chat</title>
        <style>
          body {
            font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-editor-foreground, #ccc);
            background-color: var(--vscode-sideBar-background, #1e1e1e);
            padding: 10px;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
          }
          .chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          #messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border, #333);
            border-radius: 6px;
            background-color: var(--vscode-editor-background, #1e1e1e);
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 10px;
          }
          .message {
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 85%;
            word-break: break-word;
            line-height: 1.4;
          }
          .user-msg {
            align-self: flex-end;
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #fff);
          }
          .ai-msg {
            align-self: flex-start;
            background-color: var(--vscode-editor-inactiveSelectionBackground, #2d2d2d);
            color: var(--vscode-editor-foreground, #ccc);
            border: 1px solid var(--vscode-panel-border, #333);
          }
          .input-area {
            display: flex;
            gap: 6px;
            padding-bottom: 25px;
          }
          input[type="text"] {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background, #3c3c3c);
            border: 1px solid var(--vscode-input-border, #3c3c3c);
            color: var(--vscode-input-foreground, #fff);
            border-radius: 4px;
            outline: none;
          }
          button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background, #007acc);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground, #0062a3);
          }
          pre {
            background-color: #0d0d0d;
            padding: 24px 10px 10px 10px;
            border-radius: 6px;
            overflow-x: auto;
            position: relative;
            margin: 8px 0;
            border: 1px solid #222;
          }
          code {
            font-family: var(--vscode-editor-font-family, monospace);
            color: #e2e8f0;
          }
          .copy-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            background: #2d3748;
            color: #cbd5e0;
            border: none;
            padding: 2px 6px;
            font-size: 0.7rem;
            border-radius: 3px;
            cursor: pointer;
          }
          .copy-btn:hover {
            background: #4a5568;
            color: #fff;
          }
        </style>
      </head>
      <body>
        <div class="chat-container">
          <div id="messages">
            <div class="message ai-msg">Hi! I am your Harikson AI assistant. Ask code completions or logic questions here!</div>
          </div>
          <div class="input-area">
            <input id="input" type="text" placeholder="Ask Harikson AI..." />
            <button id="send">Ask</button>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const messagesContainer = document.getElementById('messages');
          const inputField = document.getElementById('input');
          const sendBtn = document.getElementById('send');

          sendBtn.addEventListener('click', sendMessage);
          inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
          });

          function sendMessage() {
            const text = inputField.value.trim();
            if (!text) return;

            // Render User Bubble
            const userDiv = document.createElement('div');
            userDiv.className = 'message user-msg';
            userDiv.textContent = text;
            messagesContainer.appendChild(userDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            vscode.postMessage({ type: 'sendMessage', value: text });
            inputField.value = '';
          }

          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'showThinking') {
              const thinkingDiv = document.createElement('div');
              thinkingDiv.className = 'message ai-msg';
              thinkingDiv.id = 'thinking-indicator';
              thinkingDiv.textContent = 'Thinking...';
              messagesContainer.appendChild(thinkingDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else if (message.type === 'addResponse') {
              const thinkingIndicator = document.getElementById('thinking-indicator');
              if (thinkingIndicator) thinkingIndicator.remove();

              const aiDiv = document.createElement('div');
              aiDiv.className = 'message ai-msg';
              aiDiv.innerHTML = formatMarkdown(message.value);
              
              messagesContainer.appendChild(aiDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          });

          function formatMarkdown(text) {
            let formatted = text.replace(/\\n/g, '<br>');
            
            // Format code blocks
            const codeBlockRegex = /\`\`\`([a-zA-Z0-9-]*)\\n([\\s\\S]*?)\`\`\`/g;
            formatted = formatted.replace(codeBlockRegex, (match, lang, code) => {
              const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              return \`
                <pre>
                  <button class="copy-btn" onclick="copyCode(this)">Copy</button>
                  <code>\${escapedCode}</code>
                </pre>
              \`;
            });

            // Format inline code
            formatted = formatted.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            return formatted;
          }

          function copyCode(btn) {
            const code = btn.nextElementSibling.textContent;
            navigator.clipboard.writeText(code).then(() => {
              btn.textContent = 'Copied!';
              setTimeout(() => btn.textContent = 'Copy', 1500);
            });
          }
        </script>
      </body>
      </html>
    `;
  }
}
