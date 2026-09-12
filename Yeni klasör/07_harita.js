function getTurkishMapName(value)
{
 const raw=String(value||'').replaceAll('_',' ').trim();
 if(MAP_TURKISH_NAMES[raw])return MAP_TURKISH_NAMES[raw];
 return raw
   .replace(/\bProvince\b/gi,'')
   .replace(/\bCounty\b/gi,'')
   .replace(/\bRegion\b/gi,'')
   .replace(/\s{2,}/g,' ')
   .trim();
}
 
function normalizeMapName(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9]+/g,'')}
function normalizeMapColor(value,fallback='#c5a059'){const v=String(value||'').trim();if(/^#[0-9a-f]{6}$/i.test(v))return v;if(/^#[0-9a-f]{3}$/i.test(v))return '#'+v.slice(1).split('').map(x=>x+x).join('');const m=v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(m)return '#'+[m[1],m[2],m[3]].map(x=>Math.max(0,Math.min(255,Number(x))).toString(16).padStart(2,'0')).join('');return fallback;}
function getProvinceDisplayColor(provinceId,detail={},owner=null)
{
  const path=document.getElementById(provinceId);
  let rawColor = detail?.color || owner?.color || path?.dataset?.originalFill || '#c5a059';
  return normalizeMapColor(rawColor);
}
function getOwnedMapProvinceIds(stateId){return Object.entries(db.mapProvinceOwners||{}).filter(([,ownerId])=>ownerId===stateId).map(([provinceId])=>provinceId);}
function refreshMapFortressCounts(){db.states.forEach(s=>{const next=Math.max(0,getOwnedMapProvinceIds(s.id).length);const applied=Math.max(0,Math.floor(Number(s.fortressPopulationCount)||0));const fortressDelta=next-applied;if(fortressDelta)s.population=Math.max(0,(Number(s.population)||0)+(fortressDelta*30000));s.fortressPopulationCount=next;s.fortressCount=next;});}
function redistributeMapGarrisonsForStateIds(stateIds){for(const stateId of new Set(stateIds)){const s=getState(stateId);if(s&&getOwnedMapProvinceIds(s.id).length)distributeFortressGarrisonToMap(s,s.fortressGarrison||0);}}
function distributeFortressGarrisonToMap(s,total){const ids=getOwnedMapProvinceIds(s.id),safeTotal=Math.max(0,Math.floor(Number(total)||0));s.fortressCount=ids.length;s.fortressGarrison=safeTotal;db.mapProvinceDetails=db.mapProvinceDetails||{};const base=ids.length?Math.floor(safeTotal/ids.length):0,remainder=ids.length?safeTotal%ids.length:0;ids.forEach((id,index)=>{const old=db.mapProvinceDetails[id]||{};db.mapProvinceDetails[id]={...old,countryName:s.name,garrison:base+(index<remainder?1:0),color:old.color||s.color||'#c5a059'};});return {count:ids.length,base,remainder};}

let _mapAssetsLoading=false;
async function loadMapAssets(){
 if(mapSvgCache&&mapConfigCache)return;
 if(_mapAssetsLoading)return;
 _mapAssetsLoading=true;
 try{
  const [svgResponse,configResponse]=await Promise.all([
    fetch('MapChart_Map.svg?v=57',{cache:'no-store'}),
    fetch('map-config.json?v=57',{cache:'no-store'})
  ]);
  if(!svgResponse.ok)throw new Error('MapChart_Map.svg yüklenemedi: HTTP '+svgResponse.status);
  if(!configResponse.ok)throw new Error('map-config.json yüklenemedi: HTTP '+configResponse.status);
  mapSvgCache=await svgResponse.text();
  mapConfigCache=await configResponse.json();
 }finally{ _mapAssetsLoading=false; }
}

function initializeMapOwnersFromConfig(){
 db.mapProvinceOwners=db.mapProvinceOwners||{};
 if(db.mapOwnershipInitialized||!isAdmin||!mapConfigCache)return;
 const stateByName=new Map(db.states.map(s=>[normalizeMapName(s.name),s.id]));
 Object.values(mapConfigCache.groups||{}).forEach(group=>{
   const stateId=stateByName.get(normalizeMapName(group.label));
   if(stateId)(group.paths||[]).forEach(provinceId=>{if(!db.mapProvinceOwners[provinceId])db.mapProvinceOwners[provinceId]=stateId;});
 });
 db.mapOwnershipInitialized=true;
 refreshMapFortressCounts();
 queueMapSave();
}

function getStrategicRegionList(){
 const out=[];
 const seen=new Set();
 const groups=mapConfigCache?.groups||{};
 Object.values(groups).forEach(group=>{
   (group.paths||[]).forEach(provinceId=>{
     if(!seen.has(provinceId)){
       seen.add(provinceId);
       out.push({id:provinceId,name:getTurkishMapName(provinceId)});
     }
   });
 });
 if(!out.length){
   Object.keys(db.mapProvinceOwners||{}).forEach(provinceId=>{
     if(!seen.has(provinceId)){
       seen.add(provinceId);
       out.push({id:provinceId,name:getTurkishMapName(provinceId)});
     }
   });
 }
 return out.sort((a,b)=>a.name.localeCompare(b.name,'tr-TR'));
}
function strategicDomKey(id){return encodeURIComponent(id).replace(/%/g,'_');}
function getStrategicRegionConfig(provinceId){return db.valuableRegions?.[provinceId]||{};}

function filterStrategicRegions(){
  const input=document.getElementById('strategicRegionSearch');
  const q=String(input?.value||'').trim().toLocaleLowerCase('tr-TR');
  document.querySelectorAll('[data-strategic-region-row]').forEach(row=>{
    const hay=String(row.dataset.search||row.textContent||'').toLocaleLowerCase('tr-TR');
    row.style.display=(!q||hay.includes(q))?'':'none';
  });
}
function renderStrategicRegionStickers(){
 const canvas=document.getElementById('gameMapCanvas'),svg=canvas?.querySelector('svg');
 if(!canvas||!svg||!mapStrategicView)return;
 canvas.querySelectorAll('.strategic-region-sticker').forEach(node=>node.remove());
 Object.entries(db.valuableRegions||{}).forEach(([provinceId,cfg])=>{
   if(!cfg?.enabled||!cfg.url)return;
   const path=document.getElementById(provinceId); if(!path)return;
   try{
     const b=path.getBBox();
     const area=Math.max(1,b.width*b.height);
     const autoSize=Math.max(12,Math.min(52,Math.sqrt(area)*0.34));
     const size=autoSize*(Math.max(0.5,Math.min(2,Number(cfg.scale)||1)));
     const x=(Number.isFinite(Number(cfg.x))?Number(cfg.x):b.x+b.width/2)-size/2;
     const y=(Number.isFinite(Number(cfg.y))?Number(cfg.y):b.y+b.height/2)-size/2;
     const image=document.createElementNS('http://www.w3.org/2000/svg','image');
     image.classList.add('strategic-region-sticker');
     image.setAttribute('href',cfg.url); image.setAttribute('x',x); image.setAttribute('y',y);
     image.setAttribute('width',size); image.setAttribute('height',size); image.setAttribute('preserveAspectRatio','xMidYMid meet');
     image.setAttribute('pointer-events','none'); image.setAttribute('aria-hidden','true');
     image.style.pointerEvents='none'; image.style.overflow='visible';
     svg.appendChild(image);
   }catch(_){}
 });
}
function openStrategicRegionAdmin(){
 if(!isAdmin)return;
 const regions=getStrategicRegionList();
 const rows=regions.map((r,i)=>{
   const cfg=getStrategicRegionConfig(r.id),k=strategicDomKey(r.id);
   return `<div class="list-item strategic-region-row" data-strategic-region-row data-search="${esc(r.name)}" style="display:block;margin-bottom:7px;padding:8px;">
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;"><input id="f_sr_enabled_${k}" type="checkbox" ${cfg.enabled?'checked':''} style="width:auto;"><label for="f_sr_enabled_${k}" style="margin:0;cursor:pointer;"><b>${esc(r.name)}</b></label></div>
     <div class="formgrid" style="margin:0;">
       ${field(`sr_url_${k}`,'Sticker URL',cfg.url||'','text')}
       ${field(`sr_desc_${k}`,'Açıklama',cfg.description||'','text')}
       ${field(`sr_scale_${k}`,'Sticker Ölçeği (Otomatik ×)',cfg.scale||1,'number')}
     </div>
   </div>`;
 }).join('');
 modal(`<h2>⭐ DEĞERLİ / STRATEJİK BÖLGELER</h2><div style="margin:8px 0 10px;">
<input id="strategicRegionSearch" type="search" placeholder="Bölge ara..." oninput="filterStrategicRegions()" style="width:100%;box-sizing:border-box;">
</div>
 <p class="sub">Stratejik Görünüm açıkken işaretlenen topraklarda sticker görünür. Sticker boyutu bölgenin büyüklüğüne göre otomatik ayarlanır; ölçek alanı ile ince ayar yapabilirsin. Oyuncu bölgeye tıkladığında mevcut sahip/garnizon bilgisinin altında açıklamayı görür.</p>
 <div style="max-height:58vh;overflow:auto;padding-right:4px;">${rows||'<p class="sub">Harita bölgeleri yüklenemedi.</p>'}</div>
 <div class="actions" style="margin-top:12px;"><button class="btn" onclick="openAdmin()">GERİ</button><button class="btn blue" onclick="saveStrategicRegions()">💾 STRATEJİK BÖLGELERİ KAYDET</button></div>`);
}
function saveStrategicRegions(){
 if(!isAdmin)return;
 const next={};
 getStrategicRegionList().forEach(r=>{
   const k=strategicDomKey(r.id);
   const enabled=!!document.getElementById(`f_sr_enabled_${k}`)?.checked;
   const url=cleanUrl(document.getElementById(`f_sr_url_${k}`)?.value||'');
   const description=(document.getElementById(`f_sr_desc_${k}`)?.value||'').trim();
   const scale=Math.max(0.5,Math.min(2,Number(document.getElementById(`f_sr_scale_${k}`)?.value)||1));
   if(enabled||url||description)next[r.id]={enabled,url,description,scale};
 });
 db.valuableRegions=next;
 queueMapSave();
 closeModal();
 if(document.getElementById('gameMapCanvas')){applyMapOwnership();}
 toast('Stratejik bölgeler kaydedildi',true);
}
let mapAdjacencyCache = null;
function applyMapOwnership()
{
 const canvas=document.getElementById('gameMapCanvas');if(!canvas)return;
 canvas.querySelectorAll('.strategic-country-label,.strategic-country-clip').forEach(label=>label.remove());
 
 let viewer = getCurrentPlayerState();
 let isSimulating = false;
 
 // ADMİN KİMLİĞİNE BÜRÜNME MANTIĞI
 if(isAdmin) {
     const simId = document.getElementById('admin_vision_sim')?.value;
     if(simId) { viewer = getState(simId); isSimulating = true; } // Admin, seçtiği devletin gözünden bakıyor!
 }
 
 let visibleProvinces = "ALL";
 
 if((!isAdmin || isSimulating) && viewer && (viewer.istihbarat_binasi || 0) === 0) {
    const myProvinces = getOwnedMapProvinceIds(viewer.id);
    visibleProvinces = new Set(myProvinces);
    (viewer.discoveredProvinces || []).forEach(id => visibleProvinces.add(id));
    
    if(myProvinces.length > 0) {
        if(!mapAdjacencyCache) {
            mapAdjacencyCache = {};
            const paths = Array.from(canvas.querySelectorAll('path[id][d]'));
            const bboxes = paths.map(p => { try { return { id: p.id, b: p.getBBox() }; } catch(e) { return null; } }).filter(x => x);
            const bboxGap = (a,b) => Math.hypot(Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width)), Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height)));
            for(let i=0; i<bboxes.length; i++) {
                mapAdjacencyCache[bboxes[i].id] = [];
                for(let j=0; j<bboxes.length; j++) {
                    if(i !== j && bboxGap(bboxes[i].b, bboxes[j].b) <= 15) mapAdjacencyCache[bboxes[i].id].push(bboxes[j].id);
                }
            }
        }
        myProvinces.forEach(id => {
            (mapAdjacencyCache[id] || []).forEach(adjId => visibleProvinces.add(adjId));
        });
    }
 }
 canvas.querySelectorAll('path[id][d]').forEach(path=>{
   if(!path.dataset.originalFill)path.dataset.originalFill=path.getAttribute('fill')||path.style.fill||'';
   const ownerId=db.mapProvinceOwners?.[path.id];
   const owner=getState(ownerId);
   const detail=db.mapProvinceDetails?.[path.id];
   const displayOwner=detail?.countryName||owner?.name||'Sahipsiz / atanmadı';
   
   let isVisible = (visibleProvinces === "ALL" || visibleProvinces.has(path.id) || ownerId === "__rebel__" || detail?.isGloballyVisible);
   if(isVisible) {
       path.style.fill=detail?.color||(owner?(owner.color||'#c5a059'):path.dataset.originalFill);
       let title=path.querySelector('title');
       if(!title){title=document.createElementNS('http://www.w3.org/2000/svg','title');path.appendChild(title);}
       title.textContent=`${getTurkishMapName(path.id)} — ${displayOwner}`;
   } else {
       path.style.fill = "#1a1a1a";
       let title=path.querySelector('title');
       if(!title){title=document.createElementNS('http://www.w3.org/2000/svg','title');path.appendChild(title);}
       title.textContent=`Bilinmeyen Toprak (Savaş Sisi)`;
   }
   
   path.onclick=()=>handleProvinceClick(path.id);
 });
 if(mapStrategicView){renderStrategicRegionStickers();}
}
 
