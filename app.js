// Mi Stock · almacenamiento compatible y no destructivo
const KEY='mi-stock-v1';
const LEGACY_KEY='mi-stock-v2';
const readJSON=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const old1=readJSON(KEY), old2=readJSON(LEGACY_KEY);
let source=old1 || old2 || {};
const data={
 tobacco:Array.isArray(source.tobacco)?source.tobacco:[],
 coals:Array.isArray(source.coals)?source.coals.map(c=>typeof c==='string'?{brand:c,units:0}:c):[],
 history:Array.isArray(source.history)?source.history:[],
 bowls:Array.isArray(source.bowls)?source.bowls:[],
 mixes:Array.isArray(source.mixes)?source.mixes:[],
 recipes:Array.isArray(source.recipes)?source.recipes:[]
};
// Si existe v2, se toma como la versión más reciente. La copia v2 original no se borra.
if(typeof source.coals==='number' && source.coals>0) data.coals=[{brand:'Sin marca (stock anterior)',units:source.coals}];
if(!old1 && old2) {
  // Migrar v2 solo si todavía no existe la base v1. Nunca sobrescribir datos nuevos con una copia antigua.
  localStorage.setItem(KEY,JSON.stringify(data));
}
const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));render();renderStats()};
const log=text=>{data.history.unshift({text,at:new Date().toLocaleString('es-ES')});data.history=data.history.slice(0,150)};
data.consumption=Array.isArray(source.consumption)?source.consumption:[];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const record=(kind,details)=>data.consumption.push({date:today(),kind,...details});

// Recuperar mezclas preparadas en versiones anteriores que descontaron stock,
// pero no llegaron a guardarse en data.mixes. Se reconstruyen desde consumo e historial.
(()=>{
 const known=new Set(data.mixes.map(m=>String(m.id)));
 const groups=new Map();
 data.consumption.filter(e=>e.mixId).forEach(e=>{
  const id=String(e.mixId);
  if(known.has(id))return;
  if(!groups.has(id))groups.set(id,[]);
  groups.get(id).push(e);
 });
 let recovered=false;
 for(const [id,events] of groups){
  const tobacco=events.filter(e=>e.kind==='tobacco');
  if(!tobacco.length)continue;
  const coal=events.find(e=>e.kind==='coal');
  const session=events.find(e=>e.kind==='session');
  const hist=data.history.find(h=>String(h.mixId)===id);
  const text=hist?.text||'';
  const bowlMatch=text.match(/^Mezcla (.*?):/);
  const parts=tobacco.map(e=>({name:e.name||'Tabaco',grams:Number(e.grams||0),percent:0}));
  const total=parts.reduce((sum,p)=>sum+p.grams,0);
  data.mixes.push({
   id,
   date:hist?.at||events[0]?.date||'Fecha anterior',
   bowl:bowlMatch?.[1]||'Mezcla recuperada',
   total,
   parts,
   coalBrand:coal?.name||'',
   coalUnits:Number(coal?.units||0),
   recovered:true
  });
  recovered=true;
 }
 if(recovered)localStorage.setItem(KEY,JSON.stringify({...data,consumption:data.consumption}));
})();
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

