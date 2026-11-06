// Mi Stock · almacenamiento compatible y no destructivo
const KEY='mi-stock-v1';
const LEGACY_KEY='mi-stock-v2';
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const old1=readJSON(KEY), old2=readJSON(LEGACY_KEY);
let source=old2 || old1 || {};
const data={
 tobacco:Array.isArray(source.tobacco)?source.tobacco:[],
 coals:Array.isArray(source.coals)?source.coals.map(c=>typeof c==='string'?{brand:c,units:0}:c):[],
 history:Array.isArray(source.history)?source.history:[],
 bowls:Array.isArray(source.bowls)?source.bowls:[],
 mixes:Array.isArray(source.mixes)?source.mixes:[]
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
 $('statsSummary').innerHTML=`<strong>${month}</strong><br>Tabaco consumido: ${fmt(totalGrams)} g · Carbones: ${totalCoal} · Sesiones: ${totalSessions}<br>Media por sesión: ${totalSessions?fmt(totalGrams/totalSessions):'—'} g y ${totalSessions?fmt(totalCoal/totalSessions):'—'} carbones`;
 // Comparativa con el mes anterior seleccionado.
 const [yy,mm]=month.split('-').map(Number), prevDate=new Date(yy,mm-2,1), prevMonth=`${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
 const prevEvents=data.consumption.filter(e=>e.date&&e.date.startsWith(prevMonth));
 const prevGrams=prevEvents.filter(e=>e.kind==='tobacco').reduce((s,e)=>s+Number(e.grams||0),0);
 const prevCoal=prevEvents.filter(e=>e.kind==='coal').reduce((s,e)=>s+Number(e.units||0),0);
 const prevSessions=prevEvents.filter(e=>e.kind==='session').reduce((s,e)=>s+Number(e.count||0),0);
 const maxMonth=Math.max(1,totalGrams,prevGrams), monthScale=120/maxMonth;
 $('monthCompare').innerHTML=`<div class="compare-chart"><div class="compare-col"><strong>${fmt(prevGrams)} g</strong><div class="compare-bar previous" style="height:${Math.max(4,prevGrams*monthScale)}px"></div><span>${prevMonth}</span></div><div class="compare-col"><strong>${fmt(totalGrams)} g</strong><div class="compare-bar current" style="height:${Math.max(4,totalGrams*monthScale)}px"></div><span>${month}</span></div></div><p class="chart-note">Tabaco consumido · Mes anterior frente al seleccionado</p><div class="stat-day">Carbones: ${prevCoal} → ${totalCoal} · Sesiones: ${prevSessions} → ${totalSessions}</div>`;
 // Agrupar consumo del mes seleccionado en semanas naturales del mes.
 const weeks={};
 events.forEach(e=>{const d=new Date(`${e.date}T12:00:00`),w=Math.ceil(d.getDate()/7),key=`Semana ${w}`;(weeks[key]??={grams:0,coal:0,sessions:0});if(e.kind==='tobacco')weeks[key].grams+=Number(e.grams||0);if(e.kind==='coal')weeks[key].coal+=Number(e.units||0);if(e.kind==='session')weeks[key].sessions+=Number(e.count||0)});
 const weekRows=Object.entries(weeks), weekMax=Math.max(1,...weekRows.map(x=>x[1].grams));
 $('weeklyStats').innerHTML=weekRows.length?`<div class="week-chart">${weekRows.map(([k,v])=>`<div class="week-col"><strong>${fmt(v.grams)} g</strong><div class="week-bar" style="height:${Math.max(4,v.grams/weekMax*112)}px"></div><span>${k.replace('Semana ','Sem. ')}</span></div>`).join('')}</div>`:'<p class="empty">No hay actividad para este mes.</p>';
 const bars=(obj,suffix)=>{const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...entries.map(x=>x[1]));return entries.length?`<div class="rank-chart">${entries.map(([name,val])=>`<div class="rank-row"><div class="rank-label"><span>${esc(name)}</span><strong>${fmt(val)} ${suffix}</strong></div><div class="stat-track"><div class="stat-fill" style="width:${val/max*100}%"></div></div></div>`).join('')}</div>`:'<p class="empty">Todavía no hay consumos registrados este mes.</p>'};
 $('tobaccoChart').innerHTML=bars(tobacco,'g');
 const dailyCoal=Object.entries(coal).sort((a,b)=>a[0].localeCompare(b[0]));
 const coalMax=Math.max(1,...dailyCoal.map(x=>x[1]));
 $('coalChart').innerHTML=dailyCoal.length?`<div class="week-chart">${dailyCoal.map(([day,val])=>`<div class="week-col"><strong>${val}</strong><div class="week-bar" style="height:${Math.max(4,val/coalMax*112)}px"></div><span>${day.slice(-2)}</span></div>`).join('')}</div><p class="chart-note">Día del mes · unidades</p>`:'<p class="empty">Todavía no hay carbones registrados este mes.</p>';
 $('dailyStats').innerHTML=Object.keys(days).sort().reverse().map(day=>{const d=days[day],fl=Object.entries(d.tobacco).map(([n,g])=>`${esc(n)}: ${fmt(g)} g`).join('<br>')||'Sin tabaco registrado';return `<div class="stat-day"><strong>${day}</strong><br>${fl}<br>Carbones: ${d.coal} · Sesiones: ${d.sessions}</div>`}).join('')||'<p class="empty">No hay actividad registrada en este mes.</p>';
 // Sesiones registradas manualmente: lista visible dentro de Estadísticas.
 const manual=data.consumption.map((e,i)=>({e,i})).filter(x=>x.e.kind==='session' && !x.e.mixId).sort((a,b)=>String(b.e.date).localeCompare(String(a.e.date)));
 $('manualSessionsList').innerHTML=manual.length?manual.map(({e,i})=>`<div class="history-item"><strong>${esc(e.date||'Sin fecha')}</strong><div>${Number(e.count||0)} sesión(es)</div><button class="delete" data-delete-manual-session="${i}">🗑 Eliminar sesión</button></div>`).join(''):'<p class="empty">No hay sesiones manuales registradas.</p>';

 // Mostrar solo las mezclas que siguen incluidas en estadísticas.
 const statsMixes=data.mixes.filter(m=>!m.statsExcluded);
 $('statsMixList').innerHTML=statsMixes.length?statsMixes.map(m=>{
  const parts=(m.parts||[]).map(x=>`${esc(x.name)}: ${fmt(x.grams)} g`).join('<br>');
  const linked=!!m.id&&data.consumption.some(e=>e.mixId===m.id);
  return `<div class="history-item"><strong>Mezcla · ${esc(m.date||'Sin fecha')}</strong><div>${parts||esc(m.bowl||'Mezcla guardada')}</div><small>${fmt(m.total||0)} g</small><button class="delete" data-delete-stat-mix="${esc(m.id||'')}" ${!m.id?'disabled':''}>🗑 Eliminar de estadísticas</button>${!linked?'<small>Sin registros de consumo vinculados; se ocultará de esta lista.</small>':''}</div>`;
 }).join(''):'<p class="empty">No hay mezclas guardadas.</p>';

}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Catálogo Hookymia: 15 marcas y 363 sabores. Las sugerencias no limitan la entrada manual.
const flavorCatalog = {"187 Tobacco":["040","Beach Vibez","Dd Music","Ello&Rafa","I Love Hamburg","Iscrea Pistoco","Juicy Puzzy","New Flash","Pink Mellow","Red Light District"],"Adalya":["Adalya Power","Bagdadi","Berlin Nights","Billionaire","Blue Dragan","Blue I'ss","Blue Yellow","Chwng Wood Kizz","Cindy's","Desperado","Dragan Code","Dulcinea","Eskimo Leon","Esmeralda","Exotic Rush","Gipsy Kings","Green Leon Kizz","Hawaii","I'ss","I'ss Boni","I'ss Lie on the R.cks","I'ss Kaktu","Jungle Jungle","Kizz","Krosty App","L.Kill","La Bonita","Lady Killer","Leon Pi","Love66","M.M.","Manko Tanko","Manko Tanko I'ss","Moon Dream","Pair Kizz","Paradiso I'ss","Passion Kizz","Punkman","Pych Blue Kizz","Red Alert I'ss","Rhapsody","Skyfall","Sweess Boom","Three Angels","Tony's Destiny","Twist Pi","Two App","Two Yellow I'ss","Tynky Wynky","Van","Waterlon Kizz"],"Al Fakher":["Amber Rise","Big Blue","Big Blue Green","Big Coral","Big Green","Big Red Splash","Big Yellow Green","Catwalk Melody","Cinnasense","Crimson Crush","Exotic Scape","Flower Pop","Forever Fantasy","Frost Double Crunch","Goova","Grapio","Grapio Green","Grapio Night","Green Chu","Green Velvet","Hello Harmony","Indigo Crescendo","Ivory Gold","Japanese Sunrise","Jazzy Summer","Lucid Dream","Magic Love","Majestic Aurora","Malone","Midnights Dreams","Polar Freeze","Red Green Smash","Red Patch","Red Smash","Runway Rhapsody","Showtime Symphony","Snowy Fuchsia Green","Summer Mix","Sundow Serenade","The Double Crunch","Tropic Treat","Twiwi","White Flash","White Pods","Wicked Esmerald","Winter Dream","Winter Glow","Winter Wonder","Yellow"],"Al-Waha":["66","Alibaba","Amor","Big Boy","Blue Lion","Blue Van Cream","Casper","Dirty Thirty","Dólar","Fck 66","Fresh Bon","Fresh Cherr","Fresh GM","Fresh Loco","Fresh Mang Tang","Fresh Mary","Fresh Pea","Friday 13","Funky Fresh","Grap Min","Gumba","Hot’n Cold","Kaktus Jack","Lazourdi","Lcorce","Lem Min","Libella Swing","Libuma","Mang Lem Ned","Masala","Min Fusion","Panana Van","Paradisio","Pikchu","Pussy Wagon","Ringle Rangle","Rosito","Sakura","Sodala","Sweet Africa","The Devil","Tornado","Trex","Two App","Veneto","Zero Gravity"],"Anda":["Bestia Blanca","Blue Toteta","Casinada","Chupala","Clipporizz","Crim Pay","Mentido","Mongolo","Optimus Leim","Pygman","Red & Green","Sour Dia","Temptation","Temptation Mandingo","Tiki Taka","Tropido","Yo Girl"],"Blackburn":["Anans Shok","Bapai Dinner","Blckm Lmnd","Bromnie","Celebr(i) Crisp","Chuper Grupp(er)","Donatella","Ekzotic M","Elka","Epic Guru","Fei Jem","Frost Peak","Glacial Tot","Green Stoner","Green T","Haribon","Kane Myata","Kram Shok","Lemm Shok","Malibu","Na Chille","Overdose","Persik Guru","Raserry","Real P.F.","Red Energy","Skitlezz","Summer Basket","Vallas Las","Zerry Shock","Zestybliss"],"BlueHorse":["Alhambra","Amsterdam Lights","Baku Nights","Beirut Al Araq","Discovery","Istanbulue","La Beirut","London Fog","Mi Amor","Moskow Evenings","No Woman No Cry","Paris Romantique","Rio Kiss","Sputnik","Strangers in the Night","The Coldest Green","The Perfect Storm","Thor’s Flash","Tokyo Desire","Venezia Serenata","Wind Of Amazon"],"BLYAT":["Buttlover","Clipporizz","Cono Verde","Mentido","Optimus Leim","Swiet Swirl","Temptation","Tiki Taka"],"Cannibales Club":["Cold Blood","Dark Blood","Lion","My Bro","White Panther","Wild"],"Capital Bra Smoke":["365 Tage","Black Annab","Blody Nane","Huba Cola","Lecker Lecker","Naughty Girl","Pomshwk","Wann Dann"],"Dozaj":["Amnesia","BumBum","Carnival","Casablanca","Dead Sea","Eternal","Euphoria","Filomena","Furious","Huracan","Invisible","Jelly Bear","Krasava","Lambada","Lío","Mangolia","Nairobi","Old School","Purple","Rich","Solo","Tokyo","Uff"],"Dozaj Black":["¡Joe, qué frío!","Berga","Blast","Booster","Chester","CIA","Code","Dark Purple","Double Manza","Explosion","Infinity","Kyoto","Lux","Max","Nube","Paradox","Prime","R-Gasm","S.O.S","Suka","Terry Miss You","Tornado","Vampiro"],"Forever Gold":["After","Albpesgo","American Gangster","Black","Border","Budapest","Crazy Izu","Dark Blue","Drácula","Dragon Daddy","Evil Witch","Fantasy","Faruk & Farik","Flowers","Freak","Galben","Go with The Flow","Green","Gro Lych","Heaven","Hurricane","Island","Jazz Music","Jess Pirate","Kekoko","Little Ghost","Monkey","Mow","Mr. Curry","O La Lá","Piggy BBQ","Pinkman Black","Pinkman By Love 78","Pinkman Storm","Plum","Purple","Rakka","Red Code","Russet","Scape Room","Secret History","Space","The Cave","Timothy","Wake Up","White Night"],"Holster":["!Z Bomb","!Z Finger","Bloody Punch","Blue Punch","Bono","Gp 2.0","IZ Kactuz","Lee Punch","Miss Joosy","MR John","Mr. C","P-Rex","Peery Punch","Quwi Punch","Smurf Daddy","Unicorn","Verdacho","Wild Punch","Willy Punch","Winter Edition","Yellow Punch"],"Holster Noir":["!Z Kaktuz","Charly Punch","Miss Joosy"]};
// Selectores nativos: evitan los problemas de datalist/autocompletado de Safari iOS.
const brandSelect=$('brand');
brandSelect.innerHTML='<option value="">Selecciona una marca</option>'+Object.keys(flavorCatalog).map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
function updateCatalogSuggestions(){
 const match=brandSelect.value;
 const flavors=match?flavorCatalog[match]:[];
 const flavorSelect=$('flavor');
 flavorSelect.innerHTML='<option value="">'+(match?'Selecciona un sabor':'Primero selecciona una marca')+'</option>'+flavors.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('');
 flavorSelect.disabled=!match;
}
brandSelect.addEventListener('change',updateCatalogSuggestions);
updateCatalogSuggestions();
function fillSelect(id,items,placeholder,labelFn){
 const el=$(id),previous=el.value;
 el.innerHTML=`<option value="">${placeholder}</option>`+items.map((x,i)=>`<option value="${i}">${esc(labelFn(x))}</option>`).join('');
 if(previous!=='' && Number(previous)<items.length) el.value=previous;
}
function refreshMixSelectors(reset=false){
 document.querySelectorAll('.mix-tobacco').forEach(sel=>{
  const previous=reset?'':sel.value;
  sel.innerHTML='<option value="">Selecciona tabaco</option>'+data.tobacco.map((p,i)=>`<option value="${i}">${esc(p.brand)} · ${esc(p.flavor)} (${fmt(p.grams)} g)</option>`).join('');
  if(previous!=='' && Number(previous)<data.tobacco.length) sel.value=previous;
 });
}
function addMixRow(defaultPercent=''){
 const row=document.createElement('div');row.className='mix-row';
 row.innerHTML=`<label>Tabaco<select class="mix-tobacco"><option value="">Selecciona tabaco</option></select></label>
 <label>Porcentaje (%)<input class="mix-percent" type="number" min="0.01" max="100" step="0.01" placeholder="Ej. 25" value="${defaultPercent}"></label>
 <button type="button" class="delete remove-part" aria-label="Quitar tabaco">✕</button>`;
 $('mixParts').appendChild(row);
 refreshMixSelectors(true);
}
function render(){
 refreshMixSelectors();
 $('stockList').innerHTML=data.tobacco.length?data.tobacco.map((p,i)=>`<div class="stock-item"><div><strong>${esc(p.brand)} · ${esc(p.flavor)}</strong><span class="amount">${fmt(p.grams)} g</span>${Number(p.grams)<20?'<span class="stock-warning">⚠️ STOCK BAJO · Menos de 20 g</span>':''}</div><button class="delete" data-delete-tobacco="${i}">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Todavía no hay tabaco añadido.</p>';
 $('coalList').innerHTML=data.coals.length?data.coals.map((c,i)=>`<div class="stock-item"><div><strong>Carbón · ${esc(c.brand)}</strong><span class="amount">${Number(c.units)||0} uds.</span>${Number(c.units)<20?'<span class="stock-warning">⚠️ STOCK BAJO · Menos de 20 carbones</span>':''}</div><button class="delete" data-delete-coal="${i}">🗑 Eliminar marca</button></div>`).join(''):'<p class="empty">Todavía no hay carbones añadidos.</p>';
 const lowTobacco=data.tobacco.filter(p=>Number(p.grams)<20);
 const lowCoal=data.coals.filter(c=>Number(c.units)<20);
 $('lowStockAlerts').innerHTML=(lowTobacco.length||lowCoal.length)?`<div class="low-stock-banner"><strong>⚠️ Aviso de stock bajo</strong>${lowTobacco.map(p=>`<div>Tabaco: ${esc(p.brand)} · ${esc(p.flavor)} — ${fmt(p.grams)} g</div>`).join('')}${lowCoal.map(c=>`<div>Carbón: ${esc(c.brand)} — ${Number(c.units)||0} unidades</div>`).join('')}</div>`:'<div class="stock-ok">✓ Todo el stock está en 20 o más</div>';
 fillSelect('consumeProduct',data.tobacco,'Selecciona tabaco',p=>`${p.brand} · ${p.flavor} (${fmt(p.grams)} g)`);
 fillSelect('mixCoal',data.coals,'Selecciona marca de carbón',c=>`${c.brand} (${c.units} uds.)`);
 fillSelect('mixBowl',data.bowls,'Selecciona cazoleta',b=>`${b.name} · ${b.brand} (${fmt(b.grams)} g)`);
 $('bowlList').innerHTML=data.bowls.length?data.bowls.map((b,i)=>`<div class="stock-item"><div><strong>${esc(b.name)} · ${esc(b.brand)}</strong><span class="amount">${fmt(b.grams)} g</span></div><button class="delete" data-delete-bowl="${i}">🗑 Eliminar</button></div>`).join(''):'<p class="empty">Aún no has guardado cazoletas.</p>';
 $('mixList').innerHTML=data.mixes.length?data.mixes.map((m,i)=>`<div class="history-item"><strong>${esc(m.date)} · ${esc(m.bowl)}</strong><div>${esc((m.parts||[]).map(x=>`${x.name}: ${fmt(x.grams)} g (${x.percent}%)`).join(' + '))}</div><small>Total: ${fmt(m.total)} g</small><button class="delete" data-delete-mix="${i}">🗑 Eliminar registro</button></div>`).join(''):'<p class="empty">Todavía no hay mezclas guardadas.</p>';
 $('history').innerHTML=data.history.length?data.history.map(h=>`<div class="history-item">${esc(h.text)}<small>${esc(h.at)}</small></div>`).join(''):'<p class="empty">Aún no hay movimientos.</p>';
}
$('addTobacco').onclick=()=>{const brand=$('customBrand').value.trim()||$('brand').value.trim(),flavor=$('customFlavor').value.trim()||$('flavor').value.trim(),grams=Number($('grams').value);if(!brand||!flavor||!Number.isFinite(grams)||grams<=0){alert('Introduce una marca, un sabor y unos gramos válidos. Puedes elegirlos del catálogo o escribirlos manualmente.');return}data.tobacco.push({brand,flavor,grams});log(`Añadidos ${fmt(grams)} g de ${brand} · ${flavor}`);['brand','flavor','customBrand','customFlavor','grams'].forEach(id=>$(id).value='');updateCatalogSuggestions();save();};
$('addCoal').onclick=()=>{const brand=$('coalBrand').value.trim(),units=Number($('coalAdd').value);if(!brand||!Number.isInteger(units)||units<=0){alert('Introduce una marca y unidades válidas.');return}let item=data.coals.find(c=>c.brand.toLowerCase()===brand.toLowerCase());if(item)item.units=(Number(item.units)||0)+units;else data.coals.push({brand,units});log(`Añadidas ${units} unidades de carbón ${brand}`);$('coalBrand').value='';$('coalAdd').value='';save();};
$('addBowl').onclick=()=>{const name=$('bowlName').value.trim(),brand=$('bowlBrand').value.trim(),grams=Number($('bowlGrams').value);if(!name||!brand||!Number.isFinite(grams)||grams<=0){alert('Indica nombre/modelo, marca y capacidad válida.');return}data.bowls.push({name,brand,grams});log(`Añadida cazoleta ${name} · ${brand} (${fmt(grams)} g)`);['bowlName','bowlBrand','bowlGrams'].forEach(id=>$(id).value='');save();};
$('addMixPart').onclick=()=>addMixRow();
$('mixParts').addEventListener('click',e=>{if(e.target.closest('.remove-part')){const rows=$('mixParts').querySelectorAll('.mix-row');if(rows.length<=1){alert('La mezcla debe tener al menos un tabaco.');return}e.target.closest('.mix-row').remove();}});
$('calculateMix').onclick=()=>{
 refreshMixSelectors();
 const bi=$('mixBowl').value, rows=[...$('mixParts').querySelectorAll('.mix-row')];
 if(bi===''||!rows.length){alert('Selecciona una cazoleta y añade al menos un tabaco.');return}
 const coalIndex=$('mixCoal').value, coalUnits=Number($('mixCoalUse').value);
 if(coalIndex===''||!Number.isInteger(coalUnits)||coalUnits<=0){alert('Selecciona una marca de carbón e indica cuántos carbones has utilizado.');return}
 const coalStock=data.coals[Number(coalIndex)];
 if(!coalStock||coalUnits>Number(coalStock.units)){alert('No hay suficientes unidades de esa marca de carbón.');return}
 const parts=rows.map(r=>({idx:r.querySelector('.mix-tobacco').value,percent:Number(r.querySelector('.mix-percent').value)}));
 if(parts.some(p=>p.idx===''||!data.tobacco[Number(p.idx)]||!Number.isFinite(p.percent)||p.percent<=0)){alert('Selecciona un tabaco y un porcentaje mayor que 0 en cada fila.');return}
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
 coalStock.units=Number(coalStock.units)-coalUnits;
 const mixId=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());
 const mix={id:mixId,date:new Date().toLocaleString('es-ES'),bowl:`${bowl.name} · ${bowl.brand}`,total,parts:calculated.map(x=>({name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams,percent:x.percent}))};
 data.mixes.unshift(mix);calculated.forEach(x=>record('tobacco',{mixId,name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams}));record('coal',{mixId,name:coalStock.brand,units:coalUnits});record('session',{mixId,count:1});
 $('mixCoalUse').value='';
 data.history.unshift({mixId,text:`Mezcla ${mix.bowl}: ${mix.parts.map(x=>`${fmt(x.grams)} g de ${x.name} (${x.percent}%)`).join(' + ')}. Descontados del stock.`,at:new Date().toLocaleString('es-ES')});
 $('mixResult').innerHTML=`<strong>Mezcla calculada: ${fmt(total)} g</strong><br>${mix.parts.map(x=>`${esc(x.name)}: ${fmt(x.grams)} g (${fmt(x.percent)}%)`).join('<br>')}`;
 save();
};
$('useTobacco').onclick=()=>{const raw=$('consumeProduct').value,n=Number($('consumeGrams').value);if(raw===''||!Number.isFinite(n)||n<=0){alert('Selecciona un tabaco e indica los gramos.');return}const p=data.tobacco[Number(raw)];if(!p||Number(p.grams)+1e-8<n){alert('No hay suficientes gramos en stock.');return}p.grams=Math.round((Number(p.grams)-n)*100)/100;log(`Consumidos ${fmt(n)} g de ${p.brand} · ${p.flavor}`);record('tobacco',{name:`${p.brand} · ${p.flavor}`,grams:n});$('consumeGrams').value='';save();};

