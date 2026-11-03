const gifts=[["Pumpkin Surprise","🎃","A note from my heart","Hey, my little pumpkin.... 🎃\n\nI know Halloween is usually about costumes, candies, and spooky little adventures. But I wanted to make something a little different for you.\n\nYou once told me how much you miss the little gifts and surprises you used to get as a child. And I thought... why should growing up mean we stop receiving little things that make us happy?\n\nSo here's a tiny Halloween world, made just for you.\n\nI can't hand you a pumpkin basket or knock on your door with candies (not yet, anyway), but I can still find little ways to make you feel special.\n\nI hope this brings back that little girl who got excited over the smallest surprises.\n\nYou deserve to feel that magic, mahal ko. Not just today, but always.\n\nHappy Halloween, my love. ❤️"],["Ghostly Love","👻","A few things I adore","reasons"],["Sweet Treats","🍬","Pick a candy","candy"],["Little Message","🧸","...","If I could visit little you for just a moment, I'd bring you a basket full of candies, a teddy bear, and all the little surprises you loved.\n\nI'd tell that little girl not to rush growing up. That she doesn't have to become someone else to be loved. That she deserves kindness, patience, surprises, and countless reasons to smile.\n\nAnd I'd make her one promise:\nEven when you grow older, you never have to stop being that playful, silly, excited little girl. You can still love cute things. You can still get excited over tiny gifts. You can still have your childish moments. Growing up doesn't mean leaving all the magic behind.\n\nI hope I get to spoil both the little girl you once were and the woman you're becoming. Don't worry, we'll recreate all these things when we are together hehe... mwaaaah"],["Magical Wishes","🪄","Things I want for you","1. I wish you wake up every day feeling loved and appreciated.\n2. I wish you never lose your curiosity or your silly side.\n3. I wish life becomes gentler with you.\n4. I wish you get to experience all the little things you've been dreaming about.\n5. I wish I could be there for your happiest days and your most difficult ones.\n6. I wish that one day, our goodnight kisses won't have to travel through a screen like a portal. HAHAHA.\n7. I wish all your 11:11 prayers come true.\n8. I wish you achieve all the goals you've been working so hard for.\n9. I wish you always find reasons to smile, even on days when everything feels a little too much.\n10. I wish you never have to doubt how special and deserving of love you are."],["Mystery Present","🎁","Saved just for last","final"]];
let opened=new Set(JSON.parse(localStorage.getItem("allyzah-gifts")||"[]")),ctx,musicOn=true;
const $=s=>document.querySelector(s);
function beep() {
}
function render() {
  let e=$("#gifts");
  e.innerHTML="";
  gifts.forEach((g,i)=> {
    let b=document.createElement("button");b.className="gift"+(i===5?" final":"");b.disabled=i===5&&opened.size<5;b.innerHTML='<span class="tag">'+(i===5?(b.disabled?"🔒 LOCKED":"UNLOCKED"):opened.has(i)?"OPENED ✓":"TAP TO OPEN")+'</span><span class="emoji">'+g[1]+'</span><strong>'+g[0]+'</strong><small>'+g[2]+'</small>';b.onclick=()=>openGift(i);e.append(b)
  }
);
  $("#count").textContent=Math.min(5,opened.size)+" / 5 opened";
  $("#unlock").textContent=opened.size>=5?"✨ The Mystery Present is ready! ✨":""
}
function openGift(i) {
  let g=gifts[i];
  if(i<5) {
    opened.add(i);
    localStorage.setItem("allyzah-gifts",JSON.stringify([...opened]));
    render()
  }
beep(740);
  $("#emoji").textContent=g[1];
  $("#title").textContent=g[0];
  let c=$("#content");
  c.classList.toggle("wishes-content", i===4);
  if(g[3]==="reasons")c.innerHTML='<div class="reasons">'+["Your kind heart","The way you make me laugh","Your brave spirit","Your beautiful smile","How safe I feel with you","All the little things that make you you"].map(x=>'<div class="reason">💜 '+x+'</div>').join("")+"</div>";
  else if(g[3]==="candy") {
    const candyMessages=[["🍭","You make my heart go lolli-lolli-pop! Mwah!"],["🍫","You're choco-lot prettier than anyone else."],["🧸","I wanna be your gummy bear, always sticking by your side."],["🧁","You're my little crushie-cake!"],["🍬","Life is candy-sweet, but it's sweeter with you."],["🍓","I like you berry, berry much, cutiepie!"],["🍡","Sugarboo, honeybunch, sweetiepie… you're my favourite treat!"]];
    c.innerHTML='<p>Pick a candy to unwrap a little sweetness.</p>'+candyMessages.map((item,n)=>'<button class="sweet" data-n="'+n+'">'+item[0]+'</button>').join("")+'<p id="sweet"></p>';
    document.querySelectorAll(".sweet").forEach(x=>x.onclick=()=> {
      $("#sweet").textContent=candyMessages[x.dataset.n][1];
      beep(820)
    });
  }
else if(g[3]==="final") {
    c.innerHTML='<div class="letter">Happy Halloween, my little pumpkin!\n\nYou might be growing up, but I hope you never lose that little girl inside you who gets excited about presents, candies, and silly little surprises.\n\nYou deserve to feel that happiness again.\n\nI wish I could be there to hand you these little presents, see your smile, and experience this Halloween together.\n\nUntil that day comes, here’s a tiny magical world I made just for you. I love you so much bebe. Live, laugh and love...\n\nWith all my love,\nYour Shazeee~ ❤️</div><p class="photo">📷 Space for our favorite memories 📷</p>';
    confetti()
  }
else c.innerHTML='<p class="copy">'+g[3]+"</p>";
  $("#modal").classList.add("show")
}
function confetti() {
  let colors=["#ffc47a","#ff8eb1","#c9a7f2","#fff1a2","#a7d2aa"];
  for(let i=0;i<60;i++) {
    let e=document.createElement("i");
    e.style.cssText="position:fixed;z-index:8;left:"+Math.random()*100+"vw;top:-12px;width:8px;height:12px;background:"+colors[i%5]+";transition:top 2s,transform 2s";
    document.body.append(e);
    requestAnimationFrame(()=> {
      e.style.top="105vh";e.style.transform="rotate(700deg)"
    }
);
    setTimeout(()=>e.remove(),2200)
  }
}
function go(id) {
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===id));
  beep()
}
const gateForm=$("#gateForm"),gateAnswer=$("#gateAnswer"),gateMessage=$("#gateMessage");gateForm.addEventListener("submit",e=>{e.preventDefault();const answer=gateAnswer.value.trim().toLowerCase();if(answer==="goon"||answer==="gooning"){gateMessage.textContent="Correct, twin. Your tiny world is waiting. 💜";gateMessage.classList.remove("error");go("welcome");$("#lockPage").hidden=false}else{gateMessage.textContent="Nope, twin. Think of our very specific stress remedy. 😌";gateMessage.classList.add("error");gateAnswer.select()}});$("#enter").onclick=()=>{go("shop");startMusic()};
document.querySelectorAll("[data-go]").forEach(x=>x.onclick=()=>go(x.dataset.go));
$("#lockPage").onclick=()=>{$("#modal").classList.remove("show");$("#gateAnswer").value="";$("#gateMessage").textContent="No hints from the ghosts.";$("#gateMessage").classList.remove("error");$("#lockPage").hidden=true;go("gate")};
$("#close").onclick=()=>$("#modal").classList.remove("show");
$(".shade").onclick=()=>$("#modal").classList.remove("show");
document.addEventListener("keydown",e=> {
  if(e.key==="Escape")$("#modal").classList.remove("show")
}
);
$("#trick").onclick=()=> {
  $("#result").textContent=["Send me your instant selfie rn 📸","You owe me a virtual kiss 😘","Make your silliest spooky face 👻","Sing for me 🎤","Twerk for daddy 😏💃"][Math.random()*5|0];
  beep()
}
;
$("#treat").onclick=()=> {
  $("#result").textContent=["A big hug from me 🍬","Make a wish, pumpkin ✨","A kiss through the moonlight 💋","I’ll sing for you 🎤","I’ll dance for you 💃"][Math.random()*5|0];
  beep()
}
;
const bgMusic=$("#bgMusic");
bgMusic.volume=.32;
async function startMusic() {
  try {
    await bgMusic.play();
    musicOn=true;
    $("#music").textContent="♫ Music on"
  }
catch {
    musicOn=false;
    $("#music").textContent="♫ Tap for music"
  }
}
$("#music").onclick=()=> {
  if(bgMusic.paused)startMusic();
  else {
    bgMusic.pause();
    musicOn=false;
    $("#music").textContent="♫ Music off"
  }
}
;
render();
