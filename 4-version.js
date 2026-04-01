// ===== 4-VCS: Version control — save + future GitHub/GitLab =====
const app = window.blank

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault()
    const textarea = document.getElementById("editor")
    if (textarea) app.content = textarea.value
    if (app.content) localStorage.setItem("slidev-md", app.content)
    console.log("[vcs] Saved locally")
    // TODO: GitHub/GitLab commit integration
  }
})
