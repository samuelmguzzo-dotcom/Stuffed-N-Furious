// Stuffed & Furious: input, audio, game logic, supers, rendering
'use strict';
/* ---------- safe cross-file helpers ---------- */
const hasMusic=()=>typeof Music!=='undefined'&&!!Music;
function MU(fn,arg){if(!hasMusic()||typeof Music[fn]!=='function')return undefined;try{return Music[fn](arg)}catch(e){return undefined}}
const hasCPU=()=>typeof CPU!=='undefined'&&!!CPU;
let cpuLvlLocal=1;
try{const v=parseInt(localStorage.getItem('sf-cpu'),10);if(v>=0&&v<=2)cpuLvlLocal=v}catch(e){}
if(hasCPU())try{CPU.level=cpuLvlLocal}catch(e){}
function cpuLevels(){return(hasCPU()&&Array.isArray(CPU.levels)&&CPU.levels.length)?CPU.levels:['EASY','NORMAL','HARD']}
function cpuLevel(){const n=cpuLevels().length;let v=hasCPU()&&typeof CPU.level==='number'?CPU.level:cpuLvlLocal;return((v|0)%n+n)%n}
function setCpuLevel(v){const n=cpuLevels().length;v=((v%n)+n)%n;cpuLvlLocal=v;if(hasCPU())try{CPU.level=v}catch(e){}try{localStorage.setItem('sf-cpu',String(v))}catch(e){}}
function FX(){if(typeof SUPERFX==='undefined'||!SUPERFX)return null;for(const n of arguments){let v=SUPERFX[n];if(Array.isArray(v))v=v.length?v[Math.floor(frame/6)%v.length]:null;if(v&&v.width)return v}return null}
function mkFx(rows,pal){try{return outline(mk(rows,pal))}catch(e){return null}}
const FB={kernel:mkFx(['.yy.','yYYy','yYyy','.yy.'],{y:'#f5d142',Y:'#fff2a0'}),
 feather:mkFx(['..r.','.ror','.ro.','or..','o...'],{r:'#c8302c',o:'#e87a22'})};
function fxScale(img,target){return Math.max(1,Math.round(target/Math.max(1,img.width)))}

/* ---------- supers: names + descriptions ---------- */
const SUPER_N=['CORN CANNON','FEATHER FURY','ROLLING PIN','HAIL MARY','JACK-O-BLAST','FLAMBE'];
const SUPER_D=['A huge cone blast of corn kernels','A blur of a dash that leaves only feathers','A spinning pin that bounces at the foe','A deep lob that crashes with a shockwave. Jump it!','Charges up, then fires a blazing seed beam','A wall of fire that rolls forward and burns'];
CHARS.forEach((c,i)=>{if(!c.superName)c.superName=SUPER_N[i]||'SUPER';if(!c.superDesc)c.superDesc=SUPER_D[i]||''});
function wrap(s,n){if(Array.isArray(s))s=s.join(' ');const out=[];let l='';for(const w of String(s||'').split(/\s+/)){if(!w)continue;if((l+' '+w).trim().length>n){if(l)out.push(l);l=w}else l=(l+' '+w).trim()}if(l)out.push(l);return out}
const SUPER_WIN=4;

/* ---------- ambient ---------- */
let amb=[],ambK=-1;
function newAmb(k,init){const r=Math.random;if(k===0)return{x:r()*W,y:init?r()*G:-4,vx:0,vy:.25+r()*.35,ph:r()*6,c:['#e46a34','#f2b043','#c4442c'][Math.floor(r()*3)],s:2};
 if(k===1)return{x:150+r()*20,y:G-26-(init?r()*30:0),vx:0,vy:-.2-r()*.2,ph:r()*6,c:'rgba(255,255,255,.55)',s:1,life:60+r()*60};
 return{x:r()*W,y:init?r()*G:-4,vx:0,vy:.5+r()*.6,ph:r()*6,c:['#ff5a7a','#ffd34a','#6ec8ff','#7ee07a','#ffffff','#e87a22'][Math.floor(r()*6)],s:1}}
function setAmb(k){if(k===ambK)return;ambK=k;amb=[];const n=[14,10,40][k];for(let i=0;i<n;i++)amb.push(newAmb(k,true))}
function updAmb(){for(let i=0;i<amb.length;i++){const a=amb[i];a.ph+=.05;a.x+=Math.sin(a.ph)*(ambK===1?.2:.5);a.y+=a.vy;if(a.life!==undefined)a.life--;if(a.y>G||a.life<=0||a.y<0)amb[i]=newAmb(ambK,false)}}
function drawAmb(){for(const a of amb){R(ctx,a.x,a.y,ambK===2&&Math.sin(a.ph*3)>0?1:2,ambK===2?(Math.sin(a.ph*3)>0?2:1):a.s,a.c)}
 if(ambK===1)for(const x of[60,262]){const f=frame%16<8;R(ctx,x-1,G-41+(f?0:1),3,5,'#ffb43a');R(ctx,x,G-40+(f?1:0),1,3,'#fff6c0')}}

/* ---------- audio + rumble ---------- */
let AC=null;
function unlock(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state!=='running')AC.resume()}catch(e){}MU('unlock')}
function sfx(f,d,type,v,slide){if(!AC||AC.state!=='running')return;try{const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v||.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
function getPads(){try{return[...(navigator.getGamepads?navigator.getGamepads():[])].filter(p=>p&&p.connected)}catch(e){return[]}}
function rumble(i,ms,s){if(cpu&&i===1)return;const p=getPads()[i];try{p&&p.vibrationActuator&&p.vibrationActuator.playEffect('dual-rumble',{duration:ms,strongMagnitude:s,weakMagnitude:s*.6})}catch(e){}}
let muteMsg=null,curTrack=null;
function toggleMute(){let m=MU('toggleMute');if(typeof m!=='boolean')m=hasMusic()?!!Music.muted:null;muteMsg={s:m===null?'NO MUSIC':m?'MUSIC OFF':'MUSIC ON',t:60}}
function syncMusic(){const want=state==='title'?'title':state==='fight'?['farm','table','parade'][sel.stage]||'farm':state==='over'?'victory':'select';if(want!==curTrack){curTrack=want;MU('play',want)}}

/* ---------- input ---------- */
const keys=new Set(),GK=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Slash','Period','Comma','Enter']);
addEventListener('keydown',e=>{if(GK.has(e.code))e.preventDefault();keys.add(e.code);unlock();if(e.code==='KeyM'&&!e.repeat)toggleMute()});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
addEventListener('sf-mute',()=>{unlock();toggleMute()});
cv.addEventListener('pointerdown',()=>{unlock();try{cv.focus()}catch(e){}});
const KB=[{left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],throw:['KeyF'],cycle:['KeyG'],block:['KeyH']},
 {left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],throw:['Period','Numpad1'],cycle:['Slash','Numpad2'],block:['Comma','Numpad3']}];
const inp=[{cur:{},prev:{}},{cur:{},prev:{}}],padAny=[false,false];
function poll(){const pads=getPads();for(let i=0;i<2;i++){const k=KB[i],h=a=>a.some(c=>keys.has(c));
 const r={left:h(k.left),right:h(k.right),up:h(k.up),down:h(k.down),throw:h(k.throw),cycle:h(k.cycle),block:h(k.block),start:i===0&&h(['Enter','Escape'])};
 // confirm = throw key / Enter / Space / pad A or X; pad B is throw in fights but only "back" in menus
 r.ok=r.throw||(i===0&&h(['Enter','Space']));r.back=r.cycle;let ja=false;
 const p=pads[i];if(p){const b=n=>!!(p.buttons[n]&&p.buttons[n].pressed),ax=p.axes[0]||0,ay=p.axes[1]||0;
  r.left=r.left||b(14)||ax<-.45;r.right=r.right||b(15)||ax>.45;r.up=r.up||b(12)||ay<-.6;r.down=r.down||b(13)||ay>.6;
  r.throw=r.throw||b(2)||b(1);r.cycle=r.cycle||b(3);r.block=r.block||b(4)||b(5)||b(6)||b(7);r.start=r.start||b(9);r.ok=r.ok||b(0)||b(2);r.back=r.back||b(1);ja=b(0);
  let any=false;for(const bt of p.buttons)if(bt&&bt.pressed){any=true;break}if(any&&!padAny[i])unlock();padAny[i]=any}else padAny[i]=false;
 r.jump=r.up||ja;inp[i].prev=inp[i].cur;inp[i].cur=r}}
