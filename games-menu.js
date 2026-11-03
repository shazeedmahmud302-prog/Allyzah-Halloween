(() => {
  const read = (key, fallback = "0") => {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  };
  const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  const time = value => {
    const seconds = Number(value || 0);
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  };
  function update() {
    set("arcadeFlappyBest", read("flappy-shazeee-best"));
    set("arcadeFruitBest", read("fruit-ninja-halloween-best"));
    set("arcadeCandyBest", read("candy-collector-best"));
    const easy = Number(read("our-little-puzzle-best-3", "0"));
    const medium = Number(read("our-little-puzzle-best-4", "0"));
    const hard = Number(read("our-little-puzzle-best-5", "0"));
    set("arcadePuzzleBest", "Best times: Easy " + (easy ? time(easy) : "—") + " · Medium " + (medium ? time(medium) : "—") + " · Hard " + (hard ? time(hard) : "—"));
  }
  document.addEventListener("arcade:record", update);
  window.addEventListener("storage", update);
  document.addEventListener("click", event => {
    if (event.target.closest('[data-go="games"]')) setTimeout(update, 0);
  }, true);
  update();

  // Preserve Flappy's original mechanics while celebrating its existing best-score save.
  let seenFlappyBest = Number(read("flappy-shazeee-best", "0"));
  setInterval(() => {
    const current = Number(read("flappy-shazeee-best", "0"));
    if (current > seenFlappyBest) {
      seenFlappyBest = current;
      update();
      const flappy = document.querySelector("#flappy");
      if (flappy && flappy.classList.contains("active")) {
        const toast = document.createElement("div");
        toast.className = "flappy-record-toast";
        toast.textContent = "NEW PERSONAL BEST! 🎉";
        flappy.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
      }
    }
  }, 250);
})();