// ===== 2-PREVIEW: Markdown → Doc or Slides + Navigation =====
const app = window.blank

// Load marked
const { marked } = await import("https://esm.sh/marked@15")
marked.setOptions({ gfm: true, breaks: false })
marked.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || "text").split(/\s/)[0]
      return '<pre class="code-block rounded-lg border border-gray-200 dark:border-white/10 bg-[#2d1525] dark:bg-[#0d0d0e] p-5 my-3 max-w-3xl w-full overflow-x-auto" data-lang="' + language + '"><code class="text-[#ffe4ec] dark:text-[#fce4ec] text-sm leading-7 block">' + app.esc(text) + "</code></pre>"
    },
    table({ header, rows }) {
      let html = '<table class="w-full border-collapse my-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden"><thead><tr>'
      for (const cell of header) html += '<th class="text-left p-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 border-b-2 border-gray-200 dark:border-white/10">' + cell.text + "</th>"
      html += "</tr></thead><tbody>"
      for (const row of rows) {
        html += '<tr class="border-b border-gray-200 dark:border-white/10 even:bg-gray-50/50 dark:even:bg-white/[0.02]">'
        for (const cell of row) html += '<td class="p-2.5 px-4 text-sm">' + cell.text + "</td>"
        html += "</tr>"
      }
      return html + "</tbody></table>"
    },
    link({ href, text }) {
      return '<a href="' + href + '" target="_blank" rel="noopener">' + text + "</a>"
    },
  },
})
app.marked = marked
function md(text) {
  return text ? marked.parse(text) : ""
}

// ===== PREVIEW MODE =====
let previewMode = "doc"

// ===== DOC RENDERER =====
function renderDoc(content) {
  return '<article class="font-sans prose dark:prose-invert max-w-none font-mono">' + md(content) + "</article>"
}

// ===== SLIDE PARSING =====
function parseSlides(text) {
  text = text.trim()
  const lines = text.split("\n")
  const slides = []
  let buf = []
  let inCode = false

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode
    if (!inCode && /^(#{1,6} |\d+\.\s)/.test(line) && buf.length) {
      const content = buf.join("\n").trim()
      if (content) slides.push({ content })
      buf = []
    }
    buf.push(line)
  }
  const last = buf.join("\n").trim()
  if (last) slides.push({ content: last })

  for (let i = 0; i < slides.length; i++) {
    slides[i].content = promoteNumberedTitle(slides[i].content)
    slides[i].layout = detectLayout(slides[i].content, i, slides.length)
  }
  return slides
}

function promoteNumberedTitle(content) {
  return content.replace(/^(\d+\.)\s+(.*)/, (_, num, rest) => "### " + num + " " + rest)
}

function detectLayout(content, index, total) {
  if (index === 0) return "cover"
  if (index === total - 1) return "end"
  if (isTwoCols(content)) return "two-cols"
  return "default"
}

