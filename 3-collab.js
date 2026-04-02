// ===== 3-COLLAB: Multi cursor, pointer, follow via Yjs + WebRTC =====
const app = window.blank

// Remote pointer container
document.body.insertAdjacentHTML("beforeend", '<div id="remote-pointers"></div>')

// Cursor overlay
const editorBody = document.querySelector("#editor > div:first-child")
if (editorBody) {
  const overlay = document.createElement("div")
  overlay.id = "cursor-overlay"
  overlay.className = "absolute inset-0 pointer-events-none z-[2] overflow-hidden"
  editorBody.appendChild(overlay)
}

let ydoc,
  ytext,
  awareness,
  knownValue = "",
  collabReady = false,
  followingId = null

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
  const editorEl = document.getElementById("editor")
  const textarea = document.getElementById("ta")
  if (!overlay || !awareness || !textarea) return
  if (editorEl?.style.display === "none") {
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
    html += '<div class="absolute w-0.5 pointer-events-none rounded-sm" style="left:' + coords.left + "px;top:" + top + "px;height:" + coords.height + "px;background:" + color + '">' + '<div class="absolute -top-[18px] -left-px text-white text-[10px] py-px px-1.5 rounded-t rounded-tr whitespace-nowrap font-mono font-semibold leading-[14px]" style="background:' + color + '">' + app.esc(name) + "</div></div>"
  }
  overlay.innerHTML = html
}

function renderRemotePointers() {
  const container = document.getElementById("remote-pointers")
  if (!container || !awareness) return
  const states = awareness.getStates()
  const localId = awareness.clientID
  const wW = window.innerWidth,
    wH = window.innerHeight
  let html = ""
  for (const [id, s] of states) {
    if (id === localId || !s.user || !s.pointer) continue
    const { name, color } = s.user
    const { rx, ry } = s.pointer
    const x = rx * wW,
      y = ry * wH
    html += '<div class="fixed pointer-events-none z-[9999] transition-[left,top] duration-75 ease-linear" style="left:' + x + "px;top:" + y + 'px">' + '<svg class="w-4 h-5 drop-shadow-md" viewBox="0 0 16 20"><path d="M0 0 L0 16 L4.5 12 L8.5 19.5 L11 18.5 L7 11 L12 11 Z" fill="' + color + '" stroke="#fff" stroke-width="1"/></svg>' + '<div class="absolute top-4 left-2.5 text-white text-[10px] py-px px-1.5 rounded whitespace-nowrap font-mono font-semibold leading-[14px] opacity-90" style="background:' + color + '">' + app.esc(name) + "</div></div>"
  }
  container.innerHTML = html
}

