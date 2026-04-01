// ===== 2-PREVIEW: Markdown → Slides + Navigation =====
const app = window.blank

// Load marked
const { marked } = await import("https://esm.sh/marked@15")
marked.setOptions({ gfm: true, breaks: false })
marked.use({
  renderer: {
    code({ text, lang }) {
      const language = (lang || "text").split(/\s/)[0]
      return '<pre class="code-block" data-lang="' + language + '"><code>' + app.esc(text) + "</code></pre>"
    },
    table({ header, rows }) {
      let html = '<table class="md-table"><thead><tr>'
      for (const cell of header) html += "<th>" + cell.text + "</th>"
      html += "</tr></thead><tbody>"
      for (const row of rows) {
        html += "<tr>"
        for (const cell of row) html += "<td>" + cell.text + "</td>"
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
  let sectionIdx = 0
  for (const s of slides) {
    const c = s.content
    if (/^(###?\s.+\n\n)?```[\s\S]*```\s*$/.test(c)) s.layout = s.layout === "default" ? "center" : s.layout
    if (/^>\s/.test(c) && !c.includes("\n- ")) s.layout = "quote"
    if (s.layout === "section") {
      const sLines = c.split("\n").filter((l) => l.trim())
      if (sLines.every((l) => /^##?\s/.test(l) || l.trim().length < 60)) {
        sectionIdx++
        s.content = '<span class="section-number">' + String(sectionIdx).padStart(2, "0") + "</span>\n\n" + c
      }
    }
    if (s.layout === "section") {
      const parts = c.split(/\n\n+/).filter((p) => p.trim())
      const headings = parts.filter((p) => /^##?\s/.test(p))
      const bulletGroups = parts.filter((p) => p.split("\n").every((l) => /^[-*+] /.test(l.trim()) || !l.trim()))
      if (headings.length >= 1 && bulletGroups.length === 2) {
        s.content = headings.join("\n")
        const sLines2 = s.content.split("\n").filter((l) => l.trim())
        if (sLines2.every((l) => /^##?\s/.test(l) || l.trim().length < 60)) {
          sectionIdx++
          s.content = '<span class="section-number">' + String(sectionIdx).padStart(2, "0") + "</span>\n\n" + s.content
        }
        slides.splice(slides.indexOf(s) + 1, 0, {
          layout: "two-cols",
          content: "::left::\n" + bulletGroups[0].trim() + "\n::right::\n" + bulletGroups[1].trim(),
        })
      }
    }
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
function renderSlide(slide) {
  const layout = slide.layout || "default"
  const content = slide.content || ""

  if (layout === "two-cols") {
    const beforeCols = content.match(/^([\s\S]*?)(?=::(?:left|right)::)/)?.[1]?.trim() || ""
    const left = content.match(/::left::([\s\S]*?)(?=::right::|$)/)?.[1]?.trim() || ""
    const right = content.match(/::right::([\s\S]*?)(?=::left::|$)/)?.[1]?.trim() || ""
    return '<section class="slide layout-two-cols">' + (beforeCols ? md(beforeCols) : "") + '<div class="cols"><div class="col">' + md(left) + '</div><div class="col">' + md(right) + "</div></div></section>"
  }
  if (layout === "quote") {
    const bqMatch = content.match(/>\s*(.+)/s)
    const citeLines = content.split("\n").filter((l) => /^[—–\u2014-]\s/.test(l.trim()) && !l.startsWith(">"))
    let html = '<section class="slide layout-quote"><div class="quote-mark">\u201C</div>'
    if (bqMatch) html += "<blockquote>" + marked.parseInline(bqMatch[1].trim()) + "</blockquote>"
    for (const cl of citeLines) {
      const cm = cl.trim().match(/^[—–\u2014-]\s*(.+)/)
      if (cm) html += "<cite>\u2014 " + marked.parseInline(cm[1]) + "</cite>"
    }
    return html + "</section>"
  }
  if (layout === "end") return '<section class="slide layout-end"><div class="end-content">' + md(content) + "</div></section>"
  return '<section class="slide layout-' + layout + '">' + md(content) + "</section>"
}

// ===== DOM =====
const deck = document.createElement("div")
deck.id = "deck"
deck.className = "deck"
document.body.prepend(deck)

const progress = Object.assign(document.createElement("div"), { className: "deck-progress" })
const dotsEl = Object.assign(document.createElement("div"), { className: "deck-dots", id: "deck-dots" })
const counter = Object.assign(document.createElement("div"), { className: "deck-counter" })
document.body.append(progress, dotsEl, counter)

let slides = [],
  current = 0,
  observer,
  dots = []

function buildDeck() {
  slides = parseSlides(app.content || "")
  deck.innerHTML = slides.map(renderSlide).join("")
  deck.querySelectorAll(".slide").forEach((slide) => {
    Array.from(slide.children).forEach((child) => {
      if (!child.classList.contains("cols") && !child.classList.contains("end-content")) child.classList.add("reveal")
    })
  })
  observeSlides()
  app.emit("render")
}

function observeSlides() {
  if (observer) observer.disconnect()
  const els = Array.from(deck.querySelectorAll(".slide"))
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible")
          current = els.indexOf(entry.target)
          updateChrome()
        }
      })
    },
    { threshold: 0.3 },
  )
  els.forEach((s) => observer.observe(s))
}

function rebuildDots() {
  dotsEl.innerHTML = ""
  dots = slides.map((_, i) => {
    const d = Object.assign(document.createElement("button"), { className: "deck-dot", title: "Slide " + (i + 1) })
    d.onclick = () => goTo(i)
    dotsEl.appendChild(d)
    return d
  })
}

function updateChrome() {
  const total = slides.length || 1
  progress.style.width = ((current + 1) / total) * 100 + "%"
  dots.forEach((d, i) => d.classList.toggle("active", i === current))
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
  requestAnimationFrame(() => {
    const els = deck.querySelectorAll(".slide")
    const idx = Math.min(prev, els.length - 1)
    if (els[idx]) els[idx].scrollIntoView({ behavior: "instant" })
  })
}
app.goTo = goTo

// ===== EVENTS =====
let navLock = false
document.addEventListener("keydown", (e) => {
  const ed = document.getElementById("editor")
  if (ed && !ed.classList.contains("hidden")) {
    if (e.key === "Escape") app.closeEditor?.()
    return
  }
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
  } else if (e.key === "e") app.openEditor?.()
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

// Init
buildDeck()
rebuildDots()
updateChrome()
const hashSlide = parseInt(location.hash.slice(1)) - 1
if (hashSlide > 0) requestAnimationFrame(() => goTo(hashSlide))

// Switch from editor to deck view
app.closeEditor()
