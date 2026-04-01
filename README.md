# blank.md

FEATURES:

1. [x] Text Editor (line number, syntax highlighting, line/word count)
2. [ ] Preview HTML or Slides (with theme support)
3. [ ] Collaboration (multi cursor and pointer and follow and comments)
4. [ ] Version Control (URL based on github/gitlab public/private repo and commit on CTRL+S)

IDEA/ROADMAP:

1+. [ ] Dictate, AI autocomplete, AI rework, spell check and grammar check, VSCode
2+. [ ] Editable, searchable, collapsible outline, scrollspy, extended markdown syntax (callouts, tabs, details, etc), auto-slide split or frontmatter, advanced theme features (components, animation, drawing), slidev plugins
3+. [ ] room.sh like features (chat, video, audio, whiteboard)
4+. [ ] History switch, Diff viewer, Diff line indicator, or FileSystem API for local file and inline version control in a single self-contained file or CRDT based version control.

NOTE:

- The project is meant to stay minimal and focused on writing, on a single md file.
- The core features is the text editor, the rest are optional and should not introduce too much complexity or bloat.

UI:

- [ ] Top Bar (Collab Indicator, Version Indicator, Mode Switcher)
- [ ] Left Bar (Outline)

INSPIRATION:

- https://sli.dev/
- https://code.storage/docs/
- https://hashify.me/
- https://room.sh/
- https://gether.md/

DEV:

- `npx prettier --write --no-semi --print-width 1000 .`