let lastCalculatedMix=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Catálogo Hookymia: 15 marcas y 363 sabores. Las sugerencias no limitan la entrada manual.
const flavorCatalog = {"187 Tobacco":["040","Beach Vibez","Dd Music","Ello&Rafa","I Love Hamburg","Iscrea Pistoco","Juicy Puzzy","New Flash","Pink Mellow","Red Light District"],"Adalya":["Adalya Power","Bagdadi","Berlin Nights","Billionaire","Blue Dragan","Blue I'ss","Blue Yellow","Chwng Wood Kizz","Cindy's","Desperado","Dragan Code","Dulcinea","Eskimo Leon","Esmeralda","Exotic Rush","Gipsy Kings","Green Leon Kizz","Hawaii","I'ss","I'ss Boni","I'ss Lie on the R.cks","I'ss Kaktu","Jungle Jungle","Kizz","Krosty App","L.Kill","La Bonita","Lady Killer","Leon Pi","Love66","M.M.","Manko Tanko","Manko Tanko I'ss","Moon Dream","Pair Kizz","Paradiso I'ss","Passion Kizz","Punkman","Pych Blue Kizz","Red Alert I'ss","Rhapsody","Skyfall","Sweess Boom","Three Angels","Tony's Destiny","Twist Pi","Two App","Two Yellow I'ss","Tynky Wynky","Van","Waterlon Kizz"],"Al Fakher":["Amber Rise","Big Blue","Big Blue Green","Big Coral","Big Green","Big Red Splash","Big Yellow Green","Catwalk Melody","Cinnasense","Crimson Crush","Exotic Scape","Flower Pop","Forever Fantasy","Frost Double Crunch","Goova","Grapio","Grapio Green","Grapio Night","Green Chu","Green Velvet","Hello Harmony","Indigo Crescendo","Ivory Gold","Japanese Sunrise","Jazzy Summer","Lucid Dream","Magic Love","Majestic Aurora","Malone","Midnights Dreams","Polar Freeze","Red Green Smash","Red Patch","Red Smash","Runway Rhapsody","Showtime Symphony","Snowy Fuchsia Green","Summer Mix","Sundow Serenade","The Double Crunch","Tropic Treat","Twiwi","White Flash","White Pods","Wicked Esmerald","Winter Dream","Winter Glow","Winter Wonder","Yellow"],"Al-Waha":["66","Alibaba","Amor","Big Boy","Blue Lion","Blue Van Cream","Casper","Dirty Thirty","Dólar","Fck 66","Fresh Bon","Fresh Cherr","Fresh GM","Fresh Loco","Fresh Mang Tang","Fresh Mary","Fresh Pea","Friday 13","Funky Fresh","Grap Min","Gumba","Hot’n Cold","Kaktus Jack","Lazourdi","Lcorce","Lem Min","Libella Swing","Libuma","Mang Lem Ned","Masala","Min Fusion","Panana Van","Paradisio","Pikchu","Pussy Wagon","Ringle Rangle","Rosito","Sakura","Sodala","Sweet Africa","The Devil","Tornado","Trex","Two App","Veneto","Zero Gravity"],"Anda":["Bestia Blanca","Blue Toteta","Casinada","Chupala","Clipporizz","Crim Pay","Mentido","Mongolo","Optimus Leim","Pygman","Red & Green","Sour Dia","Temptation","Temptation Mandingo","Tiki Taka","Tropido","Yo Girl"],"Blackburn":["Anans Shok","Bapai Dinner","Blckm Lmnd","Bromnie","Celebr(i) Crisp","Chuper Grupp(er)","Donatella","Ekzotic M","Elka","Epic Guru","Fei Jem","Frost Peak","Glacial Tot","Green Stoner","Green T","Haribon","Kane Myata","Kram Shok","Lemm Shok","Malibu","Na Chille","Overdose","Persik Guru","Raserry","Real P.F.","Red Energy","Skitlezz","Summer Basket","Vallas Las","Zerry Shock","Zestybliss"],"BlueHorse":["Alhambra","Amsterdam Lights","Baku Nights","Beirut Al Araq","Discovery","Istanbulue","La Beirut","London Fog","Mi Amor","Moskow Evenings","No Woman No Cry","Paris Romantique","Rio Kiss","Sputnik","Strangers in the Night","The Coldest Green","The Perfect Storm","Thor’s Flash","Tokyo Desire","Venezia Serenata","Wind Of Amazon"],"BLYAT":["Buttlover","Clipporizz","Cono Verde","Mentido","Optimus Leim","Swiet Swirl","Temptation","Tiki Taka"],"Cannibales Club":["Cold Blood","Dark Blood","Lion","My Bro","White Panther","Wild"],"Capital Bra Smoke":["365 Tage","Black Annab","Blody Nane","Huba Cola","Lecker Lecker","Naughty Girl","Pomshwk","Wann Dann"],"Dozaj":["Amnesia","BumBum","Carnival","Casablanca","Dead Sea","Eternal","Euphoria","Filomena","Furious","Huracan","Invisible","Jelly Bear","Krasava","Lambada","Lío","Mangolia","Nairobi","Old School","Purple","Rich","Solo","Tokyo","Uff"],"Dozaj Black":["¡Joe, qué frío!","Berga","Blast","Booster","Chester","CIA","Code","Dark Purple","Double Manza","Explosion","Infinity","Kyoto","Lux","Max","Nube","Paradox","Prime","R-Gasm","S.O.S","Suka","Terry Miss You","Tornado","Vampiro"],"Forever Gold":["After","Albpesgo","American Gangster","Black","Border","Budapest","Crazy Izu","Dark Blue","Drácula","Dragon Daddy","Evil Witch","Fantasy","Faruk & Farik","Flowers","Freak","Galben","Go with The Flow","Green","Gro Lych","Heaven","Hurricane","Island","Jazz Music","Jess Pirate","Kekoko","Little Ghost","Monkey","Mow","Mr. Curry","O La Lá","Piggy BBQ","Pinkman Black","Pinkman By Love 78","Pinkman Storm","Plum","Purple","Rakka","Red Code","Russet","Scape Room","Secret History","Space","The Cave","Timothy","Wake Up","White Night"],"Holster":["!Z Bomb","!Z Finger","Bloody Punch","Blue Punch","Bono","Gp 2.0","IZ Kactuz","Lee Punch","Miss Joosy","MR John","Mr. C","P-Rex","Peery Punch","Quwi Punch","Smurf Daddy","Unicorn","Verdacho","Wild Punch","Willy Punch","Winter Edition","Yellow Punch"],"Holster Noir":["!Z Kaktuz","Charly Punch","Miss Joosy"],"Hookain":["American Pei","Big Black Barries","Blowtus","Blue Dragon","Bubblenciaga","Cactopus","Cheri Zkittlez","Code in Love","Cotton Cndy Creem","Dubai Stachio","Eyez Kalt","Fellatio","Fuggi Ninja","Green Crack","Green Dragon","Green Lean","Hijo de Phruta","Jizzy Pia","Kaffa Yayo","Kivy King","Laoz","Lemenciaga","Millionair","Mng Loco","Original Vanta Zotic","Orog!na","Piç Dragon","Pic Zkittlez","Pink Lemenciaga","Pumpgun Spy","Punani","Red Dragon","Sm!nt","Soleiro Spliff","Swii Ti","Vantanaz","Virgin Batluva","White Brown","White Caek","White Caek Alman","X-Trem Blue Bay","Zenter Schox"],"Hookain Black":["Fellatio","Kaffa Yayo","Soleiro Spliff","White Caek","Zenter Schox"],"Inferno":["Angel Vice","Demon Kiss","Elysira","Luciferum","Skyfall"],"Kaja":["3.14Ch","Ana's Azz","Brain Freeze","C-Trick","Ch Rosso","Jmpricot","Mndrl ing","Prdise","Stwy"],"Mr. Shisha":["1000k","Adan","Babilonia","Boss Mode","Camdown","Coolio","Dosman","Frank Huesta","Ginja Laim","Got Dozen","Guayna","Habana","Habibi","Harlem Frap","Haselnat","Jheez","Lamint Amal","Late Night","Lxmxn","Malibu","Melo Crush","Oriental Desert","Otai","Passion Love","Pomaye","Rock N Roll","Scattman","Summer Sunset","Tropical"],"Musth":["Aluva","Amazonia","Apl Drops","Bam Nam","Berri Hols","Blvck Bros","Chisi Pi","Chry Col","Coky","Cosmos","Djumngo","Eclipse","Exotic Pum","Gap Fut","Kendi Co","Koko Dream","Milric","Morocco","Neptune","Ornj Team","Parapap","Pinkman","Plombir","Proscco","Raspi","Rd Ti","Red Grape","Rocketman","Sea Backtrn Ti","Space Invaders","Stellar","Straw Lych","Swt Pech","Tarxun","Unicorn","Uranus","Violet Co","Wet Mel","White Sod","Y1kah"],"Nameless":["#007 Gold Finger","#100 Yellow Pe!","#105 Red Turtle","#107 Winter is Coming","#109 Monkey Brain","#11 Adam & Eve","#116 Pablo","#13 K!w!ck","#15 Grüner Marokkaner","#17 P!ches","#40 Black Nana","#711 L'Oasis","#808 Pina & Lada","Dark Nana"],"Nash":["Bali","Bravo","Cold Sun","Corazón","Green Heart","Heaven","Hola Carmencita","Hola Gargopera","Jubilee","Skittles","Sun Capri","Tarkun","Tuselo","Violet Cloud"],"Overdozz":["1st Love","24 Karatine","All Nighter","Areejan","Bad Habit","Banango","Crazy Ex","Dopomine","Double Trouble","Fresh Greens","Go For Broke","Green Mist","Heat Wave","Judgment Day","K.O.","Kaffeine Addikt","Kesowawa","Kooliche","Love Bug","Lusidrem","Mad Spiral","One Night Stand","Perta On The Rocks","Pombom","Psych Out","Rachillo","Sex with an ex","Summer Fling","Tranquilyser","Wild Night Out","Zero Gravity"],"Privilege":["Break","Breathe","Dance","Discover","Dive","Dream","Enjoy","Feel","Fight","Jump","Kiss","Like","Live","Love","Play","Read","Shake","Show","Stop","Travel"],"Revoshi":["Anibal Fang","Antep Dream","Blackbeard Soul","Blck Grp","Boricua","Capitan Pinto","Carmitta","Chao Bella","D'App Strng","Darmita","Eskimo Cndy","Eskimo Lmn","Eskimo Loka","Eskimo P’app","Eskimo Polar","Eskimo Wtrmln","Float Like Butterfly","Free Spartacus","Funny Bunny","Green Jagger","Kak Dela Trshkv","Kazak","Lazy Sunday","Leonidas Spirit","Manda","Marbella","Mulan Sword","Nana","Ola Zapata","Orng Mnt","Pancho Villa","Panonino","Qui-Oui","Racy Colombian","Raggata","Ragnar","Red Sunset","Rope A Dope","Rumble Of Jungle","Sting Like Bee","Thanks Engels","The Shuffle","Thrilla In Manila","Txele","Vaina","Vamos Ernesto","What's My Name","Zingy NewYork"],"Sapphire":["Alpine Straw","Apple Strudell","Aprl","Ba Na2","Code Red","Crownberry","Froostyle","Greent Co","Hazel Crush","Indian Stuff","Italimisu","Kraven","Ladan","Lelo","Love Above","Love Under Tonic","Persik","Sun Granade","Tropic","Yozo Hani"],"SAYes!":["Blaro","Dominika","Eldery Ti","Ginbrew","Lemafy","Noir Bry","Passika","Pinkman","Raspi","Rokman","Shak","Spayz","Straw","Zola"],"Sebero":["Blue Forest","Bumble","Children Sun","Depth","Double Royal","Fun Madness","Garden Queen","Heart","Hedgehogs","Italian Sunset","Kingly","Love and Passion","Lunch Break","Pearl","Predictions","Red Yellow Mix","Sunlight","Tropical"],"Serbetli":["American Ke","Charli","Doble A","Emon","Fei Joan","Genios Dream","Grapi","Icbdrumm","Meint","Stra Shark"],"Social Smoke":["Absolute Zero","C Roll","CA Chill","Cu Chill","D D L","H CTA","L Chill","P Chill","White Bear","WM Chill"],"Shisha Kartel":["Big Bagman","Blood Bath","Bouncer Bruno","Capo Dei Capi","Cursed Crusader","Fatal Frenzy","Guilty Gang","Happy Hound","Hidden Hacker","Krazee Kombo","Latino Loco","Mafia Madness","Maniac Manager","Milf Mia","Plata o plomo","Sexy Sheba","Silly Scientist"],"Serbetli Hard Line":["Breezy Bum","Jerry","Limton Grill","Naraja","Nestja","Panepol","Pops","Redbera","Supremo","Sweet Oney"],"Starbuzz":["Apple Doppio","Black Mint","Black Peach Mist","Blue Dew","Blue Mist","Blue Surfer","Brown Kiss","Citrus Mist","Code 69","Cosmopolitan","Cucu Jumbo","Egyptian Pharos","French Buzz","Fuzzy Naval","Geisha","Green Savior","Ice Colussus","Indy White","Irish Kiss","Jack The Ripper","Lebanese Bomb Shell","Mighty Freeze","Mijoti","Pineana","Pineana Freeze","Pink","Pink Chica","Pinolada","Pirate's Cave","Pumpkin Pi","Queen Of Sex","Safari M Dew","Spicy Red","Strawmargarita","Sweet Meli","Tangi Dream","Tropikool","White Freeze","White Nec","Wild Artic","Winter Fresh","Yellow Mist","Yellow T"],"Starbuzz Vintage":["Alaskan Freeze","Cheers","Colombian Spice","Dark Caribbean","Dark Mist","Dark Valencia","Dark Winilla","DelhiT","FreshCito","Fuzzy Kick","Green Savior","Hunny Dew Me","Indian Spiced App","Kick Me Red","La Dominicana","Morning Breeze","Shanghai Passion","Timisue","Tokyo Kick","White Mist"],"Stral":["Alberino","Black Min","Huwa","Kho Kha","Kiva","Lit Schi","Mancoton","Ness Ti","Te Rza","Tik Tok"],"Taboo":["Alien Twist","Alpine Spirit","American Pay","Arizona","Bahama Mama","Banaloco","Bikini Sunset","Black Limousine","Blizzardina","Blue Bay","Brutal Choice","Car Melo","Caribbean Cruise","Casanova Dream","Cinna Mill","Cool Sunrise","Copa Cabana","Crunch","Cumulus","Dancing Queen","Darkum","Five O'Clock","Flash","French Kiss","Game Over","Golden Eye","Hakuna Matata","Indian Summer","Irish Dream","Italian Passion","Jungle","Lucky","Mambo","Melair","Misguided","Moonwalk","Mystic China","Over The Rainbow","Pocamel","Power of Love","Promise","Red Blast","Red Fusion","Richman","Rim Shot","Seduction","Sexy Green","Splash","Talisman","Tropical Storm","Tuxedo","Unicorn Dust","Vanla Sky","Volcano","Waterfall"],"Tangiers":["3","4","5","6","8","9","10","16","19","24","27","34","35","38","51","57","58","59","62","63","69","74","76","77","78","87","90","92","93","94","96","96a","111","113","118","119","132","138","143"],"Ziggy":["Amazon Breeze","Beach Crush","Brazilian Gold","Green Hapocalyx","Love Diamond","Lust Crow","Lust Queen","Morning Glace","Native Lines","Pool Party","Purple Starburst","Rainbow Blast","Red Starburst","Rubi Shade","Summer Sunrise","Thrilla Hunter","Tropical","Valentine's Kiss","Velvet Petals","Wild Dive","Yellow Hype"]};
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
 $('mixList').innerHTML=data.recipes.length?data.recipes.map((r,i)=>`<div class="history-item"><strong>${esc(r.name||'Receta sin nombre')}</strong><div>${esc(r.bowl||'')}</div><div>${(r.parts||[]).map(x=>`${esc(x.name)}: ${fmt(x.grams)} g (${fmt(x.percent)}%)`).join(' + ')}</div><small>Total: ${fmt(r.total||0)} g · Carbones: ${Number(r.coalUnits||0)}${r.coalBrand?' · '+esc(r.coalBrand):''}</small><button class="delete" data-delete-recipe="${i}">🗑 Eliminar receta</button></div>`).join(''):'<p class="empty">Todavía no tienes recetas. Calcula una mezcla y pulsa «Guardar como receta» para añadirla aquí.</p>';
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
 const mix={id:mixId,date:new Date().toLocaleString('es-ES'),bowl:`${bowl.name} · ${bowl.brand}`,total,parts:calculated.map(x=>({name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams,percent:x.percent})),coalBrand:coalStock.brand,coalUnits};
 // Guardar la preparación en el historial de mezclas de Estadísticas, sin añadirla al recetario manual.
 data.mixes.unshift(mix);
 lastCalculatedMix={...mix,parts:mix.parts.map(x=>({...x}))};
