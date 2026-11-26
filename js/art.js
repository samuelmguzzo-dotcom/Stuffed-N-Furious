// Stuffed & Furious: constants, sprites, foods, stage art
'use strict';
const W=320,H=180,G=154,FONT='"Press Start 2P",monospace';
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
const PCOL=['#ffd34a','#6ec8ff'],INK='#1a0f14';
const rnd2=a=>(Math.random()*2-1)*a;

/* ---------- pixel sprite helpers ---------- */
function mk(rows,pal,w){w=w||Math.max(...rows.map(r=>r.length));const c=document.createElement('canvas');c.width=w;c.height=rows.length;const x=c.getContext('2d');rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const col=pal[r[i]];if(col){x.fillStyle=col;x.fillRect(i,j,1,1)}}});return c}
function outline(c){const w=c.width,h=c.height,s=c.getContext('2d').getImageData(0,0,w,h).data;const o=document.createElement('canvas');o.width=w+2;o.height=h+2;const x=o.getContext('2d');x.fillStyle=INK;const a=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&s[(j*w+i)*4+3]>0;for(let j=-1;j<=h;j++)for(let i=-1;i<=w;i++)if(!a(i,j)&&(a(i-1,j)||a(i+1,j)||a(i,j-1)||a(i,j+1)))x.fillRect(i+1,j+1,1,1);x.drawImage(c,1,1);return o}
function whiten(c){const d=document.createElement('canvas');d.width=c.width;d.height=c.height;const x=d.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,d.width,d.height);return d}
function spr(img,x,y,s,flip){const w=img.width*s,h=img.height*s;x=Math.round(x);y=Math.round(y);if(flip){ctx.save();ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(img,0,0,w,h);ctx.restore()}else ctx.drawImage(img,x,y,w,h)}

/* ---------- fighters ---------- */
const CHARS=[
{name:'PILGRIM PETE',short:'PETE',hp:100,spd:1.7,jump:5.4,pow:1,perk:['Steady all-round','brawler'],
 pal:{k:'#1a1420',y:'#f2c14e',s:'#f0b48a',e:'#1a1420',b:'#6b3b1f',w:'#f4efe6',n:'#2b2d42',N:'#474b6e'},
 body:["......kkkkk.....","......kkkkk.....","......kyyyk.....","....kkkkkkkkk...","......bssss.....","......bsses.....","......bssss.....",".......sss......",".....wwwwwww....","....nwwwwwwwn...","...nNnnwwnnNnn..","..snNnnnnnnNns..","..snnnnnnnnnns..","....nnnnnnnnn...","....nkkyykkkn...","....nnnnnnnnn..."],
 la:["....nnn...nnn...","...kkkk...kkkk.."],lb:[".....nnn.nnn....","....kkkk.kkkk..."]},
{name:'TOM TURKEY',short:'TOM',hp:85,spd:2.2,jump:5.6,pow:.9,jumps:2,perk:['Light and quick.','Double jump!'],
 pal:{d:'#5a3418',m:'#8a5a2b',M:'#b07c42',r:'#c8302c',o:'#e87a22',y:'#f2c14e',w:'#fff',k:'#111',l:'#f0a020'},
 body:["................","..ror...........",".royor.....ddd..","royoyor...ddddd.","royoyor...ddwkd.","royoyor...ddddll",".royomm....drd..",".roymmmm...ddr..","..mmMMmmmdddd...","..mMMMmmmmddd...","...mMMmmmmmd....","...mmmmmmmmm....","....mmmmmmm.....",".....mmmmm......","......l..l......","......l..l......"],
 la:[".....ll..ll.....","....lll.lll....."],lb:["......l.l.......",".....lllll......"]},
{name:'GRANDMA GERT',short:'GERT',hp:100,spd:1.4,jump:4.9,pow:1,regen:1,perk:['Nibbles leftovers','to slowly heal'],
 pal:{g:'#d8d8e2',G:'#a4a4b4',s:'#f0b48a',k:'#1a1420',r:'#c0505a',c:'#8a4f9e',C:'#b07ac2',w:'#f4efe6'},
 body:["......gggg......",".....gGGGGg.....","....gggggggg....","....gssssssg....","....gkkskkkg....","....gssssssg....",".....ssrrss.....","......ssss......","....cccwwccc....","...cCccwwccCc...","..scCcwwwwcCcs..","..s.ccwwwwcc.s..","....ccwwwwcc....","....cccccccc....","....cCccccCc....","....cccccccc...."],
 la:[".....ss..ss.....","....kkk..kkk...."],lb:["......ss.ss.....",".....kkkkkk....."]},
{name:'UNCLE BUCK',short:'BUCK',hp:110,spd:1.5,jump:5,pow:1.25,perk:['Slow, but throws','25% harder'],
 pal:{b:'#6b3b1f',s:'#f0b48a',e:'#1a1420',r:'#c0505a',j:'#2f7d3a',J:'#4fa65a',w:'#f4efe6',u:'#3a5a8a',k:'#1a1420'},
 body:["................",".....bbbbbb.....","....bbbbbbbb....","....bssssssb....","....bssesses....","....bssssssb....","....bbsrrsbb....",".....bbbbbb.....","...jjjjjjjjjj...","..jjJjjwwjjJjj..","..sjJjjwwjjJjs..","..sjjjjwwjjjjs..","...jjjjjjjjjj...","....uuuuuuuu....","....uuuuuuuu....","....uuu..uuu...."],
 la:["....uuu..uuu....","...kkkk..kkkk..."],lb:[".....uuuuuu.....","....kkkkkkkk...."]},
{name:'PUMPKIN KNIGHT',short:'PUMPKIN',hp:100,spd:1.5,jump:5,pow:1,blockMul:.08,stamMul:.5,perk:['Iron rind: blocks','almost anything'],
 pal:{g:'#4c7a2a',o:'#e07a1f',O:'#f7a64a',D:'#a34d10',y:'#ffe14a',a:'#a9b3bf',A:'#e2e7ec',k:'#1a1420'},
 body:["......gg........",".......g........","...oOoDoOoDo....","..oOoyoDoyoOo...","..oOoyoDoyoOo...","..oOoDoDoDoOo...","..oOyyyyyyyOo...","...oOoDoOoDo....",".....aaaaa......","...aAAaaaAAa....","..aaAAaaaAAaa...","..kaaaaDaaaak...","...aaaaaaaaa....","...aaAaaaAaa....","....aaaaaaa.....","....aa...aa....."],
 la:["....aa...aa.....","...kkk...kkk...."],lb:[".....aa.aa......","....kkk.kkk....."]},
{name:'CHEF BASIL',short:'CHEF',hp:95,spd:1.8,jump:5.3,pow:1,cdMul:.7,perk:['Fast hands: 30%','quicker reload'],
 pal:{w:'#f8f8fc',W:'#c8c8d6',s:'#f0b48a',e:'#1a1420',k:'#1a1420',R:'#d23a2e',p:'#2b2b33'},
 body:[".....wwwwww.....","....wwwwwwww....","....wwWwwWww....",".....wwwwww.....",".....WWWWWW.....",".....ssssss.....",".....ssesse.....",".....skkkks.....","......ssss......","....wwRRRRww....","...wwwwRRwwww...","..swwwWwwWwwws..","..swwwwwwwwwws..","....wwwWwwww....","....pppppppp....","....ppp..ppp...."],
 la:["....ppp..ppp....","...kkkk..kkkk..."],lb:[".....pppppp.....","....kkkkkkkk...."]}];
for(const c of CHARS){c.f=[outline(mk(c.body.concat(c.la),c.pal,16)),outline(mk(c.body.concat(c.lb),c.pal,16))];c.w=c.f.map(whiten)}

