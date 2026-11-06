// Mi Stock · almacenamiento compatible y no destructivo
const KEY='mi-stock-v1';
const LEGACY_KEY='mi-stock-v2';
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const old1=readJSON(KEY), old2=readJSON(LEGACY_KEY);
let source=old2 || old1 || {};
// Recupera inventario de ambas claves: una clave v2 vacía no debe ocultar
// el tabaco que todavía exista en la copia v1 del mismo dispositivo.
const pickArray=(field)=>Array.isArray(source[field]) && source[field].length
 ? source[field]
 : (Array.isArray(old1?.[field]) ? old1[field] : (Array.isArray(source[field]) ? source[field] : []));
const data={
 tobacco:pickArray('tobacco'),
 coals:pickArray('coals').map(c=>typeof c==='string'?{brand:c,units:0}:c),
 history:pickArray('history'),
 bowls:pickArray('bowls'),
 mixes:pickArray('mixes')
};
// Si existe v2, se toma como la versión más reciente. La copia v2 original no se borra.
if(typeof source.coals==='number' && source.coals>0) data.coals=[{brand:'Sin marca (stock anterior)',units:source.coals}];
if(old2) {
  // Se conserva una copia intacta de la estructura antigua; la app nueva escribe en mi-stock-v1.
  localStorage.setItem(KEY,JSON.stringify(data));
}
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render();renderStats()};
const log=text=>{data.history.unshift({text,at:new Date().toLocaleString('es-ES')});data.history=data.history.slice(0,150)};
data.consumption=Array.isArray(source.consumption)?source.consumption:[];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const record=(kind,details)=>data.consumption.push({date:today(),kind,...details});
const monthNow=()=>today().slice(0,7);
function renderStats(){
 const month=$('statsMonth').value||monthNow(), events=data.consumption.filter(e=>e.date&&e.date.startsWith(month));
 const tobacco={},coal={},days={};
 events.forEach(e=>{const day=e.date;(days[day]??={tobacco:{},coal:0,sessions:0});
 if(e.kind==='tobacco'){tobacco[e.name]=(tobacco[e.name]||0)+Number(e.grams||0);days[day].tobacco[e.name]=(days[day].tobacco[e.name]||0)+Number(e.grams||0)}
 if(e.kind==='coal'){coal[day]=(coal[day]||0)+Number(e.units||0);days[day].coal+=Number(e.units||0)}
 if(e.kind==='session')days[day].sessions+=Number(e.count||0);
 });
 const totalGrams=Object.values(tobacco).reduce((a,b)=>a+b,0),totalCoal=Object.values(coal).reduce((a,b)=>a+b,0),totalSessions=Object.values(days).reduce((a,d)=>a+d.sessions,0);
 $('statsSummary').innerHTML=`<strong>${month}</strong><br>Tabaco: ${fmt(totalGrams)} g · Carbones: ${totalCoal} · Sesiones: ${totalSessions}<br>Media por sesión: ${totalSessions?fmt(totalGrams/totalSessions):'—'} g y ${totalSessions?fmt(totalCoal/totalSessions):'—'} carbones`;
 const bars=(obj,suffix)=>{const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...entries.map(x=>x[1]));return entries.length?entries.map(([name,val])=>`<div class="stat-line"><span>${esc(name)}</span><div class="stat-track"><div class="stat-fill" style="width:${val/max*100}%"></div></div><strong>${fmt(val)} ${suffix}</strong></div>`).join(''):'<p class="empty">Todavía no hay consumos registrados este mes.</p>'};
 $('tobaccoChart').innerHTML=bars(tobacco,'g');
 $('coalChart').innerHTML=bars(coal,'uds.');
 $('dailyStats').innerHTML=Object.keys(days).sort().reverse().map(day=>{const d=days[day],fl=Object.entries(d.tobacco).map(([n,g])=>`${esc(n)}: ${fmt(g)} g`).join('<br>')||'Sin tabaco registrado';return `<div class="stat-day"><strong>${day}</strong><br>${fl}<br>Carbones: ${d.coal} · Sesiones: ${d.sessions}</div>`}).join('')||'<p class="empty">No hay actividad registrada en este mes.</p>';
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fillSelect(id,items,placeholder,labelFn){
 const el=$(id),previous=el.value;
 el.innerHTML=`<option value="">${placeholder}</option>`+items.map((x,i)=>`<option value="${i}">${esc(labelFn(x))}</option>`).join('');
 if(previous!=='' && Number(previous)<items.length) el.value=previous;
}
function addMixRow(defaultPercent=''){
 const row=document.createElement('div');row.className='mix-row';
 row.innerHTML=`<label>Tabaco<select class="mix-tobacco"><option value="">Selecciona tabaco</option></select></label>
 <label>Porcentaje (%)<input class="mix-percent" type="number" min="0.01" max="100" step="0.01" placeholder="Ej. 25" value="${defaultPercent}"></label>
 <button type="button" class="delete remove-part" aria-label="Quitar tabaco">✕</button>`;
 const sel=row.querySelector('select');
 sel.innerHTML='<option value="">Selecciona tabaco</option>'+data.tobacco.map((p,i)=>`<option value="${i}">${esc(p.brand)} · ${esc(p.flavor)} (${fmt(p.grams)} g)</option>`).join('');
 $('mixParts').appendChild(row);
}
function render(){
 $('stockList').innerHTML=data.tobacco.length?data.tobacco.map((p,i)=>`<div class="stock-item"><div><strong>${esc(p.brand)} · ${esc(p.flavor)}</strong><span class="amount">${fmt(p.grams)} g</span></div><button class="delete" data-delete-tobacco="${i}">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Todavía no hay tabaco añadido.</p>';
 $('coalList').innerHTML=data.coals.length?data.coals.map((c,i)=>`<div class="stock-item"><div><strong>Carbón · ${esc(c.brand)}</strong><span class="amount">${Number(c.units)||0} uds.</span></div><button class="delete" data-delete-coal="${i}">🗑 Eliminar marca</button></div>`).join(''):'<p class="empty">Todavía no hay carbones añadidos.</p>';
 fillSelect('consumeProduct',data.tobacco,'Selecciona tabaco',p=>`${p.brand} · ${p.flavor} (${fmt(p.grams)} g)`);
 fillSelect('consumeCoal',data.coals,'Selecciona marca',c=>`${c.brand} (${c.units} uds.)`);
 fillSelect('mixBowl',data.bowls,'Selecciona cazoleta',b=>`${b.name} · ${b.brand} (${fmt(b.grams)} g)`);
 $('bowlList').innerHTML=data.bowls.length?data.bowls.map((b,i)=>`<div class="stock-item"><div><strong>${esc(b.name)} · ${esc(b.brand)}</strong><span class="amount">${fmt(b.grams)} g</span></div><button class="delete" data-delete-bowl="${i}">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Aún no has guardado cazoletas.</p>';
 $('mixList').innerHTML=data.mixes.length?data.mixes.map((m,i)=>`<div class="history-item"><strong>${esc(m.date)} · ${esc(m.bowl)}</strong><div>${esc((m.parts||[]).map(x=>`${x.name}: ${fmt(x.grams)} g (${x.percent}%)`).join(' + '))}</div><small>Total: ${fmt(m.total)} g</small><button class="delete" data-delete-mix="${i}">🗑 Eliminar registro</button></div>`).join(''):'<p class="empty">Todavía no hay mezclas guardadas.</p>';
 $('history').innerHTML=data.history.length?data.history.map(h=>`<div class="history-item">${esc(h.text)}<small>${esc(h.at)}</small></div>`).join(''):'<p class="empty">Aún no hay movimientos.</p>';
}
$('addTobacco').onclick=()=>{const brand=$('brand').value.trim(),flavor=$('flavor').value.trim(),grams=Number($('grams').value);if(!brand||!flavor||!Number.isFinite(grams)||grams<=0){alert('Introduce marca, sabor y gramos válidos.');return}data.tobacco.push({brand,flavor,grams});log(`Añadidos ${fmt(grams)} g de ${brand} · ${flavor}`);['brand','flavor','grams'].forEach(id=>$(id).value='');save();};
$('addCoal').onclick=()=>{const brand=$('coalBrand').value.trim(),units=Number($('coalAdd').value);if(!brand||!Number.isInteger(units)||units<=0){alert('Introduce una marca y unidades válidas.');return}let item=data.coals.find(c=>c.brand.toLowerCase()===brand.toLowerCase());if(item)item.units=(Number(item.units)||0)+units;else data.coals.push({brand,units});log(`Añadidas ${units} unidades de carbón ${brand}`);$('coalBrand').value='';$('coalAdd').value='';save();};
$('addBowl').onclick=()=>{const name=$('bowlName').value.trim(),brand=$('bowlBrand').value.trim(),grams=Number($('bowlGrams').value);if(!name||!brand||!Number.isFinite(grams)||grams<=0){alert('Indica nombre/modelo, marca y capacidad válida.');return}data.bowls.push({name,brand,grams});log(`Añadida cazoleta ${name} · ${brand} (${fmt(grams)} g)`);['bowlName','bowlBrand','bowlGrams'].forEach(id=>$(id).value='');save();};
$('addMixPart').onclick=()=>addMixRow();
$('mixParts').addEventListener('click',e=>{if(e.target.closest('.remove-part')){const rows=$('mixParts').querySelectorAll('.mix-row');if(rows.length<=1){alert('La mezcla debe tener al menos un tabaco.');return}e.target.closest('.mix-row').remove();}});
$('calculateMix').onclick=()=>{
 const bi=$('mixBowl').value, rows=[...$('mixParts').querySelectorAll('.mix-row')];
 if(bi===''||!rows.length){alert('Selecciona una cazoleta y añade al menos un tabaco.');return}
 const parts=rows.map(r=>({idx:r.querySelector('.mix-tobacco').value,percent:Number(r.querySelector('.mix-percent').value)}));
 if(parts.some(p=>p.idx===''||!Number.isFinite(p.percent)||p.percent<=0)){alert('Selecciona un tabaco y un porcentaje mayor que 0 en cada fila.');return}
 const indexes=parts.map(p=>Number(p.idx));
 if(new Set(indexes).size!==indexes.length){alert('No repitas el mismo producto en una mezcla.');return}
 const sum=parts.reduce((s,p)=>s+p.percent,0);
 if(Math.abs(sum-100)>0.000001){alert(`Los porcentajes suman ${fmt(sum)} %. Deben sumar exactamente 100 %.`);return}
 const bowl=data.bowls[Number(bi)], total=Number(bowl.grams);
 let assigned=0;
 const calculated=parts.map((p,i)=>{const grams=i===parts.length-1?Math.round((total-assigned)*100)/100:Math.round(total*p.percent)/100;assigned+=grams;const tobacco=data.tobacco[Number(p.idx)];return {tobacco,grams,percent:p.percent};});
 const shortage=calculated.filter(x=>Number(x.tobacco.grams)+1e-8<x.grams);
 if(shortage.length){alert('Stock insuficiente:\\n'+shortage.map(x=>`${x.tobacco.brand} · ${x.tobacco.flavor}: necesitas ${fmt(x.grams)} g y tienes ${fmt(x.tobacco.grams)} g.`).join('\\n'));return}
 calculated.forEach(x=>x.tobacco.grams=Math.round((Number(x.tobacco.grams)-x.grams)*100)/100);
 const mix={date:new Date().toLocaleString('es-ES'),bowl:`${bowl.name} · ${bowl.brand}`,total,parts:calculated.map(x=>({name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams,percent:x.percent}))};
 data.mixes.unshift(mix);calculated.forEach(x=>record('tobacco',{name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams}));record('session',{count:1});
 log(`Mezcla ${mix.bowl}: ${mix.parts.map(x=>`${fmt(x.grams)} g de ${x.name} (${x.percent}%)`).join(' + ')}. Descontados del stock.`);
 $('mixResult').innerHTML=`<strong>Mezcla calculada: ${fmt(total)} g</strong><br>${mix.parts.map(x=>`${esc(x.name)}: ${fmt(x.grams)} g (${fmt(x.percent)}%)`).join('<br>')}`;
 save();
};
$('useTobacco').onclick=()=>{const raw=$('consumeProduct').value,n=Number($('consumeGrams').value);if(raw===''||!Number.isFinite(n)||n<=0){alert('Selecciona un tabaco e indica los gramos.');return}const p=data.tobacco[Number(raw)];if(!p||Number(p.grams)+1e-8<n){alert('No hay suficientes gramos en stock.');return}p.grams=Math.round((Number(p.grams)-n)*100)/100;log(`Consumidos ${fmt(n)} g de ${p.brand} · ${p.flavor}`);record('tobacco',{name:`${p.brand} · ${p.flavor}`,grams:n});$('consumeGrams').value='';save();};
$('useCoal').onclick=()=>{const raw=$('consumeCoal').value,n=Number($('coalUse').value);if(raw===''||!Number.isInteger(n)||n<=0){alert('Selecciona una marca e indica unidades válidas.');return}const c=data.coals[Number(raw)];if(!c||n>Number(c.units)){alert('No hay suficientes unidades de esa marca.');return}c.units-=n;log(`Consumidas ${n} unidades de carbón ${c.brand}`);record('coal',{name:c.brand,units:n});$('coalUse').value='';save();};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-delete-tobacco],[data-delete-coal],[data-delete-bowl],[data-delete-mix]');if(!el)return;
 if(el.dataset.deleteTobacco!==undefined){const i=+el.dataset.deleteTobacco,p=data.tobacco[i];if(p&&confirm(`¿Eliminar ${p.brand} · ${p.flavor} del inventario?`)){data.tobacco.splice(i,1);log(`Eliminado producto ${p.brand} · ${p.flavor}`);save();}}
 if(el.dataset.deleteCoal!==undefined){const i=+el.dataset.deleteCoal,c=data.coals[i];if(c&&confirm(`¿Eliminar la marca de carbón ${c.brand} y sus ${c.units} unidades?`)){data.coals.splice(i,1);log(`Eliminada marca de carbón ${c.brand}`);save();}}
 if(el.dataset.deleteBowl!==undefined){const i=+el.dataset.deleteBowl,b=data.bowls[i];if(b&&confirm(`¿Eliminar la cazoleta ${b.name} · ${b.brand}?`)){data.bowls.splice(i,1);log(`Eliminada cazoleta ${b.name} · ${b.brand}`);save();}}
 if(el.dataset.deleteMix!==undefined){const i=+el.dataset.deleteMix;if(confirm('¿Eliminar este registro de mezcla? (No devuelve gramos al stock)')){data.mixes.splice(i,1);save();}}
});
$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial de movimientos?')){data.history=[];save();}};
$('statsMonth').value=monthNow();
$('statsMonth').onchange=renderStats;
$('addSessions').onclick=()=>{const n=Number($('sessionCount').value);if(!Number.isInteger(n)||n<=0){alert('Indica un número de sesiones válido.');return}record('session',{count:n});log(`Registradas ${n} sesiones`);$('sessionCount').value='';save();};
if(!$('mixParts').children.length)addMixRow('100');
render();renderStats();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
