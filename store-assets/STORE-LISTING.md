# Chrome Web Store Listing — RenderDraw Lens

## Extension Name
RenderDraw Lens

## Summary (132 characters max)
Visual feedback, video direction & QA assertions for any web page. Built for the RenderDraw creative stack.

## Category
Developer Tools

## Language
English

## Description

RenderDraw Lens is a universal visual feedback tool for designers, developers, and QA teams. Click any element on any page to leave annotated feedback, build cinematic video sequences, or define visual regression assertions — all from a single Chrome extension.

THREE MODES

Feedback — Report visual bugs with element selectors, computed styles, and React component trees. Tag by severity (blocking, important, suggestion, cosmetic) and intent (visual_bug, spacing, typography, color, and more).

Video Direction — Build shot-by-shot cinematic sequences with zoom, pan, and highlight actions. Set timing, easing, and narration for each step. Export directly to Remotion for React-based video rendering.

QA Assertion — Define visual regression specs by clicking elements and specifying expected values. Export as executable Playwright test files for automated visual testing.

EXPORT ANYWHERE

Copy structured Markdown grouped by severity with emoji indicators, full JSON in the RenderDraw Annotation Format (RAF), executable Playwright test specs, or Remotion video manifests. Use the clipboard shortcut (C) when you need it fast.

MCP BRIDGE — CLAUDE CODE INTEGRATION

Connect RenderDraw Lens directly to Claude Code via the built-in MCP bridge server (port 4848). Push annotations, watch for new feedback in real-time, and let your AI assistant resolve visual bugs automatically. Tools include lens_get_pending, lens_resolve, lens_reply, lens_watch, and more.

PROJECT CONTEXT

Organize feedback by project with slug, name, and repo URL. MCP payloads include project context so Claude Code knows which codebase to route feedback to. Session persistence keeps your annotations for 30 days with auto-eviction.

KEYBOARD-FIRST

Toggle Lens: Cmd+Shift+L (Ctrl+Shift+L on Windows)
Copy feedback: C
Dismiss: Esc

BUILT FOR THE RENDERDRAW STACK

RenderDraw Lens integrates with Journeys (https://journeys.studio) for 3D presentation feedback and the full RenderDraw platform (https://renderdraw.com) for creative production workflows. Works on any website — not just RenderDraw properties.

Zero external dependencies. Open source. Privacy-first — all data stays in your browser's IndexedDB.

## Website
https://renderdraw.com

## Privacy Policy URL
https://renderdraw.com/privacy

---

## Assets Checklist

| Asset | File | Dimensions |
|-------|------|-----------|
| Screenshot 1 — Feedback Mode | screenshot-1-feedback.png | 1280x800 |
| Screenshot 2 — Video Direction | screenshot-2-video.png | 1280x800 |
| Screenshot 3 — QA Assertions | screenshot-3-qa.png | 1280x800 |
| Screenshot 4 — Export Formats | screenshot-4-export.png | 1280x800 |
| Small Promo Tile | promo-small-440x280.png | 440x280 |
| Marquee Promo | promo-marquee-1400x560.png | 1400x560 |
| Extension Icon | ../public/icons/lens-128.png | 128x128 |

## Upload Instructions

1. Go to https://chrome.developer.google.com/
2. Sign in with your Google developer account
3. Click "New Item" → Upload dist/ as a ZIP
4. Fill in the listing fields using the copy above
5. Upload screenshots and promo images from this directory
6. Set category to "Developer Tools"
7. Submit for review
