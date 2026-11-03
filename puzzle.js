(() => {
  const section = document.querySelector("#puzzle");
  if (!section) return;
  const $ = selector => section.querySelector(selector);
  const PUZZLE_PHOTOS = [
    { src: "assets/photos/couple-puzzle-1.jpg", label: "Photo 1" },
    { src: "assets/photos/couple-puzzle-2.jpg", label: "Photo 2" }
  ];
  let photoSrc = PUZZLE_PHOTOS[0].src, photo = new Image(), photoRequest = 0;
  const board = $("#puzzleBoard"), tray = $("#puzzleTray"), hintLayer = $("#puzzleHintOverlay");
  const ui = {
    status: $("#puzzlePhotoStatus"), timer: $("#puzzleTimer"), best: $("#puzzleBestTime"),
    progress: $("#puzzleProgress"), hint: $("#puzzleHint"), hintImage: $("#puzzleHintImage"),
    edges: $("#puzzleEdges"), lock: $("#puzzleLock"),
    overlay: $("#puzzleOverlay"), overlayKicker: $("#puzzleOverlayKicker"), overlayTitle: $("#puzzleOverlayTitle"),
    overlayText: $("#puzzleOverlayText"), overlayRecord: $("#puzzleOverlayRecord"),
    newRecord: $("#puzzleNewRecord"), start: $("#puzzleStart"), emoji: $("#puzzleOverlayEmoji"),
    mute: $("#puzzleMute")
  };
  let photoReady = false, size = 3, placed = 0, startedAt = 0, timerId = 0;
  let edgeOnly = false, piecesLocked = false, hintVisible = false;
  let state = "ready", sound = null, muted = false;
  const sizeButtons = [...section.querySelectorAll("[data-puzzle-size]")];
  const photoButtons = [...section.querySelectorAll("[data-puzzle-photo]")];
  const TAB_RATIO = .16, TRAY_TILE_SIZE = 48;
  let geometry = null, horizontalEdges = [], verticalEdges = [];

  function bestKey(n) { return "our-little-puzzle-best-" + n; }
  function bestFor(n) { return Number(localStorage.getItem(bestKey(n)) || 0); }
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function updateBestDisplay() {
    const record = bestFor(size);
    ui.best.textContent = record ? formatTime(record) : "—";
    ui.overlayRecord.textContent = "Best time for " + size + "×" + size + ": " + (record ? formatTime(record) : "not set yet");
  }
  function fx(correct) {
    if (muted) return;
    try {
      sound ||= new (window.AudioContext || window.webkitAudioContext)();
      if (sound.state === "suspended") sound.resume();
      const osc = sound.createOscillator(), gain = sound.createGain(), now = sound.currentTime;
      osc.type = "sine"; osc.frequency.value = correct ? 760 : 230;
      gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + .12);
      osc.connect(gain).connect(sound.destination); osc.start(now); osc.stop(now + .13);
    } catch (_) {}
  }
  function emitRecord() { window.dispatchEvent(new CustomEvent("arcade:record", { detail: { game: "puzzle", size } })); }
  function setPhotoStatus(message, error) {
    ui.status.textContent = message;
    ui.status.classList.toggle("error", Boolean(error));
  }
  function updateSizeButtons() {
    for (const button of sizeButtons) {
      const selected = Number(button.dataset.puzzleSize) === size;
      button.setAttribute("aria-pressed", String(selected));
    }
    updateBestDisplay();
  }
  function loadPhoto(index) {
    photoSrc = PUZZLE_PHOTOS[index].src;
    const request = ++photoRequest;
    photoReady = false;
    ui.start.disabled = true;
    ui.hint.disabled = true;
    board.innerHTML = "";
    tray.innerHTML = "";
    placed = 0;
    ui.progress.textContent = "Choose a difficulty and start when ready.";
    for (const button of photoButtons) {
      const selected = Number(button.dataset.puzzlePhoto) === index;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);
    }
    setPhotoStatus("Loading " + PUZZLE_PHOTOS[index].label.toLowerCase() + "…");
    const nextPhoto = new Image();
    nextPhoto.onload = () => {
      if (request !== photoRequest) return;
      photo = nextPhoto;
      photoReady = true;
      ui.hintImage.src = photoSrc;
      ui.start.disabled = false;
      setPhotoStatus(PUZZLE_PHOTOS[index].label + " is ready. Choose a difficulty and begin whenever you like.");
      updateBestDisplay();
    };
    nextPhoto.onerror = () => {
      if (request !== photoRequest) return;
      photoReady = false;
      ui.start.disabled = true;
      setPhotoStatus("Could not load " + PUZZLE_PHOTOS[index].label + ". Check the image file in assets/photos.", true);
      ui.overlayText.textContent = "The selected photo could not be loaded. Check the image file in assets/photos.";
    };
    nextPhoto.src = photoSrc;
  }
  for (const button of photoButtons) {
    button.addEventListener("click", () => {
      if (state === "running") return;
      if (state === "complete") {
        state = "ready";
        ui.overlayKicker.textContent = "A LITTLE PIECE OF US";
        ui.overlayTitle.textContent = "Puzzle";
        ui.overlayText.textContent = "Choose one of our photos and a difficulty, then fit the jigsaw pieces together. There is no time limit.";
        ui.start.textContent = "Start the puzzle 🧩";
        ui.newRecord.hidden = true;
        ui.overlay.classList.remove("is-hidden");
      }
      loadPhoto(Number(button.dataset.puzzlePhoto));
    });
  }
  loadPhoto(0);

  function createSharedEdges() {
    const randomSign = () => Math.random() < .5 ? -1 : 1;
    horizontalEdges = Array.from({ length: size - 1 }, () =>
      Array.from({ length: size }, randomSign));
    verticalEdges = Array.from({ length: size }, () =>
      Array.from({ length: size - 1 }, randomSign));
  }
  function pieceEdges(row, col) {
    return {
      top: row > 0 ? -horizontalEdges[row - 1][col] : 0,
      right: col < size - 1 ? verticalEdges[row][col] : 0,
      bottom: row < size - 1 ? horizontalEdges[row][col] : 0,
      left: col > 0 ? -verticalEdges[row][col - 1] : 0
    };
  }
  function jigsawPath(tile, pads, edges) {
    let path = "M " + pads.left + " " + pads.top;
    const point = (start, tangent, normal, t, depth, pad, sign) => [
      start[0] + tangent[0] * tile * t + normal[0] * pad * .72 * depth * sign,
      start[1] + tangent[1] * tile * t + normal[1] * pad * .72 * depth * sign
    ];
    const fmt = p => p[0].toFixed(2) + " " + p[1].toFixed(2);
    const edge = (start, tangent, normal, sign, pad) => {
      const p = (t, d = 0) => fmt(point(start, tangent, normal, t, d, pad, sign));
      if (!sign) {
        path += " L " + p(1);
        return;
      }
      path += " L " + p(.33) +
        " C " + p(.35, .65) + " " + p(.39, 1) + " " + p(.44, 1) +
        " C " + p(.44, 1.3) + " " + p(.56, 1.3) + " " + p(.56, 1) +
        " C " + p(.61, 1) + " " + p(.65, .65) + " " + p(.67);
      path += " L " + p(1);
    };
    const left = pads.left, top = pads.top, right = left + tile, bottom = top + tile;
    edge([left, top], [1, 0], [0, -1], edges.top, pads.top);
    edge([right, top], [0, 1], [1, 0], edges.right, pads.right);
    edge([right, bottom], [-1, 0], [0, 1], edges.bottom, pads.bottom);
    edge([left, bottom], [0, -1], [-1, 0], edges.left, pads.left);
    return path + " Z";
  }
  function applyPieceGeometry(piece, geo, locked = false) {
    const index = Number(piece.dataset.piece);
    const row = Math.floor(index / size), col = index % size;
    const base = locked ? geo.tileSize : Math.min(68, 280 / size);
    const scale = base / geo.tileSize;
    const edges = pieceEdges(row, col);
    const tab = base * TAB_RATIO;
    const pads = {
      top: edges.top ? tab : 0,
      right: edges.right ? tab : 0,
      bottom: edges.bottom ? tab : 0,
      left: edges.left ? tab : 0
    };
    const width = base + pads.left + pads.right;
    const height = base + pads.top + pads.bottom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let bitmap = piece.querySelector("canvas.puzzle-piece-art");
    if (!bitmap) {
      bitmap = document.createElement("canvas");
      bitmap.className = "puzzle-piece-art";
      bitmap.setAttribute("aria-hidden", "true");
      piece.appendChild(bitmap);
    }
    bitmap.width = Math.ceil(width * dpr);
    bitmap.height = Math.ceil(height * dpr);
    bitmap.style.width = width + "px";
    bitmap.style.height = height + "px";
    const ctx = bitmap.getContext("2d");
    ctx.scale(dpr, dpr);
    const shape = new Path2D(jigsawPath(base, pads, edges));
    ctx.save();
    ctx.clip(shape);
    const imageX = pads.left + (geo.offsetX - col * (geo.tileSize + geo.gap)) * scale;
    const imageY = pads.top + (geo.offsetY - row * (geo.tileSize + geo.gap)) * scale;
    ctx.drawImage(photo, imageX, imageY, geo.fitW * scale, geo.fitH * scale);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,239,197,.9)";
    ctx.lineWidth = Math.max(1, base * .018);
    ctx.lineJoin = "round";
    ctx.stroke(shape);
    piece.style.width = width + "px";
    piece.style.height = height + "px";
    piece.style.setProperty("--piece-pad-left", pads.left + "px");
    piece.style.setProperty("--piece-pad-top", pads.top + "px");
    piece.style.backgroundImage = "none";
    piece.style.backgroundColor = "transparent";
    piece.style.border = "0";
    piece.style.borderRadius = "0";
    piece.style.boxShadow = "none";
  }
  function makePiece(index, geo) {
    const piece = document.createElement("button");
    piece.type = "button";
    piece.className = "puzzle-piece";
    piece.dataset.piece = String(index);
    const row = Math.floor(index / size), col = index % size;
    piece.dataset.edge = String(row === 0 || col === 0 || row === size - 1 || col === size - 1);
    piece.setAttribute("aria-label", "Jigsaw piece " + (index + 1));
    piece.style.backgroundRepeat = "no-repeat";
    applyPieceGeometry(piece, geo);
    return piece;
  }
  function attachDrag(piece) {
    piece.addEventListener("pointerdown", event => {
      if (state !== "running" || piecesLocked || piece.classList.contains("locked") || (edgeOnly && piece.dataset.edge !== "true")) return;
      event.preventDefault();
      const rect = piece.getBoundingClientRect();
      const placeholder = document.createElement("div");
      placeholder.className = "puzzle-placeholder";
      placeholder.style.width = rect.width + "px";
      placeholder.style.height = rect.height + "px";
      placeholder.style.flex = "0 0 " + rect.width + "px";
      const home = piece.parentElement;
      home.insertBefore(placeholder, piece);
      piece.classList.add("puzzle-dragging");
      piece.style.setProperty("--drag-width", rect.width + "px");
      piece.style.setProperty("--drag-height", rect.height + "px");
      piece.style.left = rect.left + "px"; piece.style.top = rect.top + "px";
      document.body.appendChild(piece);
      const offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
      const move = e => {
        piece.style.left = (e.clientX - offsetX) + "px";
        piece.style.top = (e.clientY - offsetY) + "px";
      };
      const finish = e => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", cancel);
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const slot = target && target.closest(".puzzle-slot");
        const correct = slot && Number(slot.dataset.slot) === Number(piece.dataset.piece) && !slot.firstElementChild;
        piece.classList.remove("puzzle-dragging"); piece.style.left = ""; piece.style.top = ""; piece.style.removeProperty("--drag-width"); piece.style.removeProperty("--drag-height");
        if (correct) {
          placeholder.remove(); piece.classList.add("locked");
          applyPieceGeometry(piece, geometry, true);
          slot.classList.add("is-correct"); slot.appendChild(piece);
          placed++; ui.progress.textContent = placed + " / " + (size * size) + " pieces placed"; fx(true);
          if (placed === size * size) complete();
        } else {
          placeholder.replaceWith(piece); fx(false);
        }
      };
      const cancel = e => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", cancel);
        piece.classList.remove("puzzle-dragging"); piece.style.left = ""; piece.style.top = ""; piece.style.removeProperty("--drag-width"); piece.style.removeProperty("--drag-height");
        placeholder.replaceWith(piece);
      };
      document.addEventListener("pointermove", move, { passive: false });
      document.addEventListener("pointerup", finish, { once: true });
      document.addEventListener("pointercancel", cancel, { once: true });
    }, { passive: false });
  }
  function getGeometry(boardSize) {
    const gap = 0, tileSize = (boardSize - gap * (size - 1)) / size;
    const aspect = photo.naturalWidth / photo.naturalHeight;
    const fitW = aspect >= 1 ? boardSize : boardSize * aspect;
    const fitH = aspect >= 1 ? boardSize / aspect : boardSize;
    return {
      boardSize, gap, tileSize, fitW, fitH,
      offsetX: (boardSize - fitW) / 2,
      offsetY: (boardSize - fitH) / 2
    };
  }
  function refreshPieceBackgrounds() {
    if (!photoReady) return;
    const boardSize = board.clientWidth;
    if (!boardSize) return;
    geometry = getGeometry(boardSize);
    for (const piece of section.querySelectorAll(".puzzle-piece")) {
      applyPieceGeometry(piece, geometry, piece.classList.contains("locked"));
    }
  }
  function buildPuzzle() {
    board.innerHTML = "";
    tray.innerHTML = "";
    createSharedEdges();
    board.style.setProperty("--puzzle-size", size);
    const boardSize = board.clientWidth || Math.min(500, window.innerWidth - 48);
    geometry = getGeometry(boardSize);
    const total = size * size;
    for (let i = 0; i < total; i++) {
      const slot = document.createElement("div");
      slot.className = "puzzle-slot";
      slot.dataset.slot = String(i);
      slot.setAttribute("aria-label", "Puzzle position " + (i + 1));
      board.appendChild(slot);
    }
    const order = Array.from({ length: total }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((value, i) => value === i)) [order[0], order[1]] = [order[1], order[0]];
    for (const index of order) {
      const piece = makePiece(index, geometry);
      tray.appendChild(piece);
      attachDrag(piece);
    }
    placed = 0;
    edgeOnly = false; piecesLocked = false; hintVisible = false;
    ui.edges.setAttribute("aria-pressed", "false"); ui.edges.classList.remove("is-active");
    ui.lock.setAttribute("aria-pressed", "false"); ui.lock.classList.remove("is-active");
    ui.lock.textContent = "🔒 Lock pieces";
    ui.edges.disabled = false; ui.lock.disabled = false;
    ui.hint.setAttribute("aria-pressed", "false"); ui.hint.textContent = "👁 Show photo";
    tray.classList.remove("edge-filter");
    ui.progress.textContent = "0 / " + total + " pieces placed";
    hintLayer.classList.remove("show");
    ui.hint.disabled = false;
  }
  function startPuzzle() {
    if (!photoReady) return;
    if (state === "paused") return;
    size = Number(section.querySelector('[data-puzzle-size][aria-pressed="true"]').dataset.puzzleSize);
    updateBestDisplay(); buildPuzzle();
    state = "running"; startedAt = Date.now(); clearInterval(timerId); ui.timer.textContent = "00:00";
    timerId = setInterval(() => { if (state === "running") ui.timer.textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 500);
    ui.overlay.classList.add("is-hidden"); ui.newRecord.hidden = true;
    setPhotoStatus("Take your time. There is no countdown or time limit.");
  }
  function complete() {
    if (state !== "running") return;
    state = "complete"; clearInterval(timerId); timerId = 0;
    ui.hint.disabled = true; ui.edges.disabled = true; ui.lock.disabled = true;
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const key = bestKey(size), previous = bestFor(size), newBest = !previous || seconds < previous;
    if (newBest) { localStorage.setItem(key, String(seconds)); emitRecord(); }
    ui.timer.textContent = formatTime(seconds); updateBestDisplay();
    ui.overlayKicker.textContent = "ALL THE PIECES, STILL US";
    ui.overlayTitle.textContent = "You found every piece ❤️";
    ui.emoji.textContent = "🧩💞";
    ui.overlayText.textContent = "No matter how scattered the pieces get, I'll always find my way back to you. ❤️";
    ui.overlayRecord.textContent = "Your time: " + formatTime(seconds) + " · Best: " + formatTime(bestFor(size));
    ui.newRecord.hidden = !newBest;
    ui.start.textContent = "Shuffle and play again 🧩";
    ui.overlay.classList.remove("is-hidden");
    setPhotoStatus("Puzzle complete · no timer limit, just your own pace.");
  }
  function showHint() {
    if (state !== "running") return;
    hintVisible = !hintVisible;
    hintLayer.classList.toggle("show", hintVisible);
    ui.hint.setAttribute("aria-pressed", String(hintVisible));
    ui.hint.textContent = hintVisible ? "🙈 Hide photo" : "👁 Show photo";
  }
  for (const button of sizeButtons) {
    button.addEventListener("click", () => {
      if (state === "running") return;
      size = Number(button.dataset.puzzleSize); updateSizeButtons();
      if (state !== "complete") {
        ui.overlayText.textContent = "Fit each jigsaw piece into its matching place. Take all the time you need; there is no limit.";
        ui.start.textContent = "Start the puzzle 🧩";
      }
    });
  }
  ui.start.addEventListener("click", () => {
    if (state === "complete") { state = "ready"; ui.overlayTitle.textContent = "Puzzle"; }
    startPuzzle();
  });
  ui.hint.addEventListener("click", showHint);
  ui.edges.addEventListener("click", () => {
    if (state !== "running") return;
    edgeOnly = !edgeOnly;
    tray.classList.toggle("edge-filter", edgeOnly);
    ui.edges.setAttribute("aria-pressed", String(edgeOnly));
    ui.edges.classList.toggle("is-active", edgeOnly);
  });
  ui.lock.addEventListener("click", () => {
    if (state !== "running") return;
    piecesLocked = !piecesLocked;
    ui.lock.setAttribute("aria-pressed", String(piecesLocked));
    ui.lock.classList.toggle("is-active", piecesLocked);
    ui.lock.textContent = piecesLocked ? "🔓 Unlock pieces" : "🔒 Lock pieces";
  });
  ui.mute.addEventListener("click", () => { muted = !muted; ui.mute.textContent = muted ? "🔇 Sound off" : "🔊 Sound on"; ui.mute.setAttribute("aria-pressed", String(muted)); });
  window.addEventListener("resize", refreshPieceBackgrounds);
  updateBestDisplay();
})();