/* ---------- extra fighter poses: throw / hurt / block / win / super (16x18, facing right) ---------- */
// shared extra palette (digits/symbols so they never clash with a fighter's own letters)
// 1/2/3 dinner plate, 4 glow, 5/6 corn, 7/8/9 fire, 0/# metal, + sweat, =/~ wood, * sparkle, % open mouth
(()=>{
 const EX={'1':'#f4f6fa','2':'#5f9fd4','3':'#b8c4d0','4':'#fff27a','5':'#f5d142','6':'#d4a51c','7':'#ff8a1e','8':'#e0402a','9':'#fff6c0',
  '0':'#a9b3c4','#':'#4a4a56','+':'#8fd0ff','=':'#8a4a22','~':'#e0b070','*':'#ffffff','%':'#d8343a'};
 const P=[
 {// PILGRIM PETE
  throw:[".......kkkkk....",".......kkkkk....",".......kyyyk....",".....kkkkkkkkk..",".......bssss....",".......bsses....",".......bssss....","........sss.....","......wwwwwww...",".....nwwwwwwwnns","..ssnNnnwwnnNn..","...snNnnnnnnNn..",".....nnnnnnnnn..",".....nnnnnnnnn..",".....nkkyykkkn..",".....nnnnnnnnn..","....nnn....nnn..","...kkkk....kkkk."],
  hurt:["...kkkkk........","...kyyyk....+...",".kkkkkkkkk..+...","....bbbbb.......","....bssss.......","....bsees.......","s...bs%ss..s....",".s...sss...s....",".n.wwwwwww.n....","..nwwwwwwwn.....",".nNnnwwnnNnn....",".nNnnnnnnNnn....","..nnnnnnnnn.....","..nnnnnnnnn.....","..nkkyykkkn.....","..nnnnnnnnn.....","...nnn..nnn.....","..kkkk..kkkk...."],
  block:[".....kkkkk......",".....kkkkk......",".....kyyyk......","...kkkkkkkkk....",".....bssss......",".....bsses......",".....bssss...22.","......sss...2112","....wwwwwww.2112","...nwwwwwwwns112","..nNnnwwnnNns112","..snNnnnnnnn2132","...nnnnnnnnn.22.","...nnnnnnnnn....","...nkkyykkkn....","...nnnnnnnnn....","...nnn...nnn....","..kkkk...kkkk..."],
  win:["......kkkkk.....","......kkkkk.....","......kyyyk.....","..s.kkkkkkkkk.s.","..s...bssss...s.","..n...bsses...n.","..n...bss%s...n.","...n...sss...n..","...nnwwwwwwwnn..","....nwwwwwwwn...","....nNnwwnnNn...","....nNnnnnnNn...","....nnnnnnnnn...","....nnnnnnnnn...","....nkkyykkkn...","....nnnnnnnnn...","....nnn...nnn...","...kkkk...kkkk.."],
  super:[".....kkkkk......",".....kkkkk......",".....kyyyk......","...kkkkkkkkk....",".....bssss......",".....bsses......",".....bssss.....4","......sss.....#5","....wwwwwww..#55","...nwwwws00000#5","..nNn===s######5","..s====nnnnnn#55","....nnnnnnnnn.#5","....nnnnnnnnn...","....nkkyykkkn...","....nnnnnnnnn...","...nnn....nnn...","..kkkk....kkkk.."]},
 {// TOM TURKEY
  throw:["................","..ror...........",".royor.....ddd..","royoyor...ddddd.","royoyor...ddwkd.","royoyor...ddddll",".royomm....drd..",".roymmmm...ddr..","..mmMMmmmddddMMM","..mMmmmmmmddMMM.","...mmmmmmmmd....","...mmmmmmmmm....","....mmmmmmm.....",".....mmmmm......","......l..l......",".....l...l......","....ll....ll....","...lll....lll..."],
  hurt:["...o.........y..",".ror.........+..","royor.....ddd...","oyoyor...ddddd..","oyoyor...ddkkd..","oyoyor...ddddll.","royomm....drdl..","roymmmm...ddr...",".mmMMmmmdddd....",".mMMMmmmmddd....","..mMMmmmmmd.....","..mmmmmmmmm.....","...mmmmmmm......","....mmmmm.......",".....l..l.......",".....l..l.......","....l....l......","...ll.....ll...."],
  block:["................","..ror...........",".royor..ddd.....","royoyorddddd....","royoyorddwkd.22.","royoyorddddl2112",".royomm.drd.2112",".roymmmmddr.2112","..mmMMmmmddMM112","..mMMMmmmmdMM132","...mMMmmmmmd.22.","...mmmmmmmmm....","....mmmmmmm.....",".....mmmmm......","......l..l......","......l..l......",".....ll..ll.....","....lll.lll....."],
  win:[".ror.ror....*...","royoyoyor..ddd..","royoyoyor.ddddd.","royoyoyor.ddwkd.","royoyoyor.ddddll",".royoyor...dr...","..royMM...ddr...","..roMMMm..dd....","..mmMMmmmddd....","..mMMMmmmmdd....","...mMMmmmmmd....","...mmmmmmmmm....","....mmmmmmm.....",".....mmmmm......","......l..l......","......l..l......",".....l....l.....",".....ll...ll...."],
  super:["4ror4ror........","royoyoyor...ddd.","roy4y4yor..dddkd","roy4y4yor..ddwkd","royoyoyor..ddddl",".royoyor....drd.","..royomm...ddr..","...rommmm.ddd...","..mmMMmmmdddd...","..mMMMmmmmddd...","...mMMmmmmmd....","...mmmmmmmmm....","....mmmmmmm.....",".....mmmmm......",".....l....l.....","....l......l....","...ll......ll...","..lll......lll.."]},
 {// GRANDMA GERT
  throw:["......gggg......",".....gGGGGg.....","....gggggggg....","....gssssssg....","....gkkskkkg....","....gssssssg....",".....ssrrss.....","......ssss......","....cccwwccc....","...cCccwwccCccss","..scCcwwwwcCc...",".s..ccwwwwcc....","....ccwwwwcc....","....cccccccc....","....cCccccCc....","....cccccccc....",".....ss...ss....","....kkk...kkk..."],
  hurt:[".....gggg.......","....gGGGGg..kwk.","...gggggggg.....","...gssssssg.....","...gkksskkg.....","...gssssssg.....","s...srkkrs...s..",".s...ssss...s...",".c.cccwwccc.c...","..cCccwwccCc....","..cCcwwwwcCc....","...ccwwwwcc.....","...ccwwwwcc.....","...cccccccc.....","...cCccccCc.....","...cccccccc.....","....ss...ss.....","...kkk...kkk...."],
  block:["......gggg......",".....gGGGGg.....","....gggggggg....","....gssssssg....","....gkkskkkg.22.","....gssssssg2112",".....ssrrss.2112","......ssss..2112","....cccwwcccs112","...cCccwwccCs112","..scCcwwwwcC2132","..s.ccwwwwcc.22.","....ccwwwwcc....","....cccccccc....","....cCccccCc....","....cccccccc....",".....ss..ss.....","....kkk..kkk...."],
  win:["......gggg......",".....gGGGGg.....","....gggggggg....","..s.gssssssg.s..","..s.gkkskkkg.s..","..c.gssssssg.c..","..c..srrrrs..c..","...c..ssss..c...","....cccwwccc....","...cCccwwccCc...","...cCcwwwwcCc...","....ccwwwwcc....","....ccwwwwcc....","....cccccccc....","....cCccccCc....","....cccccccc....",".....ss..ss.....","....kkk..kkk...."],
  super:["......gggg...=..",".....gGGGGg.~~=.","....gggggggg~~=.","....gssssssg~~=.","....g44s444g~~=.","....gssssssg~~=.",".....swwwws..=..","......ssss...=..","....cccwwccc.ss.","...cCccwwccCcc..","..scCcwwwwcCc...","..s.ccwwwwcc....","....ccwwwwcc....","....cccccccc....","....cCccccCc....","....cccccccc....","....ss....ss....","...kkk....kkk..."]},
 {// UNCLE BUCK
  throw:["................",".....bbbbbb.....","....bbbbbbbb....","....bssssssb....","....bssesses....","....bssssssb....","....bbsrrsbb....",".....bbbbbb.....","...jjjjjjjjjj...","..jjJjjwwjjJjjss",".sjjJjjwwjjJj...",".s.jjjjwwjjjj...","...jjjjjjjjjj...","....uuuuuuuu....","....uuuuuuuu....","....uuu..uuu....","...uuu....uuu...","..kkkk....kkkk.."],
  hurt:["...........+....","....bbbbbb......","...bbbbbbbb.....","...bssssssb.....","...bskkskks.....","...bssssssb.....","s..bbrkrsbb..s..",".s..bbbbbb..s...",".jjjjjjjjjjjj...","..jJjjwwjjJj....","..jJjjwwjjJj....","..jjjjwwjjjj....","..jjjjjjjjjj....","...uuuuuuuu.....","...uuuuuuuu.....","...uuu..uuu.....","..uuu....uuu....",".kkkk....kkkk..."],
  block:["................",".....bbbbbb.....","....bbbbbbbb....","....bssssssb.22.","....bssesses2112","....bssssssb2112","....bbsrrsbb2112",".....bbbbbb.2112","...jjjjjjjjjs112","..jjJjjwwjjJs112","..sjJjjwwjjJj132","..sjjjjwwjjjj22.","...jjjjjjjjjj...","....uuuuuuuu....","....uuuuuuuu....","....uuu..uuu....","....uuu..uuu....","...kkkk..kkkk..."],
  win:["..ss........ss..","..ss.bbbbbb.ss..","..j.bbbbbbbb.j..","..j.bssssssb.j..","..j.bssesses.j..","...jbssssssbj...","....bbrrrrbb....",".....bbbbbb.....","...jjjjjjjjjj...","...jJjjwwjjJj...","...jJjjwwjjJj...","...jjjjwwjjjj...","...jjjjjjjjjj...","....uuuuuuuu....","....uuuuuuuu....","....uuu..uuu....","....uuu..uuu....","...kkkk..kkkk..."],
  super:[".==.4...........","=**=.bbbbbb.....",".==.bbbbbbbb....","..s.bssssssb....","..j.bssesses....","..j.bssssssb....","..j.bbsrrsbb....","...j.bbbbbb.....","...jjjjjjjjjjss.","...jJjjwwjjJj...","...jJjjwwjjJj...","...jjjjwwjjjj...","...jjjjjjjjjj...","....uuuuuuuu....","....uuuuuuuu....","....uuu..uuu....","...uuu....uuu...","..kkkk....kkkk.."]},
 {// PUMPKIN KNIGHT
  throw:["......gg........",".......g........","...oOoDoOoDo....","..oOoyoDoyoOo...","..oOoyoDoyoOo...","..oOoDoDoDoOo...","..oOyyyyyyyOo...","...oOoDoOoDo....",".....aaaaa......","...aAAaaaAAaaak.",".kaaAAaaaAAa....","...aaaaDaaaa....","...aaaaaaaaa....","...aaAaaaAaa....","....aaaaaaa.....","....aa...aa.....","...aa.....aa....","..kkk.....kkk..."],
  hurt:[".....gg....+....","......g.........","..oOoDoOoDo.....",".oOoooDoooOo....",".oOkkoDokkOo....",".oOoDoDoDoOo....",".oOooyyyooOo....","..oOoDoOoDo.....",".ka.aaaaa.ak....","..aAAaaaAAa.....",".aaAAaaaAAaa....","..aaaaDaaaa.....","..aaaaaaaaa.....","..aaAaaaAaa.....","...aaaaaaa......","...aa...aa......","..aa.....aa.....",".kkk.....kkk...."],
  block:[".....gg.........","......g.........","..oOoDoOoDo.....",".oOoyoDoyoOo....",".oOoyoDoyoOo.22.",".oOoDoDoDoOo2112",".oOyyyyyyyOo2112","..oOoDoOoDo.2112","....aaaaa..k2112","..aAAaaaAAaak112",".aaAAaaaAAaa2132",".kaaaaDaaaa..22.","..aaaaaaaaa.....","..aaAaaaAaa.....","...aaaaaaa......","...aa...aa......","...aa...aa......","..kkk...kkk....."],
  win:[".k....gg......k.",".a.....g......a.",".a.oOoDoOoDo..a.",".aoOoyoDoyoOo.a.",".aoOoyoDoyoOoa..",".aoOyDoDoDyOoa..",".aoOyyyyyyyOoa..","..aoOoDoOoDoa...","...aaaaaaaaa....","...aAAaaaAAa....","...aAAaaaAAa....","...aaaaDaaaa....","...aaaaaaaaa....","...aaAaaaAaa....","....aaaaaaa.....","....aa...aa.....","....aa...aa.....","...kkk...kkk...."],
  super:[".....gg......4*.","......g......*0.","..oOoDoOoDo..*0.",".oOo4oDo4oOo.*0.",".oOo4oDo4oOo.*0.",".oOoDoDoDoOo.*0.",".oO4999994Oo.*0.","..oOoDoOoDo..*0.","....aaaaa...yyyy","..aAAaaaAAaaakk.",".aaAAaaaAAa..==.",".kaaaaDaaaa.....","..aaaaaaaaa.....","..aaAaaaAaa.....","...aaaaaaa......","...aa...aa......","..aa.....aa.....",".kkk.....kkk...."]},
 {// CHEF BASIL
  throw:[".....wwwwww.....","....wwwwwwww....","....wwWwwWww....",".....wwwwww.....",".....WWWWWW.....",".....ssssss.....",".....ssesse.....",".....skkkks.....","......ssss......","....wwRRRRww....","...wwwwRRwwwwss.",".swwwwWwwWwww...",".s.wwwwwwwwww...","....wwwWwwww....","....pppppppp....","....ppp..ppp....","...ppp....ppp...","..kkkk....kkkk.."],
  hurt:["...wwwwww.......","..wwwwwwww...+..","..wwWwwWww......","...wwwwww.......","....WWWWWW......","....ssssss......","....skkskk......","....skRRks......",".....ssss.......","s..wwRRRRww..s..",".swwwwRRwwwws...","..wwwWwwWwww....","..wwwwwwwwww....","...wwwWwwww.....","...pppppppp.....","...ppp..ppp.....","..ppp...ppp.....",".kkkk...kkkk...."],
  block:[".....wwwwww.....","....wwwwwwww....","....wwWwwWww....",".....wwwwww.....",".....WWWWWW..22.",".....ssssss.2332",".....ssesse.2332",".....skkkks.2332","......ssss..2332","....wwRRRRwws332","...wwwwRRwwws332","..swwwWwwWwww332","..swwwwwwwwww22.","....wwwWwwww....","....pppppppp....","....ppp..ppp....","....ppp..ppp....","...kkkk..kkkk..."],
  win:["..s..wwwwww..s..","..s.wwwwwwww.s..","..W.wwWwwWww.W..","..W..wwwwww..W..","...W.WWWWWW.W...",".....ssssss.....",".....ssesse.....",".....skkkks.....","......sRRs......","....wwRRRRww....","...wwwwRRwwww...","...wwwWwwWwww...","...wwwwwwwwww...","....wwwWwwww....","....pppppppp....","....ppp..ppp....","....ppp..ppp....","...kkkk..kkkk..."],
  super:[".....wwwwww.....","....wwwwwwww....","....wwWwwWww....",".....wwwwww.....",".....WWWWWW...8.",".....ssssss..87.",".....ssesse.8798",".....skkkks87998","......ssss.79997","....wwRRRRs#####","...wwwwRRwww###.","..swwwWwwWwww...","..swwwwwwwwww...","....wwwWwwww....","....pppppppp....","....ppp..ppp....","...ppp....ppp...","..kkkk....kkkk.."]}];
 const SN=[['CORN CANNON',['Blasts a wave of','corn kernels!']],['FEATHER FURY',['Dashes forward in','a feather storm!']],
  ['ROLLING PIN',['Spinning pin that','bounces along!']],['HAIL MARY',['Huge football lob','with a shockwave!']],
  ['JACK-O-BLAST',['Fires a glowing','pumpkin seed beam']],['FLAMBE',['Raises a wall of','fire in front!']]];
 CHARS.forEach((c,i)=>{const pal=Object.assign({},EX,c.pal);c.poseRows=P[i];c.pose={};c.poseW={};
  for(const k of['throw','hurt','block','win','super']){c.pose[k]=outline(mk(P[i][k],pal,16));c.poseW[k]=whiten(c.pose[k])}
  c.superName=SN[i][0];c.superDesc=SN[i][1]});
})();

