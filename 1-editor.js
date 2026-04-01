// ===== 1-EDITOR: Markdown text editor with syntax highlighting =====
window.blank = {
  on(e, fn) {
    document.addEventListener("blank:" + e, (ev) => fn(ev.detail))
  },
  emit(e, d) {
    document.dispatchEvent(new CustomEvent("blank:" + e, { detail: d }))
  },
  esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  },
}
const app = window.blank

// DOM
document.body.insertAdjacentHTML(
  "beforeend",
  `
  <div id="editor" class="editor">
    <div class="editor-bar">
      <span>blank.md</span>
      <div class="spacer"></div>
      <button id="btn-done">Preview</button>
    </div>
    <div class="editor-body">
      <div class="editor-hl" id="hl"></div>
      <textarea id="ta" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
    </div>
  </div>
  <div id="deck-bar" class="deck-bar hidden">
    <button id="btn-edit">Edit</button>
  </div>
`,
)

const editor = document.getElementById("editor")
const ta = document.getElementById("ta")
const hl = document.getElementById("hl")
const deckBar = document.getElementById("deck-bar")

// Highlight
function highlight(text) {
  const lines = text.split("\n"),
    out = []
  let i = 0,
    inFM = false
  while (i < lines.length) {
    const raw = lines[i]
    const codeMatch = raw.match(/^```(\S*)/)
    if (codeMatch) {
      out.push('<span class="ed-code">' + app.esc(raw) + "</span>")
      const lang = codeMatch[1].split(/\s/)[0]
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (app.shiki && lang) {
        try {
          const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "min-dark" : "vitesse-light"
          const tokens = app.shiki.codeToTokens(codeLines.join("\n"), { lang, theme })
          for (const tokenLine of tokens.tokens) {
            let lineHtml = ""
            for (const token of tokenLine) {
              lineHtml += '<span style="color:' + (token.color || "") + '">' + app.esc(token.content) + "</span>"
            }
            out.push(lineHtml)
          }
        } catch {
          for (const cl of codeLines) out.push('<span class="ed-code">' + app.esc(cl) + "</span>")
        }
      } else {
        for (const cl of codeLines) out.push('<span class="ed-code">' + app.esc(cl) + "</span>")
      }
      if (i < lines.length) out.push('<span class="ed-code">' + app.esc(lines[i]) + "</span>")
      inFM = false
      i++
      continue
    }
    const line = app.esc(raw)
    if (/^\s*---\s*$/.test(line)) {
      inFM = true
      out.push('<span class="ed-sep">' + line + "</span>")
      i++
      continue
    }
    if (inFM && /^[\w-]+\s*:/.test(line)) {
      out.push('<span class="ed-fm">' + line + "</span>")
      i++
      continue
    }
    inFM = false
    if (/^#{1,6}\s/.test(line)) {
      out.push('<span class="ed-h">' + line + "</span>")
      i++
      continue
    }
    if (/^&gt;/.test(line)) {
      out.push('<span class="ed-bq">' + line + "</span>")
      i++
      continue
    }
    if (/^&lt;/.test(line)) {
      out.push('<span class="ed-html">' + line + "</span>")
      i++
      continue
    }
    out.push(
      line
        .replace(/(\*\*[^*]+\*\*)/g, '<span class="ed-bold">$1</span>')
        .replace(/(`[^`]+`)/g, '<span class="ed-tick">$1</span>')
        .replace(/^([-*+]\s)/, '<span class="ed-bullet">$1</span>'),
    )
    i++
  }
  return out.join("\n")
}

function sync() {
  hl.innerHTML = highlight(ta.value) + "\n"
}

// Shiki
try {
  const m = await import("https://esm.sh/shiki@1.29.2/bundle/web")
  app.shiki = await m.createHighlighter({
    themes: ["min-dark", "vitesse-light"],
    langs: ["javascript", "typescript", "json", "bash", "html", "css", "python", "yaml", "markdown"],
  })
} catch (e) {
  console.debug("[shiki]", e.message)
}
if (app.shiki) sync()
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => sync())

function upgradeCodeBlocks() {
  if (!app.shiki) return
  const deck = document.getElementById("deck")
  if (!deck) return
  deck.querySelectorAll(".code-block[data-lang]").forEach((pre) => {
    const code = pre.querySelector("code")
    if (!code) return
    const raw = code.textContent,
      lang = pre.dataset.lang || "javascript"
    try {
      const html = app.shiki.codeToHtml(raw, { lang, theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "min-dark" : "vitesse-light" })
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      const shikiPre = tmp.querySelector("pre")
      if (shikiPre) {
        pre.style.backgroundColor = shikiPre.style.backgroundColor || ""
        pre.classList.add("shiki")
        code.innerHTML = shikiPre.querySelector("code").innerHTML
      }
    } catch {}
  })
}
app.on("render", upgradeCodeBlocks)

// Prettier
let prettierMod, prettierMd
try {
  ;[prettierMod, prettierMd] = await Promise.all([import("https://esm.sh/prettier@3/standalone"), import("https://esm.sh/prettier@3/plugins/markdown")])
} catch (e) {
  console.debug("[prettier]", e.message)
}

// Open / Close
app.openEditor = () => {
  ta.value = app.content || ""
  editor.classList.remove("hidden")
  deckBar.classList.add("hidden")
  sync()
  ta.focus()
  app.emit("editoropen")
}

app.closeEditor = () => {
  editor.classList.add("hidden")
  deckBar.classList.remove("hidden")
  app.content = ta.value
  localStorage.setItem("slidev-md", app.content)
  app.refreshDeck?.()
}

app.updateHighlight = sync

// Events
ta.addEventListener("input", () => {
  app.emit("editorinput", { value: ta.value })
  sync()
})
ta.addEventListener("scroll", () => {
  hl.scrollTop = ta.scrollTop
  hl.scrollLeft = ta.scrollLeft
})
ta.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault()
    const s = ta.selectionStart,
      end = ta.selectionEnd
    ta.value = ta.value.substring(0, s) + "  " + ta.value.substring(end)
    ta.selectionStart = ta.selectionEnd = s + 2
    app.emit("editorinput", { value: ta.value })
    sync()
  }
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && prettierMod) {
    e.preventDefault()
    prettierMod.format(ta.value, { parser: "markdown", plugins: [prettierMd], semi: false, printWidth: 1000 }).then((formatted) => {
      ta.value = formatted.trimEnd()
      app.emit("editorinput", { value: ta.value })
      sync()
    })
  }
})

document.getElementById("btn-edit").onclick = () => app.openEditor()
document.getElementById("btn-done").onclick = () => app.closeEditor()

// Load content
app.content = localStorage.getItem("slidev-md") || ""
if (!app.content) {
  try {
    app.content = (await (await fetch("ai.md")).text()).trim()
  } catch {}
}
ta.value = app.content
sync()
