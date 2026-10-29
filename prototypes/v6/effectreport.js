// Reports generated effect frequencies by card group and turn band.
// Usage: node effectreport.js [path/to/heartrow.html] [--samples 100000]
const vm=require('vm'),fs=require('fs');
const a=process.argv.slice(2),opt=(n,d)=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:d};
const file=a.find(x=>x.endsWith('.html'))||'heartrow-v6.html',N=+(opt('samples',100000));
if(!Number.isInteger(N)||N<1)throw new Error('--samples must be a positive integer');
const html=fs.readFileSync(file,'utf8'),match=html.match(/<script>([\s\S]*)<\/script>/);
if(!match)throw new Error('Could not find the game script in '+file);
const ctx={document:{querySelector:()=>({setAttribute(){}}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};
vm.createContext(ctx);vm.runInContext(match[1],ctx);
const effects=['none',...vm.runInContext('Object.keys(FX)',ctx)];
const bands=[['early',1,8],['mid',9,16],['late',17,24]];
const group=()=>({cards:0,retain:0,counts:Object.fromEntries(effects.map(k=>[k,0]))});
const groups={all:group(),recruit:group(),enemy:group(),moss:group(),ember:group(),tide:group()};
const timed=Object.fromEntries(bands.flatMap(([n])=>[[n+':all',group()],[n+':recruit',group()]]));
const add=(g,c)=>{g.cards++;g.retain+=!!c.ret;g.counts[c.fx[0]||'none']++};
for(let turn=1;turn<=24;turn++){
 const band=bands.find(([,lo,hi])=>turn>=lo&&turn<=hi)[0];
 for(let i=0;i<N;i++){
  const c=ctx.make(turn);add(groups.all,c);add(groups[c.kind],c);if(c.kind=='recruit')add(groups[c.type],c);
  add(timed[band+':all'],c);if(c.kind=='recruit')add(timed[band+':recruit'],c);
 }}
const pct=(n,d)=>d?(n/d*100).toFixed(2).padStart(7)+'%':'      -';
const print=(title,names)=>{
 console.log('\n'+title);
 console.log('effect'.padEnd(10)+names.map(([n])=>n.padStart(10)).join(''));
 for(const k of effects)console.log(k.padEnd(10)+names.map(([,g])=>pct(g.counts[k],g.cards).padStart(10)).join(''));
};
const printRetain=(title,names)=>{
 console.log('\n'+title);
 console.log('property'.padEnd(10)+names.map(([n])=>n.padStart(10)).join(''));
 console.log('Retain'.padEnd(10)+names.map(([,g])=>pct(g.retain,g.cards).padStart(10)).join(''));
};
console.log('Heartrow effect report');
console.log('source',file,'samples per turn',N,'cards',groups.all.cards);
console.log('group sizes',Object.entries(groups).map(([n,g])=>n+'='+g.cards).join(' '));
print('By card group',[['all',groups.all],['recruit',groups.recruit],['enemy',groups.enemy],['moss',groups.moss],['ember',groups.ember],['tide',groups.tide]]);
print('By turn band: all cards',bands.map(([n])=>[n,timed[n+':all']]));
print('By turn band: recruits only',bands.map(([n])=>[n,timed[n+':recruit']]));
printRetain('Retain by card group',[['all',groups.all],['recruit',groups.recruit],['enemy',groups.enemy],['moss',groups.moss],['ember',groups.ember],['tide',groups.tide]]);
printRetain('Retain by turn band: recruits only',bands.map(([n])=>[n,timed[n+':recruit']]));
