const KEY='mi-stock-v2';
let data=JSON.parse(localStorage.getItem(KEY)||'null');
if(!data){const old=JSON.parse(localStorage.getItem('mi-stock-v1')||'null')||{};data={tobacco:old.tobacco||[],coals:old.coals||0,history:old.history||[],bowls:[],mixes:[]};}
data.bowls=data.bowls||[];data.mixes=data.mixes||[];
const $=id=>document.getElementById(id), fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render()};
const log=text=>{data.history.unshift({text,at:new Date().toLocaleString('es-ES')});data.history=data.history.slice(0,100)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function options(id,items,placeholder,selected){$(id).innerHTML=`<option value="">${placeholder}</option>`+items.map((p,i)=>`<option value="${i}" ${String(i)===String(selected)?'selected':''}>${esc(p.brand)}${p.flavor?' · '+esc(p.flavor):''}${p.grams!==undefined?' ('+fmt(p.grams)+' g)':''}</option>`).join('')}
function render(){
 $('coalCount').textContent=data.coals;
 $('stockList').innerHTML=data.tobacco.length?data.tobacco.map((p,i)=>`<div class="stock-item"><div><strong>${esc(p.brand)} · ${esc(p.flavor)}</strong><span class="amount">${fmt(p.grams)} g</span></div><button class="delete" data-delete-tobacco="${i}" aria-label="Eliminar producto">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Todavía no hay tabaco añadido.</p>';
 options('consumeProduct',data.tobacco,'Selecciona tabaco');options('mixT1',data.tobacco,'Selecciona tabaco');options('mixT2',data.tobacco,'Selecciona tabaco');
 options('mixBowl',data.bowls,'Selecciona cazoleta');
 $('bowlList').innerHTML=data.bowls.length?data.bowls.map((b,i)=>`<div class="stock-item"><strong>${esc(b.brand)}</strong><span class="amount">${fmt(b.grams)} g</span><button class="delete" data-delete-bowl="${i}">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Aún no has guardado cazoletas.</p>';
 $('mixList').innerHTML=data.mixes.length?data.mixes.map((m,i)=>`<div class="history-item"><strong>${esc(m.date)} · ${esc(m.bowl)}</strong><div>${esc(m.parts.map(x=>`${x.name}: ${fmt(x.grams)} g (${x.percent}%)`).join(' + '))}</div><small>Total: ${fmt(m.total)} g</small><button class="delete" data-delete-mix="${i}">🗑 Eliminar registro</button></div>`).join(''):'<p class="empty">Todavía no hay mezclas guardadas.</p>';
 $('history').innerHTML=data.history.length?data.history.map(h=>`<div class="history-item">${esc(h.text)}<small>${esc(h.at)}</small></div>`).join(''):'<p class="empty">Aún no hay movimientos.</p>';
}
$('addTobacco').onclick=()=>{let brand=$('brand').value.trim(),flavor=$('flavor').value.trim(),grams=Number($('grams').value);if(!brand||!flavor||!Number.isFinite(grams)||grams<=0){alert('Introduce marca, sabor y gramos válidos.');return}data.tobacco.push({brand,flavor,grams});log(`Añadidos ${fmt(grams)} g de ${brand} · ${flavor}`);['brand','flavor','grams'].forEach(id=>$(id).value='');save()};
$('addCoal').onclick=()=>{let n=Number($('coalAdd').value);if(!Number.isInteger(n)||n<=0){alert('Introduce unidades válidas.');return}data.coals+=n;log(`Añadidos ${n} carbones`);$('coalAdd').value='';save()};
$('addBowl').onclick=()=>{let brand=$('bowlBrand').value.trim(),grams=Number($('bowlGrams').value);if(!brand||!Number.isFinite(grams)||grams<=0){alert('Indica la marca y la capacidad en gramos.');return}data.bowls.push({brand,grams});log(`Añadida cazoleta ${brand} (${fmt(grams)} g)`);$('bowlBrand').value='';$('bowlGrams').value='';save()};
$('calculateMix').onclick=()=>{
 const bi=$('mixBowl').value,a=Number($('mixT1').value),b=Number($('mixT2').value),p1=Number($('mixP1').value),p2=Number($('mixP2').value);
 if(bi===''||$('mixT1').value===''||$('mixT2').value===''||a===b){alert('Selecciona una cazoleta y dos tabacos distintos.');return}
 if(!Number.isFinite(p1)||!Number.isFinite(p2)||p1<0||p2<0||p1>100||p2>100||Math.abs(p1+p2-100)>0.0001||p1===0||p2===0){alert('Los porcentajes deben ser mayores que 0 y sumar exactamente 100%.');return}
 const bowl=data.bowls[Number(bi)], total=bowl.grams, g1=Math.round(total*p1)/100, g2=Math.round((total-g1)*100)/100, t1=data.tobacco[a],t2=data.tobacco[b];
 if(t1.grams+1e-8<g1||t2.grams+1e-8<g2){alert(`Stock insuficiente. Necesitas ${fmt(g1)} g de ${t1.brand} y ${fmt(g2)} g de ${t2.brand}.`);return}
 t1.grams=Math.round((t1.grams-g1)*100)/100;t2.grams=Math.round((t2.grams-g2)*100)/100;
 const mix={date:new Date().toLocaleString('es-ES'),bowl:bowl.brand,total,parts:[{name:`${t1.brand} · ${t1.flavor}`,grams:g1,percent:p1},{name:`${t2.brand} · ${t2.flavor}`,grams:g2,percent:p2}]};
 data.mixes.unshift(mix);log(`Mezcla ${bowl.brand}: ${fmt(g1)} g de ${t1.brand} (${p1}%) + ${fmt(g2)} g de ${t2.brand} (${p2}%). Descontados del stock.`);$('mixResult').innerHTML=`<strong>Mezcla calculada: ${fmt(total)} g</strong><br>${esc(mix.parts.map(x=>`${x.name}: ${fmt(x.grams)} g (${x.percent}%)`).join(' · '))}`;save();
};
$('useTobacco').onclick=()=>{let i=Number($('consumeProduct').value),n=Number($('consumeGrams').value);if($('consumeProduct').value===''||!Number.isFinite(n)||n<=0){alert('Selecciona un tabaco e indica los gramos.');return}if(!data.tobacco[i]||data.tobacco[i].grams+1e-8<n){alert('No hay suficientes gramos en stock.');return}let p=data.tobacco[i];p.grams=Math.round((p.grams-n)*100)/100;log(`Consumidos ${fmt(n)} g de ${p.brand} · ${p.flavor}`);$('consumeGrams').value='';save()};
$('useCoal').onclick=()=>{let n=Number($('coalUse').value);if(!Number.isInteger(n)||n<=0){alert('Introduce unidades válidas.');return}if(n>data.coals){alert('No hay suficientes carbones.');return}data.coals-=n;log(`Consumidos ${n} carbones`);$('coalUse').value='';save()};
document.addEventListener('click',e=>{let el=e.target.closest('[data-delete-tobacco],[data-delete-bowl],[data-delete-mix]');if(!el)return;
 if(el.dataset.deleteTobacco!==undefined){let i=+el.dataset.deleteTobacco;if(confirm(`¿Eliminar ${data.tobacco[i].brand} · ${data.tobacco[i].flavor} del inventario?`)){let p=data.tobacco.splice(i,1)[0];log(`Eliminado producto ${p.brand} · ${p.flavor}`);save()}}
 if(el.dataset.deleteBowl!==undefined){let i=+el.dataset.deleteBowl;if(confirm(`¿Eliminar la cazoleta ${data.bowls[i].brand}?`)){let b=data.bowls.splice(i,1)[0];log(`Eliminada cazoleta ${b.brand}`);save()}}
 if(el.dataset.deleteMix!==undefined){let i=+el.dataset.deleteMix;if(confirm('¿Eliminar este registro de mezcla? (No devuelve gramos al stock)')){data.mixes.splice(i,1);save()}}
});
$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial de movimientos?')){data.history=[];save()}};
render();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