document.addEventListener('click',e=>{
 const el=e.target.closest('[data-delete-tobacco],[data-delete-coal],[data-delete-bowl],[data-delete-mix]');if(!el)return;
 if(el.dataset.deleteTobacco!==undefined){const i=+el.dataset.deleteTobacco,p=data.tobacco[i];if(p&&confirm(`¿Eliminar ${p.brand} · ${p.flavor} del inventario?`)){data.tobacco.splice(i,1);refreshMixSelectors(true);log(`Eliminado producto ${p.brand} · ${p.flavor}`);save();}}
 if(el.dataset.deleteCoal!==undefined){const i=+el.dataset.deleteCoal,c=data.coals[i];if(c&&confirm(`¿Eliminar la marca de carbón ${c.brand} y sus ${c.units} unidades?`)){data.coals.splice(i,1);log(`Eliminada marca de carbón ${c.brand}`);save();}}
 if(el.dataset.deleteBowl!==undefined){const i=+el.dataset.deleteBowl,b=data.bowls[i];if(b&&confirm(`¿Eliminar la cazoleta ${b.name} · ${b.brand}?`)){data.bowls.splice(i,1);log(`Eliminada cazoleta ${b.name} · ${b.brand}`);save();}}
 if(el.dataset.deleteMix!==undefined){const i=+el.dataset.deleteMix;if(confirm('¿Eliminar esta mezcla y sus datos asociados de las estadísticas? Los gramos descontados NO se devolverán al stock.')){const mix=data.mixes[i];if(mix){if(mix.id){data.consumption=data.consumption.filter(e=>e.mixId!==mix.id);data.history=data.history.filter(h=>h.mixId!==mix.id);}data.mixes.splice(i,1);save();}}}
});
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-delete-manual-session]');
 if(!btn)return;
 const index=Number(btn.dataset.deleteManualSession);
 const item=data.consumption[index];
 if(!item||item.kind!=='session')return;
 if(!confirm(`¿Eliminar el registro de ${Number(item.count||0)} sesión(es) del ${item.date||'sin fecha'}? Esta acción solo afecta a las estadísticas.`))return;
 data.consumption.splice(index,1);
 save();
});
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-delete-stat-mix]');
 if(!btn)return;
 const id=btn.dataset.deleteStatMix;
 if(!confirm('¿Eliminar esta mezcla de las estadísticas? Se borrarán sus registros de consumo y sesión. Los gramos NO se devolverán al stock.'))return;
 data.consumption=data.consumption.filter(item=>item.mixId!==id);
 const mix=data.mixes.find(item=>String(item.id)===String(id));
 if(mix)mix.statsExcluded=true;
 // La mezcla permanece en Mis mezclas; solo se oculta de Estadísticas.
 save();
});
$('clearHistory').onclick=()=>{if(confirm('¿Borrar todo el historial de movimientos?')){data.history=[];save();}};
$('statsMonth').value=monthNow();
$('statsMonth').onchange=renderStats;
$('addSessions').onclick=()=>{const n=Number($('sessionCount').value);if(!Number.isInteger(n)||n<=0){alert('Indica un número de sesiones válido.');return}record('session',{count:n,manual:true});log(`Registradas ${n} sesiones`);$('sessionCount').value='';save();};

// Navegación principal
function showTab(tab){
 document.querySelectorAll('[data-tab]').forEach(el=>{el.hidden=el.dataset.tab!==tab;});
 document.querySelectorAll('[data-tab-target]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tabTarget===tab));
 window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-tab-target]').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tabTarget)));
document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.go)));
showTab('home');

if(!$('mixParts').children.length)addMixRow('100');
render();renderStats();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
