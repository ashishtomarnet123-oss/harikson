import * as vscode from 'vscode';

export class GhostTextProvider implements vscode.InlineCompletionItemProvider {
  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[] | undefined> {
    
    // 1. Debounce 300ms to avoid flooding requests during typing
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (token.isCancellationRequested) {
      return undefined;
    }

    const config = vscode.workspace.getConfiguration('harikson');
    const tenantUrl = config.get<string>('tenantUrl') || 'http://localhost:3000';
    const apiKey = config.get<string>('apiKey') || '';
    const model = config.get<string>('model') || 'harikson-plus';

    // No completion triggered if apiKey is unset
    if (!apiKey) {
      return undefined;
    }

    const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
    const suffix = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, 0)));
    const currentLine = document.lineAt(position.line).text;

    // Build autocomplete prompt
    const prompt = `Complete this code at the cursor. 
Prefix:
${prefix}
Suffix:
${suffix}
Current line: ${currentLine}

Provide ONLY the code suggestions to insert next. Do NOT include markdown tags like \`\`\` or explanations.`;

    try {
      const response = await fetch(`${tenantUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Tenant-Url': tenantUrl
        },
        body: JSON.stringify({
          message: prompt,
          model: model === 'harikson-plus' ? 'harikson-chat-8b' : 'harikson-coder-14b'
        }),
        signal: AbortSignal.timeout(4000) // 4 seconds timeout limit
      });

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json() as any;
      if (data && data.response) {
        let completionText = data.response;
        
        // Clean markdown backticks that the LLM might have returned
        completionText = completionText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
        
        const completionItem = new vscode.InlineCompletionItem(
          completionText,
          new vscode.Range(position, position)
        );
        
        return [completionItem];
      }
    } catch (err) {
      console.error('GhostText autocompletes error:', err);
    }

    return undefined;
  }
}