calculated.forEach(x=>record('tobacco',{mixId,name:`${x.tobacco.brand} · ${x.tobacco.flavor}`,grams:x.grams}));record('coal',{mixId,name:coalStock.brand,units:coalUnits});record('session',{mixId,count:1});
 $('mixCoalUse').value='';
 data.history.unshift({mixId,text:`Mezcla ${mix.bowl}: ${mix.parts.map(x=>`${fmt(x.grams)} g de ${x.name} (${x.percent}%)`).join(' + ')}. Descontados del stock.`,at:new Date().toLocaleString('es-ES')});
 $('mixResult').innerHTML=`<strong>Mezcla preparada: ${fmt(total)} g</strong><br>${mix.parts.map(x=>`${esc(x.name)}: ${fmt(x.grams)} g (${fmt(x.percent)}%)`).join('<br>')}<br><small>Stock descontado. No se ha guardado en tu recetario.</small><label class="recipe-name-label">Nombre para guardarla (opcional)<input id="recipeName" type="text" maxlength="60" placeholder="Ej. Mi mezcla favorita"></label><button type="button" id="saveRecipe" class="secondary">＋ Guardar como receta</button>`;
 save();
};
$('mixResult').addEventListener('click',e=>{if(e.target.id!=='saveRecipe')return;if(!lastCalculatedMix){alert('Primero calcula una mezcla.');return}const name=$('recipeName')?.value.trim();if(!name){alert('Ponle un nombre a la receta antes de guardarla.');return}data.recipes.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,bowl:lastCalculatedMix.bowl,total:lastCalculatedMix.total,parts:lastCalculatedMix.parts.map(x=>({...x})),coalBrand:lastCalculatedMix.coalBrand,coalUnits:lastCalculatedMix.coalUnits,createdAt:new Date().toLocaleString('es-ES')});log(`Guardada receta «${name}» en Mis mezclas`);save();$('mixResult').insertAdjacentHTML('beforeend','<p class=\"hint\">✓ Receta guardada en tu recetario. No se ha vuelto a descontar stock.</p>');e.target.disabled=true;});

