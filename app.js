const KEY='mi-stock-v1';
let data=JSON.parse(localStorage.getItem(KEY)||'null')||{tobacco:[],coals:0,history:[]};
const $=id=>document.getElementById(id);
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render()};
const log=(text)=>{data.history.unshift({text,at:new Date().toLocaleString('es-ES')});data.history=data.history.slice(0,100)};
function render(){
 $('coalCount').textContent=data.coals;
 $('stockList').innerHTML=data.tobacco.length?data.tobacco.map((p,i)=>`<div class="stock-item"><strong>${esc(p.brand)} · ${esc(p.flavor)}</strong><span class="amount">${p.grams} g</span><div class="muted">En inventario</div></div>`).join(''):'<p class="empty">Todavía no hay tabaco añadido.</p>';
 $('consumeProduct').innerHTML='<option value="">Selecciona tabaco</option>'+data.tobacco.map((p,i)=>`<option value="${i}">${esc(p.brand)} · ${esc(p.flavor)} (${p.grams} g)</option>`).join('');
 $('history').innerHTML=data.history.length?data.history.map(h=>`<div class="history-item">${esc(h.text)}<small>${esc(h.at)}</small></div>`).join(''):'<p class="empty">Aún no hay movimientos.</p>';
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('addTobacco').onclick=()=>{let brand=$('brand').value.trim(),flavor=$('flavor').value.trim(),grams=Number($('grams').value);if(!brand||!flavor||!Number.isInteger(grams)||grams<=0){alert('Introduce marca, sabor y gramos válidos.');return}data.tobacco.push({brand,flavor,grams});log(`Añadidos ${grams} g de ${brand} · ${flavor}`);$('brand').value='';$('flavor').value='';$('grams').value='';save()};
$('addCoal').onclick=()=>{let n=Number($('coalAdd').value);if(!Number.isInteger(n)||n<=0){alert('Introduce unidades válidas.');return}data.coals+=n;log(`Añadidos ${n} carbones`);$('coalAdd').value='';save()};
$('useTobacco').onclick=()=>{let i=Number($('consumeProduct').value),n=Number($('consumeGrams').value);if($('consumeProduct').value===''||!Number.isInteger(n)||n<=0){alert('Selecciona un tabaco e indica los gramos.');return}if(!data.tobacco[i]||data.tobacco[i].grams<n){alert('No hay suficientes gramos en stock.');return}let p=data.tobacco[i];p.grams-=n;log(`Consumidos ${n} g de ${p.brand} · ${p.flavor}`);if(!p.grams)data.tobacco.splice(i,1);$('consumeGrams').value='';save()};
$('useCoal').onclick=()=>{let n=Number($('coalUse').value);if(!Number.isInteger(n)||n<=0){alert('Introduce unidades válidas.');return}if(n>data.coals){alert('No hay suficientes carbones.');return}data.coals-=n;log(`Consumidos ${n} carbones`);$('coalUse').value='';save()};
$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial de movimientos?')){data.history=[];save()}};
render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));