function renderCollabUsers() {
  const container = document.getElementById("collab-users")
  if (!container || !awareness) return
  const states = awareness.getStates()
  const localId = awareness.clientID
  let html = ""
  for (const [id, s] of states) {
    if (!s.user) continue
    const isMe = id === localId
    const isFollowed = followingId === id
    html += '<span class="w-2.5 h-2.5 rounded-full border-2 shrink-0 cursor-pointer' + (isFollowed ? " ring-2 ring-offset-1" : "") + '" style="background:' + s.user.color + ";border-color:" + s.user.color + (isFollowed ? ";--tw-ring-color:" + s.user.color : "") + '" title="' + app.esc(s.user.name) + (isMe ? " (you)" : "") + '" data-collab-id="' + id + '"></span>'
  }
  if (states.size > 1) html += '<span class="font-mono text-[11px] text-gray-500 ml-0.5">' + states.size + "</span>"
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
  const { default: YPartyKitProvider } = await import("https://esm.sh/y-partykit@0/provider?deps=yjs@13")

  ydoc = new Y.Doc()
  ytext = ydoc.getText("markdown")

  const host = "blank-md.vbrajon.partykit.dev"
  const roomName = "blank-md-" + location.host + location.pathname.replace(/[^a-z0-9]/gi, "-")
  const provider = new YPartyKitProvider(host, roomName, ydoc)
  awareness = provider.awareness

  const colors = ["#fd0", "#f6e", "#f34", "#fa3", "#7d0", "#39f", "#3df"]
  const names = ["Yellow", "Pink", "Red", "Orange", "Green", "Blue", "Cyan"]
  const saved = JSON.parse(localStorage.getItem("collab-user") || "null")
  const userName = saved?.name || names[names.length - 1]
  const userColor = saved?.color || colors[colors.length - 1]
  awareness.setLocalStateField("user", { name: userName, color: userColor })
  localStorage.setItem("collab-user", JSON.stringify({ name: userName, color: userColor }))

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
    app.refreshDeck?.()
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

  // Mouse pointer tracking — send as ratio of window size
  document.addEventListener("mousemove", (e) => awareness.setLocalStateField("pointer", { rx: e.clientX / window.innerWidth, ry: e.clientY / window.innerHeight }))
  document.addEventListener("mouseleave", () => awareness.setLocalStateField("pointer", null))

  // ===== FOLLOW MODE =====
  let applyingFollow = false
  const origUpdateHash = app.updateHash
  app.updateHash = function () {
    origUpdateHash()
    if (!followingId && !applyingFollow) awareness.setLocalStateField("view", { hash: location.hash })
  }
  awareness.setLocalStateField("view", { hash: location.hash })

  awareness.on("change", () => {
    renderRemoteCursors()
    renderRemotePointers()
    renderCollabUsers()
    if (!followingId) return
    const s = awareness.getStates().get(followingId)
    if (!s?.view?.hash) return
    const remote = s.view.hash.replace(/^#/, "")
    if (remote === location.hash.replace(/^#/, "")) return
    applyingFollow = true
    location.hash = remote
    applyingFollow = false
  })

  // Click handler on collab user dots
  document.getElementById("collab-users").addEventListener("click", (e) => {
    const dot = e.target.closest("[data-collab-id]")
    if (!dot) return
    const id = Number(dot.dataset.collabId)
    if (id === awareness.clientID) {
      showUserEditor()
    } else {
      followingId = followingId === id ? null : id
      if (followingId) {
        const s = awareness.getStates().get(followingId)
        if (s?.view?.hash) location.hash = s.view.hash.replace(/^#/, "")
      }
      renderCollabUsers()
    }
  })

  // Name + color editor popup
  function showUserEditor() {
    let popup = document.getElementById("collab-editor")
    if (popup) {
      popup.remove()
      return
    }
    const state = awareness.getLocalState()
    const { name, color } = state.user
    popup = document.createElement("div")
    popup.id = "collab-editor"
    popup.className = "fixed z-[400] bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg p-3 flex flex-col gap-2"
    popup.style.cssText = "top:44px;left:60px"
    popup.innerHTML = '<div class="flex items-center gap-2">' + '<input id="collab-name" class="font-mono text-xs bg-transparent border border-gray-200 dark:border-white/10 rounded px-2 py-1 outline-none w-24" value="' + app.esc(name) + '" maxlength="12" />' + '<input id="collab-color" type="color" class="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" value="' + color + '" />' + "</div>"
    document.body.appendChild(popup)
    const nameInput = document.getElementById("collab-name")
    const colorInput = document.getElementById("collab-color")
    function save() {
      const n = nameInput.value.trim().slice(0, 12) || name
      const c = colorInput.value
      awareness.setLocalStateField("user", { name: n, color: c })
      localStorage.setItem("collab-user", JSON.stringify({ name: n, color: c }))
      renderCollabUsers()
    }
    nameInput.addEventListener("input", save)
    colorInput.addEventListener("input", save)
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") popup.remove()
    })
    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", function close(e) {
        if (!popup.contains(e.target) && !e.target.closest("[data-collab-id]")) {
          popup.remove()
          document.removeEventListener("click", close)
        }
      })
    })
    nameInput.focus()
    nameInput.select()
  }

  provider.on("sync", () => setTimeout(initContent, 200))
  setTimeout(initContent, 1000)
  renderCollabUsers()
  console.log("[collab] Room:", roomName)
} catch (e) {
  console.warn("[collab] Not available:", e.message)
}
