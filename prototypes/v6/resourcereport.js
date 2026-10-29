// Reports direct generated resources by card group and type.
// It also reports cards with a heart-producing effect and multi-heart cards.
// Usage: node resourcereport.js [path/to/heartrow.html] [--samples 100000]
const vm=require('vm'),fs=require('fs');
const a=process.argv.slice(2),opt=(n,d)=>{const i=a.indexOf('--'+n);return i>=0?a[i+1]:d};
const file=a.find(x=>x.endsWith('.html'))||'heartrow-v6.html',N=+(opt('samples',100000));
if(!Number.isInteger(N)||N<1)throw new Error('--samples must be a positive integer');
const html=fs.readFileSync(file,'utf8'),match=html.match(/<script>([\s\S]*)<\/script>/);
if(!match)throw new Error('Could not find the game script in '+file);
const ctx={document:{querySelector:()=>({setAttribute(){}}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};
vm.createContext(ctx);vm.runInContext(match[1],ctx);
const heartEffects=['all3','vault','reapG','reapP'];
const blank=()=>({cards:0,goldCards:0,powerCards:0,heartCards:0,multiHeartCards:0,gold:0,power:0,hearts:0,heartEffects:0});
const groups={all:blank(),recruit:blank(),enemy:blank(),moss:blank(),ember:blank(),tide:blank()};
const add=(g,c)=>{
 g.cards++;g.gold+=c.gold;g.power+=c.power;g.hearts+=c.hearts;
 g.goldCards+=c.gold>0;g.powerCards+=c.power>0;g.heartCards+=c.hearts>0;g.multiHeartCards+=c.hearts>=2;
 g.heartEffects+=c.fx.some(k=>heartEffects.includes(k));
};
for(let turn=1;turn<=24;turn++)for(let i=0;i<N;i++){
 const c=ctx.make(turn);add(groups.all,c);add(groups[c.kind],c);if(c.kind=='recruit')add(groups[c.type],c);
}
const pct=(n,d)=>(n/d*100).toFixed(2)+'%';
const avg=(n,d)=>(n/d).toFixed(3);
console.log('Heartrow resource report');
console.log('source',file,'samples per turn',N,'cards',groups.all.cards);
console.log('direct resources: percentage of cards with a resource, then average resource per card');
for(const [name,g] of Object.entries(groups))console.log(
 name.padEnd(8),String(g.cards).padStart(8),
 '●',pct(g.goldCards,g.cards),avg(g.gold,g.cards),
 '⚔',pct(g.powerCards,g.cards),avg(g.power,g.cards),
 '♥',pct(g.heartCards,g.cards),avg(g.hearts,g.cards),
 '♥2+',pct(g.multiHeartCards,g.cards),
 'heart fx',pct(g.heartEffects,g.cards)
);