// renderStrategicMapLabels silindi (ölü kod — hiçbir yerden çağrılmıyordu)
function toggleStrategicMapView(){mapStrategicView=!mapStrategicView;const btn=document.getElementById('mapStrategicBtn');if(btn){btn.textContent=mapStrategicView?'✕ STRATEJİK GÖRÜNÜM':'🧭 STRATEJİK GÖRÜNÜM';btn.className=mapStrategicView?'btn red':'btn blue';}applyMapOwnership();}

async function openGameMap()
{
 mapBrush=null;mapPickerMode=false;mapBatch=null;mapBatchSelection.clear();mapStrategicView=false;
 document.getElementById('home').classList.add('hidden');
 document.getElementById('detail').classList.add('hidden');
 const screen=document.getElementById('mapScreen');screen.classList.remove('hidden');
 screen.innerHTML=`<div class="map-toolbar"><button class="btn" onclick="renderHome()">← DEVLETLERE DÖN</button><span class="sub">Harita yükleniyor…</span></div>`;
 try{
   await loadMapAssets();
   initializeMapOwnersFromConfig();
   
   // SİMÜLASYON MENÜSÜ (Kimin Gözünden Bakıyorsun?)
   const visionSelect = isAdmin ? `<select id="admin_vision_sim" onchange="applyMapOwnership()" style="width:auto; padding:5px; font-weight:bold; background:rgba(0,0,0,0.5); border:1px solid var(--border-gold); color:var(--gold); border-radius:3px;"><option value="">👁️ Tam Görüş (Admin)</option>` + db.states.map(s=>`<option value="${s.id}">${esc(s.name)} Gözünden Bak</option>`).join('') + `</select>` : '';
   screen.innerHTML=`<div class="map-toolbar"><button class="btn" onclick="renderHome()">← DEVLETLERE DÖN</button><button class="btn" onclick="changeMapZoom(-0.25)">−</button><button class="btn" onclick="changeMapZoom(0.25)">+</button><button class="btn blue" onclick="resetMapZoom()">%500</button>${isAdmin?'<button id="mapPickerBtn" class="btn blue" onclick="toggleMapPicker()">💧 RENK/ÜLKE SEÇ</button><button id="mapBrushBtn" class="btn gold" onclick="openMapBrushSetup()">🖌️ FIRÇA</button><button id="mapBatchBtn" class="btn green" onclick="openMapBatchSetup()">☑ ÇOKLU ATAMA</button>':''}<button id="mapStrategicBtn" class="btn blue" onclick="toggleStrategicMapView()">🧭 STRATEJİK GÖRÜNÜM</button>${visionSelect}<span id="mapZoomLabel" class="badge">%500</span><span id="mapBrushStatus" class="sub">${isAdmin?'Toprağa dokun: düzenle, damlalıkla seç veya fırça kullan.':'Toprağa dokun: sahibini gör.'}</span></div><div id="gameMapViewport" class="game-map-viewport"><div id="gameMapCanvas" class="game-map-canvas">${mapSvgCache}</div></div><div class="sub" style="margin-top:6px;text-align:right;">Harita: MapChart.net — CC BY-SA 4.0</div>`;
   mapZoom=5;changeMapZoom(0);applyMapOwnership();const mapViewport=document.getElementById('gameMapViewport');if(mapViewport){mapViewport.scrollLeft=Math.max(0,(mapViewport.scrollWidth-mapViewport.clientWidth)*.62);mapViewport.scrollTop=Math.max(0,(mapViewport.scrollHeight-mapViewport.clientHeight)*.15);}initMapTouchControls();
 }catch(error){screen.innerHTML=`<button class="btn" onclick="renderHome()">← DEVLETLERE DÖN</button><p class="error">❌ ${esc(error.message||error)}</p>`;}
}

