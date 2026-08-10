// tenant-api's /api/v1/chat defaults to Server-Sent Events (stream: true),
// writing `data: {"content": "..."}\n\n` chunks followed by `data: [DONE]\n\n`.
// response.json() cannot parse that — this extracts the concatenated content
// from the raw SSE body instead.
export async function extractSseContent(response: Response): Promise<string> {
  const raw = await response.text();
  let content = '';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed.content === 'string') content += parsed.content;
    } catch {
      // Ignore malformed/partial SSE lines
    }
  }
  return content;
}
