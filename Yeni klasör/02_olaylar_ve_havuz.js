function buildDefaultEvents(){
 let arr=[];
 for(let i=0;i<100;i++){
   const cat=EVENT_CATEGORIES[i%EVENT_CATEGORIES.length];
   const variant=Math.floor(i/EVENT_CATEGORIES.length);
   const title=cat.title[variant%cat.title.length];
   const aLoss=50000 + ((i*73123)%701)*1000;
   const bGain=(i*17321)%250001;
   const aHappy=[-4,-3,-2,1,2,3,4][i%7];
   const bHappy=[4,3,2,1,0,-1,-2,-3,-4][i%9];
   const aAmount=-Math.min(750000,aLoss);
   const bAmount=Math.min(250000,bGain);
   arr.push({id:"evt_"+String(i+1).padStart(3,"0"),category:cat.name,title:title+" #"+(variant+1),description:(cat.name+" alanında beklenmedik bir gelişme yaşandı. Hükümdarın vereceği kararın mali ve toplumsal sonuçları olacaktır."),options:[{id:"A",text:EVENT_A_TEXTS[i%EVENT_A_TEXTS.length],gold:aAmount,happiness:aHappy},{id:"B",text:EVENT_B_TEXTS[i%EVENT_B_TEXTS.length],gold:bAmount,happiness:bHappy}]});
 }
 return arr;
}
const DEFAULT_RANDOM_EVENTS=buildDefaultEvents();
function getEventPool(){
 db.settings.randomEvents = Array.isArray(eventAssetCache)&&eventAssetCache.length ? structuredClone(eventAssetCache) : (Array.isArray(db.settings.randomEvents)&&db.settings.randomEvents.length ? db.settings.randomEvents : structuredClone(DEFAULT_RANDOM_EVENTS));
 return db.settings.randomEvents;
}
async function loadEventAssets(){
 try{
  const response=await fetch('events-100.json?v='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const events=await response.json();
  if(!Array.isArray(events)||!events.length||events.some(e=>!e?.id||!Array.isArray(e.options)||e.options.length!==2))throw new Error('olay dosyası biçimi geçersiz');
  eventAssetCache=events;
  db.settings.randomEvents=structuredClone(events);
  const byId=new Map(events.map(e=>[e.id,e]));
  db.pendingEvents=(db.pendingEvents||[]).map(p=>byId.has(p.eventId)?{...p,event:structuredClone(byId.get(p.eventId))}:p);
  return true;
 }
 catch(error)
 {
  console.error('events-100.json yüklenemedi:',error);
  return false;
 }
}
function randomEventCount(){
 const r=Math.random();
 if(r<0.30)return 0; if(r<0.75)return 1; if(r<0.95)return 2; return 3;
}
function eventAlreadyRecent(stateId,eventId){
 const hist=(db.eventHistory||[]).filter(x=>x.stateId===stateId); return hist.slice(0,10).some(x=>x.eventId===eventId);
}
function createYearEventsForState(s){
 const count=randomEventCount(); if(!count)return [];
 const pool=getEventPool().filter(e=>!eventAlreadyRecent(s.id,e.id));
 const picked=[]; const copy=[...pool];
 for(let i=0;i<count&&copy.length;i++){const idx=Math.floor(Math.random()*copy.length);picked.push(copy.splice(idx,1)[0]);}
 return picked.map(e=>({uid:crypto.randomUUID(),stateId:s.id,stateName:s.name,eventId:e.id,year:db.gameYear,event:e,createdAt:new Date().toISOString()}));
}
function applySoldierEventEffect(s,change){
 change=Math.trunc(Number(change)||0);
 if(change>=0){s.piyade=(s.piyade||0)+change;return change;}
 let remaining=Math.min(Math.abs(change),(s.piyade||0)+(s.nisanci||0)+(s.suvari||0));
 const removed=remaining;
 for(const key of ["piyade","nisanci","suvari"]){const take=Math.min(s[key]||0,remaining);s[key]=(s[key]||0)-take;remaining-=take;if(!remaining)break;}
 return -removed;
}
function applyGunEventEffect(s,change){
 change=Math.trunc(Number(change)||0);
 if(change>=0){s.kucuk_top=(s.kucuk_top||0)+change;return change;}
 let remaining=Math.min(Math.abs(change),(s.kucuk_top||0)+(s.orta_top||0)+(s.buyuk_top||0));
 const removed=remaining;
 for(const key of ["kucuk_top","orta_top","buyuk_top"]){const take=Math.min(s[key]||0,remaining);s[key]=(s[key]||0)-take;remaining-=take;if(!remaining)break;}
 return -removed;
}
function eventEffectSummary(effect){
 const parts=[];
 const gold=Number(effect.gold||0), happiness=Number(effect.happiness||0), population=Number(effect.population||0);
 const soldiers=Number(effect.soldiers||0), guns=Number(effect.guns||0), educated=Number(effect.educatedPopulation||0);
 if(gold)parts.push(`💰 Hazine: ${gold>0?'+':''}${money(gold)}`);
 if(happiness)parts.push(`😊 Mutluluk: ${happiness>0?'+':''}${happiness}%`);
 if(population)parts.push(`👥 Nüfus: ${population>0?'+':''}${num(population)}`);
 if(soldiers)parts.push(`⚔️ Asker: ${soldiers>0?'+':''}${num(soldiers)}`);
 if(guns)parts.push(`💣 Top: ${guns>0?'+':''}${num(guns)}`);
 if(educated)parts.push(`🎓 Eğitimli: ${educated>0?'+':''}${num(educated)}`);
 return parts.length?parts.join(" | "):"Nötr sonuç";
}
function applyEventChoice(pendingOrUid,optionId){
 const pending=typeof pendingOrUid==="string"?(db.pendingEvents||[]).find(x=>x.uid===pendingOrUid):pendingOrUid;
 if(!pending)return;
 const s=getState(pending.stateId); if(!s)return;
 const event=pending.event; const opt=event.options.find(o=>o.id===optionId); if(!opt)return;
 const oldT=Number(s.treasury||0); const oldH=Number(s.happiness||0); const oldP=Number(s.population||0); const oldEducated=calcPop(s).edu;
 const oldArmy=(s.piyade||0)+(s.nisanci||0)+(s.suvari||0);
 const oldGuns=(s.kucuk_top||0)+(s.orta_top||0)+(s.buyuk_top||0);
 const requestedGold=Number(opt.gold||0); let actualGold=requestedGold;
 if(requestedGold<0) actualGold=-Math.min(oldT,Math.abs(requestedGold));
 const requestedPopulation=Number(opt.population||0);
 const actualPopulation=requestedPopulation<0?-Math.min(oldP,Math.abs(requestedPopulation)):requestedPopulation;
 s.treasury=Math.max(0,oldT+actualGold);
 s.happiness=Math.max(0,Math.min(100,oldH+Number(opt.happiness||0)));
 s.population=Math.max(0,oldP+actualPopulation);
 const actualSoldiers=applySoldierEventEffect(s,opt.soldiers||0);
 const actualGuns=applyGunEventEffect(s,opt.guns||0);
 const educatedRequest=Math.trunc(Number(opt.educatedPopulation)||0);
 const remainingPopulation=calcPop(s).remaining;
 const targetEducated=Math.max(0,Math.min(remainingPopulation,oldEducated+educatedRequest));
 s.education=remainingPopulation>0?Math.max(0,Math.min(100,(targetEducated/remainingPopulation)*100)):0;
 const actualEducated=targetEducated-oldEducated;
 db.eventHistory.unshift({uid:pending.uid,stateId:s.id,stateName:s.name,eventId:event.id,eventTitle:event.title,year:pending.year,choice:optionId,choiceText:opt.text,gold:actualGold,happiness:Number(opt.happiness||0),population:actualPopulation,soldiers:actualSoldiers,guns:actualGuns,educatedPopulation:actualEducated,date:new Date().toLocaleString("tr-TR"),user:currentUserEmail});
 if(db.eventHistory.length>500)db.eventHistory.pop();
 const newArmy=(s.piyade||0)+(s.nisanci||0)+(s.suvari||0);
 const newGuns=(s.kucuk_top||0)+(s.orta_top||0)+(s.buyuk_top||0);
 const newEducated=calcPop(s).edu;
 addLog({
   stateId:s.id,stateName:s.name,logType:"event",
   action:`🎲 Olay: ${event.title} — ${optionId}) ${opt.text}`,
   cost:0,qty:1,eventChoice:optionId,choiceText:opt.text,
   eventChanges:[
     {label:"Hazine",kind:"money",old:oldT,new:s.treasury},
     {label:"Mutluluk",kind:"percent",old:oldH,new:s.happiness},
     {label:"Nüfus",kind:"number",old:oldP,new:s.population},
     {label:"Asker",kind:"number",old:oldArmy,new:newArmy},
     {label:"Top",kind:"number",old:oldGuns,new:newGuns},
     {label:"Eğitimli nüfus",kind:"number",old:oldEducated,new:newEducated}
   ]
 });
 db.pendingEvents=(db.pendingEvents||[]).filter(x=>x.uid!==pending.uid);
 queueSave();
 closeModal();
 alert(`${event.title}\n\nSeçenek ${optionId}: ${opt.text}\n\n${eventEffectSummary({gold:actualGold,happiness:Number(opt.happiness||0),population:actualPopulation,soldiers:actualSoldiers,guns:actualGuns,educatedPopulation:actualEducated})}`);
 openDetail(s.id);
 switchTab('olaylar');
}
function openRandomEvent(uid){
 const pending=(db.pendingEvents||[]).find(x=>x.uid===uid); if(!pending)return;
 const s=getState(pending.stateId); if(!s)return;
 const e=pending.event;
 const opts=e.options.map(o=>`<button type="button" class="event-option" onclick="applyEventChoice('${pending.uid}','${o.id}')"><div style="font-size:15px;font-weight:bold;">${o.id}) ${esc(o.text)}</div><div class="sub" style="margin-top:5px;">${eventEffectSummary(o)}</div></button>`).join('');
 modal(`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;"><h2 style="margin-top:0;">🎲 ${esc(e.title)}</h2><button type="button" class="btn red small" onclick="closeModal()">✕ ÇIKIŞ</button></div><div class="badge">${esc(e.category)} • ${pending.year}</div><p style="font-size:14px;line-height:1.5;margin-top:12px;">${esc(e.description)}</p><p class="sub">Devlet: <b>${esc(s.name)}</b></p>${opts}<p class="sub" style="margin-top:10px;">⚠️ Seçim yapıldığında geri alınamaz.</p>`);
}
function getVisiblePendingEvents(){
 return isAdmin?(db.pendingEvents||[]):(db.pendingEvents||[]).filter(e=>e.stateId && getState(e.stateId)?.ownerEmail===currentUserEmail);
}
function renderPendingEvents(){
 const mine=getVisiblePendingEvents();
 if(!mine.length)return `<div class="event-result"><b>Şu anda bekleyen olay bulunmuyor.</b><div class="sub" style="margin-top:5px;">Yeni bir olay oluştuğunda bu sekmede görünecek.</div></div>`;
 return `<div style="margin-bottom:12px;"><h4 style="color:var(--border-gold);font-family:'Oswald';margin:0 0 7px;">🎲 BEKLEYEN RASTGELE OLAYLAR</h4>${mine.map(e=>`<div class="event-card"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${esc(e.event.title)}</b><span class="badge">${e.year}</span></div><div class="sub">${esc(e.stateName)} • ${esc(e.event.category)}</div><div class="actions" style="margin-top:7px;"><button class="btn gold small" onclick="openRandomEvent('${e.uid}')">OLAYI AÇ →</button>${isAdmin?`<button class="btn red small" onclick="deletePendingEvent('${e.uid}')">SİL</button>`:''}</div></div>`).join('')}</div>`;
}
function deletePendingEvent(uid){
 if(!isAdmin)return;
 const event=(db.pendingEvents||[]).find(item=>item.uid===uid);
 if(!event)return;
 if(!confirm(`"${event.event?.title||'Bu olay'}" olayı ${event.stateName} için silinsin mi?`))return;
 db.pendingEvents=(db.pendingEvents||[]).filter(item=>item.uid!==uid);
 addLog({stateId:event.stateId||"",stateName:event.stateName||"Bilinmeyen Devlet",action:`Rastgele olay admin tarafından silindi: ${event.event?.title||'Bilinmeyen olay'}`,qty:1,cost:0});
 queueSave();
 if(document.getElementById("modal")?.classList.contains("show"))openEventHistoryAdmin();
 else if(currentId)openDetail(currentId);else renderHome();
 toast("Bekleyen olay silindi.",true);
}
function openEventHistoryAdmin(){
 if(!isAdmin)return;
 const hist=db.eventHistory||[];
 const pending=db.pendingEvents||[];
 const rows=hist.map(h=>`<div class="event-card"><b>${esc(h.stateName)}</b> — ${esc(h.eventTitle)} <span class="badge">${h.year}</span><div class="sub">Seçim: <b>${h.choice}</b> — ${esc(h.choiceText)}<br>${eventEffectSummary(h)}<br>${esc(h.date||'')}</div></div>`).join('');
 const pendingRows=pending.map(e=>`<div class="event-card"><b>${esc(e.stateName)}</b> — ${esc(e.event.title)} <span class="badge">${e.year}</span><div class="sub">Henüz seçim yapılmadı.</div><button class="btn red small" style="margin-top:7px;" onclick="deletePendingEvent('${e.uid}')">SİL</button></div>`).join('');
 modal(`<h2>🎲 RASTGELE OLAYLAR</h2><div class="event-result"><b>Mevcut yıl:</b> ${db.gameYear} &nbsp; | &nbsp; <b>Bekleyen:</b> ${pending.length}</div><h4 style="color:var(--gold);font-family:'Oswald';">BEKLEYEN OLAYLAR</h4>${pendingRows||'<p class="sub">Bekleyen olay yok.</p>'}<h4 style="color:var(--gold);font-family:'Oswald';">SEÇİM GEÇMİŞİ</h4><div style="max-height:50vh;overflow:auto;">${rows||'<p class="sub">Henüz olay seçimi yapılmadı.</p>'}</div><div class="actions" style="margin-top:10px;"><button class="btn blue" onclick="closeModal()">KAPAT</button></div>`);
}
function openEventPoolAdmin(){
 if(!isAdmin)return;
 const pool=getEventPool();
 const rows=pool.map((e,i)=>`<div class="event-card"><div style="display:flex;justify-content:space-between;gap:8px;"><b>${i+1}. ${esc(e.title)}</b><span class="badge">${esc(e.category)}</span></div><div class="sub">${esc(e.description)}</div><div style="margin-top:5px;font-size:11px;">${e.options.map(o=>`${o.id}: ${esc(o.text)} → ${eventEffectSummary(o)}`).join('<br>')}</div></div>`).join('');
 modal(`<h2>🗂️ OLAY HAVUZU (${pool.length})</h2><p class="sub">100 hazır olay. Ekonomik ve mutluluk sonuçları sınırlar içinde tutulur.</p><div style="max-height:70vh;overflow:auto;">${rows}</div><div class="actions" style="margin-top:10px;"><button class="btn blue" onclick="closeModal()">KAPAT</button></div>`);
}

function initSupabase(){
 if(!window.supabase || typeof window.supabase.createClient!=="function") throw new Error("Supabase kütüphanesi yüklenemedi.");
 sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
}

const defaultSettings={
 prices:{piyade:21,suvari:40,nisanci:30,kucuk_top:10000,orta_top:25000,buyuk_top:45000,kucuk_gemi:65000,orta_gemi:95000,buyuk_gemi:130000,kucuk_liman:100000,orta_liman:180000,buyuk_liman:300000,kucuk_ocak:80000,orta_ocak:150000,buyuk_ocak:250000,okul:120000,istihbarat_binasi:200000},
 capacity:{kucuk_liman:5,orta_liman:7,buyuk_liman:10,kucuk_ocak:10,orta_ocak:20,buyuk_ocak:35},
 upkeep:{piyade:35,suvari:55,nisanci:45,kucuk_top:7500,orta_top:15000,buyuk_top:25000,kucuk_gemi:20000,orta_gemi:35000,buyuk_gemi:50000},
 garrisonUpkeep:{fortress:8},
 populationBuildingGrowth:{hastane:0.5,asevi:0.4,su_degirmeni:0.6,kervansaray:0.3,pazar:0.4},
 populationBuildingCostPerPerson:{hastane:0.10,asevi:0.05,su_degirmeni:0.08,kervansaray:0.12,pazar:0.10},
 populationBuildingUpkeep:{hastane:0,asevi:0,su_degirmeni:0,kervansaray:0,pazar:0},
 schoolCapacityPerBuilding:500,
 schoolUpkeep:10000,
 educatedTaxMultiplier:1.5,
 infrastructureUpkeep:{kucuk_liman:0,orta_liman:0,buyuk_liman:0,kucuk_ocak:0,orta_ocak:0,buyuk_ocak:0,istihbarat_binasi:0},
 edictCost:{erzak:2, karakol:1.5, panayir:1, ibadethane:3, anit:2.5, denetim:0.5},
 campaignCost:{piyade:2, suvari:5, nisanci:3, kucuk_top:200, orta_top:500, buyuk_top:1000},
 schoolEducation:2,
 mapIntelReportCost:100000,
 images:{piyade:"",suvari:"",nisanci:"",kucuk_top:"",orta_top:"",buyuk_top:"",kucuk_gemi:"",orta_gemi:"",buyuk_gemi:"",kucuk_liman:"",orta_liman:"",buyuk_liman:"",kucuk_ocak:"",orta_ocak:"",buyuk_ocak:"",okul:"",istihbarat_binasi:"",fortress:"",fortress_garrison:"",hastane:"",asevi:"",su_degirmeni:"",kervansaray:"",pazar:""},
 customItems: [] 
};

const EDICTS = [
    { id: 'erzak', name: 'Erzak Dağıtımı', desc: 'Ambarları açarak halkı doyur.', pts: 10, icon: '🍞' },
    { id: 'karakol', name: 'Karakol İnşası', desc: 'Güvenliği sağla.', pts: 8, icon: '🛡️' },
    { id: 'panayir', name: 'Panayır Düzenle', desc: 'Şenlikler düzenle.', pts: 7, icon: '🎪' },
    { id: 'ibadethane', name: 'İbadethane / Hamam', desc: 'Manevi yapılar kur.', pts: 7, icon: '🕌' },
    { id: 'anit', name: 'Anıt İnşası', desc: 'Görkemli anıtlar dik.', pts: 5, icon: '🏛️' },
    { id: 'denetim', name: 'Pazar Denetimi', desc: 'Karaborsayı engelle.', pts: '5-9', icon: '⚖️' }
];

function esc(x){return String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function cleanUrl(u){
    if(!u) return "";
    let s = String(u).trim();
    let m = s.match(/https?:\/\/[^\s"'<>\[\]\)]+/);
    return m ? m[0] : s;
}
function money(n){return Number(n||0).toLocaleString("tr-TR")+" TL"}
function num(n){return Number(n||0).toLocaleString("tr-TR")}
function getState(id){return db.states.find(s=>s.id===id)}
function valuesEqual(a,b){if(a===b)return true;if(a==null||b==null)return a===b;if(typeof a!==typeof b)return false;if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++){if(!valuesEqual(a[i],b[i]))return false;}return true;}if(typeof a==='object'){const ka=Object.keys(a),kb=Object.keys(b);if(ka.length!==kb.length)return false;for(const k of ka){if(!valuesEqual(a[k],b[k]))return false;}return true;}return a===b;}
function normalizeSettings(settings){
 const s={...defaultSettings,...(settings||{})};
 ["prices","capacity","upkeep","garrisonUpkeep","populationBuildingGrowth","populationBuildingCostPerPerson","populationBuildingUpkeep","infrastructureUpkeep","edictCost","campaignCost","images"].forEach(k=>{s[k]={...defaultSettings[k],...(s[k]||{})};});
 s.customItems=Array.isArray(s.customItems)?s.customItems:[];
 return s;
}
function mergeStateThreeWay(base,local,remote,path="",conflicts=[]){
 if(valuesEqual(local,base))return structuredClone(remote);
 if(valuesEqual(remote,base))return structuredClone(local);
 if(valuesEqual(local,remote))return structuredClone(local);

 // Sayılarda (Örn: asker sayısı, hazine) anlık çakışmaları delta (fark) mantığıyla toplayarak çöz:
 if(typeof base === "number" && typeof local === "number" && typeof remote === "number") {
     const deltaLocal = local - base;
     const deltaRemote = remote - base;
     return base + deltaLocal + deltaRemote;
 }

 if(Array.isArray(local)||Array.isArray(remote)){
   // ÖNEMLİ: Eskiden burada aynı id'ye sahip öğe hem local hem remote'da varsa
   // sadece remote'daki kopya tutulup local'deki değişiklik SESSİZCE siliniyordu.
   // Bu, iki oyuncu aynı anda farklı devletlerde işlem yaptığında birinin
   // değişikliğinin kaybolmasına sebep oluyordu. Şimdi öğeler id/uid/logId/
   // stateId'ye göre eşleştirilip her öğe kendi içinde tekrar 3-way merge ediliyor.
   const baseArr=Array.isArray(base)?base:[];
   const localArr=Array.isArray(local)?local:[];
   const remoteArr=Array.isArray(remote)?remote:[];
   const keyOf=it=>(it&&typeof it==='object')?(it.id??it.uid??it.logId??it.stateId??JSON.stringify(it)):it;
   const byKey=arr=>{const m=new Map();arr.forEach(it=>m.set(keyOf(it),it));return m;};
   const baseMap=byKey(baseArr),localMap=byKey(localArr),remoteMap=byKey(remoteArr);

   const order=[],seen=new Set();
   [...remoteArr,...localArr].forEach(it=>{const k=keyOf(it);if(!seen.has(k)){seen.add(k);order.push(k);}});

   const merged=[];
   order.forEach(k=>{
     const inLocal=localMap.has(k),inRemote=remoteMap.has(k),inBase=baseMap.has(k);
     if(!inLocal&&!inRemote)return;              // ikisinde de yok
     if(!inLocal&&inBase)return;                 // yerelde silinmiş -> silik kalsın
     if(!inRemote&&inBase)return;                // sunucuda silinmiş -> silik kalsın
     if(!inLocal){merged.push(structuredClone(remoteMap.get(k)));return;}   // sadece uzakta eklenmiş
     if(!inRemote){merged.push(structuredClone(localMap.get(k)));return;}  // sadece yerelde eklenmiş
     merged.push(mergeStateThreeWay(baseMap.get(k),localMap.get(k),remoteMap.get(k),`${path}[${k}]`,conflicts));
   });
   return merged;
 }
 if(local===null||remote===null||typeof local!=="object"||typeof remote!=="object"){
   conflicts.push(path||"root");return structuredClone(remote);
 }
 const merged={},keys=new Set([...Object.keys(base||{}),...Object.keys(local||{}),...Object.keys(remote||{})]);
 keys.forEach(key=>{
   const childPath=path?path+"."+key:key;
   merged[key]=mergeStateThreeWay(base?.[key],local?.[key],remote?.[key],childPath,conflicts);
 });
 return merged;
}
function closeModal(){document.getElementById("modal").classList.remove("show")}
function modal(html){document.getElementById("modalContent").innerHTML=html;document.getElementById("modal").classList.add("show")}
function toast(msg,ok=false){document.getElementById("syncText").textContent=(ok?"✓ ":"⚠ ")+msg}

