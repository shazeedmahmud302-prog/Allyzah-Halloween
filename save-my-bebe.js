(() => {
  const section = document.querySelector("#saveMyBebe");
  const canvas = document.querySelector("#sbCanvas");
  if (!section || !canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 960, H = 600, GROUND_Y = 510, LEVEL_END = 7280;
  const root = "assets/save-my-bebe/sprites/";
  const source = {
    boyIdle: "shazeee-idle.png", boyRun: ["shazeee-run-1.png", "shazeee-run-2.png", "shazeee-run-3.png"],
    girlIdle: "allyzah-idle.png", girlRun: ["allyzah-run-1.png", "allyzah-run-2.png", "allyzah-run-3.png"],
    platform: "boy-platform.png", smallPlatform: "boy-platform-small.png", heart: "pink-heart.png",
    star: "golden-star.png", pumpkin: "pumpkin-large.png", pumpkinSmall: "pumpkin-small.png",
    portal: "portal.png", lantern: "lantern.png", teddy: "teddy.png", reunionHug: "reunion-hug.png"
  };
  const sprites = {};
  let loaded = 0, total = 0;
  function load(key, file) {
    if (Array.isArray(file)) { sprites[key] = file.map((item, i) => load(`${key}${i}`, item)); return sprites[key]; }
    const image = new Image(); total++;
    image.onload = image.onerror = () => { loaded++; updateLoadLabel(); };
    image.src = root + file;
    sprites[key] = image;
    return image;
  }
  Object.entries(source).forEach(([key, file]) => load(key, file));

  const ui = Object.fromEntries(["overlay", "kicker", "title", "text", "start", "pause", "mute", "score", "hearts", "lives", "time", "bestScore", "bestHearts", "bestTime", "hitFlash", "progress", "progressText", "introCouple", "reunionArt"].map(key => [key, document.getElementById({
    overlay:"sbOverlay", kicker:"sbKicker", title:"sbOverlayTitle", text:"sbOverlayText", start:"sbStart", pause:"sbPause", mute:"sbMute", score:"sbScore", hearts:"sbHearts", lives:"sbLives", time:"sbTime", bestScore:"sbBestScore", bestHearts:"sbBestHearts", bestTime:"sbBestTime", hitFlash:"sbHitFlash", progress:"sbProgress", progressText:"sbProgressText", introCouple:"sbIntroCouple", reunionArt:"sbReunionArt"
  }[key])]));
  const keys = { score:"save-my-bebe-best-score", hearts:"save-my-bebe-best-hearts", time:"save-my-bebe-best-time", mute:"save-my-bebe-muted" };
  const read = key => { try { return Number(localStorage.getItem(key) || 0); } catch (_) { return 0; } };
  const write = (key, value) => { try { localStorage.setItem(key, String(value)); } catch (_) {} };
  let bestScore = read(keys.score), bestHearts = read(keys.hearts), bestTime = read(keys.time);
  let muted = (() => { try { return localStorage.getItem(keys.mute) === "true"; } catch (_) { return false; } })();
  let audio = null;
  const notes = { jump:[480,660], heart:[740,990], hurt:[260,170], checkpoint:[520,780,1040], win:[520,660,790,1050] };
  function sound(kind) {
    if (muted) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      (notes[kind] || [500]).forEach((hz, i) => {
        const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime + i * .07;
        osc.type = kind === "hurt" ? "triangle" : "sine"; osc.frequency.value = hz;
        gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.075, t + .02); gain.gain.exponentialRampToValueAtTime(.0001, t + .16);
        osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + .17);
      });
    } catch (_) {}
  }
  const ground = [
    {x:0,y:510,w:960,h:150}, {x:1090,y:510,w:690,h:150}, {x:1945,y:510,w:750,h:150},
    {x:2865,y:510,w:755,h:150}, {x:3800,y:510,w:760,h:150}, {x:4750,y:510,w:820,h:150}, {x:5760,y:510,w:1540,h:150}
  ];
  const floats = [
    [295,425,165],[610,355,165],[865,430,150],[1110,430,150],[1390,365,175],[1645,420,150],[1820,435,130],
    [2050,420,170],[2350,350,165],[2630,425,165],[2910,425,160],[3210,355,175],[3510,425,150],
    [3850,420,165],[4140,350,175],[4440,425,155],[4820,420,165],[5130,350,175],[5440,425,165],
    [5840,425,165],[6120,350,180],[6440,420,170],[6740,420,150]
  ].map(([x,y,w]) => ({x,y,w,h:36}));
  const platforms = ground.concat(floats.map(p => ({...p,h:32})));
  const hazards = [
    ["spikes",555,488,62,22],["pumpkin",1200,458,48,50],["spikes",1510,488,80,22],["pumpkin",2165,460,48,48],
    ["spikes",2480,488,74,22],["pumpkin",3090,458,50,50],["spikes",3405,488,88,22],["pumpkin",4045,458,50,50],
    ["spikes",4320,488,86,22],["pumpkin",5045,458,50,50],["spikes",5310,488,86,22],["pumpkin",6260,458,54,52],
    ["spikes",6550,488,78,22]
  ].map(([kind,x,y,w,h]) => ({kind,x,y,w,h}));
  const items = [
    [225,438,"heart"],[390,340,"heart"],[664,270,"star"],[840,365,"heart"],[1015,395,"heart"],[1168,360,"heart"],
    [1472,280,"star"],[1700,355,"heart"],[1885,370,"heart"],[2110,355,"heart"],[2415,268,"star"],[2665,365,"heart"],
    [2815,438,"heart"],[2960,360,"heart"],[3280,272,"star"],[3580,365,"heart"],[3745,438,"heart"],[3915,350,"heart"],
    [4215,270,"star"],[4510,365,"heart"],[4670,438,"heart"],[4890,350,"heart"],[5200,270,"star"],[5505,365,"heart"],
    [5680,438,"heart"],[5915,365,"heart"],[6200,270,"star"],[6480,360,"heart"],[6700,360,"heart"],[6955,415,"heart"]
  ].map(([x,y,kind], id) => ({id,x,y,kind,collected:false,bob:Math.random()*6.28}));
  const checkpoints = [{x:2470,active:false},{x:4810,active:false}];
  const ghosts = [
    [890,1055,372,1.8,0],[1780,1950,354,2.1,1.4],[2680,2840,354,1.7,2.3],
    [3600,3790,356,2.2,.8],[4560,4740,350,2.35,2.8],[5570,5750,360,2.5,1.1],[6500,6710,360,2.7,2.1]
  ].map(([start,end,y,speed,phase])=>({start,end,y,speed,phase,x:(start+end)/2}));
  const stars = Array.from({length:100},(_,i)=>({x:(i*197+73)%1600,y:30+(i*131+19)%270,r:1+(i%4)*.55,phase:i*.61}));
  const player = {x:86,y:432,w:38,h:78,vx:0,vy:0,jumps:0,coyote:0,invulnerable:0,anim:0,facing:1};
  const input = {left:false,right:false};
  let state="ready", score=0, hearts=0, lives=3, elapsed=0, checkpointX=86, camera=0, last=0, raf=0, reunion=0, particles=[];
  let newBest=false,newHeartBest=false,newTimeBest=false,scaleX=1,scaleY=1;
  function timeText(seconds) {
    if (!seconds) return "—";
    const n=Math.floor(seconds); return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;
  }
  function updateLoadLabel() {
    if (state!=="ready") return;
    ui.start.disabled=loaded<total;
    ui.start.textContent=loaded<total?`Loading sprites ${loaded}/${total}…`:"Start Adventure ✨";
  }
  function records() {
    bestScore=read(keys.score); bestHearts=read(keys.hearts); bestTime=read(keys.time);
    ui.bestScore.textContent=bestScore; ui.bestHearts.textContent=bestHearts; ui.bestTime.textContent=timeText(bestTime);
    const a=document.getElementById("arcadeSaveBebeBest"),b=document.getElementById("arcadeSaveBebeHearts"),c=document.getElementById("arcadeSaveBebeTime");
    if(a)a.textContent=bestScore;if(b)b.textContent=bestHearts;if(c)c.textContent=timeText(bestTime);
  }
  records();
  function resize() {
    const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
    scaleX=canvas.width/W;scaleY=canvas.height/H;draw();
  }
  addEventListener("resize",resize,{passive:true});
  if("ResizeObserver" in window)new ResizeObserver(resize).observe(canvas);
  function overlay(mode) {
    ui.overlay.classList.remove("is-hidden");
    ui.introCouple.hidden=mode==="won";ui.reunionArt.hidden=mode!=="won";
    if(mode==="ready"){
      ui.kicker.textContent="A LITTLE HALLOWEEN ADVENTURE";ui.title.textContent="SAVE MY BEBE ❤️";
      ui.text.textContent="One little adventure to find my favourite person. Double-jump across moonlit platforms, collect hearts, and dodge the silly spooky things.";ui.start.textContent="Start Adventure ✨";
    }else if(mode==="paused"){
      ui.kicker.textContent="CATCH YOUR BREATH, HERO";ui.title.textContent="Adventure paused";
      ui.text.textContent="Allyzah is still waiting at the castle. Your hearts and checkpoint are safe.";ui.start.textContent="Resume adventure ▶";
    }else if(mode==="over"){
      ui.kicker.textContent="THE MOONLIGHT IS STILL WAITING";ui.title.textContent="BEBEEE, I NEED ANOTHER CHANCE! 😭";
      ui.text.textContent=`You collected ${hearts} hearts and scored ${score}. Restart and bring your favourite hero home.`;ui.start.textContent="Restart adventure ↻";
    }else if(mode==="won"){
      ui.kicker.textContent=newBest||newHeartBest||newTimeBest?"A NEW PERSONAL RECORD! ✨":"THE SWEETEST REUNION";
      ui.title.textContent="FINALLY FOUND MY BEBEEE! ❤️";
      const badges=[newBest?"NEW BEST SCORE!":"",newHeartBest?"MOST HEARTS!":"",newTimeBest?"NEW FASTEST TIME!":""].filter(Boolean).join(" ");
      ui.text.textContent=`Worth every jump. Score ${score} · ${hearts} hearts · ${timeText(elapsed)}.${badges?` ${badges} 🎉`:""}`;ui.start.textContent="Replay adventure ↻";
    }
    ui.bestScore.textContent=bestScore;ui.bestHearts.textContent=bestHearts;ui.bestTime.textContent=timeText(bestTime);
  }
  const hideOverlay=()=>ui.overlay.classList.add("is-hidden");
  function reset() {
    score=0;hearts=0;lives=3;elapsed=0;checkpointX=86;camera=0;reunion=0;particles=[];newBest=newHeartBest=newTimeBest=false;
    items.forEach(o=>o.collected=false);checkpoints.forEach(o=>o.active=false);
    Object.assign(player,{x:86,y:GROUND_Y-player.h,vx:0,vy:0,jumps:0,coyote:0,invulnerable:0,anim:0,facing:1});
    input.left=input.right=false;ui.score.textContent="0";ui.hearts.textContent="0";ui.lives.textContent="❤️❤️❤️";ui.time.textContent="00:00";
    ui.progress.style.width="0%";ui.progressText.textContent="0%";
  }
  function start() {
    if(state==="paused"){state="running";hideOverlay();ui.pause.textContent="Ⅱ Pause";last=performance.now();raf=requestAnimationFrame(loop);return;}
    reset();state="running";hideOverlay();ui.pause.textContent="Ⅱ Pause";
    if(audio?.state==="suspended")audio.resume();cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(loop);
  }
  function pause() {
    if(state==="running"){state="paused";input.left=input.right=false;ui.pause.textContent="▶ Resume";overlay("paused");cancelAnimationFrame(raf);}
    else if(state==="paused")start();
  }
  ui.start.addEventListener("click",start);ui.pause.addEventListener("click",pause);
  ui.mute.textContent=muted?"🔇 Sound off":"🔊 Sound on";ui.mute.setAttribute("aria-pressed",String(muted));
  ui.mute.addEventListener("click",()=>{muted=!muted;try{localStorage.setItem(keys.mute,String(muted));}catch(_){}ui.mute.textContent=muted?"🔇 Sound off":"🔊 Sound on";ui.mute.setAttribute("aria-pressed",String(muted));if(!muted)sound("heart");});
  function jump(){if(state!=="running"||player.jumps>=2)return;player.vy=player.jumps?-570:-650;player.jumps++;player.coyote=0;burst(player.x+20,player.y+player.h,"#ecd1ff",5);sound("jump");}
  document.querySelectorAll("[data-sb-control]").forEach(button=>{
    const action=button.dataset.sbControl;
    button.addEventListener("pointerdown",e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);button.classList.add("is-held");if(action==="jump")jump();else input[action]=true;});
    const release=e=>{e.preventDefault();button.classList.remove("is-held");if(action!=="jump")input[action]=false;};
    ["pointerup","pointercancel","lostpointercapture"].forEach(type=>button.addEventListener(type,release));
    button.addEventListener("contextmenu",e=>e.preventDefault());
  });
  const keyCodes=new Set(["ArrowLeft","ArrowRight","ArrowUp","Space","KeyA","KeyD","KeyP"]);
  document.addEventListener("keydown",e=>{
    if(!section.classList.contains("active")||!keyCodes.has(e.code))return;e.preventDefault();
    if(e.code==="KeyP"){pause();return;}if(state!=="running")return;
    if(e.code==="ArrowLeft"||e.code==="KeyA"){input.left=true;player.facing=-1;}
    if(e.code==="ArrowRight"||e.code==="KeyD"){input.right=true;player.facing=1;}
    if((e.code==="Space"||e.code==="ArrowUp")&&!e.repeat)jump();
  });
  document.addEventListener("keyup",e=>{if(e.code==="ArrowLeft"||e.code==="KeyA")input.left=false;if(e.code==="ArrowRight"||e.code==="KeyD")input.right=false;});
  addEventListener("blur",()=>{if(state==="running")pause();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="running")pause();});
  document.addEventListener("click",e=>{const dest=e.target.closest("[data-go]")?.dataset.go;if(dest&&dest!=="saveMyBebe"&&section.classList.contains("active")&&state==="running")pause();},true);

  function burst(x,y,color,count=10){for(let i=0;i<count;i++){const a=Math.random()*6.28,s=35+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.5,size:2+Math.random()*4,color,heart:Math.random()<.25});}}
  const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  function refreshEvent(){document.dispatchEvent(new CustomEvent("arcade:record",{detail:{game:"save-my-bebe",score,hearts,time:elapsed}}));}
  function collect(item){item.collected=true;if(item.kind==="star")score+=300;else{score+=100;hearts++;}
    const oldS=bestScore,oldH=bestHearts;if(score>bestScore){bestScore=score;write(keys.score,bestScore);}if(hearts>bestHearts){bestHearts=hearts;write(keys.hearts,bestHearts);}
    newBest=newBest||score>oldS;newHeartBest=newHeartBest||hearts>oldH;ui.score.textContent=score;ui.hearts.textContent=hearts;records();burst(item.x+15,item.y+15,item.kind==="star"?"#ffdc79":"#ff79ad",15);sound("heart");refreshEvent();
  }
  function hurt(){if(state!=="running"||player.invulnerable>0)return;lives--;ui.lives.textContent="❤️".repeat(Math.max(0,lives))||"♡♡♡";
    player.invulnerable=1.5;player.vy=-330;player.vx=player.facing*-120;ui.hitFlash.classList.remove("active");void ui.hitFlash.offsetWidth;ui.hitFlash.classList.add("active");burst(player.x+20,player.y+35,"#ff719e",12);sound("hurt");
    if(lives<=0){state="over";input.left=input.right=false;overlay("over");cancelAnimationFrame(raf);draw();return;}
    player.x=Math.max(checkpointX,player.x-30);player.y=GROUND_Y-player.h-8;
  }
  function update(dt){
    elapsed+=dt;ui.time.textContent=timeText(elapsed);player.invulnerable=Math.max(0,player.invulnerable-dt);player.anim+=dt;
    const move=(input.right?1:0)-(input.left?1:0);if(move)player.facing=move;
    const speed=260+Math.min(55,Math.floor(player.x/1400)*8);player.vx+=(move*speed-player.vx)*Math.min(1,dt*12);if(!move)player.vx*=Math.max(0,1-dt*9);
    const oldX=player.x;player.x+=player.vx*dt;
    for(const p of platforms){if(player.y+player.h<=p.y+3||player.y>=p.y+p.h)continue;if(player.x<p.x+p.w&&player.x+player.w>p.x){if(player.vx>0&&oldX+player.w<=p.x+1)player.x=p.x-player.w;else if(player.vx<0&&oldX>=p.x+p.w-1)player.x=p.x+p.w;}}
    player.x=Math.max(0,Math.min(LEVEL_END-player.w,player.x));const oldBottom=player.y+player.h;player.vy=Math.min(920,player.vy+1650*dt);player.y+=player.vy*dt;
    let landed=false;for(const p of platforms){if(player.x+player.w<=p.x+4||player.x>=p.x+p.w-4)continue;
      if(player.vy>=0&&oldBottom<=p.y+7&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.jumps=0;player.coyote=.11;landed=true;}
      else if(player.vy<0&&oldBottom>p.y+p.h&&player.y<p.y+p.h){player.y=p.y+p.h;player.vy=80;}}
    if(!landed)player.coyote=Math.max(0,player.coyote-dt);
    ghosts.forEach(g=>g.x=(g.start+g.end)/2+Math.sin(elapsed*g.speed+g.phase)*(g.end-g.start)/2);
    const box={x:player.x+4,y:player.y+5,w:player.w-8,h:player.h-8};
    if(player.invulnerable<=0){
      for(const h of hazards){if(h.kind==="pumpkin"?hit(box,{x:h.x+7,y:h.y+8,w:h.w-12,h:h.h-8}):hit(box,{x:h.x+6,y:h.y+6,w:h.w-12,h:h.h-6})){hurt();break;}}
      if(state==="running")for(const g of ghosts){if(hit(box,{x:g.x-21,y:g.y-25,w:42,h:44})){hurt();break;}}
    }
    if(player.y>H+100){hurt();if(lives>0){player.x=checkpointX;player.y=GROUND_Y-player.h;player.vy=0;}}
    if(state!=="running")return;
    for(const item of items)if(!item.collected&&hit(box,{x:item.x,y:item.y,w:30,h:32}))collect(item);
    for(const c of checkpoints)if(!c.active&&player.x+player.w/2>=c.x){c.active=true;checkpointX=c.x+32;burst(c.x,GROUND_Y-60,"#c0f4ff",20);sound("checkpoint");}
    particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;});
    camera=Math.max(0,Math.min(LEVEL_END-W,player.x-W*.34));
    const progress=Math.min(100,player.x/(LEVEL_END-150)*100);ui.progress.style.width=`${progress}%`;ui.progressText.textContent=`${Math.floor(progress)}%`;
    if(player.x>LEVEL_END-250){state="reunion";reunion=0;player.vx=player.vy=0;sound("win");}
  }
  function loop(now){const dt=Math.min(.033,Math.max(.001,(now-last)/1000));last=now;if(state==="running")update(dt);else if(state==="reunion"){reunion+=dt;if(reunion>2.7)win();}draw();if(state==="running"||state==="reunion")raf=requestAnimationFrame(loop);}
  function win(){state="won";const oldS=bestScore,oldH=bestHearts;newBest=score>oldS;newHeartBest=hearts>oldH;newTimeBest=!bestTime||elapsed<bestTime;
    if(newBest){bestScore=score;write(keys.score,bestScore);}if(newHeartBest){bestHearts=hearts;write(keys.hearts,bestHearts);}if(newTimeBest){bestTime=elapsed;write(keys.time,bestTime);}records();overlay("won");refreshEvent();}
  function draw(){ctx.setTransform(scaleX,0,0,scaleY,0,0);sky();farWorld();ctx.save();ctx.translate(-camera,0);groundDraw();platformDraw();hazardDraw();checkpointDraw();propsDraw();itemDraw();ghostDraw();finishDraw();playerDraw();particleDraw();ctx.restore();fog();}
  function sky(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#241b45");g.addColorStop(.55,"#40305f");g.addColorStop(1,"#74517a");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    stars.forEach(s=>{let x=((s.x-camera*.12)%(W+80)+(W+80))%(W+80)-30;ctx.globalAlpha=.63+Math.sin(elapsed*2+s.phase)*.27;ctx.fillStyle=s.r>2.1?"#fff0b6":"#f7dbff";ctx.beginPath();ctx.arc(x,s.y,s.r,0,6.28);ctx.fill();if(s.r>2.3){ctx.strokeStyle="#fff3c4";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-5,s.y);ctx.lineTo(x+5,s.y);ctx.moveTo(x,s.y-5);ctx.lineTo(x,s.y+5);ctx.stroke();}});ctx.globalAlpha=1;
    ctx.fillStyle="#ffe9ad";ctx.shadowColor="#ffdd91";ctx.shadowBlur=22;ctx.beginPath();ctx.arc(785,115,52,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#31214c";ctx.beginPath();ctx.arc(808,96,50,0,6.28);ctx.fill();}
  function farWorld(){for(let i=-1;i<15;i++){const x=i*235+60-camera*.22;house(x,370+(i%3)*25,.52+(i%2)*.08);if(i%2===0)tree(x+145,418+(i%3)*17,.72);}
    for(let i=-1;i<8;i++){const x=i*510-camera*.08;ctx.fillStyle="#584270";ctx.beginPath();ctx.moveTo(x,H);ctx.quadraticCurveTo(x+165,380,x+330,H);ctx.fill();}
    for(let i=0;i<11;i++)bat(i*710+80-camera*.14+Math.sin(elapsed+i)*10,100+i%4*44,.7+i%3*.12);}
  function house(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#302542";ctx.beginPath();ctx.moveTo(0,62);ctx.lineTo(8,22);ctx.lineTo(40,0);ctx.lineTo(72,22);ctx.lineTo(78,62);ctx.closePath();ctx.fill();ctx.fillStyle="#201a32";ctx.fillRect(11,38,55,52);ctx.fillStyle="#ffdc8c";ctx.fillRect(22,52,10,14);ctx.fillRect(47,52,10,14);ctx.fillStyle="#3a2b4f";ctx.fillRect(34,70,13,20);ctx.restore();}
  function tree(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#231b35";ctx.fillRect(-7,-25,14,65);ctx.strokeStyle="#231b35";ctx.lineWidth=9;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-19,-45);ctx.moveTo(-14,-35);ctx.lineTo(-29,-47);ctx.moveTo(0,-11);ctx.lineTo(18,-48);ctx.moveTo(15,-33);ctx.lineTo(31,-43);ctx.stroke();ctx.restore();}
  function bat(x,y,s){ctx.save();ctx.translate(x,y+Math.sin(elapsed*3+x)*5);ctx.scale(s,s);ctx.fillStyle="#1c1830";ctx.beginPath();ctx.moveTo(-18,0);ctx.quadraticCurveTo(-12,-13,-3,-3);ctx.quadraticCurveTo(0,-12,4,-2);ctx.quadraticCurveTo(14,-14,20,0);ctx.lineTo(12,-5);ctx.lineTo(8,3);ctx.lineTo(2,-2);ctx.lineTo(-3,4);ctx.lineTo(-8,-3);ctx.closePath();ctx.fill();ctx.restore();}
  function groundDraw(){ground.forEach(p=>{ctx.fillStyle="#493b56";ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#6c9e42";ctx.fillRect(p.x,p.y,p.w,12);ctx.fillStyle="#a4ca59";ctx.fillRect(p.x,p.y,p.w,5);ctx.fillStyle="#59445f";for(let x=p.x+18;x<p.x+p.w;x+=58){ctx.beginPath();ctx.moveTo(x,p.y+25);ctx.lineTo(x+29,p.y+25);ctx.lineTo(x+22,p.y+42);ctx.lineTo(x-3,p.y+42);ctx.fill();}});}
  function platformDraw(){floats.forEach((p,i)=>{const img=i%4===2?sprites.smallPlatform:sprites.platform;if(img?.complete&&img.naturalWidth)ctx.drawImage(img,p.x,p.y-3,p.w,65);else{ctx.fillStyle="#8ca849";ctx.fillRect(p.x,p.y,p.w,25);}});}
  function pumpkin(x,y,size){ctx.fillStyle="#f89a48";ctx.beginPath();ctx.ellipse(x,y,size,size*.78,0,0,6.28);ctx.fill();ctx.fillStyle="#d97832";ctx.beginPath();ctx.ellipse(x,y,size*.45,size*.76,0,0,6.28);ctx.fill();ctx.fillStyle="#4e6938";ctx.fillRect(x-3,y-size,6,10);ctx.fillStyle="#311d3e";ctx.beginPath();ctx.moveTo(x-8,y-3);ctx.lineTo(x-3,y+5);ctx.lineTo(x+1,y-3);ctx.moveTo(x+4,y-3);ctx.lineTo(x+9,y+5);ctx.lineTo(x+13,y-3);ctx.fill();}
  function hazardDraw(){hazards.forEach(h=>{if(h.kind==="pumpkin"){const im=h.w>49?sprites.pumpkin:sprites.pumpkinSmall;if(im?.complete&&im.naturalWidth)ctx.drawImage(im,h.x-5,h.y-5,h.w+9,h.h+8);else pumpkin(h.x+h.w/2,h.y+h.h/2,22);}else{const n=Math.max(2,Math.floor(h.w/20));for(let i=0;i<n;i++){const x=h.x+i*h.w/n;ctx.fillStyle="#c7b5d4";ctx.strokeStyle="#57435f";ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+h.w/n/2,h.y);ctx.lineTo(x+h.w/n,h.y+h.h);ctx.closePath();ctx.fill();ctx.stroke();}}});}
  function checkpointDraw(){checkpoints.forEach(c=>{ctx.fillStyle=c.active?"#ffe29b":"#bea5ce";ctx.fillRect(c.x,GROUND_Y-68,5,68);ctx.fillStyle=c.active?"#ff78ab":"#9e76be";ctx.beginPath();ctx.moveTo(c.x+5,GROUND_Y-67);ctx.lineTo(c.x+42,GROUND_Y-54);ctx.lineTo(c.x+5,GROUND_Y-40);ctx.fill();ctx.fillStyle="#fff0b0";ctx.font="18px Fredoka";ctx.fillText(c.active?"♥":"☆",c.x+12,GROUND_Y-49);if(c.active){ctx.globalAlpha=.38+Math.sin(elapsed*4)*.12;ctx.strokeStyle="#b9f4ff";ctx.beginPath();ctx.arc(c.x+7,GROUND_Y-55,28,0,6.28);ctx.stroke();ctx.globalAlpha=1;}});}
  function propsDraw(){
    [720,2300,4480,6090].forEach((x,i)=>{const img=sprites.lantern;if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x,GROUND_Y-(i%2?64:73),38,70);});
    [2440,5795,6720].forEach(x=>{const img=sprites.teddy;if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x,GROUND_Y-68,58,68);});
  }  function itemDraw(){items.forEach(o=>{if(o.collected)return;const y=o.y+Math.sin(elapsed*3+o.bob)*5,size=o.kind==="star"?43:38,img=o.kind==="star"?sprites.star:sprites.heart;ctx.save();ctx.translate(o.x+16,y+16);ctx.rotate(Math.sin(elapsed*2+o.bob)*.12);ctx.shadowColor=o.kind==="star"?"#ffd86d":"#ff70a7";ctx.shadowBlur=17;if(img?.complete&&img.naturalWidth)ctx.drawImage(img,-size/2,-size/2,size,size);else{ctx.fillStyle="#ff78ad";ctx.font="30px sans-serif";ctx.fillText(o.kind==="star"?"⭐":"♥",-14,11);}ctx.restore();});}
  function ghostDraw(){ghosts.forEach((g,i)=>{const x=g.x,y=g.y+Math.sin(elapsed*4+g.phase)*7;ctx.save();ctx.translate(x,y);ctx.fillStyle=i%2?"#e9d9ff":"#f9e9ff";ctx.beginPath();ctx.moveTo(-18,13);ctx.lineTo(-18,-6);ctx.bezierCurveTo(-18,-30,18,-30,18,-6);ctx.lineTo(18,12);ctx.lineTo(10,7);ctx.lineTo(3,14);ctx.lineTo(-5,7);ctx.lineTo(-12,14);ctx.closePath();ctx.fill();ctx.fillStyle="#3a2850";ctx.beginPath();ctx.ellipse(-6,-6,2.5,4,0,0,6.28);ctx.ellipse(6,-6,2.5,4,0,0,6.28);ctx.fill();ctx.fillStyle="#f69abd";ctx.beginPath();ctx.arc(-12,0,3,0,6.28);ctx.arc(12,0,3,0,6.28);ctx.fill();ctx.restore();});}
  function character(image,x,y,w,h,face=1){if(!image?.complete||!image.naturalWidth)return;ctx.save();if(face<0){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(image,0,0,w,h);}else ctx.drawImage(image,x,y,w,h);ctx.restore();}
  function finishDraw(){const portal=sprites.portal;if(portal?.complete&&portal.naturalWidth)ctx.drawImage(portal,6930,GROUND_Y-130,150,130);else{ctx.fillStyle="#a557eb";ctx.beginPath();ctx.ellipse(7000,GROUND_Y-65,48,70,0,0,6.28);ctx.fill();}
    ctx.fillStyle="#fff0b0";ctx.font="600 21px Fredoka";ctx.textAlign="center";ctx.fillText("ALLYZAH'S CASTLE",7000,GROUND_Y-151);ctx.textAlign="left";
    if(state==="reunion"||state==="won"){
      const meet=Math.min(1,reunion/1.45),bx=6950+meet*44,gx=7060-meet*44;
      const frame=Math.floor(reunion*11)%3;if(reunion<1.45){character(sprites.boyRun[frame],bx,GROUND_Y-108,74,108,1);character(sprites.girlRun[frame],gx,GROUND_Y-92,65,92,-1);}else if(sprites.reunionHug?.complete&&sprites.reunionHug.naturalWidth)ctx.drawImage(sprites.reunionHug,6965,GROUND_Y-109,110,89);
      if(reunion>1.25)for(let i=0;i<9;i++){const a=elapsed*2+i*6.28/9;ctx.fillStyle=i%2?"#ff7bad":"#ffe29a";ctx.font="22px sans-serif";ctx.fillText(i%2?"♥":"✦",7004+Math.cos(a)*40,GROUND_Y-82+Math.sin(a)*52);}
    }else character(sprites.girlIdle,7017,GROUND_Y-93,62,93,-1);
  }
  function playerDraw(){if(state==="reunion"||state==="won"||player.invulnerable>0&&Math.floor(elapsed*15)%2===0)return;let img=sprites.boyIdle;if(Math.abs(player.vx)>30&&Math.abs(player.vy)<100)img=sprites.boyRun[Math.floor(player.anim*10)%sprites.boyRun.length];const air=player.jumps>0,tilt=air?(player.vy<0?-.08:.1):player.invulnerable>1.2?Math.sin(elapsed*55)*.12:0;ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h);ctx.rotate(tilt);character(img,-35,-107,70,107,player.facing);ctx.restore();if(player.jumps===2&&player.vy<0){ctx.fillStyle="#ffe69d";ctx.font="21px sans-serif";ctx.fillText("✦",player.x+20,player.y-20);}}
  function particleDraw(){particles.forEach(p=>{ctx.globalAlpha=Math.max(0,Math.min(1,p.life/.7));if(p.heart){ctx.fillStyle=p.color;ctx.font=`${p.size*3}px sans-serif`;ctx.fillText("♥",p.x,p.y);}else{ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,6.28);ctx.fill();}});ctx.globalAlpha=1;}
  function fog(){const g=ctx.createLinearGradient(0,H-23,0,H);g.addColorStop(0,"#ffffff00");g.addColorStop(1,"#e6c4ff17");ctx.fillStyle=g;ctx.fillRect(0,H-23,W,23);}

  ui.progress.style.width="0%";ui.progressText.textContent="0%";ui.mute.setAttribute("aria-pressed",String(muted));ui.mute.textContent=muted?"🔇 Sound off":"🔊 Sound on";overlay("ready");resize();draw();
})();