function isBlock(line) {
  return /^[-*+] |^\d+\.\s|^\||^```|^>/.test(line)
}

function splitBodyBlocks(body) {
  const lines = body.split("\n")
  const blocks = []
  let cur = []
  let inCode = false
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode
    if (!inCode && !line.trim() && cur.length) {
      // Check if next non-empty line starts a new block type
      blocks.push(cur.join("\n"))
      cur = []
    } else {
      cur.push(line)
    }
  }
  if (cur.length) blocks.push(cur.join("\n"))
  return blocks.filter((b) => b.trim())
}

function isTwoCols(content) {
  const lines = content.split("\n")
  let start = 0
  if (/^#{1,6} /.test(lines[0])) start = 1
  while (start < lines.length && !lines[start].trim()) start++
  const body = lines.slice(start).join("\n")
  const blocks = splitBodyBlocks(body)
  return blocks.length === 2
}

function splitTwoCols(content) {
  const lines = content.split("\n")
  let headEnd = 0
  if (/^#{1,6} /.test(lines[0])) {
    headEnd = 1
    while (headEnd < lines.length && !lines[headEnd].trim()) headEnd++
  }
  const heading = lines.slice(0, headEnd).join("\n")
  const blocks = splitBodyBlocks(lines.slice(headEnd).join("\n"))
  return { heading, left: blocks[0] || "", right: blocks[1] || "" }
}

// ===== SLIDE RENDERER =====
const slideBase = "h-[100cqh] snap-start overflow-hidden relative flex flex-col justify-center transition-all duration-100 ease-out"
const pad = "px-[clamp(40px,8cqw,120px)] py-[clamp(40px,6cqh,80px)]"

function renderSlide(slide) {
  const layout = slide.layout || "default"
  const content = slide.content || ""

  if (layout === "cover") return '<section class="slide ' + slideBase + ' items-center text-center">' + md(content) + "</section>"
  if (layout === "end") return '<section class="slide ' + slideBase + ' items-center text-center">' + md(content) + "</section>"
  if (layout === "two-cols") {
    const { heading, left, right } = splitTwoCols(content)
    return '<section class="slide ' + slideBase + " " + pad + '">' + (heading ? md(heading) : "") + '<div class="grid grid-cols-2 gap-8 items-start flex-1"><div class="min-w-0">' + md(left) + '</div><div class="min-w-0">' + md(right) + "</div></div></section>"
  }
  return '<section class="slide ' + slideBase + " " + pad + ' justify-start pt-[clamp(36px,6cqh,72px)]">' + md(content) + "</section>"
}

// ===== DOM =====
const deck = document.createElement("div")
deck.id = "deck"
document.body.prepend(deck)

const progress = document.createElement("div")
progress.className = "fixed top-0 left-0 h-[3px] bg-pink-500 z-[100] transition-all duration-300 pointer-events-none"
progress.id = "deck-progress"

const dotsEl = document.createElement("div")
dotsEl.className = "fixed right-[clamp(12px,2vw,24px)] top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[100] p-2 bg-white/60 dark:bg-black/60 rounded-[20px] backdrop-blur-sm"
dotsEl.id = "deck-dots"

const counter = document.createElement("div")
counter.className = "fixed bottom-[clamp(12px,2vh,24px)] right-[clamp(12px,2vw,24px)] font-mono text-xs text-gray-500 dark:text-gray-400 z-[100] tabular-nums"
counter.id = "deck-counter"

document.body.append(progress, dotsEl, counter)

let slides = [],
  current = 0,
  observer,
  dots = []

function setDeckMode() {
  deck.style.cssText = ""
  deck.className = ""
  progress.style.display = "none"
  dotsEl.style.display = "none"
  counter.style.display = "none"
  if (app.text && app.slide) {
    // Simulate iPhone 15 viewport (393×852 logical pixels)
    const PW = 393,
      PH = 852
    const availW = window.innerWidth * 0.5
    const availH = window.innerHeight - 40
    const gap = 32
    const scale = Math.min((availW - gap) / PW, (availH - gap) / PH)
    const left = window.innerWidth * 0.5 + (availW - PW * scale) / 2
    const top = 40 + (availH - PH * scale) / 2
    deck.className = "snap-y snap-mandatory bg-white dark:bg-[#151516]"
    deck.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${PW}px;height:${PH}px;transform:scale(${scale});transform-origin:top left;border:1px solid rgba(128,128,128,0.25);container-type:size;overflow-x:hidden;overflow-y:auto;`
    progress.style.display = ""
    counter.style.display = ""
  } else if (app.slide) {
    deck.className = "overflow-y-auto snap-y snap-mandatory"
    deck.style.cssText = "width:100%;height:100dvh;container-type:size;"
    progress.style.display = ""
    dotsEl.style.display = ""
    counter.style.display = ""
  } else if (app.text && app.doc) {
    deck.className = "overflow-y-auto"
    deck.style.cssText = "position:fixed;top:40px;left:50%;right:0;bottom:0;padding:2rem"
  } else if (app.doc) {
    deck.className = "overflow-y-auto"
    deck.style.cssText = "position:fixed;top:40px;left:0;right:0;bottom:0"
    deck.querySelector("article")?.classList.add("max-w-3xl", "mx-auto", "px-8", "pb-16")
  } else {
    deck.style.display = "none"
  }
}

