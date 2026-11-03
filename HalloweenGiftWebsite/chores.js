(() => {
  const root = document.querySelector("#chores");
  if (!root) return;
  const host = root.querySelector("#choreStageHost");
  const progressFill = root.querySelector("#choreProgressFill");
  const progressLabel = root.querySelector("#choreProgressLabel");
  const starLabel = root.querySelector("#choreStarCount");
  const TOTAL_UNITS = 25;
  let completeUnits = 0;
  let stars = 0;
  let stageTimer = 0;
  let activePointer = null;
  let soundContext = null;
  let laundryStep = "sort";
  let sortedClothes = [];

  const clothes = [
    { id: "white-tee", icon: "👕", name: "White tee", kind: "white" },
    { id: "red-shirt", icon: "👚", name: "Pink blouse", kind: "color" },
    { id: "white-socks", icon: "🧦", name: "White socks", kind: "white" },
    { id: "blue-shirt", icon: "👖", name: "Blue jeans", kind: "color" }
  ].map(item => ({ ...item, sorted: false, loaded: false, hung: false, folded: false }));

  function updateProgress(label) {
    const percent = Math.min(100, Math.round(completeUnits / TOTAL_UNITS * 100));
    progressFill.style.width = percent + "%";
    progressLabel.textContent = label || percent + "% of the chores done";
    starLabel.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  }

  function fx(kind = "pop") {
    try {
      soundContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = soundContext.createOscillator();
      const gain = soundContext.createGain();
      const now = soundContext.currentTime;
      oscillator.type = kind === "chop" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(kind === "chop" ? 220 : 540, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "chop" ? 105 : 880, now + (kind === "chop" ? .09 : .16));
      gain.gain.setValueAtTime(kind === "chop" ? .09 : .045, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .18);
      oscillator.connect(gain).connect(soundContext.destination);
      oscillator.start(now);
      oscillator.stop(now + .19);
    } catch (_) {}
  }

  function roomScene(kind) {
    const laundry = kind === "laundry";
    const label = laundry ? "🧺 Laundry room" : kind === "onion" ? "🥕 Kitchen · chopping counter" : "🫧 Kitchen · sink corner";
    const wall = laundry ? "#bce8fa" : "#b9e7f6";
    const floor = laundry ? "#f7d7b8" : "#f5d1ad";
    const furniture = laundry
      ? "<rect x='325' y='70' width='235' height='150' rx='22' fill='#80d4d7' stroke='#4d9fa8' stroke-width='8'/><circle class='room-spin' cx='442' cy='145' r='55' fill='#e8ffff' stroke='#468e9a' stroke-width='10'/><path d='M402 140q40-45 80 0t0 25q-40 42-80 0t0-25' fill='#91c9df'/><rect x='350' y='36' width='330' height='14' rx='7' fill='#aa704c'/><path d='M370 52v48m70-48v48m70-48v48m70-48v48m70-48v48' stroke='#fff' stroke-width='5'/><path d='M370 99q20 27 40 0m30 0q20 27 40 0m30 0q20 27 40 0m30 0q20 27 40 0' fill='none' stroke='#fb9bc4' stroke-width='9'/><rect x='690' y='158' width='145' height='56' rx='17' fill='#ffafd0'/><path d='M707 177h110' stroke='#fff' stroke-width='7'/>"
      : "<rect x='280' y='22' width='250' height='100' rx='12' fill='#f3a574'/><path d='M280 72h250M405 22v100' stroke='#fff0d4' stroke-width='6'/><rect x='0' y='150' width='900' height='32' fill='#d78d62'/><rect x='0' y='182' width='900' height='48' fill='#b97359'/><rect x='600' y='72' width='225' height='65' rx='15' fill='#80d4d7' stroke='#4d9fa8' stroke-width='7'/><path d='M620 72v-20q0-24 24-24h30' fill='none' stroke='#6e8694' stroke-width='10'/><path d='M615 91q95 20 192 0' fill='none' stroke='#f6ffff' stroke-width='9'/><rect x='700' y='40' width='14' height='55' rx='7' fill='#6e8694'/><path d='M680 139v32m64-32v32' stroke='#78648f' stroke-width='9'/><rect x='667' y='134' width='130' height='8' rx='4' fill='#fff5d2'/><path d='M679 132v-20m27 20v-20m27 20v-20m27 20v-20m27 20v-20' stroke='#fff' stroke-width='4'/><rect x='80' y='125' width='145' height='60' rx='14' fill='#fff0cf'/><path d='M90 144h125' stroke='#c69672' stroke-width='5'/><path d='M100 125q-10-18 0-29m25 29q-10-18 0-29m25 29q-10-18 0-29' fill='none' stroke='#fff' stroke-width='5'/>";
    return "<div class='chore-room " + (laundry ? "laundry-room" : "kitchen-room") + "' role='img' aria-label='Cartoon " + (laundry ? "laundry room" : "kitchen") + "'><svg viewBox='0 0 900 230' preserveAspectRatio='xMidYMid slice' aria-hidden='true'><rect width='900' height='230' fill='" + wall + "'/><rect y='150' width='900' height='80' fill='" + floor + "'/><path d='M0 150H900' stroke='#d4ac8e' stroke-width='7'/><rect x='48' y='24' width='170' height='105' rx='10' fill='#fff4d7'/><rect x='58' y='34' width='150' height='85' rx='6' fill='#8bd4e8'/><path d='M133 34v85M58 76h150' stroke='#fff4d7' stroke-width='8'/><circle cx='176' cy='51' r='14' fill='#ffe38b'/>" + furniture + "</svg><span class='room-caption'>" + label + "</span><span class='room-mascot' aria-hidden='true'>" + (laundry ? "🐱" : "🐈‍⬛") + "</span></div>";
  }

  function intro() {
    host.innerHTML = `
      <article class="chore-card chore-intro">
        <p class="chore-kicker">MESSY HOUSE · TINY QUEST · BIG TEAMWORK</p>
        <div class="chore-start-art">🏠🧺🫧</div>
        <h3>Ready for a little housework adventure?</h3>
        <p>Wash the dishes, help the onions meet the chopping board, and rescue the laundry. Three chores, three stars, one very clean house.</p>
        <button class="chore-primary" data-action="start">Start the chores ✨</button>
      </article>`;
    updateProgress("Ready when you are");
  }

  function setStageTransition(title, message, next) {
    stars = Math.min(3, stars + 1);
    updateProgress("Stage complete · " + stars + " of 3 stars");
    host.innerHTML = `
      <article class="chore-card" style="text-align:center">
        <div class="celebration-stars">★ ★ ★</div>
        <h3>${title}</h3><p>${message}</p>
        <p class="chore-feedback">Next chore coming right up…</p>
      </article>`;
    clearTimeout(stageTimer);
    stageTimer = setTimeout(next, 1250);
  }

  function startDishes() {
    const dishes = [
      { id: "plate", icon: "🍽️", name: "Plate", status: "dirty", scrub: 0 },
      { id: "cup", icon: "☕", name: "Cup", status: "dirty", scrub: 0 },
      { id: "spoon", icon: "🥄", name: "Spoon", status: "dirty", scrub: 0 }
    ];
    host.innerHTML = `
      <article class="chore-card">
        <p class="chore-kicker">STAGE 1 OF 3 · DISHWASHING</p>
        ${roomScene("dishes")}
        <h3>Let’s make these dishes sparkle 🧼</h3>
        <p id="dishHint">Pick a dish and scrub it with a back-and-forth drag. Then drag it to the sink to rinse, and finally to the rack. <span class="hand-guide">👆</span></p>
        <div class="chore-layout">
          <div class="chore-zone dirty-zone" data-dest="dirty">
            <div class="zone-title">Dirty dish tray</div><div class="zone-note">Scrub each dish until the bubbles appear</div>
            <div class="dish-items" id="dirtyItems"></div>
          </div>
          <div class="chore-zone sink-zone drop-zone" data-dest="sink">
            <div class="zone-title">🚿 Sink · rinse</div><div class="zone-note">Drop scrubbed dishes here</div>
            <div class="drop-items" id="sinkItems"></div><div class="bubbles"></div>
          </div>
          <div class="chore-zone rack-zone drop-zone" data-dest="rack">
            <div class="zone-title">✨ Drying rack</div><div class="zone-note">Drop rinsed dishes here</div>
            <div class="drop-items" id="rackItems"></div>
          </div>
        </div>
        <p class="chore-count" id="dishCount">0 / 3 dishes on the rack</p>
        <p class="chore-feedback" id="dishFeedback" aria-live="polite">Scrub, rinse, rack — you’ve got this, bebe.</p>
      </article>`;
    const list = host.querySelector("#dirtyItems");
    dishes.forEach(dish => list.appendChild(makeDish(dish)));
    updateProgress("Stage 1 · Dishwashing");
    root._dishes = dishes;
  }

  function makeDish(dish) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dish-item";
    button.dataset.dish = dish.id;
    button.dataset.status = dish.status;
    button.setAttribute("aria-label", dish.name + ", dirty");
    button.innerHTML = dish.icon + "<small>" + dish.name + "</small>";
    return button;
  }

  function bubbles(zone) {
    const layer = zone.querySelector(".bubbles");
    for (let i = 0; i < 8; i++) {
      const bubble = document.createElement("i");
      bubble.className = "bubble";
      bubble.style.left = (14 + Math.random() * 72) + "%";
      bubble.style.top = (38 + Math.random() * 42) + "%";
      layer.appendChild(bubble);
      setTimeout(() => bubble.remove(), 950);
    }
  }

  function setDishScrubbed(item, dish) {
    if (dish.status !== "dirty") return;
    dish.status = "scrubbed";
    item.dataset.status = "scrubbed";
    item.classList.remove("scrubbing");
    item.classList.add("scrubbed");
    item.setAttribute("aria-label", dish.name + ", scrubbed; drag to the sink");
    host.querySelector("#dishHint").textContent = "Lovely scrubbing! Now drag that dish into the sink to rinse it.";
    host.querySelector("#dishFeedback").textContent = "Bubbles! You’re doing great 🫧";
    bubbles(host.querySelector(".sink-zone"));
    fx();
  }

  function dropDish(item, target) {
    const dish = root._dishes.find(d => d.id === item.dataset.dish);
    if (!dish || !target) return false;
    const destination = target.dataset.dest;
    if (dish.status === "scrubbed" && destination === "sink") {
      dish.status = "rinsed";
      item.dataset.status = "rinsed";
      item.classList.remove("scrubbed");
      item.classList.add("rinsed");
      item.setAttribute("aria-label", dish.name + ", rinsed; drag to the rack");
      item.querySelector("small").textContent = "Rinsed ✨";
      target.querySelector(".drop-items").appendChild(item);
      bubbles(target);
      fx();
      host.querySelector("#dishHint").textContent = "Nice rinse! Drag the clean dish over to the drying rack.";
      host.querySelector("#dishFeedback").textContent = "So shiny, mahal ko ✨";
      return true;
    }
    if (dish.status === "rinsed" && destination === "rack") {
      dish.status = "placed";
      item.dataset.status = "placed";
      item.classList.remove("rinsed");
      item.classList.add("placed");
      item.setAttribute("aria-label", dish.name + ", clean and on the rack");
      item.querySelector("small").textContent = "Clean ✓";
      target.querySelector(".drop-items").appendChild(item);
      completeUnits++;
      const count = root._dishes.filter(d => d.status === "placed").length;
      host.querySelector("#dishCount").textContent = count + " / 3 dishes on the rack";
      host.querySelector("#dishFeedback").textContent = ["One sparkling dish!","Two down — kitchen teamwork!","All clean! That sink looks brand new!"][count - 1];
      updateProgress("Stage 1 · " + count + " of 3 dishes done");
      fx("pop");
      if (count === 3) setStageTransition("Dishes: sparkling! ✨", "That was some excellent teamwork.", () => startOnions());
      return true;
    }
    host.querySelector("#dishFeedback").textContent = dish.status === "dirty"
      ? "Scrub the dish first — rub it back and forth for bubbles."
      : "Rinse it before it goes on the rack.";
    return false;
  }

  function startOnions() {
    const count = 5;
    host.innerHTML = `
      <article class="chore-card">
        <p class="chore-kicker">STAGE 2 OF 3 · ONION CUTTING</p>
        ${roomScene("onion")}
        <h3>Chop chop, chef bebe 🧅</h3>
        <p>Swipe across each onion to slice it. A short, clear swipe is all it takes! <span class="hand-guide swipe-guide">👆</span></p>
        <div class="onion-board" id="onionBoard"></div>
        <p class="tear-meter">Onions sliced: <strong id="onionCount">0 / 5</strong> · Happy tears: <span id="tearFace">😊</span></p>
        <p class="reaction-bubble" id="onionReaction" aria-live="polite">Careful with those onions… or not 😏</p>
      </article>`;
    const board = host.querySelector("#onionBoard");
    for (let i = 0; i < count; i++) {
      const onion = document.createElement("button");
      onion.type = "button";
      onion.className = "onion";
      onion.dataset.onion = String(i);
      onion.setAttribute("aria-label", "Whole onion. Swipe to slice");
      onion.textContent = "🧅";
      board.appendChild(onion);
    }
    updateProgress("Stage 2 · Onion cutting");
  }

  function sliceOnion(item) {
    if (!item || item.classList.contains("sliced")) return;
    item.classList.add("sliced");
    item.innerHTML = '<span class="onion-halves">🧅🧅</span>';
    item.setAttribute("aria-label", "Onion sliced");
    const count = host.querySelectorAll(".onion.sliced").length;
    host.querySelector("#onionCount").textContent = count + " / 5";
    host.querySelector("#tearFace").textContent = count >= 2 ? "😭" : "😊";
    const reactions = {
      2: "Why are you crying, bebe? It’s just an onion! 😂",
      4: "Awww, chef Shazeee has onion tears! 🥹"
    };
    host.querySelector("#onionReaction").textContent = reactions[count] || ["Chop chop!","That slice was chef-level!","Careful, the onion is winning!"][count % 3];
    fx("chop");
    updateProgress("Stage 2 · " + count + " of 5 onions sliced");
    if (count === 5) setStageTransition("Onions: chopped! 🧅", "No onions were emotionally prepared for your knife skills.", () => startLaundry());
  }

  function startLaundry(step = "sort") {
    laundryStep = step;
    renderLaundry();
  }

  function clothing(item, phase) {
    const el = document.createElement("div");
    el.className = "laundry-item";
    el.dataset.cloth = item.id;
    el.dataset.phase = phase;
    el.innerHTML = "<span>" + item.icon + "</span><small>" + item.name + "</small>";
    return el;
  }

  function renderLaundry() {
    if (laundryStep === "washing") {
      host.innerHTML = `
        <article class="chore-card" style="text-align:center">
          <p class="chore-kicker">STAGE 3 OF 3 · LAUNDRY</p>${roomScene("laundry")}<h3>Spin cycle in progress 🫧</h3>
          <div class="washer spinning"><div class="washer-window">🧦👕</div></div>
          <p class="chore-feedback">The washing machine is working its magic…</p>
        </article>`;
      return;
    }
    const heading = "<p class=\"chore-kicker\">STAGE 3 OF 3 · LAUNDRY</p>" + roomScene("laundry");
    if (laundryStep === "sort") {
      host.innerHTML = `<article class="chore-card">${heading}
        <h3>Let’s sort the laundry 👕</h3>
        <p>Drag each item into the matching basket: whites on the left, colours on the right. <span class="hand-guide">👆</span></p>
        <div class="laundry-layout">
          <div class="chore-zone"><div class="zone-title">Unsorted pile</div><div class="laundry-items" id="unsortedClothes"></div></div>
          <div class="chore-zone laundry-bin white-bin" data-dest="white"><div class="zone-title">🤍 Whites</div><div class="zone-note">White clothes only</div><div class="drop-items" id="whiteClothes"></div></div>
          <div class="chore-zone laundry-bin color-bin" data-dest="color"><div class="zone-title">🌈 Colours</div><div class="zone-note">Colourful clothes here</div><div class="drop-items" id="colorClothes"></div></div>
          <div class="chore-zone"><div class="zone-title">Sorting score</div><p class="chore-feedback" id="laundryFeedback">0 / 4 sorted</p></div>
        </div>
      </article>`;
      clothes.filter(c => !c.sorted).forEach(c => host.querySelector("#unsortedClothes").appendChild(clothing(c, "sort")));
    } else if (laundryStep === "load") {
      host.innerHTML = `<article class="chore-card">${heading}
        <h3>Load the washing machine 🧺</h3>
        <p>Drag each sorted pile into the washer. <span class="hand-guide">👆</span></p>
        <div class="laundry-layout">
          <div class="chore-zone"><div class="zone-title">Sorted clothes</div><div class="laundry-items" id="sortedClothes"></div></div>
          <div class="chore-zone laundry-drop" data-dest="washer"><div class="zone-title">🫧 Washing machine</div><div class="washer"><div class="washer-window">🧺</div></div><div class="drop-items" id="washerClothes"></div></div>
        </div>
        <p class="chore-feedback" id="laundryFeedback">0 / 4 loaded</p>
        <button class="washer-button" id="startWash" type="button" disabled>Start wash cycle</button>
      </article>`;
      clothes.filter(c => !c.loaded).forEach(c => host.querySelector("#sortedClothes").appendChild(clothing(c, "load")));
      host.querySelector("#startWash").addEventListener("click", () => {
        laundryStep = "washing";
        renderLaundry();
        fx("pop");
        stageTimer = setTimeout(() => {
          completeUnits++;
          updateProgress("Stage 3 · Wash cycle complete");
          fx("chop");
          laundryStep = "hang";
          renderLaundry();
        }, 2200);
      });
    } else if (laundryStep === "hang") {
      host.innerHTML = `<article class="chore-card">${heading}
        <h3>Hang the clean clothes 🌤️</h3>
        <p>Drag each clean item onto the clothesline to dry. <span class="hand-guide">👆</span></p>
        <div class="chore-zone"><div class="zone-title">Fresh from the wash</div><div class="laundry-items" id="cleanClothes"></div></div>
        <div class="chore-zone laundry-drop clothes-line" data-dest="line"><div class="zone-title">☀️ Clothesline</div><div class="drop-items" id="lineClothes"></div></div>
        <p class="chore-feedback" id="laundryFeedback">0 / 4 hanging</p>
      </article>`;
      clothes.filter(c => !c.hung).forEach(c => host.querySelector("#cleanClothes").appendChild(clothing(c, "hang")));
    } else if (laundryStep === "fold") {
      host.innerHTML = `<article class="chore-card">${heading}
        <h3>Fold it all, team bebe 🧺</h3>
        <p>Drag each dry item into the neat little folding basket. <span class="hand-guide">👆</span></p>
        <div class="chore-layout">
          <div class="chore-zone"><div class="zone-title">Dry on the line</div><div class="laundry-items" id="dryClothes"></div></div>
          <div class="chore-zone laundry-drop" data-dest="fold"><div class="zone-title">✨ Folded basket</div><div class="drop-items" id="foldedClothes"></div></div>
        </div>
        <p class="chore-feedback" id="laundryFeedback">0 / 4 folded</p>
      </article>`;
      clothes.filter(c => !c.folded).forEach(c => host.querySelector("#dryClothes").appendChild(clothing(c, "fold")));
    }
    updateProgress("Stage 3 · " + ({ sort: "Sorting", load: "Loading", hang: "Hanging", fold: "Folding" }[laundryStep] || "Laundry"));
  }

  function finishLaundryAction(item, zone) {
    const cloth = clothes.find(c => c.id === item.dataset.cloth);
    if (!cloth || !zone) return false;
    const destination = zone.dataset.dest;

    if (laundryStep === "sort") {
      if (destination !== cloth.kind) {
        host.querySelector("#laundryFeedback").textContent = "Oops, check the colour of that one 😄";
        return false;
      }
      cloth.sorted = true;
      zone.querySelector(".drop-items").appendChild(item);
      completeUnits++;
      const n = clothes.filter(c => c.sorted).length;
      host.querySelector("#laundryFeedback").textContent = n + " / 4 sorted — nice!";
      updateProgress("Stage 3 · " + n + " of 4 sorted");
      fx();
      if (n === 4) setTimeout(() => startLaundry("load"), 500);
      else {
        host.querySelectorAll("#unsortedClothes .laundry-item").forEach(el => el.remove());
        clothes.filter(c => !c.sorted).forEach(c => host.querySelector("#unsortedClothes").appendChild(clothing(c, "sort")));
      }
      return true;
    }

    if (laundryStep === "load" && destination === "washer") {
      cloth.loaded = true;
      zone.querySelector(".drop-items").appendChild(item);
      completeUnits++;
      const n = clothes.filter(c => c.loaded).length;
      host.querySelector("#laundryFeedback").textContent = n + " / 4 loaded";
      host.querySelector("#startWash").disabled = n !== 4;
      updateProgress("Stage 3 · " + n + " of 4 loaded");
      fx();
      host.querySelectorAll("#sortedClothes .laundry-item").forEach(el => el.remove());
      clothes.filter(c => !c.loaded).forEach(c => host.querySelector("#sortedClothes").appendChild(clothing(c, "load")));
      return true;
    }

    if (laundryStep === "hang" && destination === "line") {
      cloth.hung = true;
      item.classList.add("hung-cloth");
      zone.querySelector(".drop-items").appendChild(item);
      completeUnits++;
      const n = clothes.filter(c => c.hung).length;
      host.querySelector("#laundryFeedback").textContent = n + " / 4 hanging";
      updateProgress("Stage 3 · " + n + " of 4 hanging");
      fx();
      if (n === 4) setTimeout(() => startLaundry("fold"), 550);
      else {
        [...host.querySelectorAll(".laundry-item")].forEach(el => el.remove());
        clothes.filter(c => !c.hung).forEach(c => host.querySelector("#cleanClothes").appendChild(clothing(c, "hang")));
        [...zone.querySelectorAll(".laundry-item")].forEach(el => el.remove());
        clothes.filter(c => c.hung).forEach(c => {
          const hung = clothing(c, "hung");
          hung.classList.add("hung-cloth");
          zone.querySelector(".drop-items").appendChild(hung);
        });
      }
      return true;
    }

    if (laundryStep === "fold" && destination === "fold") {
      cloth.folded = true;
      item.classList.remove("hung-cloth");
      item.classList.add("folded-cloth");
      item.innerHTML = "<span>" + cloth.icon + "</span>";
      zone.querySelector(".drop-items").appendChild(item);
      completeUnits++;
      const n = clothes.filter(c => c.folded).length;
      host.querySelector("#laundryFeedback").textContent = n + " / 4 folded — looking lovely!";
      updateProgress("Stage 3 · " + n + " of 4 folded");
      fx();
      const remaining = clothes.filter(c => !c.folded);
      host.querySelectorAll("#dryClothes .laundry-item").forEach(el => el.remove());
      remaining.forEach(c => host.querySelector("#dryClothes").appendChild(clothing(c, "fold")));
      if (n === 4) setTimeout(finishGame, 600);
      return true;
    }
    host.querySelector("#laundryFeedback").textContent = "Drag that item to the next laundry spot.";
    return false;
  }

  function finishGame() {
    stars = 3;
    completeUnits = TOTAL_UNITS;
    progressFill.style.width = "100%";
    progressLabel.textContent = "Every chore complete!";
    starLabel.textContent = "★★★";
    host.innerHTML = `
      <article class="chore-card" style="text-align:center">
        <div class="celebration-stars">✨ 🎉 ✨</div>
        <div class="celebration-house">🏡</div>
        <div class="celebration-stars">⭐ 🫧 ⭐</div>
        <h3>YOU DID IT, BEBEEE! ❤️</h3>
        <p class="celebration-copy">Now you've finished all the chores. When we're finally together, we'll do these things side by side. But I'll try to do the dishes so you can relax. HAHAHA.</p>
        <button class="chore-primary" data-action="again">Play the chore quest again 🧺</button>
      </article>`;
    confetti();
    fx("pop");
  }

  function confetti() {
    const colors = ["#ffd985", "#ff9fc3", "#c6a6ec", "#a6d6bc", "#fff2d5"];
    for (let i = 0; i < 80; i++) {
      const bit = document.createElement("i");
      bit.className = "chore-confetti";
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = Math.random() * .5 + "s";
      document.body.appendChild(bit);
      setTimeout(() => bit.remove(), 3200);
    }
  }

  function onPointerDown(event) {
    const onion = event.target.closest(".onion:not(.sliced)");
    const dish = event.target.closest(".dish-item:not(.placed)");
    const laundry = event.target.closest(".laundry-item");
    const item = onion || dish || laundry;
    if (!item || !root.contains(item)) return;
    event.preventDefault();
    item.setPointerCapture?.(event.pointerId);
    activePointer = {
      item,
      kind: onion ? "onion" : dish ? "dish" : "laundry",
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      travel: 0,
      dx: 0,
      dy: 0
    };
    item.classList.add("is-dragging");
  }

  function onPointerMove(event) {
    if (!activePointer) return;
    const a = activePointer;
    a.travel += Math.hypot(event.clientX - a.lastX, event.clientY - a.lastY);
    a.dx = event.clientX - a.startX;
    a.dy = event.clientY - a.startY;
    a.lastX = event.clientX;
    a.lastY = event.clientY;
    if (a.kind !== "onion") {
      a.item.style.transform = "translate(" + a.dx + "px," + a.dy + "px) scale(1.06)";
    } else if (a.travel > 12) {
      a.item.classList.add("cutting");
    }
    if (a.kind === "dish" && a.item.dataset.status === "dirty" && a.travel > 65) {
      const dish = root._dishes.find(d => d.id === a.item.dataset.dish);
      if (dish) setDishScrubbed(a.item, dish);
    }
  }

  function onPointerUp(event) {
    if (!activePointer) return;
    const a = activePointer;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const zone = element?.closest(".drop-zone,.laundry-bin,.laundry-drop");
    a.item.classList.remove("is-dragging", "cutting");

    if (a.kind === "onion") {
      a.item.style.transform = "";
      if (a.travel > 36) sliceOnion(a.item);
    } else if (a.kind === "dish") {
      const dropped = dropDish(a.item, zone);
      if (!dropped) a.item.style.transform = "";
      else a.item.style.transform = "";
    } else {
      const dropped = finishLaundryAction(a.item, zone);
      if (!dropped) a.item.style.transform = "";
      else a.item.style.transform = "";
    }
    activePointer = null;
  }

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerUp);
  host.addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "start") startDishes();
    if (action.dataset.action === "again") resetGame();
  });

  function resetGame() {
    clearTimeout(stageTimer);
    completeUnits = 0;
    stars = 0;
    sortedClothes = [];
    clothes.forEach(c => { c.sorted = false; c.loaded = false; c.hung = false; c.folded = false; });
    updateProgress("Ready when you are");
    intro();
  }

  intro();
})();