$('useTobacco').onclick=()=>{const raw=$('consumeProduct').value,n=Number($('consumeGrams').value);if(raw===''||!Number.isFinite(n)||n<=0){alert('Selecciona un tabaco e indica los gramos.');return}const p=data.tobacco[Number(raw)];if(!p||Number(p.grams)+1e-8<n){alert('No hay suficientes gramos en stock.');return}p.grams=Math.round((Number(p.grams)-n)*100)/100;log(`Consumidos ${fmt(n)} g de ${p.brand} · ${p.flavor}`);record('tobacco',{name:`${p.brand} · ${p.flavor}`,grams:n});$('consumeGrams').value='';save();};

document.addEventListener('click',e=>{
 const el=e.target.closest('[data-delete-tobacco],[data-delete-coal],[data-delete-bowl],[data-delete-mix],[data-delete-recipe]');if(!el)return;
 if(el.dataset.deleteTobacco!==undefined){const i=+el.dataset.deleteTobacco,p=data.tobacco[i];if(p&&confirm(`¿Eliminar ${p.brand} · ${p.flavor} del inventario?`)){data.tobacco.splice(i,1);refreshMixSelectors(true);log(`Eliminado producto ${p.brand} · ${p.flavor}`);save();}}
 if(el.dataset.deleteCoal!==undefined){const i=+el.dataset.deleteCoal,c=data.coals[i];if(c&&confirm(`¿Eliminar la marca de carbón ${c.brand} y sus ${c.units} unidades?`)){data.coals.splice(i,1);log(`Eliminada marca de carbón ${c.brand}`);save();}}
 if(el.dataset.deleteBowl!==undefined){const i=+el.dataset.deleteBowl,b=data.bowls[i];if(b&&confirm(`¿Eliminar la cazoleta ${b.name} · ${b.brand}?`)){data.bowls.splice(i,1);log(`Eliminada cazoleta ${b.name} · ${b.brand}`);save();}}
 if(el.dataset.deleteRecipe!==undefined){const i=+el.dataset.deleteRecipe;if(data.recipes[i]&&confirm(`¿Eliminar la receta «${data.recipes[i].name}»? Esto no modifica el inventario.`)){data.recipes.splice(i,1);save();}}
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
