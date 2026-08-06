# Harikson AI Code Assistant

VS Code extension for Xarwiz: inline ghost-text code completions, a sidebar
chat panel, and a "Review Selection" command — all backed by your real
Xarwiz tenant, not a mock service.

## Features

- **Ghost text completions** — inline suggestions as you type, sent to your
  tenant's chat model.
- **Sidebar chat** — a chat panel in the activity bar for quick questions
  without leaving the editor.
- **Review Selection** — select code, run `Harikson: Review Selection` from
  the command palette, and get a side-by-side diff with suggested fixes.
- A status bar item shows whether the extension can currently reach your
  tenant, and lets you switch between `harikson-plus` and `harikson-max`.

## Setup

1. Get a personal access token: in the Xarwiz app, go to
   **Settings → Connected Apps → Xarwiz VS Code Extension → Connect**. Copy
   the token shown — it's only displayed once.
2. In VS Code, open **Settings** (`Ctrl+,` / `Cmd+,`) and search for
   "Harikson":
   - `Harikson: Tenant Url` — your Xarwiz endpoint (defaults to
     `https://xarwiz.com`; use `http://localhost:3008` for local
     development against the repo's own dev server).
   - `Harikson: Api Key` — paste the token from step 1.
3. Ghost text and the sidebar chat panel start working immediately. No
   reload required.

Disconnecting later (Settings → Connected Apps → Disconnect) revokes the
token immediately — the extension will show a disconnected status and stop
returning completions until a new token is issued and pasted in.

## Building & installing

This extension isn't published to the Marketplace yet, so install it from a
locally built package:

```bash
cd ide-extension
npm install
npm run package
```

This produces a `.vsix` file in this directory. Install it in VS Code via
**Extensions view → `...` menu → Install from VSIX...**, or from the
command line:

```bash
code --install-extension harikson-vscode-extension-1.0.0.vsix
```

Share the `.vsix` file with teammates so they can install it the same way —
no Marketplace account needed.

### Local development

```bash
npm install
npm run compile
```

Then press `F5` in VS Code (with this folder open) to launch an Extension
Development Host with the extension loaded, for iterating on the source
without repackaging each time.