function buildDeck() {
  if (previewMode === "slides") {
    slides = parseSlides(app.content || "")
    deck.innerHTML = slides.map(renderSlide).join("")
    observeSlides()
  } else if (previewMode === "doc") {
    slides = []
    deck.innerHTML = renderDoc(app.content || "")
  } else {
    slides = []
    deck.innerHTML = ""
  }
  setDeckMode()
  app.emit("render")
}

function observeSlides() {
  if (observer) observer.disconnect()
  const els = Array.from(deck.querySelectorAll(".slide"))
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1"
          entry.target.style.transform = "none"
          current = els.indexOf(entry.target)
          updateChrome()
        }
      })
    },
    { threshold: 0.3 },
  )
  els.forEach((s) => {
    s.style.opacity = "0"
    s.style.transform = "translateY(12px)"
    observer.observe(s)
  })
}

function rebuildDots() {
  dotsEl.innerHTML = ""
  dots = slides.map((_, i) => {
    const d = document.createElement("button")
    d.className = "w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600 opacity-30 cursor-pointer transition-all duration-200 hover:opacity-60 border-none p-0"
    d.title = "Slide " + (i + 1)
    d.onclick = () => goTo(i)
    dotsEl.appendChild(d)
    return d
  })
}

function updateChrome() {
  if (previewMode !== "slides") return
  const total = slides.length || 1
  progress.style.width = ((current + 1) / total) * 100 + "%"
  dots.forEach((d, i) => {
    d.style.opacity = i === current ? "1" : "0.3"
    d.style.transform = i === current ? "scale(1.5)" : ""
    d.style.background = i === current ? "#ec4899" : ""
  })
  counter.textContent = current + 1 + " / " + slides.length
  app.slideIndex = current
  app.updateHash()
  app.emit("slidechange", { index: current })
}

function goTo(i) {
  const els = deck.querySelectorAll(".slide")
  const target = els[Math.max(0, Math.min(i, els.length - 1))]
  if (!target) return
  deck.style.scrollSnapType = "none"
  target.scrollIntoView({ behavior: "instant" })
  deck.style.scrollSnapType = ""
}

function next() {
  if (current < slides.length - 1) goTo(current + 1)
}
function prev() {
  if (current > 0) goTo(current - 1)
}

// Expose
app.refreshDeck = () => {
  const prev = current
  buildDeck()
  rebuildDots()
  updateChrome()
  if (previewMode === "slides") {
    requestAnimationFrame(() => {
      const els = deck.querySelectorAll(".slide")
      const idx = Math.min(prev, els.length - 1)
      if (els[idx]) els[idx].scrollIntoView({ behavior: "instant" })
    })
  }
}
app.goTo = goTo

// ===== EVENTS =====
document.addEventListener("keydown", (e) => {
  if (document.activeElement?.tagName === "TEXTAREA") return
  if (e.key === "Enter") return app.toggleText()
  if (e.key === "d" || e.key === "D") return app.toggleDoc()
  if (e.key === "s" || e.key === "S") return app.toggleSlide()
  if (!app.slide) return
  if (e.key === "Home" || (e.key === "ArrowUp" && (e.metaKey || e.ctrlKey))) return (e.preventDefault(), goTo(0))
  if (e.key === "End" || (e.key === "ArrowDown" && (e.metaKey || e.ctrlKey))) return (e.preventDefault(), goTo(slides.length - 1))
  if (["ArrowDown", "ArrowRight", " ", "PageDown"].includes(e.key)) return (e.preventDefault(), next())
  if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) return (e.preventDefault(), prev())
})

let tY
deck.addEventListener(
  "touchstart",
  (e) => {
    tY = e.touches[0].clientY
  },
  { passive: true },
)
deck.addEventListener("touchend", (e) => {
  const dy = tY - e.changedTouches[0].clientY
  if (Math.abs(dy) > 50) dy > 0 ? next() : prev()
})

