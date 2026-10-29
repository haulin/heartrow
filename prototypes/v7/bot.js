// Headless balance bot for Heartrow. Runs the game's own <script> in a Node vm with stubbed DOM.
// Usage: node bot.js [path/to/heartrow.html] [--games 400] [--goal 48] [--mode standard|long] [--policies mixed,none,build,rush,pacifist,smart]
const vm=require('vm'),fs=require('fs');
const a=process.argv.slice(2),opt=(n,d)=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:d};
const file=a.find(x=>x.endsWith('.html'))||'heartrow-v7.html',N=+opt('games',400),GOAL=+opt('goal',48),MODE=opt('mode','standard'),POL=opt('policies','mixed,none,build,rush,pacifist,smart').split(',');
const js=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={document:{querySelector:()=>({setAttribute(){}}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};
vm.createContext(ctx);vm.runInContext(js,ctx);
ctx.render=()=>{};ctx.snap=()=>{};            // skip DOM rendering and undo snapshots for speed
vm.runInContext('GOALS[0]='+GOAL,ctx);          // level 1 goal used by standard-mode newGame()
const G=x=>vm.runInContext(x,ctx),C={t:0,z:0,e:0},HEARTFX={all3:10,vault:8,reapG:8,reapP:8};
function smartScore(c,i){return c.kind=='enemy'?100+c.hearts*12+(i==4?40:0)-c.cost*.5:20+(c.gold+c.power)*2+c.hearts*10+c.fx.length*8-ctx.cost(c)}
function pacifistScore(c,i){if(c.kind=='enemy')return 0;if(c.power&&!c.gold&&!c.hearts&&!c.fx.length)return -Infinity;const h=c.fx.reduce((v,k)=>v+(HEARTFX[k]||0),0),x=c.fx.includes('exile')?18:0,d=c.fx.includes('draw')?8:0,q=c.fx.some(k=>k=='cycle'||k=='purge')?14:0;return 20+c.hearts*25+c.gold*4+h+x+d+q+c.fx.length*4-ctx.cost(c)}
function retainChanges(S,c){if(!c.ret)return true;if(c.gold||c.power||c.hearts)return true;for(const k of c.fx){if(k=='draw')return S.deck.length+S.discard.length>0;if(k=='coin'||k=='cheap'||k=='weak'||k=='reapG'||k=='reapP'||k=='exile')return true;if(k=='swap'&&S.gold!=S.power)return true;if(k=='foes'&&S.row.some(x=>x.kind=='enemy'))return true;if(k=='all3'&&S.types.size>=3)return true;if(k=='vault'&&S.exile.length>=3)return true;if(k=='basics'&&[...S.deck,...S.hand,...S.discard].filter(x=>x.kind=='basic').length>=4)return true;if(k=='pile'&&S.discard.length>=3)return true;if(k=='bond'&&S.types.has(c.type))return true;if(k=='kin'&&S.hand.some(x=>x.u&&x!==c&&x.type==c.type))return true;if(k=='army'&&[...S.deck,...S.hand,...S.discard].filter(x=>x.type==c.type).length>=4)return true;if((k=='cycle'||k=='purge')&&S.hand.some(x=>!x.u&&x!==c&&(k=='purge'||!x.ret)))return true}return false}
function exileIndex(S,pol){if(pol=='pacifist'){let i=S.hand.findIndex(c=>c.power&&!c.hearts&&!c.gold&&!c.fx.length);if(i>=0)return i;i=S.hand.findIndex(c=>c.power&&!c.hearts);if(i>=0)return i;i=S.hand.findIndex(c=>c.power);if(i>=0)return i}let i=S.hand.findIndex(c=>c.kind=='basic'&&c.gold&&c.u);if(i<0&&S.turn>3)i=S.hand.findIndex(c=>c.kind=='basic'&&c.gold);return i}
function pacifistPlayIndex(S){const live=c=>!c.u&&retainChanges(S,c),pick=f=>S.hand.findIndex(c=>live(c)&&f(c)),heart=c=>c.hearts>0||c.fx.some(k=>HEARTFX[k]);let i=pick(c=>c.fx.includes('purge'));if(i>=0){const h=pick(heart);return h>=0?h:i}i=pick(c=>c.fx.includes('draw'));if(i>=0)return i;i=pick(heart);if(i>=0)return i;i=pick(c=>c.gold>0);if(i>=0)return i;i=pick(c=>c.fx.length&&!c.fx.includes('cycle'));if(i>=0)return i;return pick(c=>c.fx.length)}
function shouldProtectEdge(S,pol){const edge=S.row[4];return (pol=='smart'||pol=='mixed')&&S.mull>0&&edge&&edge.kind=='enemy'&&ctx.can(edge)&&S.row.slice(0,4).some(c=>c.kind=='enemy')}
function turn(pol){let S=G('S');
 {const ne=S.row.filter(c=>c.kind=='enemy').length;C.t++;C.e+=ne;if(!ne)C.z++}
 for(let g=0;g<40&&!S.over;g++){S=G('S');                          // play phase
  if(S.pending){const i=exileIndex(S,pol);i>=0?ctx.play(i):ctx.skip();continue}
  const di=S.hand.findIndex(c=>!c.u&&retainChanges(S,c)&&c.fx.includes('draw'));if(di>=0){ctx.play(di);continue}
  if(pol=='pacifist'){const i=pacifistPlayIndex(S);if(i<0)break;ctx.play(i);continue}
  if(pol=='smart'){const i=S.hand.findIndex(c=>!c.u&&retainChanges(S,c));if(i<0)break;ctx.play(i);continue}
  let i=S.hand.findIndex(c=>!c.u&&retainChanges(S,c)&&c.fx.length&&!c.fx.includes('cycle'));              // effect cards first, discard-effects last
  if(i<0)i=S.hand.findIndex(c=>!c.u&&retainChanges(S,c)&&!c.fx.includes('cycle'));if(i<0)i=S.hand.findIndex(c=>!c.u&&retainChanges(S,c));if(i<0)break;ctx.play(i)}
 let redrawn=false;for(let g=0;g<20;g++){S=G('S');if(S.over||S.pending)break;const left=S.max-S.turn;
  if(pol=='smart'&&!redrawn&&S.mull>0&&S.turn<S.max-2){const bestAny=Math.max(...S.row.map((c,i)=>smartScore(c,i))),bestCan=Math.max(...S.row.filter(ctx.can).map((c,i)=>smartScore(c,S.row.indexOf(c))));if(bestCan===-Infinity||bestAny-bestCan>=12){ctx.mulligan();redrawn=true;continue}}
  if(!redrawn&&shouldProtectEdge(S,pol)){ctx.mulligan();redrawn=true;continue}
  let best=-1,bs=-1; // buy phase
  S.row.forEach((c,i)=>{if(!ctx.can(c))return;let s;
    if(pol=='pacifist')s=left<3?0:pacifistScore(c,i);
   else if(pol=='smart')s=smartScore(c,i);
   else if(c.kind=='enemy')s=pol=='build'&&S.turn<9?1:100+c.hearts*10+(i==4?50:0);
   else s=pol=='none'||left<3?0:(pol=='rush'&&S.turn>3?0:10+ctx.cost(c)+c.hearts*2);
   if(s>bs){bs=s;best=i}});
  if(best<0||bs<=0)break;ctx.take(best)}
 S=G('S');if(pol!='smart'&&!S.over&&S.mull>0&&!S.row.some(c=>ctx.can(c))&&S.turn<S.max-2)ctx.mulligan();return S}
function game(pol){ctx.newGame(0,MODE);let S=G('S'),n=0,checkpoint=null;while(!S.over&&n++<100){S=turn(pol);S=G('S');if(S.turn==24)checkpoint=S.hearts;if(!S.over)ctx.endTurn();S=G('S')}return {S,checkpoint}}
for(const pol of POL){const r={h:[],k:[],lost:[],b:[],x:[],pl:[],t:[],wg:[],wp:[],cards:[],redraws:[]};
 for(let i=0;i<N;i++){const g=game(pol),S=g.S;r.h.push(S.hearts);r.k.push(S.k);r.lost.push(S.lost);r.b.push(S.b);r.x.push(S.x);r.pl.push(S.pl/S.turn);r.t.push(S.turn);r.wg.push(S.wg);r.wp.push(S.wp);r.cards.push(S.deck.length+S.hand.length+S.discard.length);r.redraws.push(S.mull);if(g.checkpoint!==null)(r.cp||(r.cp=[])).push(g.checkpoint)}
 const av=x=>(x.reduce((p,q)=>p+q,0)/x.length).toFixed(1),h=r.h.slice().sort((p,q)=>p-q),bi=r.h.reduce((best,x,i)=>x>r.h[best]?i:best,0);
 console.log(pol.padEnd(8),MODE.padEnd(8),'goal',GOAL,'hit',(r.h.filter(x=>x>=GOAL).length/N*100).toFixed(0)+'%','avg',av(r.h),'median',h[N>>1],'p10',h[Math.floor(N*.1)],MODE=='long'?'T24 avg '+av(r.cp||[0]):'','| kills',av(r.k),'cards',av(r.cards),'bought',av(r.b),'exiled',av(r.x),'redraws left',av(r.redraws),'plays/turn',av(r.pl),'turns',av(r.t),'lost to escapes',av(r.lost),'wasted gold',av(r.wg),'power',av(r.wp),'| best',r.h[bi]+' ♥, '+r.k[bi]+' kills, '+r.cards[bi]+' cards')}
console.log('avg enemies in row at turn start',(C.e/C.t).toFixed(2),'| turns with zero enemies',(C.z/C.t*100).toFixed(0)+'%');