/* ---------- super effect sprites (outlined, 8-14px canvases) ---------- */
const SUPERFX=(()=>{const o=(rows,pal)=>outline(mk(rows,pal));return{
 corn:o(["..yy..",".ywyY.","yyyyYY","yyyYYY",".yYYY.","..YY.."],{y:'#f5d142',Y:'#d4a51c',w:'#fff6c0'}),
 feather:o(["....rrooy..","..rrooyyyy.","qqqqqqqqqqQ","..rroooyy..","....rroy..."],{r:'#c8302c',o:'#e87a22',y:'#f2c14e',q:'#f4efe6',Q:'#b07c42'}),
 pin:o(["..BBBBBBBB..","hhbBBbbbbbhh","hhbbbbbbbbhh","..dddddddd.."],{h:'#8a5a2b',b:'#d9a86a',B:'#f4d49c',d:'#a8743e'}),
 football:o(["...bbbb...",".bBbwbwbd.","bBbwwwwwbd",".bbbwbwbd.","...dddd..."],{b:'#8a4a22',B:'#c07a40',w:'#f4efe6',d:'#5e3014'}),
 seed:o(["..yyy.",".ycccy","ycccyo",".yyyo."],{c:'#fff6c0',y:'#ffe14a',o:'#f7a64a'}),
 flame:o(["...r....","...rr...","..ror.r.","..rorrr.",".rooyor.",".royyor.","royywyor","roywwyor",".rywwyr.","..rrrr.."],{r:'#e0402a',o:'#ff8a1e',y:'#ffd34a',w:'#fff6c0'}),
 star:o(["...y...","..yyy..","yyywyyy",".ywwwy.","..yyy..",".yy.yy.",".o...o."],{y:'#ffd34a',w:'#fff6c0',o:'#e87a22'})}})();