const C=(i,k)=>!!inp[i].cur[k],P=(i,k)=>!!inp[i].cur[k]&&!inp[i].prev[k],AP=k=>P(0,k)||P(1,k);
function padStatus(){const pads=getPads();for(let i=0;i<2;i++){const p=pads[i],el=document.getElementById('s'+(i+1)),dt=document.getElementById('d'+(i+1));let t='P'+(i+1)+': ';if(i===1&&cpu&&state!=='title')t+='CPU';else if(p)t+=String(p.id||'').replace(/\(.*?\)/g,'').trim().slice(0,28)||'gamepad';else t+='keyboard';if(el)el.textContent=t;if(dt&&dt.classList)dt.classList.toggle('on',!!p)}}
addEventListener('gamepadconnected',()=>{padStatus();sfx(660,.1);sfx(990,.15)});addEventListener('gamepaddisconnected',padStatus);

/* ---------- text ---------- */
function T(s,x,y,col,al,sz){ctx.font=(sz||8)+'px '+FONT;ctx.textAlign=al||'left';ctx.textBaseline='top';ctx.fillStyle=INK;ctx.fillText(s,x+1,y+1);ctx.fillStyle=col||'#fff';ctx.fillText(s,x,y)}
function wrapT(s,x,y,maxW,col){ctx.font='8px '+FONT;const L=[];let cur='';for(const w of s.split(' ')){const t=cur?cur+' '+w:w;if(cur&&ctx.measureText(t).width>maxW){L.push(cur);cur=w}else cur=t}L.push(cur);L.forEach((l,i)=>T(l,x,y+i*10,col,'center',8))}
function TO(s,x,y,col,al,sz){ctx.font=sz+'px '+FONT;ctx.textAlign=al||'center';ctx.textBaseline='top';ctx.fillStyle=INK;const o=sz>=16?2:1;for(let dx=-o;dx<=o;dx++)for(let dy=-o;dy<=o+1;dy++)ctx.fillText(s,x+dx,y+dy);ctx.fillStyle=col;ctx.fillText(s,x,y)}
function bar(x,y,w,h,f,col){R(ctx,x-1,y-1,w+2,h+2,INK);R(ctx,x,y,w,h,'#3a2a3a');R(ctx,x,y,Math.max(0,Math.min(1,f))*w,h,col)}

/* ---------- game state ---------- */
let state='title',menuI=0,cpu=false,frame=0;
const sel={c:[0,1],ch:[null,null],f:[0,0],picks:[[],[]],stage:0,t:0};
let pl=[],proj=[],parts=[],pops=[],decals=[],spx=[],wins=[0,0],round=1,timer=0,phase='intro',pt=0,rw=-1,freeze=0,shake=0,paused=false,winner=0,ot=0,sflash=null;
const ai={react:null};
const cmb=[{t:0,k:'',lock:false},{t:0,k:'',lock:false}];
const QUIPS=['SPLAT!','SPLOOSH!','BONK!','YUM!','GOBBLE!','WHAP!','SQUISH!','BURP!'];
const humans=()=>cpu?[0]:[0,1];
function enterChars(){state='chars';sel.ch=[null,null];sel.t=0;if(cpu){sel.c[1]=Math.floor(Math.random()*6);sel.ch[1]=sel.c[1]}padStatus()}
function enterFoods(){state='foods';sel.picks=[[],[]];sel.t=0;if(cpu){const a=[0,1,2,3,4,5,6].sort(()=>Math.random()-.5);sel.picks[1]=a.slice(0,3)}}
function startMatch(){wins=[0,0];round=1;setAmb(sel.stage);startRound()}
function mkP(i){const c=CHARS[sel.ch[i]];return{i,c,x:i?240:80,y:G,vx:0,vy:0,face:i?-1:1,hp:c.hp,max:c.hp,shown:c.hp,cd:0,sel:0,slow:0,burn:0,stun:0,flash:0,block:false,stam:100,walk:0,ground:true,jumps:0,throwT:0,meter:0,kb:0,sup:null}}
function startRound(){pl=[mkP(0),mkP(1)];proj=[];parts=[];pops=[];decals=[];spx=[];sflash=null;freeze=0;timer=3600;phase='intro';pt=0;paused=false;state='fight';
 for(const b of cmb){b.t=0;b.lock=false}ai.react=null;if(hasCPU()&&typeof CPU.reset==='function')try{CPU.reset()}catch(e){}
 MU('duck',false);MU('sting','round');sfx(330,.2,'square',.04,330)}

function part(x,y,vx,vy,col,t,g,img){parts.push({x,y,vx,vy,col,t,g:g||0,img})}
function splat(x,y,col,n){for(let k=0;k<n;k++)part(x,y,rnd2(2.2),-Math.random()*2.6,col,25+Math.random()*20,.18)}
function dust(x){for(let k=0;k<6;k++)part(x+rnd2(8),G-1,rnd2(1),-Math.random()*.8,'#c8b090',18)}
function popup(x,y,s,col){pops.push({x,y,s,col,t:50})}
function decal(x,col){decals.push({x,col,w:4+Math.floor(Math.random()*6)});if(decals.length>30)decals.shift()}
function gain(p,n){p.meter=Math.max(0,Math.min(100,(p.meter||0)+n))}

function throwFood(p){const f=FOODS[sel.picks[p.i][p.sel]];if(!f)return;p.cd=Math.round(f.cd*(p.c.cdMul||1));p.maxcd=p.cd;p.throwT=10;const n=f.sp==='spread'?3:1;
 for(let k=0;k<n;k++)proj.push({x:p.x+p.face*16,y:p.y-28,vx:p.face*f.spd+p.vx*.3,vy:f.vy+(n>1?(k-1)*.75:0),f,o:p.i,r:0,dead:false});sfx(520,.08,'triangle',.05,-250)}
function hurt(t,d){t.hp=Math.max(0,t.hp-d);t.flash=8;popup(t.x+rnd2(6),t.y-48,'-'+d,'#ff6a5a');if(t.hp<=0&&phase==='play')ko(1-t.i)}
function blockMulOf(t){return t.c.blockMul!==undefined?t.c.blockMul:.25}
function blockFx(t){popup(t.x,t.y-58,'BLOCK','#9fd8ff');sfx(1100,.06,'square',.04);for(let k=0;k<6;k++)part(t.x+t.face*16,t.y-26,t.face*Math.random()*2,rnd2(1.5),'#ffffff',14)}
function hitP(t,q,mul){const f=q.f,own=pl[q.o],dir=Math.sign(q.vx)||own.face;let d=f.dmg*own.c.pow*(mul||1);const blk=t.block&&t.face===-dir;
 if(blk){d*=blockMulOf(t);t.stam=Math.max(0,t.stam-12*(t.c.stamMul||1));blockFx(t);if(!q.sup)gain(own,5);gain(t,3)}
 else{if(f.sp==='sticky')t.slow=120;else if(f.sp==='knock'){t.vx=dir*5;t.vy=-3;t.ground=false;t.kb=22}else if(f.sp==='stun')t.stun=28;else if(f.sp==='burn')t.burn=150;
  else if(f.sp==='steal'){const h=Math.round(d*.6);own.hp=Math.min(own.max,own.hp+h);popup(own.x,own.y-50,'+'+h,'#7ee07a')}
  t.vx+=dir*1.2;if(Math.random()<.45)popup(t.x,t.y-62,QUIPS[Math.floor(Math.random()*QUIPS.length)],'#ffd34a');sfx(140,.16,'sawtooth',.05,-70);if(!q.sup)gain(own,12);gain(t,6)}
 d=Math.max(1,Math.round(d));hurt(t,d);splat(q.x,q.y,f.col,q.sup?6:14);freeze=Math.max(freeze,blk?2:(q.sup?2:4));shake=Math.max(shake,blk?1:3);rumble(t.i,blk?60:150,blk?.3:.8)}
