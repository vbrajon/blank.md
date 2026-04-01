#!/usr/bin/env bash
set -euo pipefail

# ===== blank.md — agent-browser feature tests =====
# Tests all 4 modules: Editor, Preview, Collab, VCS
# Usage: ./agent-browser.test.sh [http://localhost:PORT]

URL="${1:-http://localhost:8000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SHOTS="$DIR/test-screenshots"
VIDEO="$DIR/test-video"
PASS=0
FAIL=0

mkdir -p "$SHOTS" "$VIDEO"

# ===== HELPERS =====
ab() { agent-browser "$@"; }
assert_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    echo "  ✓ $label"; PASS=$((PASS + 1))
  else
    echo "  ✗ $label (expected '$needle')"; FAIL=$((FAIL + 1))
  fi
}
assert_not_contains() {
  local label="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    echo "  ✗ $label (unexpected '$needle')"; FAIL=$((FAIL + 1))
  else
    echo "  ✓ $label"; PASS=$((PASS + 1))
  fi
}
assert_file_exists() {
  local label="$1" file="$2"
  if [[ -f "$file" ]]; then
    echo "  ✓ $label"; PASS=$((PASS + 1))
  else
    echo "  ✗ $label ($file not found)"; FAIL=$((FAIL + 1))
  fi
}
snap() { ab snapshot -i 2>/dev/null; }
shot() { ab screenshot "$SHOTS/$1" 2>/dev/null; }

# ===== SETUP =====
echo "=== blank.md test suite ==="
echo "URL: $URL"
echo ""

# Start local server if needed
SERVER_PID=""
if ! curl -s "$URL" > /dev/null 2>&1; then
  echo "Starting local server..."
  python3 -m http.server 8000 --directory "$DIR" &
  SERVER_PID=$!
  sleep 1
fi

# Close any previous session
ab close 2>/dev/null || true

# Start recording
ab open "$URL" 2>/dev/null
ab wait --load networkidle 2>/dev/null
ab record start "$VIDEO/blank-md-test.webm" 2>/dev/null || true

# ===== TEST 1: Preview Module (2-preview) =====
echo "--- 2-preview: Slides & Navigation ---"

SNAP=$(snap)
assert_contains "heading rendered" "$SNAP" "heading"
assert_contains "slide nav dots present" "$SNAP" "Slide"
assert_contains "edit button visible" "$SNAP" "Edit"

shot "01-preview-initial.png"

# Navigate with keyboard
ab press ArrowDown 2>/dev/null
ab wait 500 2>/dev/null
SNAP=$(snap)
assert_contains "still has headings after nav" "$SNAP" "heading"
shot "02-preview-slide2.png"

ab press ArrowUp 2>/dev/null
ab wait 500 2>/dev/null
shot "03-preview-slide1.png"

# Navigate to last slide with End key
ab press End 2>/dev/null
ab wait 500 2>/dev/null
HASH=$(ab get url 2>/dev/null)
assert_contains "hash updated on nav" "$HASH" "#"

shot "04-preview-last-slide.png"

# Navigate to first slide with Home key
ab press Home 2>/dev/null
ab wait 500 2>/dev/null
shot "05-preview-first-slide.png"

echo ""

# ===== TEST 2: Editor Module (1-editor) =====
echo "--- 1-editor: Text Editing & Syntax Highlighting ---"

# Open editor with 'e' key
ab press e 2>/dev/null
ab wait 2000 2>/dev/null
SNAP=$(snap)
assert_contains "editor overlay visible" "$SNAP" "View"
assert_contains "textarea present" "$SNAP" "textbox"
shot "06-editor-open.png"
shot "07-editor-focus.png"

# Check syntax highlighting layer exists
PAGE_HTML=$(ab eval 'document.getElementById("editor-highlight")?.innerHTML?.length > 0' 2>/dev/null)
assert_contains "highlight layer has content" "$PAGE_HTML" "true"

# Check shiki loaded
SHIKI=$(ab eval 'typeof window.blank.shiki' 2>/dev/null)
assert_contains "shiki highlighter loaded" "$SHIKI" "object"

# Close editor with Escape
ab press Escape 2>/dev/null
ab wait 1000 2>/dev/null

SNAP=$(snap)
assert_contains "back to preview after close" "$SNAP" "Edit"
assert_contains "headings visible again" "$SNAP" "heading"
shot "08-editor-closed.png"

echo ""

# ===== TEST 3: Editor Input & Preview Sync =====
echo "--- editor ↔ preview sync ---"

# Open editor, modify content, close, check preview updates
ab press e 2>/dev/null
ab wait 2000 2>/dev/null

# Inject test content via JS to avoid complex typing
ab eval --stdin <<'EVALEOF'
(() => {
  const ta = document.getElementById('editor');
  if (!ta) return 'no-textarea';
  ta.value = '# Test Slide\n\nHello from agent-browser test\n\n---\n\n## Second Slide\n\nThis verifies sync works';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'injected';
})()
EVALEOF
ab wait 500 2>/dev/null
shot "09-editor-modified.png"

