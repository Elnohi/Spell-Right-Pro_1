document.addEventListener("DOMContentLoaded", init);
function $(s){return document.querySelector(s);} function _t(el,v){if(el)el.textContent=v;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

const DEFAULTS={bee:"/data/word-lists/spelling-bee.json",oet:"/data/word-lists/oet_word_list.json",school:"/data/word-lists/spelling-bee.json"};
const S={mode:"bee",words:[],i:0,active:false,flags:new Set(),correct:[],incorrect:[],oetMode:"practice"};

async function init(){
  S.mode=document.body.dataset.mode||"bee";
  S.oetMode=$("#oetMode")?.value?.includes("Exam")?"exam":"practice";
  wireButtons(); window.AudioGuards?.primeAudio(); console.log("Freemium ready:",S.mode);
}

function wireButtons(){
  ["start","say","prev","next","flag","end"].forEach(a=>{$(`[data-action=${a}]`)?.addEventListener("click",()=>handleAction(a));});
  $("#answer")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();gradeTyped();}});
  $("#uploadList")?.addEventListener("change",async e=>{
    const f=e.target.files?.[0]; if(!f)return; $("#customWords").value=await f.text();
  });
  $("#oetMode")?.addEventListener("change",e=>S.oetMode=e.target.value.includes("Exam")?"exam":"practice");
  if(!$("[data-home]")){const h=document.createElement("a");h.href="/index.html";h.textContent="Home";h.className="btn";h.style="position:fixed;top:10px;left:10px;";h.dataset.home="";document.body.appendChild(h);}
  if(!$("[data-dark]")){const d=document.createElement("button");d.textContent="🌙";d.className="btn";d.style="position:fixed;top:10px;right:10px;";d.dataset.dark="";d.onclick=()=>document.documentElement.classList.toggle("dark");document.body.appendChild(d);}
}

async function handleAction(a){
  if(a==="start")return start();
  if(a==="say")return say();
  if(a==="prev")return move(-1);
  if(a==="next")return move(1);
  if(a==="flag")return flag();
  if(a==="end")return end();
}

async function start(){
  if(S.active)return;S.active=true;S.correct=[];S.incorrect=[];S.flags.clear();S.i=0;
  S.words=await loadWords(); if(!S.words.length){setFeed("No words.");S.active=false;return;}
  update(); play();
}

async function loadWords(){
  const t=$("#customWords")?.value.trim(); if(t){const arr=t.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);return S.mode==="oet"&&S.oetMode==="exam"?shuffle(arr).slice(0,24):arr;}
  try{const r=await fetch(DEFAULTS[S.mode]);const d=await r.json();let arr=Array.isArray(d.words)?d.words:d;if(S.mode==="oet"&&S.oetMode==="exam")arr=shuffle(arr).slice(0,24);return arr;}catch{return [];}
}

async function play(){
  if(!S.active)return;const w=S.words[S.i];if(!w)return end();
  update();setFeed("🎧 Listen...");
  await AudioGuards.speak(w);
  if(S.mode==="bee"){listen(w);} else $("#answer")?.focus();
}

function normalize(x){return(x||"").toLowerCase().replace(/[^\p{L}]/gu,"");}
async function listen(w){
  const r=AudioGuards.getRecognition(); if(!r){setFeed("No mic.");return;}
  await new Promise(res=>{
    const t=setTimeout(()=>{setFeed("⏱️ No speech");res();},8000);
    AudioGuards.safeStart(r,ev=>{clearTimeout(t);const s=ev.results?.[0]?.[0]?.transcript||"";grade(normalize(s)===normalize(w),w);res();},
      ()=>{clearTimeout(t);setFeed("Mic error");res();});
  });
  setTimeout(()=>move(1),700);
}
function grade(ok,w){if(ok){S.correct.push(w);setFeed("✅ Correct");}else{S.incorrect.push(w);setFeed(`❌ ${w}`);}}
function gradeTyped(){if(!S.active)return;const a=$("#answer");const v=a.value.trim();const w=S.words[S.i];grade(normalize(v)===normalize(w),w);a.value="";setTimeout(()=>move(1),600);}
function move(d){if(!S.active)return;const n=S.i+d;if(n<0||n>=S.words.length)return;S.i=n;play();}
function flag(){if(!S.active)return;const w=S.words[S.i];S.flags.has(w)?S.flags.delete(w):S.flags.add(w);setFeed("🚩 "+w);}
function update(){_t($("#progress"),`Word ${Math.min(S.i+1,S.words.length)} of ${S.words.length}`);}
function setFeed(m){_t($("#feedback"),m);}
function end(){S.active=false;AudioGuards.stopAll();let h=`<b>Done</b><br>✅${S.correct.length} ❌${S.incorrect.length} 🚩${S.flags.size}`;if(S.incorrect.length)h+=`<div><b>Incorrect</b><ul>${S.incorrect.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;if(S.flags.size)h+=`<div><b>Flagged</b><ul>${[...S.flags].map(x=>`<li>${x}</li>`).join("")}</ul></div>`;$("#summary").innerHTML=h;setFeed("");update();}
