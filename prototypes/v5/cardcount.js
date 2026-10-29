// Estimates how many distinct cards the generator can produce (sampling + Chao1 estimator).
// Re-run after changing make() or FX, then update the numbers in the About text in the HTML.
// Usage: node cardcount.js [path/to/heartrow.html] [samples]
const vm=require('vm'),fs=require('fs');
const file=process.argv.find(x=>x.endsWith('.html'))||'heartrow-v5.html',N=+(process.argv.find(x=>/^\d+$/.test(x))||700000);
const js=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={document:{querySelector:()=>({}),querySelectorAll:()=>[]},addEventListener(){},structuredClone};vm.createContext(ctx);vm.runInContext(js,ctx);
const m={recruit:new Map(),enemy:new Map()};
for(let i=0;i<N;i++){const c=ctx.make(1+Math.random()*24|0);const k=[c.type,c.cost,c.gold,c.power,c.hearts,c.fx.join(),c.ret,c.m,c.km,c.bn].join();const t=m[c.kind];t.set(k,(t.get(k)||0)+1)}
for(const n in m){let f1=0,f2=0;for(const v of m[n].values()){if(v==1)f1++;if(v==2)f2++}
 console.log(n,'observed',m[n].size,'estimated total',f2?Math.round(m[n].size+f1*f1/(2*f2)):m[n].size+' (saturated)')}