// generic super damage: o={knock,burn,stun,col}
function superHit(t,own,d,dir,o){if(phase!=='play'||t.hp<=0)return false;o=o||{};const blk=t.block&&t.face===-dir;
 if(blk){d*=Math.min(.4,blockMulOf(t)+.1);t.stam=Math.max(0,t.stam-(o.stam!==undefined?o.stam:20)*(t.c.stamMul||1));blockFx(t);gain(t,3)}
 else{if(o.burn)t.burn=Math.max(t.burn,o.burn);if(o.stun)t.stun=Math.max(t.stun,o.stun);if(o.knock){t.vx=dir*o.knock;t.vy=-3.5;t.ground=false;t.kb=26}else t.vx+=dir*1.5;
  popup(t.x,t.y-62,QUIPS[Math.floor(Math.random()*QUIPS.length)],'#ffd34a');sfx(110,.22,'sawtooth',.06,-60);gain(t,6)}
 d=Math.max(1,Math.round(d));hurt(t,d);splat(t.x,t.y-24,o.col||'#ffd34a',blk?6:16);freeze=Math.max(freeze,blk?2:5);shake=Math.max(shake,blk?2:4);rumble(t.i,blk?80:220,blk?.4:1);return true}
function ko(w){phase='ko';pt=0;rw=w;wins[w]++;shake=7;sfx(440,.6,'square',.06,-380);rumble(1-w,400,1);MU('sting','ko')}

/* ---------- supers ---------- */
const CORNF={n:'CORN',col:'#f5d142',dmg:3.5,spd:5,vy:0,grav:.05,cd:0,sp:'corn',d:['',''],img:null};
function canSuper(p){return phase==='play'&&!sflash&&!p.sup&&p.meter>=100&&p.stun<=0&&p.hp>0}
function superIdx(c){const k=CHARS.indexOf(c);return k<0?0:k}
function triggerSuper(p){if(!canSuper(p))return false;p.meter=0;p.block=false;sflash={t:54,i:p.i};p.sup={k:'wind',t:54};
 MU('sting','super');sfx(220,.35,'square',.06,660);sfx(880,.4,'triangle',.05,-200);rumble(p.i,200,.6);return true}
function launchSuper(p,o){const f=p.face,k=superIdx(p.c);shake=Math.max(shake,3);
 if(k===0){for(let j=0;j<8;j++)proj.push({x:p.x+f*16,y:p.y-28,vx:f*(4.6+Math.random()*1.4),vy:-1.7+j*.33,f:CORNF,o:p.i,r:0,dead:false,sup:true});
  for(let j=0;j<12;j++)part(p.x+f*18,p.y-28,f*(1+Math.random()*3),rnd2(1.5),['#fff6c0','#f5d142','#e87a22'][j%3],16);p.sup={k:'cast',t:18};sfx(160,.3,'sawtooth',.07,-90)}
 else if(k===1){p.sup={k:'dash',t:46,dir:f,hit:false};sfx(600,.3,'square',.05,600)}
 else if(k===2){spx.push({k:'pin',o:p.i,x:p.x+f*18,y:G-7,vx:f*3.3,ph:0,rot:0,dead:false});p.sup={k:'cast',t:16};sfx(300,.2,'triangle',.06,-100)}
 else if(k===3){const x=p.x+f*10,y=p.y-36,T0=56,g=.22;let tx=o.x+o.vx*20;tx=Math.max(20,Math.min(W-20,tx));
  spx.push({k:'ball',o:p.i,x,y,vx:(tx-x)/T0,vy:(G-4-y-.5*g*T0*T0)/T0,g,rot:0,hit:false,dead:false});p.sup={k:'cast',t:20};sfx(400,.5,'triangle',.06,500)}
 else if(k===4){p.sup={k:'charge',t:26};sfx(120,.45,'square',.05,400)}
 else{spx.push({k:'fire',o:p.i,x:p.x+f*22,vx:f*2.3,t:56,h:4,hit:false,dead:false});p.sup={k:'cast',t:18};sfx(90,.5,'sawtooth',.07,120)}}
function supOwner(p,o){const s=p.sup;s.t--;
 if(s.k==='dash'){p.vx=0;p.vy=0;p.x+=s.dir*7;if(frame%2===0)part(p.x-s.dir*10+rnd2(4),p.y-20+rnd2(14),-s.dir*Math.random(),-.2,'#e87a22',40,.03,FX('feather','feathers')||FB.feather);
  if(frame%3===0)part(p.x-s.dir*12,p.y-30+rnd2(16),0,0,'rgba(255,255,255,.6)',8);
  if(!s.hit&&Math.abs(p.x-o.x)<22&&o.y-40<p.y&&o.y>p.y-40){s.hit=true;superHit(o,p,26,s.dir,{knock:5,col:'#e87a22'});for(let j=0;j<14;j++)part(o.x,o.y-24,rnd2(3),-Math.random()*3,'#e87a22',40,.06,FX('feather','feathers')||FB.feather)}
  if(p.x<=14||p.x>=W-14||s.t<=0){p.sup=null;p.vx=s.dir*2;p.x=Math.max(14,Math.min(W-14,p.x))}return}
 p.vx*=.8;
 if(s.k==='charge'){for(let j=0;j<2;j++){const a=Math.random()*6.28,r=18+Math.random()*8;part(p.x+p.face*14+Math.cos(a)*r,p.y-26+Math.sin(a)*r,-Math.cos(a)*1.2,-Math.sin(a)*1.2,j?'#ffe14a':'#e07a1f',12)}
  if(s.t<=0){p.sup={k:'beam',t:36};spx.push({k:'beam',o:p.i,t:36,dead:false});shake=Math.max(shake,3);sfx(200,.6,'sawtooth',.06,300)}}
 else if(s.t<=0)p.sup=null}
