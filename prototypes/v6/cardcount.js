// Estimates how many distinct cards the generator can produce (sampling + Chao1 estimator).
// Re-run after changing make() or FX, then update the numbers in the About text in the HTML.
// Usage: node cardcount.js [path/to/heartrow.html] [samples]
const vm=require('vm'),fs=require('fs');
const file=process.argv.find(x=>x.endsWith('.html'))||'heartrow-v6.html',N=+(process.argv.find(x=>/^\d+$/.test(x))||700000);
const js=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={document:{querySelector:()=>({setAttribute(){}}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};vm.createContext(ctx);vm.runInContext(js,ctx);
const m={recruit:new Map(),enemy:new Map()};
const byCost={recruit:new Map(),enemy:new Map()};
const key=c=>[c.type,c.cost,c.gold,c.power,c.hearts,c.fx.join(),c.ret,c.m,c.km,c.bn].join('|');
for(let i=0;i<N;i++){
 const c=ctx.make(1+Math.random()*24|0),k=key(c),t=m[c.kind];
 t.set(k,(t.get(k)||0)+1);
 let g=byCost[c.kind].get(c.cost);
 if(!g){g={samples:0,variants:new Map()};byCost[c.kind].set(c.cost,g)}
 g.samples++;g.variants.set(k,(g.variants.get(k)||0)+1);
}
const estimate=g=>{let f1=0,f2=0;for(const v of g.values()){if(v==1)f1++;if(v==2)f2++}return f2?Math.round(g.size+f1*f1/(2*f2)):g.size+' (saturated)'};
for(const n in m){
 console.log(n,'observed',m[n].size,'estimated total',estimate(m[n]));
 console.log('  cost samples observed estimated');
 for(const [cost,g] of [...byCost[n]].sort((a,b)=>a[0]-b[0]))console.log(' ',String(cost).padStart(4),String(g.samples).padStart(7),String(g.variants.size).padStart(8),String(estimate(g.variants)).padStart(9));
}
