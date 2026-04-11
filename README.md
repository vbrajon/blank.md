# blank.md

A collaborative markdown editor for slides, documents and notebooks.

## FEATURES

- [x] Text Editor (line number, syntax highlighting, word count)
- [x] Preview Slides or Document or Notebook (theme\*, import/export\*)
- [x] Collaboration (multi cursor, pointer, follow, comments\*, undo/redo\*)

## IDEAS

- Plugins (à la sli.dev, or pi.dev)
- Version control (local save, GitHub/GitLab commit integration)
- AI features (autocomplete, rework, grammar check)
- 1+ Dictate, AI autocomplete, AI rework, spell check and grammar check, VSCode
- 2+ Editable, searchable, collapsible outline, scrollspy, extended markdown syntax (callouts, tabs, details, etc), auto-slide split or frontmatter, advanced theme features (components, animation, drawing), slidev plugins
- 3+ room.sh like features (chat, video, audio, whiteboard)
- 4+ History switch, Branches, Diff viewer, Diff line indicator, or FileSystem API for local file and inline version control in a single self-contained file or CRDT based version control.

## NOTE

- The project is meant to stay minimal and focused on writing, on a single md file.
- The code is meant to stay on a single file, with no build step, and no/few dependencies.
- The core features is the text editor, the rest should not introduce too much complexity or bloat.
- Format command: `npx prettier --write --no-semi --print-width 1000 .`
- Github pages: `cp index.html 404.html`

## INSPIRATION

- https://sli.dev/
- https://v0.app/
- https://figma.com/slides/
- https://observablehq.com/platform/notebooks
- https://tiptap.dev/
- https://diffs.com/
- https://shiki.style/
- https://code.storage/docs/
- https://tldraw.com/
- https://hashify.me/
- https://room.sh/
- https://gether.md/
- https://slatemd.app/
- https://md4x.unjs.io/
- https://json.pub/
- https://github.com/badlogic/jot

## COLLABORATION

- CRDT: yjs / yjs-webrtc / yjs-indexeddb
- SERVER: cloudflare DO, socket hibernate, TURN / STUN, no storage
- SECURITY: password or webauthn + PRF, stored in documents