function upSpx(){for(const e of spx){if(e.dead)continue;const own=pl[e.o],t=pl[1-e.o];
 if(e.k==='pin'){e.x+=e.vx;e.ph+=.19;const h=Math.abs(Math.sin(e.ph))*14;const py=e.y;e.y=G-7-h;e.rot+=.35;if(py<G-9&&e.y>=G-9)dust(e.x);
  if(Math.abs(e.x-t.x)<14&&e.y+7>t.y-40&&e.y-7<t.y){superHit(t,own,26,Math.sign(e.vx),{knock:4,col:'#c99a5a'});e.dead=true;splat(e.x,e.y,'#e9d4a8',14)}
  if(e.x<-30||e.x>W+30)e.dead=true}
 else if(e.k==='ball'){e.vy+=e.g;e.x+=e.vx;e.y+=e.vy;e.rot+=.3;if(frame%2===0)part(e.x,e.y,0,0,'rgba(255,255,255,.5)',10);
  if(e.vy>0&&!e.hit&&Math.abs(e.x-t.x)<14&&e.y>t.y-40&&e.y<t.y){superHit(t,own,28,Math.sign(e.vx)||own.face,{knock:4,col:'#8a4a22'});e.hit=true;e.dead=true;splat(e.x,e.y,'#8a4a22',16)}
  else if(e.y>=G-4){e.dead=true;spx.push({k:'shock',o:e.o,x:e.x,r:4,t:22,hit:e.hit,dead:false});shake=Math.max(shake,6);for(let j=0;j<18;j++)part(e.x+rnd2(6),G-2,rnd2(3.5),-Math.random()*4,j%2?'#c8b090':'#8a4a22',30,.2);decal(e.x,'#5e3a1e');sfx(70,.5,'sawtooth',.08,-30);rumble(0,200,.5);rumble(1,200,.5)}}
 else if(e.k==='shock'){e.r+=3.2;e.t--;if(!e.hit&&Math.abs(t.x-e.x)<=e.r&&t.y>=G-6){e.hit=true;superHit(t,own,26,Math.sign(t.x-e.x)||1,{knock:3.5,col:'#c8b090'})}
  if(frame%2===0){part(e.x+e.r,G-2,1,-1.5,'#c8b090',14,.15);part(e.x-e.r,G-2,-1,-1.5,'#c8b090',14,.15)}if(e.t<=0)e.dead=true}
 else if(e.k==='beam'){e.t--;const dir=own.face,x0=own.x+dir*14,y=own.y-26;
  if(frame%2===0)part(x0+dir*Math.random()*120,y+rnd2(3),dir*3,rnd2(.3),Math.random()<.5?'#fff6c0':'#ffe14a',10);
  if(e.t%7===3&&(t.x-x0)*dir>-8&&t.y-40<y+3&&t.y>y-3)superHit(t,own,5,dir,{col:'#ffb43a',stam:8});
  if(e.t<=0||!own.sup)e.dead=true}
 else if(e.k==='fire'){e.x+=e.vx;e.t--;e.h=Math.min(38,e.h+3);if(frame%2===0)part(e.x+rnd2(9),G-Math.random()*e.h,rnd2(.3),-1.2,['#ffd34a','#f07a22','#e0402a'][frame%3],18);
  if(!e.hit&&Math.abs(e.x-t.x)<14&&t.y>G-e.h+2){e.hit=true;superHit(t,own,22,Math.sign(e.vx),{burn:120,knock:2.5,col:'#f07a22'})}
  if(e.t<=0||e.x<-20||e.x>W+20){e.dead=true;for(let j=0;j<8;j++)part(e.x+rnd2(8),G-Math.random()*20,rnd2(.5),-1,'rgba(120,110,110,.7)',30)}}}
 spx=spx.filter(e=>!e.dead)}

/* ---------- actions ---------- */
// human: throw+switch pressed within SUPER_WIN frames of each other = super (when meter full).
// While the meter is full, the first of the two presses is held back for up to SUPER_WIN frames so a combo never also throws or switches food.
function humanAct(i,p){const a={left:C(i,'left'),right:C(i,'right'),jumpP:P(i,'jump'),block:C(i,'block'),throw:false,cycleP:false,super:false};
 const b=cmb[i],tp=P(i,'throw'),cp=P(i,'cycle'),th=C(i,'throw');
 if(b.lock){if(!th&&!C(i,'cycle'))b.lock=false;else return a}
 if(!canSuper(p)){if(b.t>0){b.t=0;if(b.k==='c')a.cycleP=true}a.throw=th;a.cycleP=a.cycleP||cp;return a}
 if(b.t>0){if((b.k==='t'&&cp)||(b.k==='c'&&tp)){b.t=0;b.lock=true;a.super=true;return a}
  if(b.k==='t'&&tp){b.t=SUPER_WIN;return a}if(b.k==='c'&&cp){b.t=SUPER_WIN;a.cycleP=true;return a}
  if(--b.t>0)return a;if(b.k==='t')a.throw=true;else{a.cycleP=true;a.throw=th}return a}
 if(tp&&cp){b.lock=true;a.super=true;return a}
 if(tp){b.t=SUPER_WIN;b.k='t';return a}
 if(cp){b.t=SUPER_WIN;b.k='c';a.throw=th;return a}
 a.throw=th;return a}
let cpuErr=false;
function act(i,p,o){if(cpu&&i===1){let a=null;if(hasCPU()&&typeof CPU.act==='function'){try{a=CPU.act(p,o)}catch(e){a=null;if(!cpuErr){cpuErr=true;try{console.warn('CPU.act failed, using fallback AI',e)}catch(_){}}}}
  if(!a||typeof a!=='object')a=aiAct(p,o);return a}
 return humanAct(i,p)}
function aiAct(p,o){const a={},dx=o.x-p.x,dist=Math.abs(dx),want=95+Math.sin(frame/120)*35,lv=cpuLevel();
 if(dist>want+12)a[dx>0?'right':'left']=true;else if(dist<want-12)a[dx>0?'left':'right']=true;
 const th=proj.find(q=>q.o!==p.i&&Math.abs(q.x-p.x)<55&&Math.sign(p.x-q.x)===Math.sign(q.vx));
 if(th){if(ai.react===null)ai.react=Math.random();if(ai.react<.2+lv*.1)a.block=true;else if(ai.react<.5+lv*.1)a.jumpP=p.ground}else ai.react=null;
 if(p.cd<=0&&Math.random()<.03+lv*.02)a.throw=true;if(Math.random()<.006)a.cycleP=true;if((p.x<34||p.x>W-34)&&Math.random()<.03)a.jumpP=true;
 if(p.meter>=100&&dist<170&&Math.random()<.02)a.super=true;return a}

function upP(p,o,a){if(!p.sup)p.face=o.x>p.x?1:-1;if(p.stun>0)p.stun--;if(p.kb>0)p.kb--;const can=phase==='play'&&p.stun<=0&&!p.sup;
 if(phase==='play'&&frame%60===0)gain(p,1);
 p.block=can&&!!a.block&&p.stam>4&&p.ground;if(p.block)p.stam-=.7*(p.c.stamMul||1);else p.stam=Math.min(100,p.stam+.35);
 if(p.sup)supOwner(p,o);else{
  const sp=p.c.spd*(p.slow>0?.5:1);let mv=0;if(can&&!p.block){if(a.left)mv--;if(a.right)mv++}
  p.vx+=(mv*sp-p.vx)*(p.ground?.35:.12);
  if(can&&!p.block&&a.jumpP&&p.jumps<(p.c.jumps||1)){p.vy=-p.c.jump;p.ground=false;p.jumps++;sfx(260,.12,'square',.035,260);if(p.jumps>1)for(let k=0;k<6;k++)part(p.x+rnd2(6),p.y,rnd2(1),1,'#f4efe6',14)}
  if(can&&a.cycleP){p.sel=(p.sel+1)%3;sfx(880,.05,'square',.03)}}
 if(p.cd>0)p.cd--;if(can&&!p.block&&a.throw&&p.cd<=0)throwFood(p);
 if(!(p.sup&&p.sup.k==='dash')){p.vy+=.3;p.x+=p.vx;p.y+=p.vy}
 if(p.y>=G){if(!p.ground&&p.vy>2)dust(p.x);p.y=G;p.vy=0;p.ground=true;p.jumps=0}
 p.x=Math.max(14,Math.min(W-14,p.x));if(Math.abs(p.vx)>.3&&p.ground)p.walk+=.15;
 if(p.slow>0){p.slow--;if(frame%8===0)part(p.x+rnd2(8),p.y-30,0,.3,'#c2334a',30,.05)}
 if(p.burn>0){p.burn--;if(p.burn%30===0)hurt(p,2);if(frame%4===0)part(p.x+rnd2(8),p.y-8,rnd2(.3),-1,['#ffd34a','#f07a22','#e0402a'][frame%3],20)}
 if(p.c.regen&&phase==='play'&&p.hp>0&&p.hp<p.max&&frame%90===0){p.hp=Math.min(p.max,p.hp+1);popup(p.x,p.y-48,'+1','#7ee07a')}
 if(p.flash>0)p.flash--;if(p.throwT>0)p.throwT--;if(p.shown>p.hp)p.shown=Math.max(p.hp,p.shown-.4);else p.shown=p.hp}