/* ---------- foods ---------- */
const FOODS=[
{n:'CRANBERRY',col:'#c2334a',dmg:6,spd:5.5,vy:-1,grav:.06,cd:16,sp:'sticky',d:['Sticky! Slows','foe for 2 sec'],pal:{r:'#8e1b2e',R:'#c2334a',w:'#ffd0d8'},
 icon:["........","..rrrr..",".rRRwRr.",".rRRRRr.",".rRRRRr.",".rrRRrr.","..rrrr..","........"]},
{n:'MASH POTATO',col:'#efe6cf',dmg:14,spd:3.4,vy:-3.4,grav:.2,cd:40,sp:'splash',d:['Big lob. Splashes','on the ground'],pal:{c:'#efe6cf',C:'#cfc2a2',y:'#f5d142'},
 icon:["........","...yy...","..cyyc..",".cccccc.","cccCcccc","cCccccCc",".CCCCCC.","........"]},
{n:'PUMPKIN PIE',col:'#d9641e',dmg:11,spd:4.5,vy:-1.8,grav:.1,cd:30,sp:'knock',d:['Knocks foe back','into the air'],pal:{t:'#e0a85a',T:'#a8662b',o:'#d9641e'},
 icon:["........","t.......","tto.....","tooo....","toooo...","tooooo..","TTTTTTT.","........"]},
{n:'DRUMSTICK',col:'#9a5226',dmg:17,spd:3.2,vy:-2.4,grav:.13,cd:55,sp:'stun',d:['Heavy hit that','stuns briefly'],pal:{m:'#9a5226',M:'#c97a3a',w:'#f4efe6'},
 icon:["........","..MMm...",".MMMmm..",".MMmmm..","..mmmm..","....mww.",".....ww.","....w.ww"]},
{n:'HOT GRAVY',col:'#8a5a2b',dmg:5,spd:4,vy:-2.6,grav:.16,cd:34,sp:'burn',d:['Scalding! Burns','over time'],pal:{g:'#6a3e1a',G:'#9a622e',w:'#e0b080'},
 icon:["...w....","..w.w...","...gg...","..gGwg..",".gGGGGg.",".gGGGGg.","..gggg..","........"]},
{n:'CORN COB',col:'#f5d142',dmg:5,spd:5,vy:-1.2,grav:.08,cd:44,sp:'spread',d:['Fires 3 kernels','in a spread'],pal:{y:'#f5d142',Y:'#d4a51c',g:'#5a9a3a'},
 icon:["........","........","gyYyYyY.","ggyYyYyy","gyYyYyY.","........","........","........"]},
{n:'STUFFING',col:'#b07a3b',dmg:8,spd:4,vy:-2,grav:.12,cd:36,sp:'steal',d:['Steals health','back for you'],pal:{b:'#8a5a2b',B:'#b07a3b',g:'#4f8a3a'},
 icon:["........","..bBg...",".BbbBb..","bgBbbgB.","BbbBbbbb",".bBgbBb.","........","........"]}];
for(const f of FOODS)f.img=outline(mk(f.icon,f.pal,8));


/* ---------- stage art ---------- */
let seed=1;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
function cvs(){const c=document.createElement('canvas');c.width=W;c.height=H;return[c,c.getContext('2d')]}
function R(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function disc(g,cx,cy,rx,ry,c){g.fillStyle=c;for(let y=-ry;y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y/ry)**2)));g.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1)}}
function bands(g,cols,y0,y1){const bh=(y1-y0)/cols.length;cols.forEach((c,i)=>{const y=Math.round(y0+i*bh);R(g,0,y,W,Math.ceil(bh)+1,c);if(i){for(let x=0;x<W;x+=2){R(g,x,y-1,1,1,c);R(g,x+1,y,1,1,cols[i-1])}}})}
// checkerboard dither over a rect (global parity so neighbouring patches line up)
function artDith(g,x,y,w,h,c){x=Math.round(x);y=Math.round(y);g.fillStyle=c;for(let j=0;j<h;j++)for(let i=(x+y+j)&1;i<w;i+=2)g.fillRect(x+i,y+j,1,1)}
// dithered lower part of an ellipse (shading for round props), rows from cy+from down
function artDiscD(g,cx,cy,rx,ry,c,from){g.fillStyle=c;for(let y=Math.ceil(from);y<=ry;y++){const w=Math.round(rx*Math.sqrt(Math.max(0,1-(y/ry)**2)));for(let x=-w;x<=w;x++)if(((cx+x+cy+y)&1)===0||y>ry*.7)g.fillRect(cx+x,cy+y,1,1)}}

