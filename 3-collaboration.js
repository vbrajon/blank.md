// ===== 3-COLLAB: Multi cursor, pointer, follow via Yjs + WebRTC =====
const app = window.blank

// Remote pointer container
document.body.insertAdjacentHTML("beforeend", '<div id="remote-pointers"></div>')

let ydoc,
  ytext,
  awareness,
  knownValue = "",
  collabReady = false

function getCaretCoords(el, pos) {
  const div = document.createElement("div")
  const cs = getComputedStyle(el)
  for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "wordSpacing", "textIndent", "whiteSpace", "wordWrap", "overflowWrap", "tabSize", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]) div.style[p] = cs[p]
  div.style.cssText += ";position:absolute;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;width:" + el.clientWidth + "px"
  div.textContent = el.value.substring(0, pos)
  const marker = Object.assign(document.createElement("span"), { textContent: "\u200b" })
  div.appendChild(marker)
  document.body.appendChild(div)
  const coords = { top: marker.offsetTop, left: marker.offsetLeft, height: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.7 }
  document.body.removeChild(div)
  return coords
}

function renderRemoteCursors() {
  const overlay = document.getElementById("cursor-overlay")
  const editorOverlay = document.getElementById("editor")
  const textarea = document.getElementById("ta")
  if (!overlay || !awareness || !textarea) return
  if (editorOverlay?.classList.contains("hidden")) {
    overlay.innerHTML = ""
    return
  }
  const states = awareness.getStates()
  const localId = awareness.clientID
  let html = ""
  for (const [id, s] of states) {
    if (id === localId || !s.user || !s.cursor) continue
    const { name, color } = s.user
    const pos = Math.min(s.cursor.head, textarea.value.length)
    const coords = getCaretCoords(textarea, pos)
    const top = coords.top - textarea.scrollTop
    html += '<div class="remote-cursor" style="left:' + coords.left + "px;top:" + top + "px;height:" + coords.height + "px;background:" + color + '">' + '<div class="remote-cursor-label" style="background:' + color + '">' + app.esc(name) + "</div></div>"
  }
  overlay.innerHTML = html
}

function renderRemotePointers() {
  const container = document.getElementById("remote-pointers")
  if (!container || !awareness) return
  const states = awareness.getStates()
  const localId = awareness.clientID
  let html = ""
  for (const [id, s] of states) {
    if (id === localId || !s.user || !s.pointer) continue
    const { name, color } = s.user
    const { x, y } = s.pointer
    html += '<div class="remote-pointer" style="left:' + x + "px;top:" + y + 'px">' + '<svg viewBox="0 0 16 20"><path d="M0 0 L0 16 L4.5 12 L8.5 19.5 L11 18.5 L7 11 L12 11 Z" fill="' + color + '" stroke="#fff" stroke-width="1"/></svg>' + '<div class="remote-pointer-label" style="background:' + color + '">' + app.esc(name) + "</div></div>"
  }
  container.innerHTML = html
}

function renderCollabUsers() {
  const container = document.getElementById("collab-users")
  if (!container || !awareness) return
  const states = awareness.getStates()
  let html = ""
  for (const [, s] of states) {
    if (!s.user) continue
    html += '<span class="collab-dot" style="background:' + s.user.color + '" title="' + app.esc(s.user.name) + '"></span>'
  }
  if (states.size > 1) html += '<span class="collab-count">' + states.size + "</span>"
  container.innerHTML = html
}

function syncToYText(value) {
  if (!ytext || !ydoc || !collabReady) return
  if (value === knownValue) return
  let start = 0
  while (start < knownValue.length && start < value.length && knownValue[start] === value[start]) start++
  let endOld = knownValue.length,
    endNew = value.length
  while (endOld > start && endNew > start && knownValue[endOld - 1] === value[endNew - 1]) {
    endOld--
    endNew--
  }
  ydoc.transact(() => {
    if (endOld - start > 0) ytext.delete(start, endOld - start)
    if (endNew > start) ytext.insert(start, value.slice(start, endNew))
  })
  knownValue = value
}