function changeMapZoom(delta){
 mapZoom=Math.max(1,Math.min(15,mapZoom+delta));
 const canvas=document.getElementById('gameMapCanvas');if(canvas)canvas.style.width=(mapZoom*100)+'%';
 const label=document.getElementById('mapZoomLabel');if(label)label.textContent='%'+Math.round(mapZoom*100);
}
function resetMapZoom(){mapZoom=5;const canvas=document.getElementById('gameMapCanvas');if(canvas)canvas.style.width='500%';const label=document.getElementById('mapZoomLabel');if(label)label.textContent='%500';}
function initMapTouchControls(){
 const viewport=document.getElementById('gameMapViewport');if(!viewport)return;let start=null;
 const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 viewport.addEventListener('touchstart',e=>{if(e.touches.length===1)start={kind:'pan',x:e.touches[0].clientX,y:e.touches[0].clientY,left:viewport.scrollLeft,top:viewport.scrollTop};else if(e.touches.length===2){e.preventDefault();start={kind:'pinch',distance:distance(e.touches),zoom:mapZoom,midX:(e.touches[0].clientX+e.touches[1].clientX)/2,midY:(e.touches[0].clientY+e.touches[1].clientY)/2,left:viewport.scrollLeft,top:viewport.scrollTop};}},{passive:false});
 viewport.addEventListener('touchmove',e=>{if(!start)return;if(e.touches.length===2&&start.kind==='pinch'){e.preventDefault();const next=Math.max(1,Math.min(15,start.zoom*(distance(e.touches)/Math.max(1,start.distance))));mapZoom=next;const canvas=document.getElementById('gameMapCanvas');if(canvas)canvas.style.width=(next*100)+'%';const label=document.getElementById('mapZoomLabel');if(label)label.textContent='%'+Math.round(next*100);const ratio=next/start.zoom,rect=viewport.getBoundingClientRect(),localX=start.midX-rect.left,localY=start.midY-rect.top;viewport.scrollLeft=(start.left+localX)*ratio-localX;viewport.scrollTop=(start.top+localY)*ratio-localY;}else if(e.touches.length===1&&start.kind==='pan'){e.preventDefault();viewport.scrollLeft=start.left-(e.touches[0].clientX-start.x);viewport.scrollTop=start.top-(e.touches[0].clientY-start.y);}},{passive:false});
 viewport.addEventListener('touchend',e=>{if(e.touches.length===0)start=null;else if(e.touches.length===1)start={kind:'pan',x:e.touches[0].clientX,y:e.touches[0].clientY,left:viewport.scrollLeft,top:viewport.scrollTop};},{passive:false});
}