function farm(){const[c,g]=cvs();seed=11;
 bands(g,['#2a1b3d','#45244f','#6e2c58','#a23c52','#d45f3f','#ef9142','#f6b955'],0,120);
 for(let i=0;i<30;i++)R(g,sr()*W,sr()*30,1,1,'#f4e9d8');
 for(const[x,y]of[[128,27],[188,31],[300,36]]){R(g,x,y-1,1,3,'#fff6e0');R(g,x-1,y,3,1,'#fff6e0')}
 // sun glow halo (dithered rings), then the striped retro sun
 for(let y=-32;y<=26;y++)for(let x=-32;x<=32;x++){const d=Math.hypot(x,y);if(d<=24.5||d>=32)continue;if(d<28.5){if(((x+y)&1)===0)R(g,236+x,92+y,1,1,'#ffd27a')}else if(!(x&1)&&!(y&1))R(g,236+x,92+y,1,1,'#f9b860')}
 for(let y=-24;y<=24;y++){if(y>4&&y%5<2)continue;const w=Math.round(24*Math.sqrt(1-(y/24)**2));R(g,236-w,92+y,w*2,1,y<-12?'#fff2c0':y<0?'#ffe39a':'#ffc864')}
 // wispy sunset clouds
 const streak=(x,y,w,a,b)=>{R(g,x,y,w,2,a);R(g,x+4,y-1,w-10,1,b);artDith(g,x-5,y,5,2,a);artDith(g,x+w,y,5,2,a);R(g,x+6,y+2,w-14,1,a)};
 streak(108,46,44,'#8e3a66','#a84e70');streak(14,60,58,'#c8566a','#de7a78');streak(272,58,38,'#c8566a','#de7a78');streak(70,80,40,'#e9845a','#f6a873');
 // geese heading south
 for(const[x,y]of[[150,64],[158,60],[166,66],[174,70]]){R(g,x-2,y-1,2,1,'#3a1b3d');R(g,x,y,1,1,'#3a1b3d');R(g,x+1,y-1,2,1,'#3a1b3d')}
 // far hills with ridge light and tiny tree line
 const h1=x=>Math.round(100+Math.sin(x*.03)*6+Math.sin(x*.011+2)*8),h2=x=>Math.round(118+Math.sin(x*.05+1)*5+Math.sin(x*.017)*6);
 for(let x=0;x<W;x++){const h=h1(x);R(g,x,h,1,G-h,'#6a2f4a');R(g,x,h,1,1,'#9a4f66');if(x&1)R(g,x,h+1,1,1,'#86405c');artDith(g,x,h+6,1,3,'#7a3854')}
 for(const x of[24,31,38,140,148,156,166,262,270]){const h=h1(x);disc(g,x,h-3,2,4,'#552442');R(g,x,h,1,2,'#3e1a30')}
 for(let x=0;x<W;x++){const h=h2(x);R(g,x,h,1,G-h,'#4a2238');R(g,x,h,1,1,'#683050');for(let y=h+5;y<G-4;y+=5)if(((x>>1)+(y/5|0))&1)R(g,x,y,1,1,'#55283f')}
 // trees with shading + highlights
 const tree=(x,y,r,a,b,s)=>{R(g,x-1,y,3,14,'#3a1e1a');R(g,x-1,y,1,14,'#5a3226');R(g,x-3,y+13,7,1,'#2e1814');disc(g,x,y-2,r,r,a);artDiscD(g,x,y-2,r,r,s,r*.3);disc(g,x-2,y-4,r-3,r-3,b);R(g,x-r+3,y-r+1,2,1,'#ffd08a');R(g,x-2,y-r-1,1,1,'#ffd08a');R(g,x+r-3,y,1,1,b);R(g,x-r+1,y+2,1,1,b)};
 tree(96,118,10,'#c4442c','#e46a34','#8e2a22');tree(120,124,8,'#e08a2a','#f2b043','#a85a1e');tree(302,116,11,'#b8392a','#de5a30','#842620');tree(280,126,7,'#d9a030','#f2c14e','#9a6a1e');
 // scarecrow (behind the fence) with a crow
 const sx=196;R(g,sx-1,G-44,2,44,'#5a3a22');R(g,sx-12,G-34,24,2,'#5a3a22');
 R(g,sx-11,G-36,7,5,'#3a6a9a');R(g,sx+4,G-36,7,5,'#3a6a9a');R(g,sx-6,G-36,12,14,'#3a6a9a');artDith(g,sx-6,G-33,12,1,'#c8302c');artDith(g,sx-6,G-28,12,1,'#c8302c');R(g,sx-1,G-36,1,14,'#c8302c');
 R(g,sx-14,G-35,3,3,'#e0c060');R(g,sx+11,G-35,3,3,'#e0c060');for(let i=0;i<4;i++)R(g,sx-6+i*3,G-22,2,3,'#e0c060');
 disc(g,sx,G-42,4,4,'#d8c090');R(g,sx-2,G-43,1,1,'#2a1420');R(g,sx+1,G-43,1,1,'#2a1420');R(g,sx-2,G-40,5,1,'#8a5a2b');
 R(g,sx-7,G-47,15,2,'#8a6a32');R(g,sx-4,G-52,9,5,'#8a6a32');R(g,sx-4,G-48,9,1,'#c8302c');R(g,sx-3,G-52,3,1,'#a8884a');
 R(g,sx+12,G-38,4,3,'#1a1420');R(g,sx+15,G-40,2,2,'#1a1420');R(g,sx+17,G-39,1,1,'#e8a020');R(g,sx+13,G-35,1,1,'#e8a020');
 // barn
 const bx=14,by=G-52;
 R(g,bx+27,by-14,1,14,'#2a1420');R(g,bx+22,by-10,11,1,'#2a1420');R(g,bx+31,by-11,2,3,'#2a1420');R(g,bx+21,by-11,2,3,'#2a1420');R(g,bx+25,by-18,4,3,'#2a1420');R(g,bx+28,by-19,2,1,'#c8302c');R(g,bx+24,by-17,1,2,'#2a1420');
 for(let r=0;r<16;r++){R(g,bx+28-r*2-2,by+r,r*4+4,1,r%4?'#5a1c1a':'#4a1716');if(r%4===1)artDith(g,bx+28-r*2,by+r,r*4,1,'#6a2622')}
 for(let r=1;r<16;r++){R(g,bx+26-r*2,by+r,2,1,'#f4e9d8');R(g,bx+28+r*2,by+r,2,1,'#d8ccbc')}R(g,bx+26,by,4,1,'#f4e9d8');
 R(g,bx-2,by+16,60,36,'#9e2b25');R(g,bx+42,by+16,16,36,'#7e1f1c');
 for(let y=by+19;y<G;y+=4){R(g,bx-2,y,44,1,'#8a2420');artDith(g,bx-2,y+1,44,1,'#ae3a30')}
 for(let x=bx+46;x<bx+58;x+=4)R(g,x,by+16,1,36,'#6a1a18');artDith(g,bx+42,by+16,16,3,'#5a1614');
 R(g,bx-2,by+16,2,36,'#f4e9d8');R(g,bx+40,by+16,2,36,'#f4e9d8');R(g,bx-2,by+16,44,2,'#f4e9d8');
 R(g,bx+24,by+18,8,7,'#f4e9d8');R(g,bx+25,by+19,6,5,'#3a1e1a');R(g,bx+25,by+22,6,2,'#d9b04a');R(g,bx+26,by+21,1,1,'#f0cf6a');R(g,bx+29,by+21,1,1,'#f0cf6a');
 R(g,bx+12,by+28,22,24,'#f4e9d8');R(g,bx+14,by+30,18,22,'#9e2b25');R(g,bx+22,by+30,1,22,'#7e1f1c');
 for(let k=0;k<18;k++){R(g,bx+14+k,by+30+k*22/18,1,2,'#f4e9d8');R(g,bx+31-k,by+30+k*22/18,1,2,'#f4e9d8')}
 R(g,bx+37,by+27,3,4,'#3a1e1a');R(g,bx+37,by+28,3,2,'#ffd34a');artDith(g,bx+35,by+25,7,8,'#c8503a');
 for(let x=bx-2;x<bx+58;x+=5){R(g,x,G-3,4,3,'#6a5a5a');R(g,x,G-3,4,1,'#8a7a78')}
 // corn stalks between barn and fence
 for(const x of[75,79,83]){R(g,x,G-30,1,30,'#8a8a3a');for(let y=G-26;y<G-4;y+=6){R(g,x+1,y,2,1,'#a8a048');R(g,x+3,y-1,1,1,'#a8a048');R(g,x-2,y+3,2,1,'#9a9440')}R(g,x-1,G-33,3,3,'#d9b04a');R(g,x+1,G-18,2,4,'#f2c14e');R(g,x+1,G-18,1,4,'#d4a51c')}
 // fence with caps and shadows
 for(let x=88;x<W;x+=14){R(g,x,G-16,3,16,'#8a6040');R(g,x,G-17,3,1,'#c8946a');R(g,x+2,G-16,1,16,'#6a4630')}
 R(g,88,G-12,W-88,2,'#a87a52');R(g,88,G-12,W-88,1,'#c8946a');R(g,88,G-10,W-88,1,'#6a4630');
 R(g,88,G-6,W-88,2,'#a87a52');R(g,88,G-6,W-88,1,'#c8946a');R(g,88,G-4,W-88,1,'#6a4630');
 // soil with furrows, pebbles and grass edge
 R(g,0,G,W,H-G,'#7a4a26');
 for(const y of[G+9,G+16,G+23]){R(g,0,y,W,1,'#5e3a1e');artDith(g,0,y-1,W,1,'#93602f')}
 for(let i=0;i<220;i++)R(g,sr()*W,G+4+sr()*(H-G-4),2,1,sr()<.5?'#5e3a1e':'#93602f');
 for(let i=0;i<14;i++){const x=sr()*W,y=G+5+sr()*18;R(g,x,y,2,1,'#b89a78');R(g,x,y+1,2,1,'#4e2e18')}
 R(g,0,G,W,3,'#7d9a2e');artDith(g,0,G,W,1,'#a8c84a');R(g,0,G+3,W,1,'#5a6a22');
 for(let x=0;x<W;x+=3)if(sr()<.5){R(g,x,G-2,1,2,'#9ab83a');if(sr()<.4)R(g,x+1,G-3,1,3,'#b8d050')}
 const hay=(x,y)=>{R(g,x,y,22,12,'#d9b04a');R(g,x,y,22,2,'#f0cf6a');artDith(g,x,y+3,22,1,'#f0cf6a');artDith(g,x,y+8,22,2,'#b8902e');R(g,x+7,y,2,12,'#a8822e');R(g,x+15,y,2,12,'#a8822e');R(g,x+21,y+1,1,11,'#a8822e');for(let i=0;i<4;i++)R(g,x+2+i*5,y-1,1,1,'#f0cf6a')};
 hay(268,G-12);hay(292,G-12);hay(280,G-24);
 const pk=(x,s)=>{disc(g,x,G-s,s+3,s,'#e07a1f');artDiscD(g,x,G-s,s+3,s,'#b85a12',s*.35);R(g,x-1,G-2*s,2,2*s,'#c05a10');R(g,x-s-1,G-s-1,1,s,'#c05a10');R(g,x+s+1,G-s-1,1,s,'#c05a10');R(g,x-s,G-2*s+1,2,1,'#f7a64a');R(g,x,G-2*s-3,2,3,'#4c7a2a');R(g,x+2,G-2*s-2,2,1,'#6a9a3a')};
 pk(104,5);pk(117,3);pk(226,4);
 return c}