// ===== LAYOUT — listen for panel changes from 1-editor =====
app.on("layoutchange", ({ text, doc, slide }) => {
  previewMode = slide ? "slides" : doc ? "doc" : "none"
  if (doc || slide) {
    app.refreshDeck()
  } else {
    setDeckMode()
  }
})

// Live preview when text+doc or text+slide side by side
let previewTimer
app.on("editorinput", ({ value }) => {
  if (app.text && (app.doc || app.slide)) {
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => {
      app.content = value
      if (app.slide) {
        app.refreshDeck()
      } else {
        deck.innerHTML = renderDoc(value)
        app.emit("render")
      }
    }, 300)
  }
})

// ===== STYLES =====
const proseStyle = document.createElement("style")
proseStyle.textContent = `
  .prose { line-height: 1.75; }
  .prose h1 { font-size: 2.25em; font-weight: 800; letter-spacing: -1px; line-height: 1.1; margin: 0 0 0.8em; }
  .prose h2 { font-size: 1.5em; font-weight: 700; letter-spacing: -0.5px; line-height: 1.3; margin: 1.6em 0 0.6em; }
  .prose h3 { font-size: 1.25em; font-weight: 600; line-height: 1.4; margin: 1.4em 0 0.5em; }
  .prose p { margin: 0.75em 0; }
  .prose ul, .prose ol { padding-left: 1.5em; margin: 0.75em 0; }
  .prose li { margin: 0.2em 0; }
  .prose blockquote { border-left: 3px solid #ec4899; padding: 0.5rem 1rem; margin: 1em 0; border-radius: 0 6px 6px 0; }
  .prose strong { font-weight: 600; }
  .prose a { text-decoration: underline; text-underline-offset: 2px; }
  .prose img { max-width: 100%; border-radius: 8px; }
  .prose hr { border: none; border-top: 1px solid; margin: 2em 0; opacity: 0.15; }
  .prose code { font-size: 0.9em; padding: 1px 4px; border-radius: 3px; }

  .slide h1 { font-size: clamp(32px,5cqw,56px); font-weight: 800; letter-spacing: -2px; line-height: 1.05; margin-bottom: 12px; }
  .slide h2 { font-size: clamp(24px,3.5cqw,40px); font-weight: 700; letter-spacing: -1px; line-height: 1.15; margin-bottom: 10px; }
  .slide h3 { font-size: clamp(18px,2.5cqw,28px); font-weight: 600; line-height: 1.2; margin-bottom: 8px; }
  .slide p { font-size: clamp(16px,1.8cqw,22px); line-height: 1.6; margin-bottom: 6px; }
  .slide ul, .slide ol { list-style: none; padding: 0; margin: 8px 0; }
  .slide li { padding: 6px 0 6px 20px; position: relative; font-size: clamp(16px,1.8cqw,22px); line-height: 1.5; }
  .slide li::before { content: ""; position: absolute; left: 0; top: 1em; width: 5px; height: 5px; border-radius: 1px; background: #ec4899; }
  .slide code { font-family: inherit; font-size: 0.85em; padding: 1px 5px; border-radius: 3px; }
  .slide strong { font-weight: 600; }
  .slide a { color: #ec4899; }
  .slide img { max-width: 100%; border-radius: 8px; }
  .slide blockquote { border-left: 3px solid #ec4899; padding: 8px 16px; margin: 12px 0; border-radius: 0 6px 6px 0; }

  @media (max-width: 640px) {
    #topbar { display: none !important; }
    #deck-dots { display: none !important; }
    #deck-counter { display: none !important; }
    #deck-progress { display: none !important; }
  }
`
document.head.appendChild(proseStyle)

// Resize — recalculate phone frame scale
window.addEventListener("resize", () => {
  if (app.text && app.slide) setDeckMode()
})

// Init
previewMode = app.slide ? "slides" : app.doc ? "doc" : "none"
if (app.doc || app.slide) {
  buildDeck()
  rebuildDots()
  updateChrome()
} else {
  setDeckMode()
}