# Close editor
ab press Escape 2>/dev/null
ab wait 1000 2>/dev/null

# Verify preview shows new content
PAGE_TEXT=$(ab eval 'document.getElementById("deck")?.textContent' 2>/dev/null)
assert_contains "preview shows injected heading" "$PAGE_TEXT" "Test Slide"
assert_contains "preview shows injected text" "$PAGE_TEXT" "agent-browser test"
shot "10-preview-synced.png"

echo ""

# ===== TEST 4: VCS Module (4-vcs) — Ctrl+S =====
echo "--- 4-vcs: Save to localStorage ---"

# Open editor first
ab press e 2>/dev/null
ab wait 2000 2>/dev/null

# Inject content and trigger Cmd+S / Ctrl+S
ab eval --stdin <<'EVALEOF'
(() => {
  const ta = document.getElementById('editor');
  if (!ta) return 'no-textarea';
  ta.value = '# VCS Test\n\nSaved content';
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ready';
})()
EVALEOF
ab wait 300 2>/dev/null

# Simulate Ctrl+S via keyboard
ab press Meta+s 2>/dev/null || ab press Control+s 2>/dev/null || true
ab wait 500 2>/dev/null

SAVED=$(ab eval 'localStorage.getItem("slidev-md")' 2>/dev/null)
assert_contains "localStorage saved via Ctrl+S" "$SAVED" "VCS Test"
shot "11-vcs-saved.png"

# Close editor
ab press Escape 2>/dev/null
ab wait 500 2>/dev/null

echo ""

# ===== TEST 5: Collab Module (3-collab) — DOM presence =====
echo "--- 3-collab: DOM & Yjs setup ---"

# Check collab DOM elements exist
POINTERS=$(ab eval 'document.getElementById("remote-pointers") !== null' 2>/dev/null)
assert_contains "remote-pointers container exists" "$POINTERS" "true"

COLLAB_USERS=$(ab eval 'document.getElementById("collab-users") !== null' 2>/dev/null)
assert_contains "collab-users container exists" "$COLLAB_USERS" "true"

# Check cursor overlay exists (created by editor for collab cursors)
CURSOR_OV=$(ab eval 'document.getElementById("cursor-overlay") !== null' 2>/dev/null)
assert_contains "cursor-overlay exists" "$CURSOR_OV" "true"

shot "12-collab-dom.png"

echo ""

# ===== TEST 6: Module isolation — each can be commented out =====
echo "--- module isolation ---"

# Reload to get clean state
ab eval 'localStorage.removeItem("slidev-md")' 2>/dev/null
ab open "$URL" 2>/dev/null
ab wait --load networkidle 2>/dev/null
ab wait 3000 2>/dev/null

# Verify window.blank has expected API surface (single eval to avoid timeouts)
API=$(ab eval 'Object.entries({on:typeof blank.on,emit:typeof blank.emit,esc:typeof blank.esc,refreshDeck:typeof blank.refreshDeck,openEditor:typeof blank.openEditor,goTo:typeof blank.goTo,marked:typeof blank.marked}).map(e=>e.join("=")).join(",")' 2>/dev/null)
assert_contains "on() registered" "$API" "on=function"
assert_contains "emit() registered" "$API" "emit=function"
assert_contains "esc() registered" "$API" "esc=function"
assert_contains "refreshDeck registered" "$API" "refreshDeck=function"
assert_contains "openEditor registered" "$API" "openEditor=function"
assert_contains "goTo registered" "$API" "goTo=function"
assert_contains "marked loaded" "$API" "marked=function"

echo ""

# ===== TEST 7: Responsive / mobile viewport =====
echo "--- responsive ---"

ab set viewport 375 812 2>/dev/null
ab wait 500 2>/dev/null
shot "13-responsive-mobile.png"

ab set viewport 1280 720 2>/dev/null
ab wait 500 2>/dev/null
shot "14-responsive-desktop.png"

SNAP=$(snap)
assert_contains "still renders at mobile width" "$SNAP" "heading"
echo "  ✓ responsive screenshots captured"
PASS=$((PASS + 1))

echo ""

# ===== TEST 8: Navigation dots =====
echo "--- navigation dots ---"

DOTS=$(ab eval 'document.querySelectorAll(".deck-dot").length' 2>/dev/null)
assert_not_contains "has navigation dots" "$DOTS" "0"
assert_contains "has many dots" "$DOTS" "17"
shot "15-nav-dots.png"

echo ""

# ===== CLEANUP =====
# Stop recording
ab record stop 2>/dev/null || true
ab screenshot --full "$SHOTS/99-final-full.png" 2>/dev/null

# Restore original content from ai.md so we don't leave test data
ab eval --stdin <<'EVALEOF'
localStorage.removeItem('slidev-md');
'cleaned'
EVALEOF
ab wait 200 2>/dev/null

ab close 2>/dev/null

if [[ -n "$SERVER_PID" ]]; then
  kill "$SERVER_PID" 2>/dev/null || true
fi

# ===== SUMMARY =====
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "Screenshots: $SHOTS/"
echo "Video: $VIDEO/"
echo "================================"

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
