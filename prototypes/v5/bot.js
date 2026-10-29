// Headless balance bot for Heartrow. Runs the game's own <script> in a Node vm with stubbed DOM.
// Usage: node bot.js [path/to/heartrow.html] [--games 400] [--goal 48] [--policies mixed,none,build,rush]
const vm=require('vm'),fs=require('fs');
const a=process.argv.slice(2),opt=(n,d)=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:d};
const file=a.find(x=>x.endsWith('.html'))||'heartrow-v5.html',N=+opt('games',400),GOAL=+opt('goal',48),POL=opt('policies','mixed,none,build,rush').split(',');
const js=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={document:{querySelector:()=>({}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};
vm.createContext(ctx);vm.runInContext(js,ctx);
ctx.render=()=>{};ctx.snap=()=>{};            // skip DOM rendering and undo snapshots for speed
vm.runInContext('GOALS[0]='+GOAL,ctx);          // level 1 goal used by newGame() with no argument
const G=x=>vm.runInContext(x,ctx),C={t:0,z:0,e:0};
function turn(pol){let S=G('S');
 {const ne=S.row.filter(c=>c.kind=='enemy').length;C.t++;C.e+=ne;if(!ne)C.z++}
 for(let g=0;g<40&&!S.over;g++){S=G('S');                          // play phase
  if(S.pending){let i=S.hand.findIndex(c=>c.kind=='basic'&&c.gold&&c.u);if(i<0&&S.turn>3)i=S.hand.findIndex(c=>c.kind=='basic'&&c.gold);i>=0?ctx.play(i):ctx.skip();continue}
  let i=S.hand.findIndex(c=>c.fx.length&&!c.fx.includes('cycle')&&!c.u);              // effect cards first, discard-effects last
  if(i<0)i=S.hand.findIndex(c=>!c.u&&!c.fx.includes('cycle'));if(i<0)i=S.hand.findIndex(c=>!c.u);if(i<0)break;ctx.play(i)}
 for(let g=0;g<20;g++){S=G('S');if(S.over||S.pending)break;const left=S.max-S.turn;let best=-1,bs=-1; // buy phase
  S.row.forEach((c,i)=>{if(!ctx.can(c))return;let s;
   if(c.kind=='enemy')s=pol=='build'&&S.turn<9?1:100+c.hearts*10+(i==4?50:0);
   else s=pol=='none'||left<3?0:(pol=='rush'&&S.turn>3?0:10+ctx.cost(c)+c.hearts*2);
   if(s>bs){bs=s;best=i}});
  if(best<0||bs<=0)break;ctx.take(best)}
 S=G('S');if(!S.over&&S.mull>0&&!S.row.some(c=>ctx.can(c))&&S.turn<S.max-2)ctx.mulligan();return S}
function game(pol){ctx.newGame();let S=G('S'),n=0;while(!S.over&&n++<80){S=turn(pol);if(!S.over)ctx.endTurn();S=G('S')}return S}
for(const pol of POL){const r={h:[],k:[],lost:[],b:[],x:[],pl:[],t:[],wg:[],wp:[]};
 for(let i=0;i<N;i++){const S=game(pol);r.h.push(S.hearts);r.k.push(S.k);r.lost.push(S.lost);r.b.push(S.b);r.x.push(S.x);r.pl.push(S.pl/S.turn);r.t.push(S.turn);r.wg.push(S.wg);r.wp.push(S.wp)}
 const av=x=>(x.reduce((p,q)=>p+q,0)/x.length).toFixed(1),h=r.h.slice().sort((p,q)=>p-q);
 console.log(pol.padEnd(6),'goal',GOAL,'win',(r.h.filter(x=>x>=GOAL).length/N*100).toFixed(0)+'%','median',h[N>>1],'p10',h[Math.floor(N*.1)],'| kills',av(r.k),'bought',av(r.b),'exiled',av(r.x),'plays/turn',av(r.pl),'turns',av(r.t),'lost to escapes',av(r.lost),'wasted gold',av(r.wg),'power',av(r.wp))}
console.log('avg enemies in row at turn start',(C.e/C.t).toFixed(2),'| turns with zero enemies',(C.z/C.t*100).toFixed(0)+'%');