function table(){const[c,g]=cvs();seed=5;
 // wallpaper: striped with damask motifs
 R(g,0,0,W,G,'#6e3b2e');for(let x=0;x<W;x+=10){R(g,x,0,3,104,'#7a4535');R(g,x,0,1,104,'#86503e')}
 for(let y=14;y<100;y+=12)for(let x=6;x<W;x+=20){const ox=x+((y/12|0)%2?10:0);R(g,ox,y-2,1,1,'#8e5a40');R(g,ox-1,y-1,3,1,'#8e5a40');R(g,ox-2,y,5,1,'#8e5a40');R(g,ox-1,y+1,3,1,'#8e5a40');R(g,ox,y+2,1,1,'#8e5a40');R(g,ox,y,1,1,'#b0704a')}
 R(g,0,0,W,6,'#4a2418');for(let x=1;x<W;x+=6)R(g,x,2,3,2,'#5a2e1e');R(g,0,6,W,2,'#c99a3a');R(g,0,6,W,1,'#e8c060');R(g,0,8,W,1,'#3a1c12');
 // wainscot with bevelled panels
 R(g,0,104,W,G-104,'#4a2a1e');R(g,0,104,W,2,'#c99a3a');R(g,0,104,W,1,'#e8c060');R(g,0,106,W,1,'#2e180f');
 for(let x=8;x<W;x+=40){R(g,x,110,30,G-118,'#3e2218');R(g,x,110,30,1,'#6a4430');R(g,x,110,1,G-118,'#6a4430');R(g,x,G-9,30,1,'#2a160e');R(g,x+29,110,1,G-118,'#2a160e');R(g,x+3,113,24,G-124,'#43261b');artDith(g,x+3,113,24,1,'#56321f')}
 // window: night sky, harvest moon, curtains with tie-backs
 const wx=210,wy=20;R(g,wx-12,wy-8,94,74,'#8e2a2a');for(let x=wx-12;x<wx+82;x+=4){R(g,x,wy-8,1,74,'#741f22');R(g,x+2,wy-8,1,74,'#a83a38')}
 R(g,wx-3,wy-3,76,64,'#3a2015');R(g,wx,wy,70,58,'#1f2a55');artDith(g,wx,wy+22,70,10,'#26336a');R(g,wx,wy+32,70,26,'#2c3a6e');
 disc(g,wx+52,wy+14,7,7,'#f7d98a');disc(g,wx+52,wy+14,6,6,'#f4efd0');R(g,wx+49,wy+11,2,2,'#dcd6b0');R(g,wx+54,wy+16,3,2,'#dcd6b0');R(g,wx+53,wy+10,1,1,'#dcd6b0');
 for(let i=0;i<12;i++)R(g,wx+sr()*70,wy+sr()*30,1,1,'#fff');
 R(g,wx+4,wy+40,24,18,'#18224a');disc(g,wx+12,wy+38,8,7,'#141c3c');disc(g,wx+22,wy+42,6,5,'#141c3c');R(g,wx+48,wy+44,14,14,'#141c3c');R(g,wx+46,wy+42,18,2,'#141c3c');R(g,wx+51,wy+48,3,3,'#ffd34a');R(g,wx+57,wy+48,3,3,'#ffd34a');
 for(let k=0;k<6;k++){R(g,wx+6+k,wy+4+k,1,1,'#34427a');R(g,wx+40+k,wy+34+k,1,1,'#3a4a80')}
 R(g,wx+34,wy,2,58,'#3a2015');R(g,wx,wy+28,70,2,'#3a2015');R(g,wx+34,wy,1,58,'#5a3020');
 R(g,wx-5,wy+61,80,3,'#5a3020');R(g,wx-5,wy+61,80,1,'#8a5a3a');
 R(g,wx-14,wy-10,98,6,'#741f22');for(let x=wx-12;x<wx+84;x+=8)disc(g,x+3,wy-4,4,2,'#8e2a2a');R(g,wx-14,wy-10,98,1,'#a83a38');
 for(const x of[wx-12,wx+73]){R(g,x,wy+36,9,3,'#c99a3a');R(g,x,wy+36,9,1,'#e8c060');R(g,x+4,wy+39,1,3,'#c99a3a')}
 // framed harvest painting
 const px=34,py=26;R(g,px-4,py-4,52,42,'#c99a3a');R(g,px-4,py-4,52,1,'#e8c060');R(g,px-4,py-4,1,42,'#e8c060');R(g,px-4,py+37,52,1,'#6a4818');R(g,px+47,py-4,1,42,'#6a4818');
 R(g,px-2,py-2,48,38,'#8a6420');R(g,px,py,44,34,'#9cc4e0');artDith(g,px,py+12,44,6,'#b8d8ec');R(g,px,py+20,44,14,'#5a8a3a');artDith(g,px,py+28,44,6,'#4a7a2e');
 disc(g,px+30,py+22,10,6,'#4a7a2e');disc(g,px+10,py+8,4,4,'#fff2b0');R(g,px+14,py+21,8,6,'#9e2b25');for(let r=0;r<4;r++)R(g,px+15-r+3,py+17+r,2+r*2-2+2,1,'#5a1c1a');R(g,px+17,py+24,2,3,'#f4efe6');
 for(let x=px+2;x<px+44;x+=4)R(g,x,py+29,1,3,'#f4e9d8');R(g,px,py+30,44,1,'#f4e9d8');R(g,px+30,py+6,2,1,'#3a3a44');R(g,px+33,py+5,2,1,'#3a3a44');
 R(g,px+21,py-8,2,4,'#3a2015');R(g,px+21,py-9,2,1,'#c99a3a');
 // autumn leaf wreath
 const ex=114,ey=58;R(g,ex,ey-17,2,3,'#3a2015');
 for(let a=0;a<24;a++){const t=a/24*Math.PI*2,x=Math.round(ex+Math.cos(t)*11),y=Math.round(ey+Math.sin(t)*11);disc(g,x,y,2,2,['#c4442c','#e07a1f','#f2b043','#8a5a2b'][a%4])}
 for(let a=0;a<12;a++){const t=a/12*Math.PI*2+.2;R(g,Math.round(ex+Math.cos(t)*9),Math.round(ey+Math.sin(t)*9),1,1,'#ffd08a')}
 R(g,ex-4,ey+9,9,4,'#c8302c');R(g,ex-1,ey+10,3,2,'#8e1b2e');R(g,ex-3,ey+13,2,4,'#c8302c');R(g,ex+2,ey+13,2,4,'#c8302c');
 // chandelier with crystals
 for(let y=0;y<22;y+=2)R(g,159,y,2,1,'#5a4a2a');R(g,159,1,2,21,'#3a2a1a');R(g,140,22,40,3,'#c99a3a');R(g,140,22,40,1,'#e8c060');disc(g,160,27,8,4,'#c99a3a');R(g,155,25,4,1,'#e8c060');
 for(const x of[142,152,167,177]){R(g,x,15,2,7,'#f4efe6');R(g,x+1,15,1,7,'#d8d2c4');R(g,x,12,2,3,'#ffd34a');R(g,x,13,1,1,'#fff6c0')}
 for(const x of[145,150,170,175])R(g,x,25,1,2,'#bfe6ff');R(g,160,31,1,2,'#bfe6ff');
 // table: cloth with plaid, runner, lace hem
 R(g,0,G-4,W,4,'#cdbd9a');R(g,0,G-4,W,1,'#b8a682');R(g,0,G,W,H-G,'#efe3c8');R(g,0,G,W,1,'#fff8e6');
 for(let x=6;x<W;x+=12)artDith(g,x,G+1,2,6,'#e2d2b0');artDith(g,0,G+3,W,1,'#e2d2b0');
 for(let i=0;i<50;i++)R(g,sr()*W,G+3+sr()*16,1,1,'#ddcca6');
 R(g,0,G+7,W,7,'#c8641e');R(g,0,G+7,W,1,'#f2c14e');R(g,0,G+8,W,1,'#e0843a');R(g,0,G+13,W,1,'#f2c14e');artDith(g,0,G+11,W,1,'#a84e14');
 for(let x=8;x<W;x+=16){R(g,x,G+9,2,2,'#f2c14e');R(g,x-1,G+10,1,1,'#e0843a');R(g,x+2,G+10,1,1,'#e0843a')}
 R(g,0,H-6,W,6,'#3a2015');R(g,0,H-6,W,1,'#5a3020');for(let x=0;x<W;x+=16){disc(g,x+8,H-7,8,3,'#efe3c8');R(g,x+7,H-6,2,1,'#cdbd9a');R(g,x+3,H-7,1,1,'#cdbd9a');R(g,x+12,H-7,1,1,'#cdbd9a')}
 // candles (game.js draws the flames at G-41..G-36: keep tops at G-36)
 for(const x of[60,262]){R(g,x-6,G-5,12,5,'#c99a3a');R(g,x-6,G-5,12,1,'#e8c060');R(g,x-4,G-7,8,2,'#a87a2a');R(g,x-2,G-36,4,31,'#f4efe6');R(g,x+1,G-36,1,31,'#d8d2c4');R(g,x-2,G-36,1,31,'#fffaf0');R(g,x-2,G-34,1,4,'#fffaf0');R(g,x+1,G-33,1,6,'#e8e2d4');R(g,x,G-37,1,1,'#3a2a1a')}
 // goblets of cider
 for(const x of[128,196]){R(g,x-3,G-15,7,6,'#cfe4f4');R(g,x-2,G-13,5,3,'#c8641e');R(g,x-2,G-13,5,1,'#f2a04a');R(g,x+2,G-14,1,3,'#ffffff');R(g,x,G-9,1,5,'#cfe4f4');R(g,x-2,G-4,5,1,'#cfe4f4')}
 // mashed potatoes with gravy and butter
 disc(g,100,G-6,15,5,'#3a6a8a');R(g,88,G-8,4,1,'#5a8aaa');disc(g,100,G-10,12,4,'#efe6cf');artDiscD(g,100,G-10,12,4,'#dcd2b8',2);disc(g,101,G-12,6,2,'#8a5a2b');R(g,98,G-13,3,1,'#b07a3b');R(g,98,G-16,5,3,'#f5d142');R(g,98,G-16,5,1,'#fff2a0');
 // cranberry sauce
 disc(g,222,G-6,12,5,'#7a1a2a');disc(g,222,G-9,10,3,'#c2334a');R(g,216,G-11,3,1,'#ff8090');R(g,220,G-12,1,1,'#ffd0d8');for(const x of[214,225,229])R(g,x,G-8,1,1,'#8e1b2e');
 // pumpkin pie with lattice
 disc(g,292,G-5,10,3,'#d8c9a8');for(const x of[286,293,299])disc(g,x,G-9,4,3,'#d99a4e');R(g,284,G-10,16,1,'#f0c070');R(g,288,G-12,1,5,'#f0c070');R(g,296,G-12,1,5,'#f0c070');R(g,283,G-6,18,1,'#b8a682');
 // the roast turkey: platter, garnish, glaze shine
 disc(g,160,G-5,32,6,'#f4f4f4');disc(g,160,G-6,28,4,'#dcdcdc');R(g,134,G-8,6,1,'#ffffff');
 for(const[x,y,col]of[[133,G-8,'#4f8a3a'],[138,G-6,'#4f8a3a'],[184,G-7,'#4f8a3a'],[188,G-6,'#4f8a3a'],[136,G-7,'#c2334a'],[186,G-8,'#c2334a'],[180,G-5,'#e87a22'],[142,G-5,'#e87a22']])R(g,x,y,2,2,col);
 disc(g,160,G-17,21,11,'#b5642a');artDiscD(g,160,G-17,21,11,'#9a4e1e',5);disc(g,155,G-21,12,6,'#d0803a');disc(g,152,G-23,5,2,'#e8a060');R(g,149,G-25,3,1,'#fff0c8');R(g,170,G-22,4,1,'#d0803a');
 disc(g,139,G-12,5,4,'#a0521e');R(g,137,G-14,2,1,'#c87a3a');disc(g,181,G-12,5,4,'#a0521e');R(g,180,G-14,2,1,'#c87a3a');
 for(const[x,d]of[[132,-1],[185,1]]){R(g,x,G-15,4,4,'#f4efe6');R(g,x+(d>0?4:-1),G-16,1,1,'#f4efe6');R(g,x+(d>0?4:-1),G-13,1,1,'#f4efe6');R(g,x+(d>0?4:-1),G-11,1,1,'#f4efe6');R(g,x,G-12,4,1,'#d8d2c4')}
 return c}

