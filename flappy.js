
(() => {
  const section = document.querySelector("#flappy");
  const canvas = document.querySelector("#flappyCanvas");
  if (!section || !canvas) return;

  const ctx = canvas.getContext("2d");
  let W = 960;
  let H = 540;
  const playerImage = new Image();
  let hasPlayerImage = false;
  playerImage.onload = () => { hasPlayerImage = true; };
  playerImage.onerror = () => { hasPlayerImage = false; };
  playerImage.src = "assets/photos/shazeee.png";

  const witchPhoto = new Image();
  let hasWitchPhoto = false;
  witchPhoto.onload = () => { hasWitchPhoto = true; };
  witchPhoto.onerror = () => { hasWitchPhoto = false; };
  witchPhoto.src = "assets/photos/allyzah-witch.png";

  const voices = {
    bebeNaman2: new Audio("assets/voices/Bebe naman 2.m4a"),
    ayokoNa: new Audio("assets/voices/Ayoko na.m4a"),
    kuninMoNaAko: new Audio("assets/voices/Kunin mo na ako.m4a"),
    sakitNaman: new Audio("assets/voices/Sakit naman.m4a"),
  };
  Object.values(voices).forEach(voice => { voice.preload = "none"; });

  function playVoice(name) {
    const clip = voices[name];
    if (!clip) return;
    Object.values(voices).forEach(other => {
      if (other !== clip) {
        other.pause();
        other.currentTime = 0;
      }
    });
    try {
      clip.currentTime = 0;
      const playback = clip.play();
      if (playback) playback.catch(() => {});
    } catch (_) {}
  }
  const ui = {
    stage: document.querySelector("#flappyStage"),
    score: document.querySelector("#flappyScore"),
    best: document.querySelector("#flappyBest"),
    overlay: document.querySelector("#flappyOverlay"),
    title: document.querySelector("#flappyOverlayTitle"),
    text: document.querySelector("#flappyOverlayText"),
    newRecord: document.querySelector("#flappyNewRecord"),
    start: document.querySelector("#flappyStart"),
    pause: document.querySelector("#flappyPause"),
    hit: document.querySelector("#flappyHit")
  };

  let state = "ready";
  let rafId = 0;
  let lastTime = 0;
  let elapsed = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem("flappy-shazeee-best") || 0);
  let bestAtRunStart = bestScore;
  ui.best.textContent = String(bestScore);
  let nextSpawn = 1.2;
  let nextBeam = 4.2;
  let obstacleNumber = 0;
  let obstacles = [];
  let beams = [];
  let player = { x: W * .215, y: H * .5, vy: 0, radius: 30, rotation: 0 };


  function createStars() {
    return Array.from({ length: 55 }, (_, i) => {
      const random = seed => {
        const value = Math.sin((i + 1) * 127.1 + seed * 311.7) * 43758.5453;
        return value - Math.floor(value);
      };
      return { x: random(1) * W, y: random(2) * H * .82, r: 1.1 + random(3) * .9, phase: random(4) * Math.PI * 2 };
    });
  }
  let stars = createStars();

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const portrait = rect.height > rect.width;
    const nextW = portrait ? 540 : 960;
    const nextH = portrait ? 960 : 540;
    if (nextW !== W || nextH !== H) {
      const scaleX = nextW / W, scaleY = nextH / H;
      W = nextW; H = nextH;
      player.x *= scaleX; player.y *= scaleY; player.vy *= scaleY;
      for (const obstacle of obstacles) {
        obstacle.x *= scaleX;
        if (Number.isFinite(obstacle.speed)) obstacle.speed *= scaleX;
        for (const key of ["y", "currentY", "gapY", "currentGapY", "move"]) if (Number.isFinite(obstacle[key])) obstacle[key] *= scaleY;
      }
      for (const beam of beams) {
        for (const key of ["x", "startX", "targetX", "vx"]) if (Number.isFinite(beam[key])) beam[key] *= scaleX;
        for (const key of ["y", "startY", "targetY", "vy"]) if (Number.isFinite(beam[key])) beam[key] *= scaleY;
      }
      stars = createStars();
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    draw();
  }

  function showOverlay(title, text, label) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.start.textContent = label;
    ui.overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    ui.overlay.classList.add("hidden");
  }

  function resetGame() {
    bestAtRunStart = bestScore;
    elapsed = 0;
    score = 0;
    obstacleNumber = 0;
    nextSpawn = 1.05;
    nextBeam = 4.4;
    obstacles = [];
    beams = [];
    player = { x: W * .215, y: H * .5, vy: 0, radius: 30, rotation: 0 };
    ui.score.textContent = "0";
    ui.pause.textContent = "Ⅱ Pause";
    ui.hit.classList.remove("show");
    ui.stage.classList.remove("shake", "flash");
    ui.newRecord.hidden = true;
  }

  function startGame() {
    resetGame();
    resizeCanvas();
    state = "running";
    hideOverlay();
    lastTime = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function flap() {
    player.vy = -350 * (H / 540);
  }

  function pauseGame() {
    if (state === "running") {
      state = "paused";
      ui.pause.textContent = "▶ Resume";
      showOverlay("Paused, twin!", "Take a breath. Allyzah is still loading up her sparkles…", "Resume");
    } else if (state === "paused") {
      state = "running";
      ui.pause.textContent = "Ⅱ Pause";
      hideOverlay();
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function startOrResume() {
    if (state === "paused") {
      pauseGame();
      return;
    }
    startGame();
  }

  ui.start.addEventListener("click", startOrResume);
  ui.pause.addEventListener("click", pauseGame);

  canvas.addEventListener("pointerdown", event => {
    if (state !== "running") return;
    event.preventDefault();
    flap();
  });

  document.addEventListener("keydown", event => {
    if (!section.classList.contains("active")) return;
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      if (state === "ready" || state === "over") startGame();
      if (state === "running") flap();
    } else if (event.code === "KeyP") {
      pauseGame();
    }
  });

  function spawnObstacle() {
    obstacleNumber++;
    const speed = Math.min(330, 238 + score * 3) * (H > W ? .64 : 1);
    const kind = obstacleNumber % 3;
    if (kind === 1) {
      const gap = H > W ? Math.max(215, 255 - score * 1.15) : Math.max(150, 188 - score * 1.5);
      obstacles.push({
        type: "gate",
        x: W + 45,
        width: 76,
        gap,
          gapY: H * .3 + Math.random() * H * .38,
        move: score > 2 ? 18 + Math.min(score, 14) : 0,
        phase: Math.random() * 6.28,
        speed,
        passed: false
      });
    } else if (kind === 2) {
      obstacles.push({
        type: "pumpkin",
        x: W + 35,
        y: H * .18 + Math.random() * H * .62,
        radius: 28,
        speed: speed + 12,
        phase: Math.random() * 6.28,
        passed: false
      });
    } else {
      obstacles.push({
        type: "branch",
        x: W + 40,
        y: H * .2 + Math.random() * H * .6,
        width: 94,
        height: 22,
        speed: speed + 4,
        phase: Math.random() * 6.28,
        passed: false
      });
    }
  }

  function pointToSegmentDistance(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function update(dt) {
    elapsed += dt;
    const speedBoost = Math.min(score * 2.2, 55) * (H > W ? .72 : 1);
    player.vy += 930 * (H / 540) * dt;
    player.y += player.vy * dt;
    player.rotation = Math.max(-.48, Math.min(.95, player.vy / (520 * H / 540)));

    if (elapsed >= nextSpawn) {
      spawnObstacle();
      nextSpawn = elapsed + Math.max(H > W ? 1.85 : 1.32, (1.72 - score * .012) * (H > W ? 1.2 : 1));
    }

    for (const obstacle of obstacles) {
      obstacle.x -= (obstacle.speed + speedBoost) * dt;
      if (obstacle.type === "gate") {
        obstacle.currentGapY = obstacle.gapY + Math.sin(elapsed * 1.7 + obstacle.phase) * obstacle.move;
      } else if (obstacle.type === "pumpkin") {
        obstacle.currentY = obstacle.y + Math.sin(elapsed * 2.1 + obstacle.phase) * 21;
      } else {
        obstacle.currentY = obstacle.y + Math.sin(elapsed * 1.3 + obstacle.phase) * 28;
      }
      checkObstacleCollision(obstacle);
      if (!obstacle.passed && obstacle.x + (obstacle.width || obstacle.radius * 2) < player.x) {
        obstacle.passed = true;
        score++;
        ui.score.textContent = String(score);
        if (score > bestScore) {
          bestScore = score;
          localStorage.setItem("flappy-shazeee-best", String(bestScore));
          ui.best.textContent = String(bestScore);
        }
      }
    }
    obstacles = obstacles.filter(o => o.x > -150);

    if (elapsed >= nextBeam) {
      const tip = witchWandTip();
      beams.push({ state: "aim", timer: 0, x: tip.x, y: tip.y, targetX: player.x, targetY: player.y });
      nextBeam = elapsed + (H > W ? 9.2 : 7.1) + Math.random() * (H > W ? 2 : 1.6);
    }

    for (const beam of beams) {
      beam.timer += dt;
      if (beam.state === "aim") {
        const tip = witchWandTip();
        beam.x = tip.x;
        beam.y = tip.y;
        beam.targetX = player.x;
        beam.targetY = player.y;
        if (beam.timer > (H > W ? 1.05 : .78)) {
          const beamVoices = ["bebeNaman2", "ayokoNa", "kuninMoNaAko"];
          playVoice(beamVoices[Math.floor(Math.random() * beamVoices.length)]);
          beam.state = "fire";
          beam.timer = 0;
          const dx = beam.targetX - beam.x;
          const dy = beam.targetY - beam.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          beam.dirX = dx / distance;
          beam.dirY = dy / distance;
          beam.speed = H > W ? 490 : 680;
          beam.vx = beam.dirX * beam.speed;
          beam.vy = beam.dirY * beam.speed;
          beam.traveled = 0;
          beam.startX = beam.x;
          beam.startY = beam.y;
          beam.maxDistance = distance + 110;
        }
      } else {
        beam.x += beam.vx * dt;
        beam.y += beam.vy * dt;
        beam.traveled += beam.speed * dt;
        const trailLength = Math.min(beam.traveled, 125);
        const tailX = beam.x - beam.dirX * trailLength;
        const tailY = beam.y - beam.dirY * trailLength;
        const distanceToPlayer = pointToSegmentDistance(player.x, player.y, tailX, tailY, beam.x, beam.y);
        if (distanceToPlayer < player.radius + 9) {
          collide("beam");
        }
      }
    }
    beams = beams.filter(b => b.state !== "fire" || b.traveled < b.maxDistance);

    if (player.y + player.radius > H - 46) {
      collide("obstacle");
    }
  }

  function checkObstacleCollision(o) {
    if (o.type === "gate") {
      const top = o.currentGapY - o.gap / 2;
      const bottom = o.currentGapY + o.gap / 2;
      const horizontalOverlap = player.x + player.radius > o.x &&
        player.x - player.radius < o.x + o.width;
      const hitsGate = player.y - player.radius < top ||
        player.y + player.radius > bottom;

      if (horizontalOverlap && hitsGate) {
        collide("obstacle");
        return;
      }

      const nearGate = o.x <= player.x + player.radius + 35 &&
        o.x + o.width >= player.x - player.radius - 35;
      const topClearance = player.y - player.radius - top;
      const bottomClearance = bottom - (player.y + player.radius);
      if (!o.nearMissChecked && nearGate &&
          Math.min(topClearance, bottomClearance) >= 0 &&
          Math.min(topClearance, bottomClearance) < 25) {
        o.nearMissChecked = true;
      }
      return;
    }

    if (o.type === "pumpkin") {
      const dx = player.x - (o.x + o.radius);
      const dy = player.y - o.currentY;
      const distance = Math.hypot(dx, dy);
      const hitDistance = player.radius + o.radius * .72;
      if (distance < hitDistance) {
        collide("obstacle");
      } else if (!o.nearMissChecked && distance < hitDistance + 18) {
        o.nearMissChecked = true;
      }
      return;
    }

    const dx = player.x - (o.x + o.width / 2);
    const dy = player.y - o.currentY;
    const hitX = player.radius + o.width / 2;
    const hitY = player.radius + o.height / 2;
    if (Math.abs(dx) < hitX && Math.abs(dy) < hitY) {
      collide("obstacle");
    } else if (!o.nearMissChecked &&
        Math.abs(dx) < hitX + 18 &&
        Math.abs(dy) < hitY + 18) {
      o.nearMissChecked = true;
    }
  }
  function collide(kind = "obstacle") {
    if (state !== "running") return;
    state = "over";
    const earnedNewRecord = bestScore > bestAtRunStart;
    ui.newRecord.hidden = !earnedNewRecord;
    if (earnedNewRecord) document.dispatchEvent(new CustomEvent("arcade:record", { detail: { game: "flappy", score: bestScore } }));
    playVoice("sakitNaman");
    ui.stage.classList.remove("shake", "flash");
    void ui.stage.offsetWidth;
    ui.stage.classList.add("shake", "flash");
    ui.hit.classList.remove("show");
    void ui.hit.offsetWidth;
    ui.hit.classList.add("show");
    const reactions = [
      "HAHAHAHA GOT YOU!",
      "Aray ko! Allyzah got you with the sparkles!",
      "That pumpkin had excellent aim.",
      "Twin, the witch wins this round!"
    ];
    showOverlay("Game over!", "Final score: " + score + " · Best: " + bestScore + " · " + reactions[Math.floor(Math.random() * reactions.length)], "Play again");
    setTimeout(() => ui.stage.classList.remove("shake", "flash"), 500);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#38264f");
    sky.addColorStop(.65, "#292044");
    sky.addColorStop(1, "#1c1834");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (const star of stars) {
      const twinkle = .5 + .5 * Math.sin(elapsed * 2.2 + star.phase);
      const r = star.r * (.92 + twinkle * .14);
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.rotate(star.phase * .08 + elapsed * .06);
      ctx.globalAlpha = .58 + twinkle * .4;
      ctx.shadowColor = "#ffe39a";
      ctx.shadowBlur = 1.5 + r;
      ctx.fillStyle = twinkle > .78 ? "#fff9df" : "#ffe6a8";
      ctx.beginPath();
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 === 0 ? r * 2 : r * .9;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffe5a6";
    ctx.beginPath();
    ctx.arc(W * .82, H * .18, 43, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#38264f";
    ctx.beginPath();
    ctx.arc(W * .84, H * .15, 42, 0, Math.PI * 2);
    ctx.fill();

    const cloudSpan = W + 180;
    drawCloud(75 + W * .22 - (elapsed * 12) % cloudSpan, H * .23, .8);
    drawCloud(W * .68 - (elapsed * 8) % cloudSpan, H * .4, .55);
    drawHill(0, H - 95, W * .42, 60, "#514064");
    drawHill(W * .3, H - 78, W * .42, 48, "#43375e");
    drawHill(W * .66, H - 92, W * .48, 65, "#514064");
    drawPumpkin(W * .08, H - 38, 23, 0);
    drawPumpkin(W * .91, H - 38, 28, 0);
    drawBat(W * .62 - (elapsed * 35) % (W + 80), H * .17 + Math.sin(elapsed) * 18, .7);
    ctx.fillStyle = "#322746";
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillStyle = "#907252";
    ctx.fillRect(0, H - 30, W, 3);
  }

  function drawCloud(x, y, scale) {
    if (x < -120) x += W + 180;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#82709a55";
    ctx.beginPath();
    ctx.ellipse(0, 10, 58, 17, 0, 0, Math.PI * 2);
    ctx.ellipse(-28, 3, 26, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(2, -7, 34, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(33, 5, 25, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHill(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, H - 30);
    ctx.quadraticCurveTo(x + width * .45, y - height, x + width, y);
    ctx.lineTo(x + width, H - 30);
    ctx.closePath();
    ctx.fill();
  }

  function drawBat(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#211832";
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(12, -8, 23, 8);
    ctx.quadraticCurveTo(35, -8, 47, 8);
    ctx.lineTo(39, 3);
    ctx.lineTo(34, 14);
    ctx.lineTo(24, 6);
    ctx.lineTo(15, 14);
    ctx.lineTo(9, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPumpkin(x, y, radius, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.fillStyle = "#f59a58";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * .72, 0, 0, Math.PI * 2);
    ctx.ellipse(-radius * .36, 0, radius * .48, radius * .65, 0, 0, Math.PI * 2);
    ctx.ellipse(radius * .36, 0, radius * .48, radius * .65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#75966a";
    ctx.fillRect(-3, -radius * .88, 6, radius * .35);
    ctx.fillStyle = "#38264f";
    ctx.beginPath();
    ctx.moveTo(-radius * .48, -1);
    ctx.lineTo(-radius * .23, 5);
    ctx.lineTo(-radius * .5, 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(radius * .48, -1);
    ctx.lineTo(radius * .23, 5);
    ctx.lineTo(radius * .5, 9);
    ctx.fill();
    ctx.strokeStyle = "#38264f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 5, radius * .3, .25, Math.PI - .25);
    ctx.stroke();
    ctx.restore();
  }

  function drawGate(o) {
    const gapY = o.currentGapY;
    const topHeight = gapY - o.gap / 2;
    const bottomY = gapY + o.gap / 2;
    ctx.fillStyle = "#604875";
    ctx.strokeStyle = "#e0bd82";
    ctx.lineWidth = 4;
    ctx.fillRect(o.x, 0, o.width, topHeight);
    ctx.strokeRect(o.x + 2, -2, o.width - 4, topHeight + 2);
    ctx.fillRect(o.x, bottomY, o.width, H - 30 - bottomY);
    ctx.strokeRect(o.x + 2, bottomY, o.width - 4, H - 32 - bottomY);
    ctx.fillStyle = "#8b6a8e";
    ctx.fillRect(o.x - 6, topHeight - 14, o.width + 12, 14);
    ctx.fillRect(o.x - 6, bottomY, o.width + 12, 14);
    for (let y = 26; y < topHeight - 20; y += 32) {
      drawStar(o.x + o.width / 2, y, 5, "#f5d799");
    }
    for (let y = bottomY + 37; y < H - 48; y += 36) {
      drawStar(o.x + o.width / 2, y, 5, "#f5d799");
    }
  }

  function drawStar(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const rr = i % 2 ? r * .4 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBranch(o) {
    ctx.save();
    ctx.translate(o.x, o.currentY);
    ctx.strokeStyle = "#806553";
    ctx.lineWidth = 17;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(42, -12, 94, 3);
    ctx.moveTo(36, -3);
    ctx.lineTo(25, -30);
    ctx.lineTo(12, -39);
    ctx.moveTo(65, -1);
    ctx.lineTo(76, -27);
    ctx.lineTo(91, -35);
    ctx.stroke();
    ctx.strokeStyle = "#bb966f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.quadraticCurveTo(43, -17, 88, -2);
    ctx.stroke();
    ctx.restore();
  }

  function witchPosition() {
    return { x: W - (H > W ? 65 : 135), y: H * .35 + Math.sin(elapsed * 1.25) * Math.min(35, H * .035) };
  }

  function witchWandTip() {
    const witch = witchPosition();
    return { x: witch.x + 54, y: witch.y + 4 };
  }

  function drawWitch() {
    const pos = witchPosition();
    const x = pos.x;
    const y = pos.y;
    ctx.save();
    ctx.translate(x, y);

    // A richer violet cloak with a soft plum shadow.
    const cloakGradient = ctx.createLinearGradient(-42, 15, 42, 92);
    cloakGradient.addColorStop(0, "#d19be8");
    cloakGradient.addColorStop(.48, "#9866bd");
    cloakGradient.addColorStop(1, "#68457f");
    ctx.fillStyle = cloakGradient;
    ctx.beginPath();
    ctx.moveTo(-24, 16);
    ctx.quadraticCurveTo(-47, 48, -40, 88);
    ctx.quadraticCurveTo(0, 106, 40, 88);
    ctx.quadraticCurveTo(45, 48, 23, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d9b4ef";
    ctx.beginPath();
    ctx.ellipse(0, 25, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gold-trimmed lapels and little magical details make the robe feel tailored.
    ctx.fillStyle = "#5b3b73";
    ctx.beginPath();
    ctx.moveTo(-23, 34);
    ctx.lineTo(-12, 43);
    ctx.lineTo(-3, 35);
    ctx.lineTo(0, 47);
    ctx.lineTo(3, 35);
    ctx.lineTo(12, 43);
    ctx.lineTo(23, 34);
    ctx.lineTo(19, 58);
    ctx.quadraticCurveTo(0, 69, -19, 58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffd987";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 43);
    ctx.lineTo(0, 51);
    ctx.lineTo(12, 43);
    ctx.moveTo(0, 51);
    ctx.lineTo(0, 81);
    ctx.stroke();
    ctx.fillStyle = "#ffe5a3";
    for (const buttonY of [57, 67, 77]) {
      ctx.beginPath();
      ctx.arc(0, buttonY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f7c4e7";
    ctx.beginPath();
    ctx.arc(-27, 60, 3, 0, Math.PI * 2);
    ctx.arc(27, 60, 3, 0, Math.PI * 2);
    ctx.fill();

    if (hasWitchPhoto) {
      // Use the transparent cutout so Allyzah reads as a full witch character.
      // This crop keeps her face and shoulders, without the circular avatar mask.
      ctx.fillStyle = "#ffd6bb";
      ctx.beginPath();
      ctx.moveTo(-9, -5);
      ctx.lineTo(-9, 17);
      ctx.quadraticCurveTo(-15, 27, -25, 36);
      ctx.quadraticCurveTo(0, 46, 25, 36);
      ctx.quadraticCurveTo(15, 27, 9, 17);
      ctx.lineTo(9, -5);
      ctx.closePath();
      ctx.fill();
      ctx.drawImage(
        witchPhoto,
        145, 0, 300, 360,
        -41, -94, 82, 98
      );
    } else {
      // Friendly illustrated fallback, positioned beneath the hat.
      ctx.save();
      ctx.translate(0, -42);
      ctx.fillStyle = "#593b67";
      ctx.beginPath();
      ctx.ellipse(0, -3, 35, 37, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd6bb";
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#49344f";
      ctx.beginPath();
      ctx.arc(-9, -2, 2.6, 0, Math.PI * 2);
      ctx.arc(9, -2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f39bb3";
      ctx.beginPath();
      ctx.arc(-16, 7, 4.5, 0, Math.PI * 2);
      ctx.arc(16, 7, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8c5369";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 5, 7, .15, Math.PI - .15);
      ctx.stroke();
      ctx.restore();
    }

    // Pointed cone with a flat brim seated over her hairline.
    ctx.fillStyle = "#382644";
    ctx.beginPath();
    ctx.moveTo(-31, -84);
    ctx.lineTo(-8, -151);
    ctx.quadraticCurveTo(9, -140, 32, -84);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#30213e";
    ctx.beginPath();
    ctx.ellipse(0, -84, 43, 8, -.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8f6591";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -84, 43, 8, -.1, 0, Math.PI * 2);
    ctx.stroke();

    // A little ribbon wraps the cone just above the brim.
    ctx.save();
    ctx.translate(0, -96);
    ctx.rotate(-.1);
    ctx.fillStyle = "#c27db0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd990";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Wand and spark.
    ctx.strokeStyle = "#e9c887";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(22, 36);
    ctx.lineTo(51, 8);
    ctx.stroke();
    // Small hand wraps around the wand, with a matching robe cuff.
    ctx.strokeStyle = "#8b63a4";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(12, 47);
    ctx.lineTo(22, 36);
    ctx.stroke();
    ctx.strokeStyle = "#ffd987";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(17, 42);
    ctx.lineTo(22, 46);
    ctx.stroke();
    ctx.fillStyle = "#ffd0b5";
    ctx.strokeStyle = "#8c596e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(14, 39);
    ctx.quadraticCurveTo(10, 36, 14, 32);
    ctx.lineTo(20, 33);
    ctx.lineTo(29, 23);
    ctx.quadraticCurveTo(34, 21, 34, 26);
    ctx.lineTo(29, 33);
    ctx.lineTo(34, 30);
    ctx.quadraticCurveTo(39, 30, 37, 35);
    ctx.lineTo(30, 42);
    ctx.quadraticCurveTo(22, 47, 16, 43);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Finger creases cross the wand grip so the hand reads clearly at game scale.
    ctx.strokeStyle = "#b87983";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(20, 33);
    ctx.quadraticCurveTo(24, 35, 27, 38);
    ctx.moveTo(24, 30);
    ctx.quadraticCurveTo(28, 32, 31, 35);
    ctx.moveTo(17, 39);
    ctx.quadraticCurveTo(20, 42, 23, 43);
    ctx.stroke();
    drawStar(54, 4, 10, "#ffe18f");
    ctx.restore();
  }

  function drawBeams() {
    for (const beam of beams) {
      if (beam.state === "aim") {
        ctx.save();
        ctx.strokeStyle = "rgba(255,224,139,.58)";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 9]);
        ctx.beginPath();
        ctx.moveTo(beam.x, beam.y);
        ctx.lineTo(beam.targetX, beam.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffe18f";
        ctx.beginPath();
        ctx.arc(beam.x, beam.y, 5 + Math.sin(beam.timer * 24) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const trailLength = Math.min(beam.traveled, 125);
        const tailX = beam.x - beam.dirX * trailLength;
        const tailY = beam.y - beam.dirY * trailLength;
        ctx.save();
        ctx.shadowColor = "#ffdd86";
        ctx.shadowBlur = 18;
        const gradient = ctx.createLinearGradient(tailX, tailY, beam.x, beam.y);
        gradient.addColorStop(0, "rgba(255,142,184,0)");
        gradient.addColorStop(.65, "#ff9fc8");
        gradient.addColorStop(1, "#fff0a4");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 11;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(beam.x, beam.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawBatHero() {
    const r = player.radius;
    const background = ctx.createLinearGradient(-r, -r, r, r);
    background.addColorStop(0, "#66517e");
    background.addColorStop(1, "#211832");
    ctx.fillStyle = background;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    // Tiny cape and bat-wing silhouette.
    ctx.fillStyle = "#55366b";
    ctx.beginPath();
    ctx.moveTo(-15, 1);
    ctx.lineTo(-24, 15);
    ctx.lineTo(-11, 13);
    ctx.lineTo(0, 22);
    ctx.lineTo(11, 13);
    ctx.lineTo(24, 15);
    ctx.lineTo(15, 1);
    ctx.closePath();
    ctx.fill();

    // Bat cowl with little ears.
    ctx.fillStyle = "#171723";
    ctx.beginPath();
    ctx.moveTo(-22, -8);
    ctx.lineTo(-20, -25);
    ctx.lineTo(-8, -18);
    ctx.lineTo(0, -24);
    ctx.lineTo(8, -18);
    ctx.lineTo(20, -25);
    ctx.lineTo(22, -8);
    ctx.quadraticCurveTo(20, 7, 0, 9);
    ctx.quadraticCurveTo(-20, 7, -22, -8);
    ctx.fill();

    ctx.fillStyle = "#fff0cf";
    ctx.beginPath();
    ctx.ellipse(-8, -5, 4.3, 2.4, -.18, 0, Math.PI * 2);
    ctx.ellipse(8, -5, 4.3, 2.4, .18, 0, Math.PI * 2);
    ctx.fill();

    // Gold badge with Shazeee's S.
    ctx.fillStyle = "#ffd780";
    ctx.beginPath();
    ctx.ellipse(0, 15, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#352343";
    ctx.font = "bold 13px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", 0, 15);
  }

  function drawBatBody() {
    const s = player.radius / 30;
    const kick = Math.sin(elapsed * 7.5) * 2 * s;

    // Compact cape stays close behind the flying suit.
    ctx.fillStyle = "#29233f";
    ctx.beginPath();
    ctx.moveTo(-22 * s, -8 * s);
    ctx.quadraticCurveTo(-47 * s, -18 * s, -72 * s, -13 * s);
    ctx.lineTo(-63 * s, -6 * s);
    ctx.lineTo(-91 * s, -2 * s);
    ctx.lineTo(-69 * s, 3 * s);
    ctx.lineTo(-82 * s, 9 * s);
    ctx.quadraticCurveTo(-53 * s, 15 * s, -22 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#625d7c";
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-28 * s, -7 * s);
    ctx.quadraticCurveTo(-53 * s, -14 * s, -75 * s, -10 * s);
    ctx.stroke();

    // Two bent-back trouser legs overlap closely and kick gently in flight.
    ctx.save();
    ctx.translate(0, -1.5 * s + kick);
    ctx.fillStyle = "#242d45";
    ctx.beginPath();
    ctx.moveTo(-48 * s, -1 * s);
    ctx.quadraticCurveTo(-61 * s, -3 * s, -72 * s, -8 * s);
    ctx.lineTo(-79 * s, -4 * s);
    ctx.quadraticCurveTo(-70 * s, 5 * s, -56 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111521";
    ctx.beginPath();
    ctx.moveTo(-76 * s, -6 * s);
    ctx.lineTo(-91 * s, -11 * s);
    ctx.quadraticCurveTo(-98 * s, -12 * s, -100 * s, -8 * s);
    ctx.lineTo(-86 * s, 0);
    ctx.lineTo(-77 * s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#9996ad";
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(-99 * s, -8 * s);
    ctx.lineTo(-86 * s, 0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(0, 2.5 * s - kick);
    ctx.fillStyle = "#242d45";
    ctx.beginPath();
    ctx.moveTo(-46 * s, 3 * s);
    ctx.quadraticCurveTo(-58 * s, 7 * s, -69 * s, 14 * s);
    ctx.lineTo(-64 * s, 20 * s);
    ctx.quadraticCurveTo(-49 * s, 14 * s, -38 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111521";
    ctx.beginPath();
    ctx.moveTo(-63 * s, 17 * s);
    ctx.lineTo(-78 * s, 22 * s);
    ctx.quadraticCurveTo(-85 * s, 26 * s, -83 * s, 29 * s);
    ctx.lineTo(-68 * s, 26 * s);
    ctx.lineTo(-60 * s, 21 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#9996ad";
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(-82 * s, 27 * s);
    ctx.lineTo(-68 * s, 26 * s);
    ctx.stroke();
    ctx.restore();

    // Slim shirt with a clear shoulder and chest emblem.
    ctx.fillStyle = "#596681";
    ctx.beginPath();
    ctx.moveTo(-17 * s, -10 * s);
    ctx.quadraticCurveTo(-31 * s, -15 * s, -43 * s, -9 * s);
    ctx.lineTo(-66 * s, -2 * s);
    ctx.lineTo(-58 * s, 3 * s);
    ctx.lineTo(-40 * s, 6 * s);
    ctx.lineTo(-20 * s, 2 * s);
    ctx.lineTo(-8 * s, -4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#a8a4c0";
    ctx.lineWidth = 1.3 * s;
    ctx.stroke();

    const logoX = -43 * s;
    const logoY = -3 * s;
    ctx.fillStyle = "#f7ce61";
    ctx.beginPath();
    ctx.ellipse(logoX, logoY, 12 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10131e";
    ctx.beginPath();
    ctx.moveTo(logoX - 10 * s, logoY - 1 * s);
    ctx.lineTo(logoX - 7 * s, logoY - 4 * s);
    ctx.lineTo(logoX - 4 * s, logoY - 2 * s);
    ctx.lineTo(logoX - 2 * s, logoY - 6 * s);
    ctx.lineTo(logoX, logoY - 3 * s);
    ctx.lineTo(logoX + 2 * s, logoY - 6 * s);
    ctx.lineTo(logoX + 4 * s, logoY - 2 * s);
    ctx.lineTo(logoX + 7 * s, logoY - 4 * s);
    ctx.lineTo(logoX + 10 * s, logoY - 1 * s);
    ctx.lineTo(logoX + 7 * s, logoY + 3 * s);
    ctx.lineTo(logoX + 3 * s, logoY + 2 * s);
    ctx.lineTo(logoX, logoY + 5 * s);
    ctx.lineTo(logoX - 3 * s, logoY + 2 * s);
    ctx.lineTo(logoX - 7 * s, logoY + 3 * s);
    ctx.closePath();
    ctx.fill();
  }

  function drawBatFrontHand() {
    const s = player.radius / 30;
    ctx.save();
    ctx.strokeStyle = "#343d59";
    ctx.lineCap = "round";
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -3 * s);
    ctx.lineTo(57 * s, -5 * s);
    ctx.stroke();
    ctx.fillStyle = "#111521";
    ctx.beginPath();
    ctx.moveTo(54 * s, -12 * s);
    ctx.quadraticCurveTo(59 * s, -17 * s, 64 * s, -13 * s);
    ctx.lineTo(72 * s, -12 * s);
    ctx.quadraticCurveTo(76 * s, -9 * s, 72 * s, -5 * s);
    ctx.lineTo(64 * s, 0);
    ctx.quadraticCurveTo(58 * s, 1 * s, 54 * s, -3 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f7ce61";
    ctx.lineWidth = 2.2 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(58 * s, -11 * s);
    ctx.quadraticCurveTo(64 * s, -16 * s, 70 * s, -10 * s);
    ctx.moveTo(57 * s, -5 * s);
    ctx.lineTo(61 * s, -2 * s);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    if (hasPlayerImage) {
      ctx.save();
      ctx.translate(0, 16 * (player.radius / 30));
      drawBatBody();
      ctx.restore();
      drawBatFrontHand();
      ctx.save();
      ctx.rotate(player.rotation * .28);
      const drawWidth = player.radius * 3.5;
      const drawHeight = drawWidth * (playerImage.naturalHeight / playerImage.naturalWidth);
      ctx.shadowColor = "#1b102c";
      ctx.shadowBlur = 9;
      ctx.drawImage(playerImage, player.radius * .42 - drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else {
      ctx.rotate(player.rotation);
      ctx.shadowColor = "#ffca83";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#fff0ce";
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      drawBatHero();
      ctx.strokeStyle = "#fff4de";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    for (const obstacle of obstacles) {
      if (obstacle.type === "gate") drawGate(obstacle);
      else if (obstacle.type === "pumpkin") drawPumpkin(obstacle.x + obstacle.radius, obstacle.currentY, obstacle.radius, Math.sin(elapsed * 2) * .08);
      else drawBranch(obstacle);
    }
    drawBeams();
    drawWitch();
    drawPlayer();
  }

  function loop(now) {
    if (state !== "running") return;
    if (!section.classList.contains("active")) {
      state = "paused";
      ui.pause.textContent = "▶ Resume";
      showOverlay("Paused, twin!", "Come back when you’re ready to fly again.", "Resume");
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, .04);
    lastTime = now;
    update(dt);
    draw();
    if (state === "running") rafId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  draw();
})();