function upProj(){for(const q of proj){if(q.dead)continue;q.vy+=q.f.grav;q.x+=q.vx;q.y+=q.vy;q.r+=.25;const t=pl[1-q.o];
 if(Math.abs(q.x-t.x)<14&&q.y>t.y-40&&q.y<t.y+2){hitP(t,q);q.dead=true;continue}
 if(!q.sup)for(const z of proj)if(z!==q&&!z.dead&&!z.sup&&z.o!==q.o&&Math.abs(z.x-q.x)<7&&Math.abs(z.y-q.y)<7){q.dead=z.dead=true;splat(q.x,q.y,q.f.col,10);splat(z.x,z.y,z.f.col,10);popup(q.x,q.y-12,'CLASH!','#fff');sfx(200,.12,'square',.05,-100);break}
 if(q.dead)continue;
 if(q.y>=G-1){q.dead=true;splat(q.x,G-2,q.f.col,q.sup?3:8);if(!q.sup||Math.random()<.3)decal(q.x,q.f.col);sfx(150,.08,'triangle',.04);if(q.f.sp==='splash'){if(Math.abs(t.x-q.x)<30&&t.y>G-10)hitP(t,q,.5);for(let k=0;k<10;k++)part(q.x,G-2,rnd2(3),-Math.random()*3,'#efe6cf',30,.2)}}
 if(q.x<-20||q.x>W+20)q.dead=true}proj=proj.filter(q=>!q.dead)}
function upFx(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.t--;if(p.g&&p.y>G){p.y=G;p.vx*=.5;p.vy=0}}parts=parts.filter(p=>p.t>0);if(parts.length>600)parts.splice(0,parts.length-600);for(const p of pops){p.y-=.4;p.t--}pops=pops.filter(p=>p.t>0)}

/* ---------- steps ---------- */
function stepTitle(){setAmb(0);if(AP('up')||AP('down')){menuI^=1;sfx(700,.05)}
 if(menuI===1&&(AP('left')||AP('right'))){setCpuLevel(cpuLevel()+(AP('left')?-1:1));sfx(880,.05)}
 if(AP('ok')||AP('start')){cpu=menuI===1;sfx(523,.1);sfx(784,.2);enterChars()}}
function stepChars(){for(const i of humans()){if(sel.ch[i]===null){let m=0;if(P(i,'left')){sel.c[i]=(sel.c[i]+5)%6;m=1}if(P(i,'right')){sel.c[i]=(sel.c[i]+1)%6;m=1}if(P(i,'up')||P(i,'down')){sel.c[i]=(sel.c[i]+3)%6;m=1}if(m)sfx(700,.04);
  if(P(i,'ok')){sel.ch[i]=sel.c[i];sfx(660,.08);sfx(990,.12);continue}}
 else if(P(i,'back')){sel.ch[i]=null;sfx(300,.08);continue}
 if(sel.ch[i]===null&&P(i,'back')&&i===0){state='title';return}}
 if(sel.ch[0]!==null&&sel.ch[1]!==null){if(++sel.t>40)enterFoods()}else sel.t=0}
function stepFoods(){for(const i of humans()){const L=sel.picks[i];if(P(i,'left')){sel.f[i]=(sel.f[i]+6)%7;sfx(700,.04)}if(P(i,'right')){sel.f[i]=(sel.f[i]+1)%7;sfx(700,.04)}
 if(P(i,'ok')){const k=sel.f[i],j=L.indexOf(k);if(j>=0){L.splice(j,1);sfx(300,.06)}else if(L.length<3){L.push(k);sfx(660+L.length*110,.08)}}
 else if(P(i,'back')){if(L.length){L.pop();sfx(300,.06)}else if(i===0){state='chars';sel.ch[0]=null;if(!cpu)sel.ch[1]=null;return}}}
 if(sel.picks[0].length===3&&sel.picks[1].length===3){if(++sel.t>40){state='stage';sel.t=0}}else sel.t=0}
function stepStage(){setAmb(sel.stage);if(P(0,'left')){sel.stage=(sel.stage+2)%3;sfx(700,.04)}if(P(0,'right')){sel.stage=(sel.stage+1)%3;sfx(700,.04)}
 if(P(0,'ok')){sfx(523,.1);sfx(784,.25);startMatch()}else if(P(0,'back')){state='foods';sel.picks[0].pop();sel.t=0}}
function stepFight(){if(paused){if(AP('start')){paused=false;MU('duck',false)}else if(P(0,'back')){paused=false;MU('duck',false);state='title'}return}
 if(phase==='play'&&AP('start')){paused=true;MU('duck',true);sfx(400,.1);return}
 if(sflash){sflash.t--;upFx();if(sflash.t<=0){const p=pl[sflash.i];sflash=null;launchSuper(p,pl[1-p.i])}return}
 pt++;if(phase==='intro'){if(pt===60)MU('sting','fight');if(pt>110){phase='play';pt=0}}
 if(phase==='play'){timer--;if(timer<=0){phase='time';pt=0;const a=pl[0].hp/pl[0].max,b=pl[1].hp/pl[1].max;rw=a>b?0:b>a?1:-1;if(rw>=0)wins[rw]++;sfx(300,.5,'square',.05,-200)}}
 if((phase==='ko'||phase==='time')&&pt>160){if(wins[0]>=2||wins[1]>=2){state='over';winner=wins[0]>=2?0:1;ot=0;parts=[];sfx(523,.15);sfx(659,.3);sfx(784,.5)}else{round++;startRound()}return}
 if(phase==='ko'&&pt<60&&pt%2)return;
 // actions are read even during hit-stop so super combos pressed then are not lost
 const a0=act(0,pl[0],pl[1])||{},a1=act(1,pl[1],pl[0])||{};
 if(a0.super)triggerSuper(pl[0]);if(a1.super)triggerSuper(pl[1]);if(sflash)return;
 if(freeze>0){freeze--;return}
 upP(pl[0],pl[1],a0);upP(pl[1],pl[0],a1);upProj();upSpx();upFx();if(shake>0)shake-=.25}
function stepOver(){ot++;if(ot%8===0)for(let k=0;k<4;k++)part(Math.random()*W,-2,rnd2(.5),1+Math.random(),['#ff5a7a','#ffd34a','#6ec8ff','#7ee07a','#e87a22'][k],120);upFx();
 if(ot>40){if(AP('ok')){startMatch()}else if(P(0,'back')){enterChars()}}}

