# blank.md

A collaborative markdown editor for slides

## FEATURES

- [x] Text Editor (line number, syntax highlighting, word count)
- [x] Preview Slides or Document (theme\*, import/export\*)
- [x] Collaboration (multi cursor, pointer, follow, comments\*, undo/redo\*)

## IDEAS

- Plugins (à la slidev)
- Version control (local save, GitHub/GitLab commit integration)
- AI features (autocomplete, rework, grammar check)
- 1+ Dictate, AI autocomplete, AI rework, spell check and grammar check, VSCode
- 2+ Editable, searchable, collapsible outline, scrollspy, extended markdown syntax (callouts, tabs, details, etc), auto-slide split or frontmatter, advanced theme features (components, animation, drawing), slidev plugins
- 3+ room.sh like features (chat, video, audio, whiteboard)
- 4+ History switch, Branches, Diff viewer, Diff line indicator, or FileSystem API for local file and inline version control in a single self-contained file or CRDT based version control.

## NOTE

- The project is meant to stay minimal and focused on writing, on a single md file.
- The core features is the text editor, the rest are optional and should not introduce too much complexity or bloat.

## DEV

- `npx prettier --write --no-semi --print-width 1000 . && cp index.html 404.html`

## INSPIRATION

- https://sli.dev/
- https://code.storage/docs/
- https://tldraw.com/
- https://hashify.me/
- https://room.sh/
- https://gether.md/
- https://slatemd.app/
- https://shiki.style/
- https://md4x.unjs.io/
- https://json.pub/
- https://github.com/badlogic/jot