function openMapBatchSetup(){
 if(!isAdmin)return;
 if(mapBatch){finishMapBatch();return;}
 const options=db.states.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 modal(`<h2>☑ ÇOKLU TOPRAK ATAMASI</h2><p class="sub">Devleti seçtikten sonra haritada istediğin topraklara dokun. Seçilenlerin tamamı tek seferde bu devlete atanır ve garnizonları 0 olur.</p><div class="formgrid"><div class="full"><label>Atanacak Devlet</label><select id="batch_owner" onchange="syncMapBatchOwner(this.value)">${options}</select></div>${field('batch_country','Ülke Adı',db.states[0]?.name||'','text')}${field('batch_color','Toprak Rengi',db.states[0]?.color||'#c5a059','color')}</div><div class="actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn green" onclick="activateMapBatch()">SEÇİME BAŞLA</button></div>`);
}
function syncMapBatchOwner(ownerId){const owner=getState(ownerId);if(!owner)return;const n=document.getElementById('f_batch_country'),c=document.getElementById('f_batch_color');if(n)n.value=owner.name||'';if(c)c.value=owner.color||'#c5a059';}
function activateMapBatch(){
 const ownerId=document.getElementById('batch_owner')?.value||'',owner=getState(ownerId);
 if(!owner){alert('Önce bir devlet seçmelisin.');return;}
 mapBatch={ownerId,countryName:document.getElementById('f_batch_country')?.value.trim()||owner.name,garrison:0,color:document.getElementById('f_batch_color')?.value||owner.color||'#c5a059'};
 mapBrush=null;mapPickerMode=false;mapBatchSelection.clear();closeModal();updateMapBatchUi();
}
function updateMapBatchUi(){const btn=document.getElementById('mapBatchBtn'),status=document.getElementById('mapBrushStatus');if(btn){btn.textContent=mapBatch?`✓ ATAMAYI BİTİR (${mapBatchSelection.size})`:'☑ ÇOKLU ATAMA';btn.className=mapBatch?'btn gold':'btn green';}if(status&&mapBatch)status.textContent=`Çoklu seçim: ${mapBatch.countryName} • ${mapBatchSelection.size} toprak seçildi. Yeniden dokunursan seçim kalkar.`;}
function removeBatchProvinceLabel(provinceId){document.getElementById('batch_label_'+provinceId)?.remove();}
function addBatchProvinceLabel(provinceId){const path=document.getElementById(provinceId);if(!path||!mapBatch)return;removeBatchProvinceLabel(provinceId);try{const b=path.getBBox(),t=document.createElementNS('http://www.w3.org/2000/svg','text'),maxWidth=Math.max(4,b.width*.86);t.id='batch_label_'+provinceId;t.setAttribute('x',b.x+b.width/2);t.setAttribute('y',b.y+b.height/2);t.setAttribute('text-anchor','middle');t.setAttribute('dominant-baseline','middle');t.setAttribute('font-size',Math.max(3,Math.min(7,b.width/3)));t.setAttribute('font-weight','800');t.setAttribute('fill','#fff');t.setAttribute('stroke','#111');t.setAttribute('stroke-width','1.5');t.setAttribute('paint-order','stroke');t.setAttribute('pointer-events','none');t.setAttribute('textLength',maxWidth);t.setAttribute('lengthAdjust','spacingAndGlyphs');t.textContent=mapBatch.countryName;path.ownerSVGElement.appendChild(t);}catch(_){}}
function highlightBatchSelection(){for(const id of mapBatchSelection){const p=document.getElementById(id);if(p){p.style.fill=mapBatch.color;p.setAttribute('fill',mapBatch.color);addBatchProvinceLabel(id);}}}
function toggleBatchProvince(provinceId){const path=document.getElementById(provinceId);if(!path)return;if(mapBatchSelection.has(provinceId)){mapBatchSelection.delete(provinceId);removeBatchProvinceLabel(provinceId);applyMapOwnership();highlightBatchSelection();}else{mapBatchSelection.add(provinceId);path.style.fill=mapBatch.color;path.setAttribute('fill',mapBatch.color);addBatchProvinceLabel(provinceId);}updateMapBatchUi();}
function finishMapBatch(){
 if(!mapBatch)return;
 if(!mapBatchSelection.size){mapBatch=null;updateMapBatchUi();const s=document.getElementById('mapBrushStatus');if(s)s.textContent='Çoklu atama iptal edildi.';return;}
 db.mapProvinceOwners=db.mapProvinceOwners||{};db.mapProvinceDetails=db.mapProvinceDetails||{};
 const affectedStateIds=[mapBatch.ownerId];
 for(const id of mapBatchSelection){const previousOwnerId=db.mapProvinceOwners[id];if(previousOwnerId)affectedStateIds.push(previousOwnerId);db.mapProvinceOwners[id]=mapBatch.ownerId;const existing=db.mapProvinceDetails[id]||{};db.mapProvinceDetails[id]={...existing,countryName:mapBatch.countryName,garrison:0,color:mapBatch.color};}
 refreshMapFortressCounts();redistributeMapGarrisonsForStateIds(affectedStateIds);const count=mapBatchSelection.size,name=mapBatch.countryName,ownerId=mapBatch.ownerId;
 addLog({stateId:ownerId,stateName:name,action:`Harita çoklu atama: ${count} toprak → ${name}`,qty:count,cost:0});
 for(const id of mapBatchSelection)removeBatchProvinceLabel(id);mapBatch=null;mapBatchSelection.clear();queueMapSave();applyMapOwnership();updateMapBatchUi();
 const s=document.getElementById('mapBrushStatus');if(s)s.textContent=`${count} toprak ${name} devletine atandı.`;toast(`${count} toprak → ${name}`,true);
}

