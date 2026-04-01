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

// DOM — unified top bar + editor body
const btnClass = "bg-none border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 py-0.5 px-3 rounded cursor-pointer font-mono text-[11px] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
const btnActive = "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-white/20 py-0.5 px-3 rounded cursor-pointer font-mono text-[11px] transition-colors"
app.btnClass = btnClass
app.btnActive = btnActive
document.body.insertAdjacentHTML(
  "beforeend",
  `
  <div id="topbar" class="fixed top-0 left-0 right-0 z-[300] flex items-center h-10 px-3 pl-5 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#151516] shrink-0 text-xs text-gray-400 dark:text-gray-600 gap-2">
    <span>blank.md</span>
    <div id="collab-users" class="flex items-center gap-1 ml-1"></div>
    <div class="flex-1"></div>
    <button id="btn-theme" class="group p-2 flex items-center justify-center cursor-pointer" aria-label="Toggle dark mode">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 block text-gray-400 dark:hidden group-hover:text-gray-600"><g clip-path="url(#sun-clip)"><path d="M8 1.11133V2.00022" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8711 3.12891L12.2427 3.75735" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.8889 8H14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8711 12.8711L12.2427 12.2427" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 14.8889V14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.12891 12.8711L3.75735 12.2427" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.11133 8H2.00022" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.12891 3.12891L3.75735 3.75735" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.00043 11.7782C10.0868 11.7782 11.7782 10.0868 11.7782 8.00043C11.7782 5.91402 10.0868 4.22266 8.00043 4.22266C5.91402 4.22266 4.22266 5.91402 4.22266 8.00043C4.22266 10.0868 5.91402 11.7782 8.00043 11.7782Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="sun-clip"><rect width="16" height="16" fill="white"/></clipPath></defs></svg>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 hidden dark:block text-gray-500 dark:group-hover:text-gray-300"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
    </button>
    <button id="btn-format" class="${btnClass}">Format <span class="font-semibold">⌘K</span></button>
    <button id="btn-text" class="${btnActive}">Text</button>
    <button id="btn-doc" class="${btnClass}">Doc</button>
    <button id="btn-slide" class="${btnClass}">Slide</button>
  </div>
  <div id="editor" class="fixed inset-0 pt-10 z-[200] flex flex-col bg-white dark:bg-[#151516]">
    <div class="flex-1 relative overflow-hidden">
      <div class="absolute inset-0 font-mono text-xs leading-[24px] py-5 px-6 [tab-size:2] whitespace-pre-wrap [word-wrap:break-word] text-[#393a34] dark:text-[#bbb] bg-white dark:bg-[#151516] pointer-events-none overflow-hidden" id="hl"></div>
      <textarea id="ta" class="absolute inset-0 font-mono text-xs leading-[24px] py-5 px-6 [tab-size:2] whitespace-pre-wrap [word-wrap:break-word] text-transparent bg-transparent caret-[#171717] dark:caret-[#dfdfdf] z-[1] [-webkit-text-fill-color:transparent] overflow-y-auto border-none outline-none resize-none" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
    </div>
  </div>
`,
)

const editor = document.getElementById("editor")
const ta = document.getElementById("ta")
const hl = document.getElementById("hl")

// Syntax colors
const syntaxColors = {
  light: { h: "#171717", sep: "#999", fm: "#998418", code: "#1e754f", bold: "#171717", tick: "#b56959", bullet: "#ab5959", bq: "#999", html: "#999" },
  dark: { h: "#dfdfdf", sep: "#555", fm: "#c4a93e", code: "#4ec99e", bold: "#dfdfdf", tick: "#d49575", bullet: "#cf8e8e", bq: "#666", html: "#666" },
}

function getColors() {
  return isDark() ? syntaxColors.dark : syntaxColors.light
}

