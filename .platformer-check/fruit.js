(() => {
  const section = document.querySelector("#fruit");
  const canvas = document.querySelector("#fruitCanvas");
  if (!section || !canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 480, H = 700, BEST_KEY = "fruit-ninja-halloween-best";
  const $ = selector => section.querySelector(selector);
  const ui = {
    score: $("#fruitScore"), best: $("#fruitBest"), lives: $("#fruitLives"),
    overlay: $("#fruitOverlay"), title: $("#fruitOverlayTitle"), text: $("#fruitOverlayText"),
    kicker: $("#fruitOverlayKicker"), emoji: $("#fruitOverlayEmoji"), start: $("#fruitStart"),
    overlayBest: $("#fruitOverlayBest"), newRecord: $("#fruitNewRecord"),
    pause: $("#fruitPause"), mute: $("#fruitMute")
  };
  let state = "ready", raf = 0, last = 0, elapsed = 0, spawnIn = .7;
  let score = 0, lives = 3, best = Number(localStorage.getItem(BEST_KEY) || 0);
  let recordThisRun = false, slicing = false, previousPoint = null;
  let objects = [], particles = [], trails = [], sound = null, muted = false;
  ui.best.textContent = String(best);
  ui.overlayBest.textContent = String(best);

  function fit() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }
  function fx(kind) {
    if (muted) return;
    try {
      sound ||= new (window.AudioContext || window.webkitAudioContext)();
      if (sound.state === "suspended") sound.resume();
      const osc = sound.createOscillator(), gain = sound.createGain();
      const now = sound.currentTime;
      osc.type = kind === "hit" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(kind === "hit" ? 150 : 620, now);
      osc.frequency.exponentialRampToValueAtTime(kind === "hit" ? 75 : 980, now + .12);
      gain.gain.setValueAtTime(kind === "hit" ? .055 : .035, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .14);
      osc.connect(gain).connect(sound.destination); osc.start(now); osc.stop(now + .15);
    } catch (_) {}
  }
  function emitRecord() {
    window.dispatchEvent(new CustomEvent("arcade:record", { detail: { game: "fruit" } }));
  }
  function updateHUD() {
    ui.score.textContent = String(score);
    ui.best.textContent = String(best);
    ui.overlayBest.textContent = String(best);
    ui.lives.textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
  }
  function addScore(points) {
    score += points;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      if (!recordThisRun) {
        recordThisRun = true;
        const pop = document.createElement("div");
        pop.className = "mini-record-pop";
        pop.textContent = "NEW PERSONAL BEST! 🎉";
        $(".fruit-stage").appendChild(pop);
        setTimeout(() => pop.remove(), 1800);
      }
      emitRecord();
    }
    updateHUD();
  }
  function randomTreat() {
    const roll = Math.random();
    if (roll < .13) return { kind: "bomb", emoji: "💣", points: 0 };
    if (roll < .24) return { kind: "rotten", emoji: "🎃", points: 0 };
    const treats = [
      { kind: "fruit", emoji: "🍉", points: 1 }, { kind: "fruit", emoji: "🍓", points: 2 },
      { kind: "fruit", emoji: "🍎", points: 1 }, { kind: "fruit", emoji: "🍬", points: 2 },
      { kind: "fruit", emoji: "🍭", points: 2 }, { kind: "fruit", emoji: "🍊", points: 1 }
    ];
    return treats[Math.random() * treats.length | 0];
  }
  function spawn() {
    const treat = randomTreat();
    const difficulty = Math.min(1.7, score * .012);
    const size = 25 + Math.random() * 9;
    objects.push({ ...treat, x: 45 + Math.random() * (W - 90), y: H - 28,
      vx: (Math.random() - .5) * (88 + difficulty * 30),
      vy: -(510 + Math.random() * 105 + difficulty * 35),
      gravity: 640 + difficulty * 55, r: size, sliced: false, wobble: Math.random() * 6 });
  }
  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
    const x = ax + t * dx, y = ay + t * dy;
    return Math.hypot(px - x, py - y);
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, speed = 55 + Math.random() * 210;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: .35 + Math.random() * .35, max: .7, color, r: 2 + Math.random() * 4 });
    }
  }
  function sliceAlong(a, b) {
    if (!a || !b) return;
    for (const item of objects) {
      if (item.sliced) continue;
      if (pointToSegmentDistance(item.x, item.y, a.x, a.y, b.x, b.y) <= item.r * .85) {
        item.sliced = true;
        if (item.kind === "fruit") {
          addScore(item.points);
          burst(item.x, item.y, "#ffd975", 12);
          fx("slice");
        } else {
          lives = Math.max(0, lives - 1);
          burst(item.x, item.y, "#ff7694", 18);
          fx("hit");
          updateHUD();
          if (lives <= 0) finish(false);
        }
      }
    }
  }
  function pointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }
  function onPointerDown(event) {
    if (state !== "running") return;
    event.preventDefault(); slicing = true; previousPoint = pointerPoint(event);
    trails.push({ ...previousPoint, life: .17 });
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  }
  function onPointerMove(event) {
    if (!slicing || state !== "running") return;
    event.preventDefault();
    const point = pointerPoint(event);
    if (previousPoint) sliceAlong(previousPoint, point);
    trails.push({ ...point, life: .18 });
    if (trails.length > 22) trails.shift();
    previousPoint = point;
  }
  function onPointerUp(event) {
    slicing = false; previousPoint = null;
    if (event.cancelable) event.preventDefault();
  }
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#4b315e"); sky.addColorStop(1, "#21182f");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) {
      const x = (i * 137 + 35) % W, y = (i * 83 + 40) % H;
      ctx.globalAlpha = .18 + .14 * Math.sin(elapsed + i);
      ctx.fillStyle = "#ffe29b"; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#342545"; ctx.fillRect(0, H - 22, W, 22);
    for (const item of objects) {
      if (item.sliced) continue;
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.sin(elapsed * 4 + item.wobble) * .12);
      ctx.shadowColor = item.kind === "bomb" ? "#ff687c" : "#ffd36d"; ctx.shadowBlur = 10;
      ctx.font = (item.r * 1.9) + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, 0, 0); ctx.restore();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (trails.length > 1) {
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff4cb"; ctx.shadowColor = "#ffe091"; ctx.shadowBlur = 14; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(trails[0].x, trails[0].y);
      for (let i = 1; i < trails.length; i++) ctx.lineTo(trails[i].x, trails[i].y);
      ctx.stroke(); ctx.restore();
    }
  }
  function finish() {
    if (state === "over") return;
    state = "over"; cancelAnimationFrame(raf); raf = 0;
    ui.title.textContent = "Game over, slicer!";
    ui.kicker.textContent = "SCORE: " + score;
    ui.emoji.textContent = "🍉✨";
    ui.text.textContent = "You earned " + score + " points. Want another round?";
    ui.start.textContent = "Play again 🍬";
    ui.newRecord.hidden = !recordThisRun;
    updateHUD(); ui.overlay.classList.remove("is-hidden");
    draw();
  }
  function pause(message) {
    if (state !== "running") return;
    state = "paused"; cancelAnimationFrame(raf); raf = 0;
    ui.title.textContent = "Paused, twin"; ui.kicker.textContent = "TAKE YOUR TIME";
    ui.emoji.textContent = "⏸️🍬"; ui.text.textContent = message || "Take a little break, then carry on.";
    ui.start.textContent = "Resume"; ui.newRecord.hidden = true;
    ui.overlay.classList.remove("is-hidden"); ui.pause.textContent = "▶ Resume";
  }
  function loop(now) {
    if (state !== "running") return;
    if (!section.classList.contains("active")) { pause("Game paused while you visit another page."); return; }
    const dt = Math.min(.04, (now - last) / 1000 || 0);
    last = now; elapsed += dt; spawnIn -= dt;
    const interval = Math.max(.42, .94 - score * .004);
    if (spawnIn <= 0) { spawn(); spawnIn = interval * (.78 + Math.random() * .45); }
    for (const item of objects) {
      if (item.sliced) continue;
      item.vy += item.gravity * dt; item.x += item.vx * dt; item.y += item.vy * dt;
      const edge = item.r + 20;
      if (item.x < edge) { item.x = edge; item.vx = Math.abs(item.vx); }
      else if (item.x > W - edge) { item.x = W - edge; item.vx = -Math.abs(item.vx); }
    }
    objects = objects.filter(item => !item.sliced && item.y < H + 55);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    for (const t of trails) t.life -= dt;
    trails = trails.filter(t => t.life > 0);
    draw(); raf = requestAnimationFrame(loop);
  }
  function start() {
    if (state === "paused") { state = "running"; ui.overlay.classList.add("is-hidden"); ui.pause.textContent = "Ⅱ Pause"; last = performance.now(); raf = requestAnimationFrame(loop); return; }
    score = 0; lives = 3; elapsed = 0; spawnIn = .6; objects = []; particles = []; trails = []; recordThisRun = false;
    state = "running"; ui.kicker.textContent = "SWIPE TO SLICE"; ui.newRecord.hidden = true;
    ui.overlay.classList.add("is-hidden"); ui.pause.textContent = "Ⅱ Pause"; updateHUD(); last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  ui.start.addEventListener("click", start);
  ui.pause.addEventListener("click", () => state === "running" ? pause() : state === "paused" ? start() : null);
  ui.mute.addEventListener("click", () => { muted = !muted; ui.mute.textContent = muted ? "🔇 Sound off" : "🔊 Sound on"; ui.mute.setAttribute("aria-pressed", String(muted)); });
  window.addEventListener("resize", fit);
  updateHUD(); draw(); fit();
})();