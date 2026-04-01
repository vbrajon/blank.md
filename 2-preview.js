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
function parseYAML(text) {
  const obj = {}
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":")
    if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return obj
}

function splitSlides(text) {
  const lines = text.split("\n")
  const sections = [[]]
  let inCode = false
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode
    if (!inCode && /^\s*---\s*$/.test(line)) sections.push([])
    else sections[sections.length - 1].push(line)
  }
  return sections.map((s) => s.join("\n").trim()).filter(Boolean)
}

function parseSlidesAuto(text) {
  const lines = text.split("\n")
  const slides = []
  let current = null
  let inCode = false

  function flush() {
    if (current && current.lines.length) {
      current.content = current.lines.join("\n").trim()
      delete current.lines
      if (current.content) slides.push(current)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith("```")) inCode = !inCode
    if (inCode) {
      if (current) current.lines.push(line)
      continue
    }

    if (/^# /.test(line)) {
      flush()
      current = { layout: "cover", lines: [line] }
      while (i + 1 < lines.length && !/^#{1,2} /.test(lines[i + 1]) && !/^\d+\.\s/.test(lines[i + 1])) {
        i++
        if (lines[i].trimStart().startsWith("```")) inCode = !inCode
        current.lines.push(lines[i])
      }
      continue
    }

    if (/^## /.test(line)) {
      flush()
      current = { layout: "section", lines: [line] }
      while (i + 1 < lines.length) {
        const next = lines[i + 1]
        if (/^#{1,2} /.test(next) || /^\d+\.\s/.test(next) || /^- /.test(next) || /^```/.test(next) || /^\|/.test(next)) break
        if (next.trim() === "" && i + 2 < lines.length && (/^#{1,2} /.test(lines[i + 2]) || /^\d+\.\s/.test(lines[i + 2]) || /^- /.test(lines[i + 2]) || /^```/.test(lines[i + 2]))) break
        i++
        current.lines.push(lines[i])
      }
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      flush()
      current = { layout: "default", lines: [line.replace(/^\d+\.\s+/, "### ")] }
      continue
    }

    if (!current) current = { layout: "default", lines: [] }
    current.lines.push(line)
  }
  flush()

  if (slides.length > 0 && slides[slides.length - 1].layout === "cover") {
    slides[slides.length - 1].layout = "end"
  }
  return slides
}

function parseSlides(text) {
  text = text.trim()
  let hasSeparators = false,
    inCode = false
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) inCode = !inCode
    if (!inCode && /^\s*---\s*$/.test(line)) {
      hasSeparators = true
      break
    }
  }
  if (hasSeparators) {
    const sections = splitSlides(text)
    const result = []
    let i = 0
    while (i < sections.length) {
      const section = sections[i]
      const sectionLines = section
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
      const isFM = sectionLines.length > 0 && sectionLines.every((l) => /^[a-zA-Z_][\w-]*\s*:/.test(l))
      if (isFM && i + 1 < sections.length) {
        const fm = parseYAML(section)
        i++
        result.push({ ...fm, content: sections[i] })
      } else {
        result.push({ content: section })
      }
      i++
    }
    return result
  }
  return parseSlidesAuto(text)
}

// ===== SLIDE RENDERER =====
const slideBase = "h-dvh snap-start overflow-hidden relative flex flex-col justify-center transition-all duration-100 ease-out"
const slideLayouts = {
  cover: slideBase + " items-center text-center",
  section: slideBase + " px-[clamp(40px,8vw,120px)] py-[clamp(40px,6vh,80px)]",
  default: slideBase + " px-[clamp(40px,8vw,120px)] pt-[clamp(36px,6vh,72px)] justify-start",
  center: slideBase + " items-center text-center px-[clamp(40px,8vw,120px)] py-[clamp(40px,6vh,80px)]",
  "two-cols": slideBase + " px-[clamp(40px,8vw,120px)] py-[clamp(40px,6vh,80px)]",
  quote: slideBase + " items-center text-center p-16",
  end: slideBase + " justify-end p-0 bg-gradient-to-br from-gray-800 to-gray-950 text-white",
}

function renderSlide(slide) {
  const layout = slide.layout || "default"
  const content = slide.content || ""
  const cls = slideLayouts[layout] || slideLayouts.default

  if (layout === "two-cols") {
    const beforeCols = content.match(/^([\s\S]*?)(?=::(?:left|right)::)/)?.[1]?.trim() || ""
    const left = content.match(/::left::([\s\S]*?)(?=::right::|$)/)?.[1]?.trim() || ""
    const right = content.match(/::right::([\s\S]*?)(?=::left::|$)/)?.[1]?.trim() || ""
    return '<section class="slide ' + cls + '">' + (beforeCols ? md(beforeCols) : "") + '<div class="grid grid-cols-2 gap-8 items-center flex-1"><div class="min-w-0">' + md(left) + '</div><div class="min-w-0">' + md(right) + "</div></div></section>"
  }
  if (layout === "quote") {
    const bqMatch = content.match(/>\s*(.+)/s)
    const citeLines = content.split("\n").filter((l) => /^[—–\u2014-]\s/.test(l.trim()) && !l.startsWith(">"))
    let html = '<section class="slide ' + cls + '"><div class="text-[clamp(80px,14vw,160px)] leading-[0.5] opacity-5 font-serif mb-[-16px]">\u201C</div>'
    if (bqMatch) html += '<blockquote class="text-[clamp(22px,3.5vw,40px)] leading-relaxed italic border-none p-0 m-0 bg-transparent">' + marked.parseInline(bqMatch[1].trim()) + "</blockquote>"
    for (const cl of citeLines) {
      const cm = cl.trim().match(/^[—–\u2014-]\s*(.+)/)
      if (cm) html += '<cite class="font-mono text-xs tracking-widest uppercase text-gray-500 dark:text-gray-400 mt-6 block not-italic">\u2014 ' + marked.parseInline(cm[1]) + "</cite>"
    }
    return html + "</section>"
  }
  if (layout === "end") return '<section class="slide ' + cls + '"><div class="p-12 px-16 relative z-10">' + md(content) + "</div></section>"
  return '<section class="slide ' + cls + '">' + md(content) + "</section>"
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
  if (app.slide) {
    deck.className = "h-dvh overflow-y-auto snap-y snap-mandatory"
    progress.style.display = ""
    dotsEl.style.display = ""
    counter.style.display = ""
  } else if (app.text && app.doc) {
    deck.className = "overflow-y-auto"
    deck.style.cssText = "position:fixed;top:40px;left:50%;right:0;bottom:0;padding:2rem"
  } else if (app.doc) {
    deck.className = "max-w-3xl mx-auto px-8 pt-14 pb-16"
  } else {
    deck.style.display = "none"
  }
}

function buildDeck() {
  if (previewMode === "slides") {
    slides = parseSlides(app.content || "")
    deck.innerHTML = slides.map(renderSlide).join("")
    observeSlides()
  } else {
    slides = []
    deck.innerHTML = renderDoc(app.content || "")
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
  history.replaceState(null, "", "#" + (current + 1))
}

function goTo(i) {
  const els = deck.querySelectorAll(".slide")
  const target = els[Math.max(0, Math.min(i, els.length - 1))]
  if (!target) return
  const start = deck.scrollTop,
    end = target.offsetTop,
    dist = end - start
  let t0 = null
  deck.style.scrollSnapType = "none"
  requestAnimationFrame(function step(ts) {
    if (!t0) t0 = ts
    const p = Math.min((ts - t0) / 200, 1)
    deck.scrollTop = start + dist * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
    if (p < 1) requestAnimationFrame(step)
    else deck.style.scrollSnapType = ""
  })
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
let navLock = false
document.addEventListener("keydown", (e) => {
  if (app.text && !app.slide) {
    if (e.key === "Escape") app.toggleText()
    return
  }
  if (app.doc && !app.text && !app.slide) {
    if (e.key === "e") app.toggleText()
    return
  }
  if (!app.slide) return
  // slide mode
  if (["ArrowDown", "ArrowRight", " ", "PageDown"].includes(e.key)) {
    e.preventDefault()
    if (!navLock) {
      navLock = true
      next()
      setTimeout(() => (navLock = false), 400)
    }
  } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
    e.preventDefault()
    if (!navLock) {
      navLock = true
      prev()
      setTimeout(() => (navLock = false), 400)
    }
  } else if (e.key === "Home") {
    e.preventDefault()
    goTo(0)
  } else if (e.key === "End") {
    e.preventDefault()
    goTo(slides.length - 1)
  } else if (e.key === "e") app.toggleText()
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
  previewMode = slide ? "slides" : "doc"
  if (doc || slide) {
    app.refreshDeck()
  } else {
    setDeckMode()
  }
})

// Live preview when text+doc side by side
let docTimer
app.on("editorinput", ({ value }) => {
  if (app.doc && app.text && !app.slide) {
    clearTimeout(docTimer)
    docTimer = setTimeout(() => {
      app.content = value
      deck.innerHTML = renderDoc(value)
      app.emit("render")
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

  .slide h1 { font-size: clamp(32px,5vw,56px); font-weight: 800; letter-spacing: -2px; line-height: 1.05; margin-bottom: 12px; }
  .slide h2 { font-size: clamp(24px,3.5vw,40px); font-weight: 700; letter-spacing: -1px; line-height: 1.15; margin-bottom: 10px; }
  .slide h3 { font-size: clamp(18px,2.5vw,28px); font-weight: 600; line-height: 1.2; margin-bottom: 8px; }
  .slide p { font-size: clamp(16px,1.8vw,22px); line-height: 1.6; margin-bottom: 6px; }
  .slide ul, .slide ol { list-style: none; padding: 0; margin: 8px 0; }
  .slide li { padding: 6px 0 6px 20px; position: relative; font-size: clamp(16px,1.8vw,22px); line-height: 1.5; }
  .slide li::before { content: ""; position: absolute; left: 0; top: 1em; width: 5px; height: 5px; border-radius: 1px; background: #ec4899; }
  .slide code { font-family: inherit; font-size: 0.85em; padding: 1px 5px; border-radius: 3px; }
  .slide strong { font-weight: 600; }
  .slide a { color: #ec4899; }
  .slide img { max-width: 100%; border-radius: 8px; }
  .slide blockquote { border-left: 3px solid #ec4899; padding: 8px 16px; margin: 12px 0; border-radius: 0 6px 6px 0; }
`
document.head.appendChild(proseStyle)

// Init
previewMode = app.slide ? "slides" : "doc"
if (app.doc || app.slide) {
  buildDeck()
  rebuildDots()
  updateChrome()
  if (app.slide) {
    const hashSlide = parseInt(location.hash.slice(1)) - 1
    if (hashSlide > 0) requestAnimationFrame(() => goTo(hashSlide))
  }
} else {
  setDeckMode()
}
