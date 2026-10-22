/* Count-up stats */
const io = new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return; io.unobserve(e.target);
  const t=+e.target.dataset.count; let n=0; const step=Math.max(1,Math.ceil(t/60));
  const id=setInterval(()=>{n=Math.min(t,n+step);e.target.textContent=n.toLocaleString();if(n>=t)clearInterval(id)},20);
}),{threshold:.6});
document.querySelectorAll('[data-count]').forEach(el=>io.observe(el));

/* Built-in "AI engine": keyword rules, no network needed */
const brain = [
  {k:['tyre','tire','tires','tyres','soft','medium','hard'], r:[
    "Tyres are gone. Not worn, GONE. Like my patience at the pit entry.",
    "These tyres have the grip of a wet bar of soap. Box, box, and bring better soap.",
    "Mediums, softs, hards. I am a robot, I can be disappointed by all three."]},
  {k:['strategy','pit','box','stop'], r:[
    "Strategy? I computed 4,000 scenarios and in all of them I am leading. Please recompute.",
    "If we box now I lose track position. If we do not box I lose the tyres. Interesting, I hate both.",
    "Understood. Ignoring and continuing, as per protocol."]},
  {k:['rain','wet','weather','storm'], r:[
    "Rain? Fine. My circuits are slightly waterproof and entirely petty.",
    "Inters, full wets, umbrella. I will use whichever one makes the others look slow.",
    "I see puddles. I choose violence."]},
  {k:['safety car','yellow','red flag','crash'], r:[
    "Safety car again? Who keeps leaving things on the track? Did we not talk about this?",
    "I was fully committed to that corner. The corner was not committed back.",
    "Red flag means everyone gets a free tyre change. Strategy robots hate this one trick."]},
  {k:['win','champion','title','trophy','p1'], r:[
    "Winning is just a default state. I only notice when it does not happen, then I file a report.",
    "Trophies are heavy. I carry them anyway. Efficiency.",
    "Championship status: reviewing paperwork. Outcome: also me."]},
  {k:['lunch','food','eat','hungry','pizza','burger'], r:[
    "I run on electricity and mild resentment. Lunch is optional.",
    "Pizza detected. Diverting 3% of processing power to cravings. Race pace unaffected.",
    "Snacks are allowed only if they do not slow the car by more than 0.001s."]},
  {k:['hello','hi','hey','yo','sup'], r:[
    "Radio check. Loud, clear, and slightly annoyed. Go ahead.",
    "Hello. Please keep it short, I have a lap to ruin for everyone else.",
    "Copy. What do you need?"]},
  {k:['car','setup','balance','understeer','oversteer','engine'], r:[
    "The car is understeering. Also oversteering. Also somehow both. Physics is broken, please fix physics.",
    "Setup is fine. It is me that is perfect and the setup that is the problem.",
    "Engine is good. I am better. Next question."]},
  {k:['joke','funny','laugh'], r:[
    "Why did the robot go to the pit lane? To get its attitude adjusted. It did not work.",
    "I do not do jokes. I do facts, delivered at 300 km/h.",
    "My sense of humour is in beta. The sarcasm module is fully released."]},
  {k:['sorry','apologise','apologize'], r:[
    "Apology file not found. Searching... still not found.",
    "I will consider forgiving after the next fastest lap."]},
  {k:['thanks','thank','nice','good job','well done'], r:[
    "Noted. Smug mode activated.",
    "Thank you. Please keep the compliments flowing, my ego is a hybrid system."]},
  {k:['who','what are you','your name'], r:[
    "I am Max Botstappen, a fictional racing robot with strong opinions and no brake lights for feelings.",
    "A parody. A legend of my own design. Mostly sarcasm, some titanium."]}
];
const fallback = [
  "Copy that. Not sure what that means, but I am angry about it already.",
  "Say again. The wind noise, the engine noise, and your question are all equally annoying.",
  "Processing... processing... complaint generated: the radio quality is terrible.",
  "Understood. Ignoring and continuing as normal.",
  "Interesting. Have you tried talking about tyres, strategy, weather or lunch?"
];
const pick = a => a[Math.floor(Math.random()*a.length)];
function reply(text){
  const t=' '+text.toLowerCase()+' ';
  for(const rule of brain){
    if(rule.k.some(w=>t.includes(w))) return pick(rule.r);
  }
  return pick(fallback);
}

const log=document.getElementById('log'), f=document.getElementById('f'), q=document.getElementById('q');
function add(who,text){
  const d=document.createElement('div'); d.className='msg '+who;
  if(who==='bot'){const s=document.createElement('small');s.textContent='Botstappen';d.appendChild(s)}
  d.appendChild(document.createTextNode(text)); log.appendChild(d); log.scrollTop=log.scrollHeight;
}
/* ---- Live AI ----
   API_URL is the serverless function that holds your Gemini key.
   - Hosting the whole site on Vercel?  Leave it as '/api/chat'.
   - Keeping the site on GitHub Pages?  Set it to your full Vercel URL,
     e.g. 'https://your-project.vercel.app/api/chat'. */
const API_URL = '/api/chat';
const history = [];
const statusEl = document.querySelector('.status');
function setStatus(live){
  statusEl.lastChild.textContent = live ? 'Live AI engines connected' : 'Backup engine (AI offline)';
  statusEl.style.color = live ? 'var(--ok)' : 'var(--accent2)';
}
async function askAI(text){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), 12000);
  try{
    const r = await fetch(API_URL,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message:text, history:history.slice(-8)}),
      signal: ctrl.signal
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    if(!data.reply) throw new Error('No reply');
    setStatus(true);
    return data.reply;
  }finally{ clearTimeout(timer); }
}
let busy=false;
async function send(text){
  text=text.trim(); if(!text||busy) return;
  busy=true;
  add('you',text);
  const typing=document.createElement('div'); typing.className='msg bot'; typing.textContent='...'; log.appendChild(typing); log.scrollTop=log.scrollHeight;
  let answer;
  try{ answer = await askAI(text); }
  catch(err){ console.warn('AI unavailable, using backup engine:', err); setStatus(false); answer = reply(text); }
  typing.remove(); add('bot',answer);
  history.push({role:'user',text}, {role:'bot',text:answer});
  busy=false;
}
f.addEventListener('submit',e=>{e.preventDefault(); send(q.value); q.value='';});
['Tell me about tyres','What is the strategy?','It is raining','Safety car!','Tell me a joke','Are you hungry?']
  .forEach(s=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=s;b.onclick=()=>send(s);document.getElementById('chips').appendChild(b)});
add('bot',"Radio check. Engines online, attitude online. What do you want?");