function openMapBrushSetup(){
 if(!isAdmin)return;
 if(mapBrush){stopMapBrush();return;}
 const options=`<option value="">Devlet kartına bağlama</option>`+db.states.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 modal(`<h2>🖌️ HARİTA FIRÇASI</h2><p class="sub">Ayarları bir kez seç; ardından haritada dokunduğun her toprak aynı ülke, renk ve garnizonla kaydedilir.</p><div class="formgrid"><div class="full"><label>Devlet Kartı (İsteğe Bağlı)</label><select id="brush_owner" onchange="syncMapBrushOwner(this.value)">${options}</select></div>${field('brush_country','Ülke Adı','','text')}${field('brush_garrison','Toprak Garnizonu',0,'number')}${field('brush_color','Toprak Rengi','#c5a059','color')}</div><div class="actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn gold" onclick="activateMapBrush()">FIRÇAYI BAŞLAT</button></div>`);
}
function syncMapBrushOwner(ownerId){const owner=getState(ownerId);if(!owner)return;const nameEl=document.getElementById('f_brush_country'),garrisonEl=document.getElementById('f_brush_garrison'),colorEl=document.getElementById('f_brush_color');if(nameEl)nameEl.value=owner.name||'';if(garrisonEl)garrisonEl.value=owner.fortressGarrison||0;if(colorEl)colorEl.value=owner.color||'#c5a059';}
function activateMapBrush(){
 const ownerId=document.getElementById('brush_owner')?.value||'';
 const countryName=document.getElementById('f_brush_country')?.value.trim()||'';
 const garrison=Math.max(0,Math.floor(Number(document.getElementById('f_brush_garrison')?.value)||0));
 const color=document.getElementById('f_brush_color')?.value||'#c5a059';
 if(!countryName){alert('Fırça için ülke adı yazmalısın.');return;}
 mapBrush={ownerId,countryName,garrison,color};closeModal();
 const btn=document.getElementById('mapBrushBtn');if(btn){btn.textContent='✕ FIRÇAYI DURDUR';btn.className='btn red';}
 const status=document.getElementById('mapBrushStatus');if(status)status.textContent=`Fırça aktif: ${countryName} • ${color} • ${num(garrison)} garnizon`;
}
function stopMapBrush(){mapBrush=null;const btn=document.getElementById('mapBrushBtn');if(btn){btn.textContent='🖌️ FIRÇA';btn.className='btn gold';}const status=document.getElementById('mapBrushStatus');if(status)status.textContent='Toprağa dokun: düzenle veya fırça kullan.';}
function toggleMapPicker(){
 mapPickerMode=!mapPickerMode;
 if(mapPickerMode)mapBrush=null;
 const pickerBtn=document.getElementById('mapPickerBtn');if(pickerBtn){pickerBtn.textContent=mapPickerMode?'✕ SEÇİMİ İPTAL':'💧 RENK/ÜLKE SEÇ';pickerBtn.className=mapPickerMode?'btn red':'btn blue';}
 const brushBtn=document.getElementById('mapBrushBtn');if(brushBtn){brushBtn.textContent='🖌️ FIRÇA';brushBtn.className='btn gold';}
 const status=document.getElementById('mapBrushStatus');if(status)status.textContent=mapPickerMode?'Damlalık aktif: özelliklerini kopyalamak istediğin toprağa dokun.':'Toprağa dokun: düzenle, damlalıkla seç veya fırça kullan.';
}
function pickProvinceAsBrush(provinceId){
 const owner=getState(db.mapProvinceOwners?.[provinceId]),detail=db.mapProvinceDetails?.[provinceId]||{};
 const path=document.getElementById(provinceId);
 const countryName=detail.countryName||owner?.name||'';
 if(!countryName){alert('Bu toprakta kopyalanabilecek bir ülke bilgisi yok.');return;}
 const color=getProvinceDisplayColor(provinceId,detail,owner);
 mapBatch={ownerId:owner?.id||'',countryName,garrison:0,color};mapBatchSelection.clear();mapBrush=null;mapPickerMode=false;
 const pickerBtn=document.getElementById('mapPickerBtn');if(pickerBtn){pickerBtn.textContent='💧 RENK/ÜLKE SEÇ';pickerBtn.className='btn blue';}
 const brushBtn=document.getElementById('mapBrushBtn');if(brushBtn){brushBtn.textContent='🖌️ FIRÇA';brushBtn.className='btn gold';}
 updateMapBatchUi();
 const status=document.getElementById('mapBrushStatus');if(status)status.textContent=`${countryName} seçildi. Şimdi atanacak bütün topraklara dokun, ardından ATAMAYI BİTİR'e bas.`;
 toast(`${countryName} kopyalandı; çoklu seçim başladı.`,true);
}
function paintProvinceWithBrush(provinceId){
 if(!isAdmin||!mapBrush)return;
 db.mapProvinceOwners=db.mapProvinceOwners||{};db.mapProvinceDetails=db.mapProvinceDetails||{};
 const previousOwnerId=db.mapProvinceOwners[provinceId]||'';
 if(mapBrush.ownerId)db.mapProvinceOwners[provinceId]=mapBrush.ownerId;else delete db.mapProvinceOwners[provinceId];
 const existing=db.mapProvinceDetails[provinceId]||{};db.mapProvinceDetails[provinceId]={...existing,countryName:mapBrush.countryName,garrison:mapBrush.garrison,color:mapBrush.color};
 addLog({stateId:mapBrush.ownerId,stateName:mapBrush.countryName,action:`Harita fırçası: ${getTurkishMapName(provinceId)} boyandı`,qty:1,cost:0});
 refreshMapFortressCounts();redistributeMapGarrisonsForStateIds([previousOwnerId,mapBrush.ownerId]);queueMapSave();applyMapOwnership();toast(`${getTurkishMapName(provinceId)} → ${mapBrush.countryName}`,true);
}

function getCurrentPlayerState(){return db.states.find(s=>String(s.ownerEmail||'').toLocaleLowerCase('tr-TR')===String(currentUserEmail||'').toLocaleLowerCase('tr-TR'))||null}
function getGarrisonIntelReport(viewerState,realGarrison){
 const realValue=Math.max(0,Number(realGarrison)||0);
 const exact=viewerState?getAdvisorEffects(viewerState).spyAccuracyBonus:false;
 if(exact)return {value:realValue,exact:true,note:'Kesinleştirme sağlayan Divan paşası sayesinde gerçek değer görüldü.'};
 const deviationPercent=0.01+(Math.random()*0.19);
 const direction=Math.random()<.5?-1:1;
 return {value:Math.max(0,Math.round(realValue*(1+(direction*deviationPercent)))),exact:false,note:'Rapor %1–20 arasında yanıltma payı içerir.'};
}


