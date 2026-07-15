import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GhostTextProvider } from './providers/ghostTextProvider';
import { ChatProvider } from './providers/chatProvider';

let statusBarItem: vscode.StatusBarItem;
let connectionTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("⚡ [Harikson AI] VS Code Extension activated!");

  const config = vscode.workspace.getConfiguration('harikson');
  const initialModel = config.get<string>('model') || 'harikson-plus';

  // 1. Setup Status Bar connection indicator
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'harikson.switchModel';
  context.subscriptions.push(statusBarItem);
  
  // Set initial status bar state
  updateStatusBar(false, initialModel);

  // 2. Register Inline Autocomplete Provider (Ghost Text)
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' }, 
      new GhostTextProvider()
    )
  );

  // 3. Register Sidebar Chat Webview panel
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatProvider.viewType,
      new ChatProvider(context.extensionUri)
    )
  );

  // 4. Register Code Review Selection Command
  context.subscriptions.push(
    vscode.commands.registerCommand('harikson.reviewSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found to review selection.');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);
      if (!selectedText.trim()) {
        vscode.window.showInformationMessage('Please select a code block to review first.');
        return;
      }

      const currentModel = config.get<string>('model') || 'harikson-plus';
      const tenantUrl = config.get<string>('tenantUrl') || 'http://localhost:3000';
      const apiKey = config.get<string>('apiKey') || '';

      if (!apiKey) {
        vscode.window.showErrorMessage('Harikson API Key is missing. Configure "harikson.apiKey" in settings.');
        return;
      }

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Harikson: Reviewing selected code...",
        cancellable: false
      }, async (progress) => {
        try {
          const prompt = `Review the following code and suggest performance enhancements, bug fixes, and security optimizations. Provide the reviewed code with corrections:\n\n${selectedText}`;
          const response = await fetch(`${tenantUrl}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'X-Tenant-Url': tenantUrl
            },
            body: JSON.stringify({
              message: prompt,
              model: currentModel === 'harikson-plus' ? 'harikson-chat-8b' : 'harikson-coder-14b'
            })
          });

          if (!response.ok) {
            throw new Error(`Server returned code ${response.status}`);
          }

          const data = await response.json() as any;
          const reviewResult = data.response || '';

          // Clean reviewed result of markdown tags
          let cleanedResult = reviewResult.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');

          // Create temporary workspace files for diff viewing
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (!workspaceFolder) {
            // Fallback: show reviewed results in new adjacent document panel
            const doc = await vscode.workspace.openTextDocument({
              content: reviewResult,
              language: editor.document.languageId
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            return;
          }

          const originalTempPath = path.join(workspaceFolder, '.harikson-review-original.tmp');
          const reviewedTempPath = path.join(workspaceFolder, '.harikson-review-suggested.tmp');

          await fs.promises.writeFile(originalTempPath, selectedText);
          await fs.promises.writeFile(reviewedTempPath, cleanedResult);

          const originalUri = vscode.Uri.file(originalTempPath);
          const reviewedUri = vscode.Uri.file(reviewedTempPath);

          // Open side-by-side VS Code Diff view panel
          await vscode.commands.executeCommand(
            'vscode.diff',
            originalUri,
            reviewedUri,
            'Harikson: Review Code Selection'
          );

          // Queue background deletion of temporary files after a short interval
          setTimeout(async () => {
            try {
              await fs.promises.unlink(originalTempPath);
              await fs.promises.unlink(reviewedTempPath);
            } catch (err: any) {
              console.warn("Warning deleting temp code review files:", err.message);
            }
          }, 15000);

        } catch (err: any) {
          vscode.window.showErrorMessage(`Code review failed: ${err.message || err}`);
        }
      });
    })
  );

  // 5. Register Switch Model Command selection pick
  context.subscriptions.push(
    vscode.commands.registerCommand('harikson.switchModel', async () => {
      const chosen = await vscode.window.showQuickPick(['harikson-plus', 'harikson-max'], {
        placeHolder: 'Select Harikson Model Context'
      });
      if (chosen) {
        await config.update('model', chosen, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Switched active model to ${chosen}`);
        checkConnection();
      }
    })
  );

  // Bind configurations change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('harikson')) {
        checkConnection();
      }
    })
  );

  // 6. Start Connection Status Check Polling
  checkConnection();
  connectionTimer = setInterval(checkConnection, 10000);
}

async function checkConnection() {
  const config = vscode.workspace.getConfiguration('harikson');
  const tenantUrl = config.get<string>('tenantUrl') || 'http://localhost:3000';
  const currentModel = config.get<string>('model') || 'harikson-plus';

  try {
    const res = await fetch(`${tenantUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      updateStatusBar(true, currentModel);
    } else {
      updateStatusBar(false, currentModel);
    }
  } catch {
    updateStatusBar(false, currentModel);
  }
}

function updateStatusBar(connected: boolean, model: string) {
  if (!statusBarItem) return;
  const icon = connected ? '$(circle-filled)' : '$(circle-outline)';
  statusBarItem.text = `${icon} Harikson: ${model}`;
  statusBarItem.tooltip = connected 
    ? `Connected to Harikson Tenant Service\nActive Model: ${model}\nClick to switch model` 
    : `Disconnected from Harikson\nClick to switch model`;
  
  if (connected) {
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  statusBarItem.show();
}

export function deactivate() {
  if (connectionTimer) {
    clearInterval(connectionTimer);
  }
}