/* ---------- drawing ---------- */
function poseKey(p){if(p.sup||(sflash&&sflash.i===p.i))return'super';if(p.flash>0||p.stun>0||p.kb>0)return'hurt';if(p.block)return'block';if(p.throwT>0)return'throw';return null}
function poseImg(c,k,white){if(!k||!c.pose)return null;if(white)return(c.poseW&&c.poseW[k])||null;return c.pose[k]||null}
function drawP(p){const c=p.c,moving=Math.abs(p.vx)>.3&&p.ground,fr=(!p.ground||(moving&&Math.floor(p.walk)%2))?1:0,wh=p.flash>0&&p.flash%2;
 let img=poseImg(c,poseKey(p),wh);if(!img)img=wh?c.w[fr]:c.f[fr];
 const sw=Math.max(8,22-(G-p.y)/4);R(ctx,p.x-sw/2,G,sw,2,'rgba(0,0,0,.35)');R(ctx,p.x-sw/2+2,G+2,sw-4,1,'rgba(0,0,0,.25)');
 if(p.sup&&(p.sup.k==='charge'||p.sup.k==='beam')&&frame%4<2){R(ctx,p.x+p.face*14-5,p.y-31,10,10,'rgba(255,225,74,.5)')}
 if(p.sup&&p.sup.k==='dash')for(let k=1;k<4;k++){ctx.globalAlpha=.35/k;spr(img,p.x-img.width-p.sup.dir*k*10,p.y-img.height*2,2,p.face<0)}ctx.globalAlpha=1;
 const lean=p.throwT>6?p.face*2:0,sq=p.throwT>6?1:0;spr(img,p.x-img.width+lean,p.y-img.height*2+sq,2,p.face<0);
 if(p.block&&!(c.pose&&c.pose.block)){const bx=p.x+p.face*15;R(ctx,bx-3,p.y-36,6,22,INK);R(ctx,bx-2,p.y-35,4,20,'#e9edf2');R(ctx,bx-2,p.y-35,4,2,'#6aa8d8');R(ctx,bx-2,p.y-17,4,2,'#6aa8d8')}
 if(p.stun>0)for(let k=0;k<3;k++){const a=frame*.15+k*2.1;R(ctx,p.x+Math.cos(a)*11-1,p.y-46+Math.sin(a)*3,3,3,'#ffd34a')}
 const tag=cpu&&p.i===1?'CPU':(p.i+1)+'P';T(tag,p.x,p.y-54,PCOL[p.i],'center',8)}
function drawProj(q){if(q.sup){const img=FX('corn','kernel','kernels')||FB.kernel;if(img){const s=fxScale(img,6);ctx.drawImage(img,Math.round(q.x-img.width*s/2),Math.round(q.y-img.height*s/2),img.width*s,img.height*s)}else{R(ctx,q.x-2,q.y-2,5,5,INK);R(ctx,q.x-1,q.y-1,3,3,'#f5d142')}return}
 ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.rotate(Math.round(q.r/(Math.PI/2))*(Math.PI/2));ctx.drawImage(q.f.img,-5,-5,10,10);ctx.restore()}
function drawRot(img,x,y,rot,target){const s=fxScale(img,target),w=img.width*s,h=img.height*s;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.round(rot/(Math.PI/2))*(Math.PI/2));ctx.drawImage(img,-Math.round(w/2),-Math.round(h/2),w,h);ctx.restore()}
function drawSpx(e){const own=pl[e.o];
 if(e.k==='pin'){const img=FX('pin','rollingPin','rolling_pin','rollingpin');if(img)drawRot(img,e.x,e.y,e.rot,28);else{const v=Math.round(e.rot/(Math.PI/2))%2===0;ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));if(!v)ctx.rotate(Math.PI/2);
   R(ctx,-17,-4,34,8,INK);R(ctx,-11,-3,22,6,'#d9a86a');R(ctx,-11,-3,22,2,'#f0cf9a');R(ctx,-16,-2,5,4,'#8a5a2b');R(ctx,11,-2,5,4,'#8a5a2b');ctx.restore()}}
 else if(e.k==='ball'){const img=FX('football','ball','hailmary');if(img)drawRot(img,e.x,e.y,e.rot,24);else{ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));if(Math.round(e.rot/(Math.PI/2))%2)ctx.rotate(Math.PI/2);
   disc(ctx,0,0,12,7,INK);disc(ctx,0,0,10,5,'#8a4a22');disc(ctx,-2,-2,5,2,'#a8642e');R(ctx,-5,-1,10,1,'#f4efe6');for(const x of[-4,-1,2])R(ctx,x,-2,1,3,'#f4efe6');ctx.restore()}}
 else if(e.k==='shock'){const a=1-e.t/22,h=Math.round(10*(1-a))+2,img=FX('shockwave','shock');
  for(const s of[-1,1]){const x=e.x+s*e.r;if(img){const sc=fxScale(img,14);ctx.drawImage(img,Math.round(x-img.width*sc/2),G-img.height*sc,img.width*sc,img.height*sc)}else{R(ctx,x-4,G-h-1,8,h+1,INK);R(ctx,x-3,G-h,6,h,'#c8b090');R(ctx,x-3,G-h,6,2,'#f4e9d8')}}
  R(ctx,e.x-e.r,G,e.r*2,2,'rgba(90,58,30,.7)')}
 else if(e.k==='beam'){const dir=own.face,x0=Math.round(own.x+dir*14),y=Math.round(own.y-26),len=dir>0?W-x0:x0,bx=dir>0?x0:0,th=frame%4<2?10:8,img=FX('beam','seedBeam','seed');
  R(ctx,bx,y-th/2-1,len,th+2,INK);R(ctx,bx,y-th/2,len,th,'#e07a1f');R(ctx,bx,y-3,len,6,'#ffe14a');R(ctx,bx,y-1,len,2,'#fffbe0');
  if(img){const s=fxScale(img,8);for(let x=(frame*4)%24;x<len;x+=24)ctx.drawImage(img,Math.round(bx+(dir>0?x:len-x)-img.width*s/2),y-Math.round(img.height*s/2),img.width*s,img.height*s)}
  else for(let x=(frame*5)%18;x<len;x+=18)R(ctx,bx+(dir>0?x:len-x),y-1+((x/18)%2?-3:2),3,2,'#fff6c0');
  disc(ctx,x0,y,7,7,'#ffe14a');disc(ctx,x0,y,4,4,'#fffbe0')}
 else if(e.k==='fire'){const img=FX('fire','flame','flambe');
  if(img){const s=fxScale(img,16),w=img.width*s,h=img.height*s,n=Math.max(1,Math.ceil((e.h-h)/(h*.6))+1);for(const ox of[-5,5])for(let k=0;k<n;k++){const j=(k+Math.floor(frame/4)+(ox>0?1:0))%2?1:-1;ctx.drawImage(img,Math.round(e.x+ox-w/2+j),Math.round(G-h-k*h*.6-(ox>0?2:0)),w,h)}}
  else for(let k=-2;k<=2;k++){const x=e.x+k*5,hh=Math.max(2,Math.round(e.h*(1-Math.abs(k)*.18)*(.8+.2*Math.sin(frame*.6+k*1.7))));
   R(ctx,x-3,G-hh-1,7,hh+1,INK);R(ctx,x-2,G-hh,5,hh,'#e0402a');R(ctx,x-2,G-Math.round(hh*.75),5,Math.round(hh*.75),'#f07a22');R(ctx,x-1,G-Math.round(hh*.45),3,Math.round(hh*.45),'#ffd34a')}}}
function drawMeter(p,bx,L){const m=(p.meter||0)/100,full=m>=1;R(ctx,bx-1,19,112,5,INK);R(ctx,bx,20,110,3,'#3a2a3a');
 const col=full?(frame%10<5?'#fff6c0':'#ffd34a'):'#e07a1f',w=Math.floor(110*Math.min(1,m));if(L)R(ctx,bx,20,w,3,col);else R(ctx,bx+110-w,20,w,3,col);
 for(let k=1;k<4;k++)R(ctx,bx+k*27.5,20,1,3,INK);
 if(full&&frame%30<20)T('SUPER!',L?bx+110:bx,26,frame%10<5?'#fff6c0':'#ffd34a',L?'right':'left',8)}