// Highlight
function highlight(text) {
  const c = getColors()
  const lines = text.split("\n"),
    out = []
  let i = 0,
    inFM = false
  while (i < lines.length) {
    const raw = lines[i]
    const codeMatch = raw.match(/^```(\S*)/)
    if (codeMatch) {
      out.push(`<span style="color:${c.code}">` + app.esc(raw) + "</span>")
      const lang = codeMatch[1].split(/\s/)[0]
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (app.shiki && lang) {
        try {
          const theme = isDark() ? "min-dark" : "vitesse-light"
          const tokens = app.shiki.codeToTokens(codeLines.join("\n"), { lang, theme })
          for (const tokenLine of tokens.tokens) {
            let lineHtml = ""
            for (const token of tokenLine) {
              lineHtml += '<span style="color:' + (token.color || "") + '">' + app.esc(token.content) + "</span>"
            }
            out.push(lineHtml)
          }
        } catch {
          for (const cl of codeLines) out.push(`<span style="color:${c.code}">` + app.esc(cl) + "</span>")
        }
      } else {
        for (const cl of codeLines) out.push(`<span style="color:${c.code}">` + app.esc(cl) + "</span>")
      }
      if (i < lines.length) out.push(`<span style="color:${c.code}">` + app.esc(lines[i]) + "</span>")
      inFM = false
      i++
      continue
    }
    const line = app.esc(raw)
    if (/^\s*---\s*$/.test(line)) {
      inFM = true
      out.push(`<span style="color:${c.sep}">` + line + "</span>")
      i++
      continue
    }
    if (inFM && /^[\w-]+\s*:/.test(line)) {
      out.push(`<span style="color:${c.fm}">` + line + "</span>")
      i++
      continue
    }
    inFM = false
    if (/^#{1,6}\s/.test(line)) {
      out.push(`<span style="color:${c.h};font-weight:700">` + line + "</span>")
      i++
      continue
    }
    if (/^&gt;/.test(line)) {
      out.push(`<span style="color:${c.bq}">` + line + "</span>")
      i++
      continue
    }
    if (/^&lt;/.test(line)) {
      out.push(`<span style="color:${c.html}">` + line + "</span>")
      i++
      continue
    }
    out.push(
      line
        .replace(/(\*\*[^*]+\*\*)/g, `<span style="color:${c.bold};font-weight:700">$1</span>`)
        .replace(/(`[^`]+`)/g, `<span style="color:${c.tick}">$1</span>`)
        .replace(/^([-*+]\s)/, `<span style="color:${c.bullet}">$1</span>`),
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
      const html = app.shiki.codeToHtml(raw, { lang, theme: isDark() ? "min-dark" : "vitesse-light" })
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

// Panels
const topbar = document.getElementById("topbar")
const btnText = document.getElementById("btn-text")
const btnDoc = document.getElementById("btn-doc")
const btnSlide = document.getElementById("btn-slide")

const savedPanels = JSON.parse(localStorage.getItem("panels") || "null") || { text: true, doc: false }
app.text = savedPanels.text
app.doc = savedPanels.doc
app.slide = false

function savePanels() {
  localStorage.setItem("panels", JSON.stringify({ text: app.text, doc: app.doc }))
}

function updateLayout() {
  const wasHidden = editor.style.display === "none"
  // Buttons
  btnText.className = app.text && !app.slide ? btnActive : btnClass
  btnDoc.className = app.doc && !app.slide ? btnActive : btnClass
  btnSlide.className = app.slide ? btnActive : btnClass
  // Topbar
  topbar.style.display = app.slide ? "none" : ""
  // Editor
  if (app.slide || !app.text) {
    editor.style.display = "none"
    editor.style.right = ""
    editor.style.borderRight = ""
  } else {
    editor.style.display = ""
    if (app.doc) {
      editor.style.right = "50%"
      editor.style.borderRight = "1px solid rgba(128,128,128,0.15)"
    } else {
      editor.style.right = ""
      editor.style.borderRight = ""
    }
    if (wasHidden) {
      ta.value = app.content || ""
      sync()
      ta.focus()
    }
  }
  app.emit("layoutchange", { text: app.text, doc: app.doc, slide: app.slide })
}

app.toggleText = () => {
  if (app.text) {
    app.content = ta.value
    localStorage.setItem("slidev-md", app.content)
  }
  if (app.slide) {
    app.slide = false
    app.text = true
  } else {
    app.text = !app.text
    if (!app.text && !app.doc) app.doc = true
  }
  savePanels()
  updateLayout()
  if (app.text) ta.focus()
}

app.toggleDoc = () => {
  if (app.text) {
    app.content = ta.value
    localStorage.setItem("slidev-md", app.content)
  }
  if (app.slide) {
    app.slide = false
    app.doc = true
  } else {
    app.doc = !app.doc
    if (!app.text && !app.doc) app.text = true
  }
  savePanels()
  updateLayout()
}

app.enterSlide = () => {
  if (app.text) {
    app.content = ta.value
    localStorage.setItem("slidev-md", app.content)
  }
  app.slide = true
  updateLayout()
}

app.openEditor = () => { if (!app.text) app.toggleText() }
app.closeEditor = () => { if (app.text) app.toggleText() }
app.setMode = (mode) => {
  if (mode === "slide") app.enterSlide()
  else if (mode === "text" && !app.text) app.toggleText()
  else if (mode === "doc" && !app.doc) app.toggleDoc()
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
  if (e.key === "k" && (e.ctrlKey || e.metaKey) && prettierMod) {
    e.preventDefault()
    prettierMod.format(ta.value, { parser: "markdown", plugins: [prettierMd], semi: false, printWidth: 1000 }).then((formatted) => {
      ta.value = formatted.trimEnd()
      app.emit("editorinput", { value: ta.value })
      sync()
    })
  }
})

document.getElementById("btn-format").onclick = () => {
  if (!prettierMod) return
  prettierMod.format(ta.value, { parser: "markdown", plugins: [prettierMd], semi: false, printWidth: 1000 }).then((formatted) => {
    ta.value = formatted.trimEnd()
    app.emit("editorinput", { value: ta.value })
    sync()
  })
}

// Theme
function isDark() {
  return document.documentElement.classList.contains("dark")
}

function setTheme(mode) {
  if (mode === "dark") {
    document.documentElement.classList.add("dark")
    localStorage.setItem("theme", "dark")
  } else if (mode === "light") {
    document.documentElement.classList.remove("dark")
    localStorage.setItem("theme", "light")
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    localStorage.removeItem("theme")
  }
  sync()
}

document.getElementById("btn-theme").onclick = () => setTheme(isDark() ? "light" : "dark")
setTheme(localStorage.getItem("theme") || "system")

// Panel buttons
btnText.onclick = () => app.toggleText()
btnDoc.onclick = () => app.toggleDoc()
btnSlide.onclick = () => app.enterSlide()

// Slide edit button (floating, only visible in slide mode)
document.body.insertAdjacentHTML("beforeend", `<button id="btn-slide-edit" class="${btnClass} fixed top-2 right-4 z-[150]" style="display:none">Edit</button>`)
document.getElementById("btn-slide-edit").onclick = () => app.toggleText()
app.on("layoutchange", ({ slide }) => {
  document.getElementById("btn-slide-edit").style.display = slide ? "" : "none"
})

// Load content
app.content = localStorage.getItem("slidev-md") || ""
if (!app.content) {
  try {
    app.content = (await (await fetch("ai.md")).text()).trim()
  } catch {}
}
ta.value = app.content
sync()

// Init
updateLayout()