function parade(){const[c,g]=cvs();seed=3;
 bands(g,['#4f93d8','#63a3e0','#7ab4e8','#94c6ee','#b0d6f2'],0,124);
 const cloud=(x,y,s)=>{disc(g,x,y,s,s*.35|0,'#eef6fc');disc(g,x+s*.6,y-2,s*.6|0,s*.35|0,'#fff');disc(g,x-s*.5,y+1,s*.5|0,s*.25|0,'#eef6fc');R(g,x-s,y+(s*.3|0),s*2,1,'#cfe2f2');artDith(g,x-s+2,y+(s*.3|0)-1,s*2-4,1,'#d8eaf6')};
 cloud(64,50,18);cloud(150,44,13);cloud(300,54,12);
 // distant skyline for depth (kept below the HUD band)
 for(let x=0;x<W;){const w=12+Math.floor(sr()*16),h=40+Math.floor(sr()*38);R(g,x,124-h,w,h,'#a4c6e6');R(g,x,124-h,w,1,'#b8d6f0');for(let wy=124-h+4;wy<118;wy+=6)for(let wx=x+2;wx<x+w-2;wx+=4)R(g,wx,wy,2,2,'#bcd8f0');if(sr()<.3)R(g,x+w/2,124-h-6,1,6,'#a4c6e6');x+=w+2}
 // main street buildings: cornices, sills, rooftop tanks, awnings
 let x=0;while(x<W){const w=24+Math.floor(sr()*24),h=36+Math.floor(sr()*52),ci=Math.floor(sr()*5),col=['#8a3a2e','#5a4a6a','#a8784a','#6a5a4a','#7a2e3a'][ci],top=126-h;
  R(g,x,top,w,h+10,col);if(ci===0||ci===4)for(let by=top+4;by<136;by+=3)artDith(g,x,by,w,1,'rgba(0,0,0,.10)');
  R(g,x+w-3,top,3,h+10,'rgba(0,0,0,.22)');R(g,x,top,1,h+10,'rgba(255,255,255,.12)');
  R(g,x-1,top,w+2,3,'rgba(255,255,255,.22)');R(g,x-1,top+3,w+2,1,'rgba(0,0,0,.3)');
  if(w>34&&sr()<.6){const tx=x+6;R(g,tx,top-10,10,8,'#6a4a3a');R(g,tx,top-10,10,1,'#8a6a52');R(g,tx+2,top-12,6,2,'#5a3a2a');R(g,tx+1,top-2,1,2,'#3a2a2a');R(g,tx+8,top-2,1,2,'#3a2a2a');for(let k=top-8;k<top-2;k+=2)R(g,tx,k,10,1,'#5e4232')}
  else if(sr()<.5){R(g,x+w-10,top-7,5,7,'#6a3a2e');R(g,x+w-11,top-8,7,2,'#4a2a24');R(g,x+w-10,top-4,5,1,'#5a3226');R(g,x+w-10,top-7,1,7,'#8a5a4a')}
  for(let wy=top+6;wy<112;wy+=8)for(let wx=x+3;wx<x+w-5;wx+=6){const lit=sr()<.3;R(g,wx,wy,3,4,lit?'#ffe39a':'#2a2a3a');if(!lit)R(g,wx,wy,1,1,'#4a5a7a');R(g,wx-1,wy+4,5,1,'rgba(255,255,255,.25)')}
  if(sr()<.6){const ac=[['#c8302c','#f4f4f4'],['#4f8a3a','#f4efe6'],['#e87a22','#f2c14e']][Math.floor(sr()*3)];for(let ax=x+1;ax<x+w-2;ax+=2)R(g,ax,114,2,5,ac[(ax-x-1)/2%2]);R(g,x+1,119,w-3,1,'rgba(0,0,0,.35)');for(let ax=x+1;ax<x+w-2;ax+=4)R(g,ax,119,2,1,ac[0])}
  x+=w+1}
 // parade balloon: a giant generic cartoon turkey
 const bx=232,by=40;for(const d of[-10,0,10])for(let t=0;t<=1;t+=.02)R(g,bx+d+d*t,by+12+t*72,1,1,'#3a3a44');
 disc(g,bx,by-4,26,20,'#c8302c');disc(g,bx,by-2,21,16,'#e87a22');disc(g,bx,by,15,12,'#f2c14e');
 for(let a=0;a<9;a++){const t=Math.PI*(1.1+a*.1);R(g,Math.round(bx+Math.cos(t)*23),Math.round(by-4+Math.sin(t)*17),1,3,'#a8221e')}
 disc(g,bx,by+8,16,13,'#8a5a2b');artDiscD(g,bx,by+8,16,13,'#6e4420',5);disc(g,bx-5,by+4,6,4,'#b07c42');R(g,bx-8,by+1,3,1,'#d8a868');R(g,bx-6,by+12,1,4,'#6e4420');R(g,bx+4,by+12,1,4,'#6e4420');
 disc(g,bx+16,by-6,7,7,'#8a5a2b');R(g,bx+13,by-11,3,1,'#b07c42');
 R(g,bx+18,by-9,3,3,'#fff');R(g,bx+19,by-8,2,2,'#111');R(g,bx+18,by-9,1,1,'#fff');R(g,bx+23,by-6,4,3,'#f0a020');R(g,bx+23,by-6,4,1,'#ffd34a');R(g,bx+21,by-3,2,5,'#c8302c');
 // bunting
 R(g,0,8,W,1,'#444');const bc=['#c8302c','#f2c14e','#e87a22','#4f8a3a'];for(let x=0;x<W;x+=12)for(let r=0;r<6;r++)R(g,x+r/2+1,9+r,8-r,1,bc[(x/12)%4]);
 // crowd: faces, hair, waving flags (slightly knocked back for depth)
 const skins=['#f0b48a','#c98a5a','#8a5a3a','#f4c8a0'],shirts=['#c8302c','#3a6a9a','#4f8a3a','#e87a22','#7a4a8a','#f2c14e','#5a5a6a'],hairs=['#3a2418','#1a1420','#8a5a2b','#d8b060','#a8a8b0'];
 for(let x=-2;x<W;x+=7){const hh=Math.floor(sr()*4),sk=skins[Math.floor(sr()*4)],sh=shirts[Math.floor(sr()*7)],hr=hairs[Math.floor(sr()*5)];
  R(g,x,132-hh,7,10,sh);R(g,x,132-hh,7,1,'rgba(255,255,255,.25)');disc(g,x+3,129-hh,3,3,sk);R(g,x+1,126-hh,5,2,hr);R(g,x+2,129-hh,1,1,'#2a1a1a');R(g,x+4,129-hh,1,1,'#2a1a1a');
  if(sr()<.22){R(g,x+6,123-hh,1,9,sk);R(g,x+7,118-hh,1,7,'#5a3a22');R(g,x+8,118-hh,4,3,sr()<.5?'#f2c14e':'#c8302c')}}
 R(g,0,117,W,25,'rgba(60,70,110,.18)');
 // barricade
 R(g,0,136,W,8,'#2a4a8a');for(let x=0;x<W;x+=16)R(g,x,136,8,8,'#f4f4f4');R(g,0,136,W,1,'rgba(255,255,255,.4)');R(g,0,143,W,1,'rgba(0,0,0,.3)');
 for(let x=6;x<W;x+=32){R(g,x,144,2,4,'#666');R(g,x-2,148,6,1,'#555')}
 // sidewalk and curb
 R(g,0,144,W,G-144,'#b8b0a8');for(let x=0;x<W;x+=20)R(g,x,144,1,G-144,'#9a9290');artDith(g,0,149,W,1,'#c8c0b8');
 for(let i=0;i<30;i++)R(g,sr()*W,145+sr()*6,1,1,'#a8a098');
 R(g,0,G-3,W,1,'#d8d2ca');R(g,0,G-2,W,2,'#8a8a8a');
 // street
 R(g,0,G,W,H-G,'#3a3a44');R(g,0,G,W,2,'#2a2a32');for(let i=0;i<140;i++)R(g,sr()*W,G+2+sr()*(H-G),1,1,sr()<.7?'#4a4a56':'#30303a');
 for(let x=4;x<W;x+=26){R(g,x,G+12,14,2,'#f2c14e');R(g,x,G+14,14,1,'#8a7a2a')}
 disc(g,70,G+20,7,2,'#2a2a32');disc(g,70,G+20,5,1,'#4a4a56');R(g,66,G+20,9,1,'#2a2a32');
 for(let i=0;i<18;i++)R(g,sr()*W,G+3+sr()*(H-G-4),1,1,['#ff5a7a','#ffd34a','#6ec8ff','#7ee07a'][i%4]);
 return c}
function menuBG(){const[c,g]=cvs();for(let y=0;y<H;y+=8)for(let x=0;x<W;x+=8)R(g,x,y,8,8,((x+y)/8)%2?'#2a1830':'#311c38');R(g,0,0,W,3,'#e07a1f');R(g,0,H-3,W,3,'#e07a1f');return c}
const STAGES=[{n:'HARVEST FARM',bg:farm()},{n:"GRANDMA'S TABLE",bg:table()},{n:'PARADE STREET',bg:parade()}];
const MENU=menuBG();