function hud(){for(let i=0;i<2;i++){const p=pl[i],L=i===0,bx=L?6:W-6-110,c=p.c,hf=p.hp/p.max,sf=p.shown/p.max,col=hf>.5?'#7ed957':hf>.25?'#f2c14e':'#e8453c';
  R(ctx,bx-1,5,112,10,INK);R(ctx,bx,6,110,8,'#3a2a3a');
  if(L){R(ctx,bx,6,110*sf,8,'#fff2c8');R(ctx,bx,6,110*hf,8,col);R(ctx,bx,6,110*hf,2,'rgba(255,255,255,.35)')}else{R(ctx,bx+110-110*sf,6,110*sf,8,'#fff2c8');R(ctx,bx+110-110*hf,6,110*hf,8,col);R(ctx,bx+110-110*hf,6,110*hf,2,'rgba(255,255,255,.35)')}
  R(ctx,bx,16,110,2,INK);if(L)R(ctx,bx,16,110*p.stam/100,2,'#6ec8ff');else R(ctx,bx+110-110*p.stam/100,16,110*p.stam/100,2,'#6ec8ff');
  drawMeter(p,bx,L);
  T(c.short,L?6:W-6,26,PCOL[i],L?'left':'right',8);
  for(let k=0;k<3;k++){const f=FOODS[sel.picks[i][k]],x=L?6+k*14:W-6-12-k*14,y=37;if(!f)continue;R(ctx,x-1,y-1,14,14,k===p.sel?PCOL[i]:INK);R(ctx,x,y,12,12,'#2a1830');ctx.drawImage(f.img,x+1,y+1);
   if(k===p.sel&&p.cd>0&&p.maxcd)R(ctx,x,y,12,12*p.cd/p.maxcd,'rgba(0,0,0,.6)')}
  for(let k=0;k<2;k++){const x=L?122-k*8:194+k*8;R(ctx,x-1,6,7,7,INK);R(ctx,x,7,5,5,wins[i]>k?'#e07a1f':'#3a2a3a')}}
 R(ctx,142,2,36,20,INK);R(ctx,143,3,34,18,'#2a1830');const s=Math.ceil(timer/60);T(String(s),160,5,s<=10&&frame%30<15?'#ff6a5a':'#ffd34a','center',16)}
function drawStage(){ctx.drawImage(STAGES[sel.stage].bg,0,0);for(const d of decals){R(ctx,d.x-d.w/2,G,d.w,2,d.col);R(ctx,d.x-d.w/2+1,G-1,d.w-2,1,d.col)}}
function drawParts(){for(const p of parts){if(p.img)ctx.drawImage(p.img,Math.round(p.x-p.img.width/2),Math.round(p.y-p.img.height/2));else R(ctx,p.x,p.y,2,2,p.col)}}
function renderSuperFlash(){const p=pl[sflash.i],c=p.c,e=54-sflash.t;
 R(ctx,0,0,W,H,'rgba(10,4,16,.72)');if(e<4)R(ctx,0,0,W,H,'rgba(255,246,192,.6)');
 const by=30,bw=Math.min(W,e*24);R(ctx,(W-bw)/2,by,bw,44,INK);R(ctx,(W-bw)/2,by+2,bw,40,PCOL[p.i]==='#ffd34a'?'#5a2a10':'#10305a');R(ctx,(W-bw)/2,by+2,bw,2,PCOL[p.i]);R(ctx,(W-bw)/2,by+40,bw,2,PCOL[p.i]);
 drawP(p);
 const st=FX('star');if(st&&e>=4)for(let k=0;k<6;k++){const a=frame*.08+k*1.047,r=58;ctx.drawImage(st,Math.round(160+Math.cos(a)*r*1.9-st.width/2),Math.round(by+22+Math.sin(a)*r*.45-st.height/2))}
 if(e>=6){T((cpu&&p.i===1?'CPU':(p.i+1)+'P')+' SUPER!',160,by+6,PCOL[p.i],'center',8);TO(String(c.superName).slice(0,18),160,by+18,frame%6<3?'#fff6c0':'#ffd34a','center',16)}
 if(e>=14){const ls=wrap(c.superDesc,36).slice(0,2);ls.forEach((l,k)=>T(l,160,by+50+k*10,'#f4e9d8','center',8))}}
function renderFight(){ctx.save();if(shake>0)ctx.translate(Math.round(rnd2(shake)),Math.round(rnd2(shake)));drawStage();drawAmb();for(const p of pl)drawP(p);for(const e of spx)drawSpx(e);for(const q of proj)drawProj(q);
 drawParts();for(const p of pops)if(p.t>8||frame%2)T(p.s,Math.round(p.x),Math.round(p.y),p.col,'center',8);ctx.restore();hud();
 if(sflash)renderSuperFlash();
 if(phase==='intro'){if(pt<60)TO('ROUND '+round,160,66,'#fff','center',16);else TO('FEAST!',160,62,'#ffb347','center',24)}
 if(phase==='ko'){TO('K.O.!',160,56,'#ff5a4a','center',24);if(pt>40)TO('STUFFED!',160,86,'#ffd34a','center',8);if(pt>70)TO(pl[rw].c.short+' TAKES THE ROUND',160,100,PCOL[rw],'center',8)}
 if(phase==='time'){TO('TIME!',160,56,'#ffd34a','center',24);TO(rw<0?'DRAW ROUND':pl[rw].c.short+' TAKES THE ROUND',160,88,rw<0?'#fff':PCOL[rw],'center',8)}
 if(paused){R(ctx,0,0,W,H,'rgba(20,10,20,.7)');TO('PAUSED',160,62,'#ffd34a','center',16);T('START: RESUME',160,92,'#fff','center',8);T('B / G: QUIT TO TITLE',160,106,'#c9b8a6','center',8);T('M: MUSIC ON/OFF',160,120,'#c9b8a6','center',8)}}
function renderTitle(){ctx.drawImage(STAGES[0].bg,0,0);drawAmb();R(ctx,0,0,W,62,'rgba(26,15,20,.35)');
 TO('STUFFED &',160,8,'#ffb347','center',16);TO('FURIOUS',160,26,'#ff5a4a','center',16);T('A THANKSGIVING FOOD BRAWL',160,46,'#fff6e0','center',8);
 for(let k=0;k<6;k++){const x=36+k*50,hop=Math.abs(Math.sin(frame/10+k*1.3))*5;spr(CHARS[k].f[Math.floor(frame/10+k)%2],x-18,G-40-hop,2,k>=3);R(ctx,x-8,G,16,2,'rgba(0,0,0,.35)')}
 const opts=['2 PLAYERS','VS CPU'];opts.forEach((o,i)=>{const y=70+i*16,on=menuI===i;R(ctx,80,y-3,160,14,on?'#e07a1f':'rgba(26,15,20,.7)');R(ctx,80,y-3,160,1,INK);
  const s=i===1?(on?'> VS CPU  < '+cpuLevels()[cpuLevel()]+' >':'  VS CPU  '+cpuLevels()[cpuLevel()]):(on?'> ':'  ')+o;T(s,88,y,on?'#fff':'#c9b8a6','left',8)});
 if(frame%60<40)T('PRESS A / F TO START',160,104,'#ffd34a','center',8);
 const pads=getPads();T('P1: '+(pads[0]?'GAMEPAD':'KEYS')+'   P2: '+(pads[1]?'GAMEPAD':'KEYS'),160,166,'#f4e9d8','center',8)}