// ===== SETUP =====
try {
  const Y = await import("https://esm.sh/yjs@13")
  const { WebrtcProvider } = await import("https://esm.sh/y-webrtc@10")

  ydoc = new Y.Doc()
  ytext = ydoc.getText("markdown")

  const roomName = "blank-md-" + location.host + location.pathname.replace(/[^a-z0-9]/gi, "-")
  const provider = new WebrtcProvider(roomName, ydoc, { signaling: ["wss://signaling.yjs.dev"] })
  awareness = provider.awareness

  const colors = ["#e85d2a", "#3d7a2a", "#1e5a8f", "#a16207", "#9333ea", "#dc2626", "#0891b2", "#c026d3"]
  const names = ["Fox", "Bear", "Owl", "Wolf", "Deer", "Hawk", "Lynx", "Crow", "Elk", "Jay"]
  awareness.setLocalStateField("user", {
    name: names[Math.floor(Math.random() * names.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
  })

  const localContent = app.content || ""
  knownValue = localContent
  let seeded = false

  function initContent() {
    if (seeded) return
    const peerContent = ytext.toString()
    if (peerContent) {
      seeded = true
      collabReady = true
      app.content = peerContent
      knownValue = peerContent
      const textarea = document.getElementById("ta")
      if (textarea) textarea.value = peerContent
      app.updateHighlight?.()
      app.refreshDeck?.()
      localStorage.setItem("slidev-md", peerContent)
      renderCollabUsers()
      return
    }
    const peerCount = awareness.getStates().size
    if (peerCount > 1) {
      const ids = [...awareness.getStates().keys()]
      if (ydoc.clientID !== Math.min(...ids)) return
    }
    seeded = true
    collabReady = true
    if (localContent) {
      ytext.insert(0, localContent)
      knownValue = localContent
    }
    renderCollabUsers()
  }

  // Remote changes → update editor + deck
  ytext.observe((event, transaction) => {
    if (transaction.local) return
    if (!seeded) {
      seeded = true
      collabReady = true
    }
    const textarea = document.getElementById("ta")
    if (textarea) {
      const selStart = textarea.selectionStart,
        selEnd = textarea.selectionEnd
      let adjStart = selStart,
        adjEnd = selEnd,
        pos = 0
      for (const op of event.delta) {
        if (op.retain !== undefined) pos += op.retain
        else if (op.insert !== undefined) {
          const len = typeof op.insert === "string" ? op.insert.length : 1
          if (pos <= selStart) adjStart += len
          if (pos <= selEnd) adjEnd += len
          pos += len
        } else if (op.delete !== undefined) {
          if (pos < selStart) adjStart -= Math.min(op.delete, selStart - pos)
          if (pos < selEnd) adjEnd -= Math.min(op.delete, selEnd - pos)
        }
      }
      textarea.value = ytext.toString()
      textarea.selectionStart = Math.max(0, adjStart)
      textarea.selectionEnd = Math.max(0, adjEnd)
    }
    const newVal = ytext.toString()
    app.content = newVal
    knownValue = newVal
    app.updateHighlight?.()
    localStorage.setItem("slidev-md", newVal)
    const editorOverlay = document.getElementById("editor")
    if (!editorOverlay || editorOverlay.classList.contains("hidden")) app.refreshDeck?.()
    renderRemoteCursors()
  })

  // Sync local edits → Y.Text
  app.on("editorinput", ({ value }) => syncToYText(value))

  // On editor open, sync from Y.Text
  app.on("editoropen", () => {
    if (ytext && ytext.length > 0) {
      const textarea = document.getElementById("ta")
      if (textarea) {
        textarea.value = ytext.toString()
        knownValue = textarea.value
      }
    }
    renderRemoteCursors()
  })

  // Cursor tracking
  const textarea = document.getElementById("ta")
  if (textarea) {
    const updateCursor = () => {
      awareness.setLocalStateField("cursor", { anchor: textarea.selectionStart, head: textarea.selectionEnd })
    }
    textarea.addEventListener("keyup", updateCursor)
    textarea.addEventListener("click", updateCursor)
    textarea.addEventListener("select", updateCursor)
    textarea.addEventListener("scroll", renderRemoteCursors)
  }

  // Mouse pointer tracking
  document.addEventListener("mousemove", (e) => awareness.setLocalStateField("pointer", { x: e.clientX, y: e.clientY }))
  document.addEventListener("mouseleave", () => awareness.setLocalStateField("pointer", null))

  awareness.on("change", () => {
    renderRemoteCursors()
    renderRemotePointers()
    renderCollabUsers()
  })

  provider.on("synced", () => setTimeout(initContent, 200))
  setTimeout(initContent, 1000)
  renderCollabUsers()
  console.log("[collab] Room:", roomName)
} catch (e) {
  console.warn("[collab] Not available:", e.message)
}
