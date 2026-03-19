# Lens

**Point. Describe. Ship.**

Chrome extension for visual feedback, video direction, and QA assertions on any web page. Click any element, describe what needs to change, and get structured annotation data that routes directly to your AI coding agent via MCP — or copy it to your clipboard.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-FFD700?style=flat&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-14B8A6?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)

---

## Quick Start

```bash
npm install
npm run build
```

Then load `dist/` into Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `dist/` folder

---

## MCP Setup

Lens ships with an MCP server that lets any AI coding agent in VS Code read your annotations, reply, and resolve them — all through the standard [Model Context Protocol](https://modelcontextprotocol.io).

### VS Code (Copilot, Copilot Chat, any MCP-capable extension)

**Zero config.** Open this project in VS Code. The `.vscode/mcp.json` file auto-registers the server. Your AI sees the `lens_*` tools immediately.

### Claude Code

Already configured via `.claude/settings.json` when you open this project. If you want it globally:

```json
{
  "mcpServers": {
    "lens": {
      "command": "npx",
      "args": ["tsx", "src/mcp-bridge/server.ts"],
      "cwd": "/path/to/lens"
    }
  }
}
```

Add to `~/.claude/settings.json`.

### Cline / Continue / Roo Code

Add to your extension's MCP config (check each extension's docs for the settings file location):

```json
{
  "mcpServers": {
    "lens": {
      "command": "npx",
      "args": ["tsx", "src/mcp-bridge/server.ts"],
      "cwd": "/path/to/lens"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "lens": {
      "command": "npx",
      "args": ["tsx", "src/mcp-bridge/server.ts"],
      "cwd": "/path/to/lens"
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "lens": {
      "command": "npx",
      "args": ["tsx", "src/mcp-bridge/server.ts"],
      "cwd": "/path/to/lens"
    }
  }
}
```

### MCP Tools

Once connected, your AI agent has these tools:

| Tool | Description |
|------|-------------|
| `lens_get_pending` | Get all pending annotations (optionally filter by `project_slug`) |
| `lens_get_session` | Get a session by ID or URL |
| `lens_acknowledge` | Mark annotation as seen |
| `lens_resolve` | Mark annotation as fixed (with optional message) |
| `lens_dismiss` | Dismiss annotation |
| `lens_reply` | Reply to an annotation thread |

When the AI resolves or replies, the Chrome extension updates in real time via SSE.

---

## Three Modes

### Feedback
Click any element to report visual bugs. Lens captures the DOM selector, bounding box, computed styles, and React/Vue/Angular component tree automatically. You describe what's wrong; Lens packages the context.

### Video Director
Build cinematic sequences by selecting elements and assigning camera actions (zoom, pan, highlight, crossfade). Each annotation becomes a sequence step with timing, easing, and optional narration. Export as a Remotion composition manifest.

### QA Assertion
Click elements and define what should be true about them (exists, visible, text equals, style matches, layout within bounds). Export as a Playwright test file with real selectors.

## Usage

### Popup Controls
- **Activate Lens** — Injects the overlay onto the current page
- **Open Panel** — Opens the side panel for annotation management and export
- **Mode Buttons** — Switch between Feedback, Video Director, and QA Assertion

### Shortcuts (active when Lens is on)

| Key | Action |
|-----|--------|
| `⌘⇧L` | Toggle Lens on/off |
| `F` | Feedback mode |
| `V` | Video Director mode |
| `Q` | QA Assertion mode |
| `C` | Copy all annotations to clipboard |
| `H` | Hide/show markers |
| `Esc` | Deactivate Lens |
| `1-9` | Jump to annotation by number |

### Side Panel
- View all annotations in the current session
- Set project context (slug, name, repo) for MCP routing
- Export as Markdown, JSON, Playwright tests, or Remotion manifest
- Copy all feedback to clipboard
- Manage annotation status

### Clipboard Export
Press `C` while Lens is active, or use the side panel's Copy button:

```
# 🔍 Lens Feedback — My App
**Page:** https://example.com/editor
**Date:** Mar 19, 2026
**Items:** 3

## 🔴 Blocking (1)
- **[Fix]** Button overlaps the sidebar on mobile
  `<button>` → `div.editor-toolbar > button:nth-child(3)`
  Component: EditorToolbar → ActionButton
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Chrome Extension (Manifest V3)                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Content Script│  │ Side Panel   │  │  Popup    │ │
│  │ • Selection  │  │ • Ann. list  │  │ • Toggle  │ │
│  │ • Highlight  │  │ • Export     │  │ • Mode    │ │
│  │ • Annotation │  │ • Project    │  │ • Panel   │ │
│  │   popup      │  │   context    │  │   opener  │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         └─────────┬───────┴────────────────┘       │
│          ┌────────┴────────┐                        │
│          │ Service Worker  │                        │
│          │ • IndexedDB     │                        │
│          │ • Session mgmt  │                        │
│          │ • MCP relay     │                        │
│          └────────┬────────┘                        │
└───────────────────┼─────────────────────────────────┘
                    │
           ┌────────┴────────┐
           │ MCP Server      │
           │ (stdio + :4848) │
           │ • MCP tools     │
           │ • SSE stream    │
           └────────┬────────┘
                    │
           ┌────────┴────────┐
           │ AI Agent        │
           │ (any MCP client)│
           └─────────────────┘
```

### Source Layout

```
src/
├── background/
│   ├── service-worker.ts    # Session persistence, messaging, tab capture
│   └── mcp-server.ts        # In-extension MCP tool handler
├── content/
│   ├── content.ts           # Main content script entry
│   ├── selector-engine.ts   # DOM targeting, CSS/XPath generation
│   ├── annotation-popup.ts  # On-page annotation form
│   └── styles.ts            # Injected CSS
├── sidepanel/
│   ├── index.html
│   ├── sidepanel.ts         # Annotation list, export, project context
│   └── sidepanel.css
├── popup/
│   ├── index.html
│   ├── popup.ts             # Mode toggle, side panel opener
│   └── popup.css
├── shared/
│   ├── raf-schema.ts        # Annotation format types
│   ├── constants.ts         # Design tokens, message types
│   ├── serializers.ts       # Markdown, JSON, Remotion, Playwright exporters
│   └── storage.ts           # IndexedDB wrapper
├── mcp-bridge/
│   └── server.ts            # MCP stdio server + HTTP listener
└── icons/
    └── generate-icons.ts    # SVG → PNG icon generator
```

## Development

```bash
npm run dev         # Watch mode
npm run typecheck   # Type check
npm run build       # Production build
```

After building, reload the extension in `chrome://extensions`.

## License

MIT

---

Made with ❤ by [RenderDraw](https://renderdraw.com)