function cursorBox(x,y,w,h,i,locked){const o=i*3;if(locked){ctx.fillStyle=i?'rgba(110,200,255,.25)':'rgba(255,211,74,.25)';ctx.fillRect(x,y,w,h)}ctx.strokeStyle=PCOL[i];ctx.lineWidth=2;ctx.strokeRect(x+1+o,y+1+o,w-2-o*2,h-2-o*2)}
function panel(i,y,h){const x0=i?164:4;R(ctx,x0,y,152,h,INK);R(ctx,x0+1,y+1,150,h-2,'#24142a');R(ctx,x0+1,y+1,150,2,PCOL[i]);return x0}
function renderChars(){ctx.drawImage(MENU,0,0);TO('PICK YOUR FIGHTER',160,7,'#ffd34a','center',8);
 for(let k=0;k<6;k++){const x=91+(k%3)*48,y=20+Math.floor(k/3)*47;R(ctx,x,y,44,44,INK);R(ctx,x+1,y+1,42,42,'#3d2440');R(ctx,x+1,y+33,42,10,'#4a2c4e');spr(CHARS[k].f[0],x+4,y+3,2,false)}
 for(let i=0;i<2;i++){const k=sel.ch[i]!==null?sel.ch[i]:sel.c[i],x=91+(k%3)*48,y=20+Math.floor(k/3)*47;cursorBox(x,y,44,44,i,sel.ch[i]!==null);T(cpu&&i===1?'CPU':(i+1)+'P',i?x+42:x+3,y+3,PCOL[i],i?'right':'left',8);if(sel.ch[i]!==null)T('OK!',x+22,y+34,PCOL[i],'center',8)}
 for(let i=0;i<2;i++){const c=CHARS[sel.ch[i]!==null?sel.ch[i]:sel.c[i]],x0=panel(i,114,62);T(c.name,x0+6,118,PCOL[i]);T(c.perk[0],x0+6,128,'#f4e9d8');T(c.perk[1],x0+6,137,'#f4e9d8');
  T('*'+String(c.superName).slice(0,17),x0+6,147,frame%40<30?'#ffb347':'#ffd34a');
  T('HP',x0+6,157,'#c9b8a6');bar(x0+40,158,104,4,c.hp/120,'#7ed957');T('SPD',x0+6,166,'#c9b8a6');bar(x0+40,167,104,4,c.spd/2.3,'#6ec8ff')}
 if(frame%60<40&&(sel.ch[0]===null||sel.ch[1]===null)){T('A/F:',44,48,'#c9b8a6','center',8);T('LOCK IN',44,58,'#c9b8a6','center',8);T('B/G:',276,48,'#c9b8a6','center',8);T('BACK',276,58,'#c9b8a6','center',8)}}
function renderFoods(){ctx.drawImage(MENU,0,0);TO('PACK YOUR PLATE: PICK 3',160,7,'#ffd34a','center',8);
 for(let k=0;k<7;k++){const x=21+k*40,y=20;R(ctx,x,y,38,38,INK);R(ctx,x+1,y+1,36,36,'#3d2440');ctx.drawImage(FOODS[k].img,x+4,y+4,30,30);
  for(let i=0;i<2;i++){const j=sel.picks[i].indexOf(k);if(j>=0){const bx=i?x+28:x+2;R(ctx,bx,y+28,9,9,PCOL[i]);T(String(j+1),bx+1,y+29,INK,'left',8)}}}
 for(let i=0;i<2;i++){if(cpu&&i===1)continue;const x=21+sel.f[i]*40;cursorBox(x,20,38,38,i,false)}
 for(let i=0;i<2;i++){const L=sel.picks[i],x0=panel(i,64,112);if(cpu&&i===1){T('CPU PLATE',x0+6,70,PCOL[1]);L.forEach((k,j)=>{const f=FOODS[k];ctx.drawImage(f.img,x0+6,84+j*24,20,20);T(f.n,x0+32,90+j*24,'#f4e9d8')});T('READY!',x0+6,162,'#7ee07a');continue}
  const f=FOODS[sel.f[i]];T(f.n,x0+6,70,PCOL[i]);
  T('DMG',x0+6,84,'#c9b8a6');bar(x0+40,85,104,5,f.dmg*(f.sp==='spread'?3:1)/18,'#ff6a5a');T('SPD',x0+6,95,'#c9b8a6');bar(x0+40,96,104,5,f.spd/6,'#6ec8ff');T('RLD',x0+6,106,'#c9b8a6');bar(x0+40,107,104,5,1-f.cd/60,'#7ed957');
  T(f.d[0],x0+6,119,'#f4e9d8');T(f.d[1],x0+6,129,'#f4e9d8');
  for(let k=0;k<3;k++){const x=x0+6+k*22;R(ctx,x,142,20,20,INK);R(ctx,x+1,143,18,18,'#3d2440');if(L[k]!==undefined)ctx.drawImage(FOODS[L[k]].img,x+1,143,18,18)}
  T(L.length<3?'PICK '+(3-L.length):(frame%40<28?'READY!':''),x0+76,148,L.length<3?'#c9b8a6':'#7ee07a')}}
function renderStage(){ctx.drawImage(MENU,0,0);TO('CHOOSE THE ARENA',160,12,'#ffd34a','center',8);
 STAGES.forEach((s,k)=>{const x=10+k*102,y=48,on=sel.stage===k;R(ctx,x-2,y-2,100,58,on?PCOL[0]:INK);ctx.drawImage(s.bg,x,y,96,54);wrapT(s.n,x+48,y+62,88,on?'#fff':'#c9b8a6')});
 const big=STAGES[sel.stage];T('< '+big.n+' >',160,30,'#fff','center',8);T('A/F: FIGHT!   B/G: BACK',160,150,'#c9b8a6','center',8);T('BEST OF 3 ROUNDS',160,164,'#ffb347','center',8)}
function renderOver(){drawStage();drawAmb();R(ctx,0,0,W,H,'rgba(26,15,20,.35)');const w=pl[winner],l=pl[1-winner],hop=Math.abs(Math.sin(ot/8))*10;
 const li=poseImg(l.c,'hurt',false)||l.c.f[0];spr(li,210,G-li.height*2,2,true);
 const wh=ot<14&&ot%4<2;let wi=poseImg(w.c,'win',wh);if(!wi)wi=wh?w.c.w[Math.floor(ot/8)%2]:w.c.f[Math.floor(ot/8)%2];spr(wi,160-27,G-wi.height*3-hop,3,false);
 drawParts();
 TO(w.c.name,160,22,PCOL[winner],'center',16);TO('WINS THE FEAST!',160,46,'#fff','center',16);T((cpu&&winner===1?'CPU':'PLAYER '+(winner+1))+'  '+wins[winner]+' - '+wins[1-winner],160,70,'#ffd34a','center',8);
 if(ot>40&&frame%60<45){T('A/F: REMATCH',160,160,'#fff','center',8);T('B/G: NEW FEAST',160,170,'#c9b8a6','center',8)}}
function renderMute(){if(!muteMsg)return;const w=muteMsg.s.length*8+12;R(ctx,W/2-w/2-1,H-31,w+2,14,INK);R(ctx,W/2-w/2,H-30,w,12,'#2a1830');R(ctx,W/2-w/2,H-30,w,1,'#e07a1f');T(muteMsg.s,160,H-28,'#ffd34a','center',8)}

function step(){frame++;poll();if(state!=='fight'||!paused)updAmb();
 if(state==='title')stepTitle();else if(state==='chars')stepChars();else if(state==='foods')stepFoods();else if(state==='stage')stepStage();else if(state==='fight')stepFight();else if(state==='over')stepOver();
 syncMusic();if(muteMsg&&--muteMsg.t<=0)muteMsg=null;
 if(frame%60===0)padStatus()}
function render(){ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;if(state==='title')renderTitle();else if(state==='chars')renderChars();else if(state==='foods')renderFoods();else if(state==='stage')renderStage();else if(state==='fight')renderFight();else renderOver();renderMute()}
let last=performance.now(),acc=0;
function loop(now){acc+=Math.min(100,now-last);last=now;while(acc>=1000/60){step();acc-=1000/60}render();requestAnimationFrame(loop)}
{const fs=document.getElementById('fs');if(fs)fs.addEventListener('click',()=>{unlock();const el=document.querySelector('.screen')||cv;try{const r=el.requestFullscreen?el.requestFullscreen():el.webkitRequestFullscreen&&el.webkitRequestFullscreen();if(r&&r.catch)r.catch(()=>{})}catch(e){}try{cv.focus()}catch(e){}})}
let started=false;const go=()=>{if(started)return;started=true;padStatus();requestAnimationFrame(loop)};
try{document.fonts.load('8px "Press Start 2P"').then(go,go)}catch(e){go()}setTimeout(go,1500);