// (Menüyü Açan Kod): Haritadaki herhangi bir toprağa tıklandığında ekrana menüyü açan koddur. (Tıklayan adminse ayar menüsünü, oyuncuysa bilgi menüsünü açar).
function handleProvinceClick(provinceId)
{
 const ownerId = db.mapProvinceOwners?.[provinceId];
 const owner = getState(ownerId);
 const detail = db.mapProvinceDetails?.[provinceId]||{};
 
 if(ownerId === "__rebel__") { openRebellionModal(provinceId, detail); return; }
 if(!isAdmin){openPlayerProvinceIntel(provinceId,owner);return;}
 if(mapBatch){toggleBatchProvince(provinceId);return;}
 if(mapPickerMode){pickProvinceAsBrush(provinceId);return;}
 if(mapBrush){paintProvinceWithBrush(provinceId);return;}
 
 const currentColor=getProvinceDisplayColor(provinceId,detail,owner);
 const options=`<option value="">Sahipsiz / atanmamış</option>`+db.states.map(s=>`<option value="${s.id}" ${owner?.id===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
 const isGloballyVisible = detail.isGloballyVisible ? 'checked' : '';
 const stateOpts = db.states.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 
 modal(`<h2>🗺️ TOPRAK YÖNETİMİ</h2><div class="event-result"><b>Toprak:</b> ${esc(getTurkishMapName(provinceId))}<br><b>Gösterilen ülke:</b> ${esc(detail.countryName||owner?.name||'Sahipsiz / atanmadı')}<br><b>Bu topraktaki garnizon:</b> ${num(detail.garrison??owner?.fortressGarrison??0)} asker</div><div class="formgrid" style="margin-top:10px;"><div class="full"><label>Devlet Kartına Bağla (İsteğe Bağlı)</label><select id="province_owner" onchange="syncProvinceOwnerFields(this.value)">${options}</select></div>${field('province_country_name','Ülke Adı (Kart olmadan yazılabilir)',detail.countryName||owner?.name||'','text')}${field('province_garrison','Bu Topraktaki Garnizon Sayısı',detail.garrison??owner?.fortressGarrison??0,'number')}${field('province_color','Toprak Rengi',currentColor,'color')}<div><label style="display:flex;align-items:center;gap:7px;margin-top:20px;"><input id="province_apply_all" type="checkbox" style="width:auto;"> Aynı ülke adlı bütün topraklara rengi uygula</label></div><div class="full" style="background:rgba(197, 160, 89, 0.1); border:1px solid var(--border-gold); padding:8px; border-radius:3px;"><label style="display:flex;align-items:center;gap:7px;margin:0;color:var(--border-gold);"><input id="province_global_visible" type="checkbox" style="width:auto;" ${isGloballyVisible}> 👁️ BÖLGEYİ DÜNYAYA AÇ (Sisi Herkes İçin Kaldır)</label></div>
 
 <div class="full" style="background:rgba(52, 152, 219, 0.1); border:1px solid var(--blue); padding:8px; border-radius:3px; margin-top:10px;">
    <label style="color:var(--blue); font-size:12px; font-weight:bold; margin-top:0;">👁️ BU TOPRAĞIN İSTİHBARATINI BİR DEVLETE VER VEYA GERİ AL</label>
    <div style="display:flex; gap:6px; margin-top:6px;">
        <select id="intel_grant_state" style="flex:1;">${stateOpts}</select>
        <button class="btn blue" style="flex:1; padding:4px;" onclick="grantIntelToState('${esc(provinceId)}', true)">İSTİHBARATI VER</button>
        <button class="btn red" style="flex:1; padding:4px;" onclick="grantIntelToState('${esc(provinceId)}', false)">GERİ AL</button>
    </div>
    <label style="display:flex; align-items:center; gap:7px; margin-top:8px;">
        <input id="intel_grant_all" type="checkbox" style="width:auto;"> Aynı ülke adlı bütün toprakların sisini seçilen devlete kaldır/geri al
    </label>
 </div>
 
 </div><div class="actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn green" onclick="saveProvinceOwner('${esc(provinceId)}')">KAYDET</button></div>`);
}


function openRebellionModal(provinceId, detail) {
    const viewer = getCurrentPlayerState();
    const cost = detail.garrison || 5000;
    let actionHtml = '';
    
    if(viewer) {
        let totalArmy = (viewer.piyade||0) + (viewer.suvari||0) + (viewer.nisanci||0);
        if(totalArmy >= cost) {
            actionHtml = `<button class="btn red" style="width:100%; padding:10px; font-weight:bold;" onclick="crushRebellion('${esc(provinceId)}')">⚔️ İSYANI BASTIR (-${num(cost)} Asker)</button>`;
        } else {
            actionHtml = `<div class="event-result" style="color:var(--red);">İsyanı bastırmak için ordunuzda en az ${num(cost)} birim asker (Piyade/Süvari/Nişancı) gereklidir. Sizin toplam ordunuz: ${num(totalArmy)}</div>`;
        }
    } else {
        if(isAdmin) {
            actionHtml = `<button class="btn gold" style="width:100%; padding:10px;" onclick="adminClearRebellion('${esc(provinceId)}')">🛠️ ADMİN: İSYANI SİL</button>`;
        } else {
            actionHtml = `<p class="sub">Devleti olmayan bir oyuncu isyan bastıramaz.</p>`;
        }
    }

    modal(`<h2>🔥 BÖLGESEL İSYAN KONTROLDEN ÇIKTI!</h2>
    <div class="event-result" style="border-color:var(--red);">
        <b>İsyan Çıkan Toprak:</b> ${esc(getTurkishMapName(provinceId))}<br>
        <b>İsyancı Çapulcu Gücü:</b> ${num(cost)} Asker
    </div>
    <p class="sub" style="margin-bottom:12px; line-height:1.5;">Bu toprağı kurtarmak için ordunuzla müdahale etmelisiniz. Kayıplar ordunuzdan kalıcı olarak düşülür. <b>İsyanı hangi devlet bastırırsa toprak tamamen ona geçer!</b> Fırsatı değerlendirin.</p>
    ${actionHtml}
    <div class="actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">KAPAT</button></div>`);
}

function adminClearRebellion(provinceId) {
    if(!isAdmin) return;
    delete db.mapProvinceOwners[provinceId];
    delete db.mapProvinceDetails[provinceId];
    queueMapSave();
    applyMapOwnership();
    closeModal();
    toast("İsyan admin tarafından temizlendi.", true);
}

function crushRebellion(provinceId) {
    const viewer = getCurrentPlayerState();
    if(!viewer) return;
    const detail = db.mapProvinceDetails?.[provinceId] || {};
    const cost = detail.garrison || 5000;
    
    let totalArmy = (viewer.piyade||0) + (viewer.suvari||0) + (viewer.nisanci||0);
    if(totalArmy < cost) { alert("Yeterli askeriniz yok!"); return; }
    
    let remaining = cost;
    
    // Çatışma kayıplarını ordudan sil (Önce piyadeden başlar)
    for(const key of ["piyade", "nisanci", "suvari"]) {
        const take = Math.min(viewer[key]||0, remaining);
        viewer[key] = (viewer[key]||0) - take;
        remaining -= take;
        if(!remaining) break;
    }

    // Toprağı kahraman oyuncunun üzerine geçir
    db.mapProvinceOwners[provinceId] = viewer.id;
    db.mapProvinceDetails[provinceId] = {
        countryName: viewer.name,
        color: viewer.color || "#c5a059",
        garrison: 0
    };

    addLog({
        stateId: viewer.id,
        stateName: viewer.name,
        action: `⚔️ İsyan Bastırıldı: ${getTurkishMapName(provinceId)} toprağı ele geçirildi!`,
        qty: cost,
        cost: 0,
        unitName: "Çatışmada Kaybedilen Asker",
        oldUnit: totalArmy,
        newUnit: totalArmy - cost
    });

    refreshMapFortressCounts();
    redistributeMapGarrisonsForStateIds([viewer.id]);
    queueMapSave();
    applyMapOwnership();
    closeModal();
    openDetail(viewer.id); // Asker sayısının azaldığını ekranda anında görsün
    toast(`Tebrikler! İsyanı kanla bastırıp ${getTurkishMapName(provinceId)} bölgesini ele geçirdiniz.`, true);
}

function syncProvinceOwnerFields(ownerId){
  const owner=getState(ownerId);if(!owner)return;
  const nameEl=document.getElementById('f_province_country_name'),garrisonEl=document.getElementById('f_province_garrison');
  if(nameEl)nameEl.value=owner.name||'';
  if(garrisonEl)garrisonEl.value=owner.fortressGarrison||0;
}
 

function openPlayerProvinceIntel(provinceId,owner)
{
 const viewer=getCurrentPlayerState();
 const provinceName=getTurkishMapName(provinceId);
 const detail=db.mapProvinceDetails?.[provinceId]||{};
 
 // SİS KONTROLÜ
 let isFogged = false;
 if(viewer && (viewer.istihbarat_binasi || 0) === 0) {
     const myProvinces = getOwnedMapProvinceIds(viewer.id);
     const isMine = myProvinces.includes(provinceId);
     const isDiscovered = (viewer.discoveredProvinces || []).includes(provinceId);
     const isAdjacent = (mapAdjacencyCache && mapAdjacencyCache[provinceId]) ? mapAdjacencyCache[provinceId].some(adj => myProvinces.includes(adj)) : false;
     const isRebel = (db.mapProvinceOwners?.[provinceId] === "__rebel__");
     if(!isMine && !isDiscovered && !isAdjacent && !isRebel) isFogged = true;
 }

 const countryName = isFogged ? "Bilinmeyen Devlet (Savaş Sisi)" : (detail.countryName||owner?.name||'');
 const realGarrison=detail.garrison??owner?.fortressGarrison??0;
 const strategic=getStrategicRegionConfig(provinceId);
 const strategicHtml=strategic.enabled&&strategic.description?`<div class="event-result" style="margin-top:10px;border-color:var(--gold);"><b>⭐ STRATEJİK BÖLGE</b><br>${esc(strategic.description)}</div>`:'';
 if(!countryName){modal(`<h2>🗺️ TOPRAK BİLGİSİ</h2><div class="event-result"><b>Toprak:</b> ${esc(provinceName)}<br><b>Sahibi:</b> Sahipsiz / atanmadı</div>${strategicHtml}<div class="actions"><button class="btn" onclick="closeModal()">KAPAT</button></div>`);return;}
 if(!viewer){modal(`<h2>🗺️ TOPRAK BİLGİSİ</h2><p class="error">Bu rapor için bir devlete bağlı oyuncu hesabı gerekir.</p><div class="actions"><button class="btn" onclick="closeModal()">KAPAT</button></div>`);return;}
 if((viewer.istihbarat_binasi||0)>0){
   const report=getGarrisonIntelReport(viewer,realGarrison);
   modal(`<h2>🗺️ TOPRAK İSTİHBARATI</h2><div class="event-result"><b>Toprak:</b> ${esc(provinceName)}<br><b>Sahibi:</b> ${esc(countryName)}<br><b>${report.exact?'Kesin':'Tahmini'} toprak garnizonu:</b> ${report.exact?'':'~'}${num(report.value)} asker</div><p class="sub">${esc(report.note)}</p>${strategicHtml}<div class="actions"><button class="btn" onclick="closeModal()">KAPAT</button></div>`);
   return;
 }
 const cost=Math.max(0,Number(db.settings.mapIntelReportCost)||0);
 modal(`<h2>🗺️ TOPRAK BİLGİSİ</h2><div class="event-result"><b>Toprak:</b> ${esc(provinceName)}<br><b>Sahibi:</b> ${esc(countryName)}</div>${strategicHtml}<p class="sub">${isFogged ? "Bu bölge tamamen sis altında. Sınırlarınızın ötesini görmek için yerel muhbirlerden rapor almalısınız." : "İstihbarat Dairen yok. Yerel muhbirlerden %1–20 sapmalı garnizon raporu satın alabilirsin."}</p><div class="event-result"><b>Rapor ücreti:</b> ${money(cost)}<br><b>Hazinen:</b> ${money(viewer.treasury||0)}</div><div class="actions"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn gold" onclick="buyProvinceIntelReport('${esc(provinceId)}','${esc(viewer.id)}')">RAPORU SATIN AL & AYDINLAT</button></div>`);
}


function buyProvinceIntelReport(provinceId,viewerId)
{
 const owner=getState(db.mapProvinceOwners?.[provinceId]),detail=db.mapProvinceDetails?.[provinceId]||{},viewer=getState(viewerId),currentViewer=getCurrentPlayerState();if(!viewer||!currentViewer||currentViewer.id!==viewer.id)return;
 const countryName=detail.countryName||owner?.name||'Bilinmeyen';
 const realGarrison=detail.garrison??owner?.fortressGarrison??0;
 const cost=Math.max(0,Number(db.settings.mapIntelReportCost)||0);
 if((viewer.treasury||0)<cost){alert(`Hazine yetersiz! Gerekli: ${money(cost)}`);return;}
 const oldTreasury=viewer.treasury||0;viewer.treasury=oldTreasury-cost;
 const report=getGarrisonIntelReport(viewer,realGarrison);
 
 // SİS KALDIRMA: İstihbarat alınan toprağı kalıcı olarak aydınlat
 viewer.discoveredProvinces = viewer.discoveredProvinces || [];
 if(!viewer.discoveredProvinces.includes(provinceId)) viewer.discoveredProvinces.push(provinceId);
 addLog({stateId:viewer.id,stateName:viewer.name,action:`Toprak istihbaratı satın alındı (Sis kaldırıldı): ${getTurkishMapName(provinceId)}`,qty:1,cost,oldTreasury,newTreasury:viewer.treasury});
 queueSave();
 applyMapOwnership(); // Haritayı anında aydınlat
 modal(`<h2>🕵️ MUHBİR RAPORU</h2><div class="event-result"><b>Toprak:</b> ${esc(getTurkishMapName(provinceId))}<br><b>Sahibi:</b> ${esc(countryName)}<br><b>${report.exact?'Kesin':'Tahmini'} toprak garnizonu:</b> ${report.exact?'':'~'}${num(report.value)} asker</div><p class="sub">${esc(report.note)} Hazineden ${money(cost)} ödendi.</p><div class="actions"><button class="btn" onclick="closeModal()">KAPAT</button></div>`);

}

 
// (Sisi Kaldıran Kod): Adminin, haritadaki karanlık bir toprağın (sisin) sadece seçtiği bir devlet (örn: Kırım) tarafından kalıcı olarak görülmesini sağladığı koddur.
function grantIntelToState(provinceId,isGranting) 
{
    if(!isAdmin) return;
    const targetStateId = document.getElementById("intel_grant_state").value;
    const s = getState(targetStateId);
    if(!s) return;
    
    const applyAll = document.getElementById("intel_grant_all").checked;
    s.discoveredProvinces = s.discoveredProvinces || [];
    
    let count = 0;
    if(applyAll) {
        const detail = db.mapProvinceDetails?.[provinceId]||{};
        const owner = getState(db.mapProvinceOwners?.[provinceId]);
        const countryName = detail.countryName || owner?.name || '';
        
        if(!countryName) { alert("Bu toprağın bağlı olduğu belli bir ülke adı yok."); return; }
        
        document.querySelectorAll('#gameMapCanvas path[id][d]').forEach(path => {
             const linkedOwner = getState(db.mapProvinceOwners?.[path.id]);
             const existing = db.mapProvinceDetails[path.id]||{};
             const effectiveName = existing.countryName || linkedOwner?.name || '';
             if(normalizeMapName(effectiveName) === normalizeMapName(countryName)) {
                 if(isGranting) {
                     if(!s.discoveredProvinces.includes(path.id)) { s.discoveredProvinces.push(path.id); count++; }
                 } else {
                     if(s.discoveredProvinces.includes(path.id)) {
                         s.discoveredProvinces = s.discoveredProvinces.filter(x => x !== path.id); count++;
                     }
                 }
             }
        });
    } else {
        if(isGranting) {
            if(!s.discoveredProvinces.includes(provinceId)) { s.discoveredProvinces.push(provinceId); count++; }
        } else {
            if(s.discoveredProvinces.includes(provinceId)) {
                s.discoveredProvinces = s.discoveredProvinces.filter(x => x !== provinceId); count++;
            }
        }
    }
    
    if(count > 0) {
        addLog({
            stateId: s.id,
            stateName: s.name,
            action: `Admin tarafından ${count} toprağın istihbaratı ${isGranting ? 'verildi (Aydınlatıldı)' : 'geri alındı (Sise Gömüldü)'}.`,
            qty: count, cost: 0
        });
        queueSave();
        applyMapOwnership(); // Simülasyon menüsü açıksa anında haritanın karardığını/açıldığını göstersin
        toast(`${s.name} devletinden ${count} toprağın istihbaratı ${isGranting ? 'verildi' : 'geri alındı'}!`, true);
    } else {
        toast(isGranting ? "Seçilen devlet zaten bu yerin istihbaratına sahip." : "Devlet zaten burayı görmüyor.", false);
    }
}


//(Değişikliği Veritabanına Yazan Kod): Admin menüde ayar yapıp "Kaydet" tuşuna bastığında; toprağın yeni sahibini, garnizonunu ve rengini veritabanına yazıp haritayı herkes için güncelleyen koddur.
function saveProvinceOwner(provinceId){
 if(!isAdmin)return;
 const newOwnerId=document.getElementById('province_owner')?.value||'';
 const countryName=document.getElementById('f_province_country_name')?.value.trim()||'';
 const garrison=Math.max(0,Math.floor(Number(document.getElementById('f_province_garrison')?.value)||0));
 const color=document.getElementById('f_province_color')?.value||'';
 const applyAll=!!document.getElementById('province_apply_all')?.checked;
 const isGloballyVisible = !!document.getElementById('province_global_visible')?.checked;
 const oldOwner=getState(db.mapProvinceOwners?.[provinceId]);
 db.mapProvinceOwners=db.mapProvinceOwners||{};
 db.mapProvinceDetails=db.mapProvinceDetails||{};
 if(newOwnerId)db.mapProvinceOwners[provinceId]=newOwnerId;else delete db.mapProvinceOwners[provinceId];
 if(countryName||garrison||color||isGloballyVisible){const existing=db.mapProvinceDetails[provinceId]||{};db.mapProvinceDetails[provinceId]={...existing,countryName,garrison,color,isGloballyVisible};}else delete db.mapProvinceDetails[provinceId];
 const newOwner=getState(newOwnerId);
 if(applyAll&&countryName){
   document.querySelectorAll('#gameMapCanvas path[id][d]').forEach(path=>{
     const linkedOwner=getState(db.mapProvinceOwners?.[path.id]);
     const existing=db.mapProvinceDetails[path.id]||{};
     const effectiveName=existing.countryName||linkedOwner?.name||'';
     if(normalizeMapName(effectiveName)===normalizeMapName(countryName))db.mapProvinceDetails[path.id]={...existing,countryName:existing.countryName||countryName,color};
   });
 }
 const displayName=countryName||newOwner?.name||'Sahipsiz';
 addLog({stateId:newOwnerId||oldOwner?.id||'',stateName:newOwner?.name||oldOwner?.name||displayName,action:`Toprak bilgisi: ${getTurkishMapName(provinceId)} → ${displayName}, garnizon ${num(garrison)}, renk ${color}${applyAll?' (tüm ülkeye uygulandı)':''}`,qty:1,cost:0});
 refreshMapFortressCounts();redistributeMapGarrisonsForStateIds([oldOwner?.id,newOwnerId]);queueMapSave();closeModal();applyMapOwnership();toast(`${getTurkishMapName(provinceId)}: ${displayName}, ${num(db.mapProvinceDetails[provinceId]?.garrison||0)} garnizon.`,true);
}

