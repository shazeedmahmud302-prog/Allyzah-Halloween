(() => {
  const section = document.querySelector("#candy");
  const canvas = document.querySelector("#candyCanvas");
  if (!section || !canvas) return;
  const ctx = canvas.getContext("2d"), W = 480, H = 700;
  const BEST_KEY = "candy-collector-best";
  const $ = selector => section.querySelector(selector);
  const ui = {
    score: $("#candyScore"), best: $("#candyBest"), time: $("#candyTime"), lives: $("#candyLives"),
    overlay: $("#candyOverlay"), title: $("#candyOverlayTitle"),
    text: $("#candyOverlayText"), kicker: $("#candyOverlayKicker"), emoji: $("#candyOverlayEmoji"),
    start: $("#candyStart"), overlayBest: $("#candyOverlayBest"), newRecord: $("#candyNewRecord"),
    pause: $("#candyPause"), mute: $("#candyMute")
  };
  let state = "ready", raf = 0, last = 0, elapsed = 0, spawnIn = .5;
  let score = 0, best = Number(localStorage.getItem(BEST_KEY) || 0), lives = 3;
  let basketX = W / 2, items = [], particles = [], sound = null, muted = false, recordThisRun = false;
  let dragging = false, keyLeft = false, keyRight = false;
  const basketY = H - 62, basketW = 96, basketH = 64;
  ui.best.textContent = String(best); ui.overlayBest.textContent = String(best);

  function fit() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); draw();
  }
  function fx(hit) {
    if (muted) return;
    try {
      sound ||= new (window.AudioContext || window.webkitAudioContext)();
      if (sound.state === "suspended") sound.resume();
      const osc = sound.createOscillator(), gain = sound.createGain(), now = sound.currentTime;
      osc.type = hit ? "triangle" : "sine"; osc.frequency.setValueAtTime(hit ? 170 : 600, now);
      osc.frequency.exponentialRampToValueAtTime(hit ? 95 : 900, now + .13);
      gain.gain.setValueAtTime(.04, now); gain.gain.exponentialRampToValueAtTime(.001, now + .16);
      osc.connect(gain).connect(sound.destination); osc.start(now); osc.stop(now + .17);
    } catch (_) {}
  }
  function emitRecord() { window.dispatchEvent(new CustomEvent("arcade:record", { detail: { game: "candy" } })); }
  function formatTime(seconds) {
    const total = Math.floor(seconds);
    return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
  }
  function updateHUD() {
    ui.score.textContent = String(score); ui.best.textContent = String(best);
    ui.overlayBest.textContent = String(best); ui.time.textContent = formatTime(elapsed);
    ui.lives.textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
  }
  function newRecordPop() {
    const pop = document.createElement("div"); pop.className = "mini-record-pop";
    pop.textContent = "NEW PERSONAL BEST! 🎉"; $(".candy-stage").appendChild(pop);
    setTimeout(() => pop.remove(), 1800);
  }
  function addScore(points) {
    score += points;
    if (score > best) {
      best = score; localStorage.setItem(BEST_KEY, String(best));
      if (!recordThisRun) { recordThisRun = true; newRecordPop(); }
      emitRecord();
    }
    updateHUD();
  }
  function spawn() {
    const roll = Math.random();
    let type = "candy", emoji = "🍬", points = 1;
    if (roll < .1) { type = "bomb"; emoji = "💣"; points = 0; }
    else if (roll < .2) { type = "rotten"; emoji = "🎃"; points = 0; }
    else {
      const treats = [{ e: "🍬", p: 1 }, { e: "🍭", p: 2 }, { e: "🍫", p: 2 }, { e: "🍡", p: 3 }, { e: "🍎", p: 1 }];
      const candy = treats[Math.random() * treats.length | 0]; emoji = candy.e; points = candy.p;
    }
    const speedFactor = Math.min(2.2, elapsed / 28);
    const r = type === "bomb" ? 23 : 21;
    const safeEdge = r + 44;
    const originX = safeEdge + Math.random() * (W - safeEdge * 2);
    items.push({ type, emoji, points, x: originX, originX, y: -35, age: 0,
      vx: (Math.random() - .5) * 9, vy: 175 + Math.random() * 95 + speedFactor * 65,
      r, sway: Math.random() * 7, swayWidth: 8 + Math.random() * 14, caught: false });
  }
  function burst(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, speed = 45 + Math.random() * 150;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        color, life: .35 + Math.random() * .3, max: .65, r: 2 + Math.random() * 3 });
    }
  }
  function moveBasket(clientX) {
    const rect = canvas.getBoundingClientRect();
    basketX = Math.max(basketW / 2, Math.min(W - basketW / 2, (clientX - rect.left) * W / rect.width));
  }
  canvas.addEventListener("pointerdown", event => {
    if (state !== "running") return;
    event.preventDefault(); dragging = true; moveBasket(event.clientX);
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  }, { passive: false });
  canvas.addEventListener("pointermove", event => {
    if (state !== "running") return;
    if (dragging || event.pointerType === "mouse") { event.preventDefault(); moveBasket(event.clientX); }
  }, { passive: false });
  function stopDrag() { dragging = false; }
  canvas.addEventListener("pointerup", stopDrag); canvas.addEventListener("pointercancel", stopDrag);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", event => {
    if (!section.classList.contains("active") || state !== "running") return;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") keyLeft = true;
    if (event.key === "ArrowRight") keyRight = true;
  });
  document.addEventListener("keyup", event => {
    if (event.key === "ArrowLeft") keyLeft = false;
    if (event.key === "ArrowRight") keyRight = false;
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#39264f"); sky.addColorStop(1, "#221832");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      const x = (i * 163 + 51) % W, y = (i * 97 + 37) % (H - 120);
      ctx.fillStyle = "#ffe5a3"; ctx.globalAlpha = .2 + .12 * Math.sin(elapsed + i);
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const item of items) {
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.sin(elapsed * 3 + item.sway) * .12);
      ctx.shadowColor = item.type === "candy" ? "#ffdf8b" : "#fa7188"; ctx.shadowBlur = 8;
      ctx.font = "42px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, 0, 0); ctx.restore();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Cute pumpkin basket, with a wide open rim for forgiving catches.
    ctx.save(); ctx.translate(basketX, basketY);
    ctx.shadowColor = "#ffbd69"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#ef974d"; ctx.strokeStyle = "#ffe0a0"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-basketW / 2, -basketH / 2);
    ctx.quadraticCurveTo(-basketW / 2 + 8, basketH / 2, 0, basketH / 2);
    ctx.quadraticCurveTo(basketW / 2 - 8, basketH / 2, basketW / 2, -basketH / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffc968"; ctx.fillRect(-basketW / 2 - 4, -basketH / 2 - 4, basketW + 8, 10);
    ctx.font = "34px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎃", 0, 3);
    ctx.restore();
    ctx.fillStyle = "#d3af80"; ctx.fillRect(0, H - 18, W, 18);
  }
  function finish() {
    if (state === "over") return;
    state = "over"; cancelAnimationFrame(raf); raf = 0;
    ui.title.textContent = "Round over, candy catcher!";
    ui.kicker.textContent = "SCORE: " + score;
    ui.emoji.textContent = "🍭💜";
    ui.text.textContent = "You collected " + score + " points in " + formatTime(elapsed) + ". Want another round?";
    ui.newRecord.hidden = !recordThisRun; ui.start.textContent = "Play again 🍬";
    ui.overlay.classList.remove("is-hidden"); updateHUD(); draw();
  }
  function pause(message) {
    if (state !== "running") return;
    state = "paused"; cancelAnimationFrame(raf); raf = 0;
    ui.title.textContent = "Paused, twin"; ui.kicker.textContent = "TAKE A BREAK"; ui.emoji.textContent = "🧺⏸️";
    ui.text.textContent = message || "The basket can wait. Resume when you’re ready.";
    ui.start.textContent = "Resume"; ui.newRecord.hidden = true;
    ui.overlay.classList.remove("is-hidden"); ui.pause.textContent = "▶ Resume";
  }
  function loop(now) {
    if (state !== "running") return;
    if (!section.classList.contains("active")) { pause("Game paused while you visit another page."); return; }
    const dt = Math.min(.04, (now - last) / 1000 || 0); last = now; elapsed += dt;
    if (keyLeft) basketX = Math.max(basketW / 2, basketX - 350 * dt);
    if (keyRight) basketX = Math.min(W - basketW / 2, basketX + 350 * dt);
    spawnIn -= dt;
    const interval = Math.max(.4, .88 - elapsed * .007);
    if (spawnIn <= 0) { spawn(); spawnIn = interval * (.75 + Math.random() * .5); }
    for (const item of items) {
      item.y += item.vy * dt;
      item.age += dt;
      const edge = item.r + 22;
      item.x = item.originX + item.vx * item.age + Math.sin(item.age * 2.5 + item.sway) * item.swayWidth;
      item.x = Math.max(edge, Math.min(W - edge, item.x));
      const basketTop = basketY - basketH / 2;
      if (!item.caught && item.y + item.r * .5 >= basketTop && item.y - item.r * .3 <= basketY + basketH / 2 && Math.abs(item.x - basketX) < basketW * .5 + item.r * .35) {
        item.caught = true;
        if (item.type === "candy") { addScore(item.points); burst(item.x, basketTop, "#ffdf8b"); fx(false); }
        else { lives = Math.max(0, lives - 1); burst(item.x, basketTop, "#ff718c"); fx(true); updateHUD(); if (!lives) finish(); }
      }
    }
    items = items.filter(item => !item.caught && item.y < H + 40);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    ui.time.textContent = formatTime(elapsed);
    draw(); if (state === "running") raf = requestAnimationFrame(loop);
  }
  function start() {
    if (state === "paused") { state = "running"; ui.overlay.classList.add("is-hidden"); ui.pause.textContent = "Ⅱ Pause"; last = performance.now(); raf = requestAnimationFrame(loop); return; }
    score = 0; lives = 3; elapsed = 0; spawnIn = .45; basketX = W / 2;
    items = []; particles = []; recordThisRun = false; state = "running"; updateHUD();
    ui.time.textContent = formatTime(elapsed); ui.newRecord.hidden = true;
    ui.kicker.textContent = "CATCH THE TREATS"; ui.title.textContent = "Candy Collector"; ui.emoji.textContent = "🧺🍬";
    ui.start.textContent = "Start collecting 🍭"; ui.pause.textContent = "Ⅱ Pause"; ui.overlay.classList.add("is-hidden");
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  ui.start.addEventListener("click", start);
  ui.pause.addEventListener("click", () => state === "running" ? pause() : state === "paused" ? start() : null);
  ui.mute.addEventListener("click", () => { muted = !muted; ui.mute.textContent = muted ? "🔇 Sound off" : "🔊 Sound on"; ui.mute.setAttribute("aria-pressed", String(muted)); });
  window.addEventListener("resize", fit);
  updateHUD(); draw(); fit();
})();