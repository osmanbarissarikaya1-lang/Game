function renderHome(){
 currentId=null;
 document.getElementById("detail").classList.add("hidden");
 document.getElementById("mapScreen")?.classList.add("hidden");
 document.getElementById("home").classList.remove("hidden");
 document.body.style.background = "var(--bg)";
 
 const pendingBox=document.getElementById("pendingEventsHome"); if(pendingBox) pendingBox.innerHTML=renderPendingEvents();
  const box=document.getElementById("stateGrid");
 const visibleStates = isAdmin ? db.states : db.states.filter(s => s.ownerEmail === currentUserEmail);
 
 if(!visibleStates.length){
    box.innerHTML=`<div class="empty" style="grid-column:1/-1; padding:30px; text-align:center; color:var(--muted); border:1px dashed var(--line);">Henüz devralınan bir devlet yok.<br><br>${isAdmin ? '<button class="btn green" onclick="openStateForm()">＋ İlk Devleti Ekle</button>' : 'Adminin size bir devlet atamasını bekleyin.'}</div>`;
    return
 }
 
 box.innerHTML=visibleStates.map(s=>{
  let army=(s.piyade||0)+(s.suvari||0)+(s.nisanci||0);
  if(db.settings.customItems) {
     db.settings.customItems.filter(x=>x.category==='asker' && (!x.faction || x.faction===s.id)).forEach(x => army += (s[x.id]||0));
  }
  const guns=(s.kucuk_top||0)+(s.orta_top||0)+(s.buyuk_top||0), ships=(s.kucuk_gemi||0)+(s.orta_gemi||0)+(s.buyuk_gemi||0);
  const isMine = s.ownerEmail === currentUserEmail;
  const accent=s.color||"#c5a059";
  const rulerImgClean = cleanUrl(s.rulerImage);
  const unreadLetters = (db.letters||[]).filter(l => l.toStateId === s.id && !l.read).length;
  const stateKey=`${s.id||''} ${s.name||''}`.toLocaleLowerCase('tr-TR');
  const cardTheme=stateKey.includes('kırım')||stateKey.includes('kirim')||stateKey.includes('crimea')?'theme-crimea':stateKey.includes('güneş')||stateKey.includes('gunes')||stateKey.includes('sun')?'theme-sun':'theme-ottoman';
  const medallion=cardTheme==='theme-crimea'?'T':cardTheme==='theme-sun'?'☀':'☾';

  return `<div class="state-card premium-state-card ${cardTheme}">
   <div class="state-frame-line"></div><div class="state-portrait-shell${rulerImgClean?'':' empty'}">${rulerImgClean?`<img src="${esc(rulerImgClean)}" alt="">`:''}</div><div class="state-medallion">${medallion}</div>
   <div class="state-card-identity"><h2>${esc(s.name)}</h2><div class="state-card-ruler">${esc(s.ruler||'Lider Yok')} ${isMine?'<span class="mine">(SEN)</span>':''}</div></div><div class="state-card-badge">${esc(s.title||'Devlet')}</div>
   ${unreadLetters>0?`<span class="badge-count" style="position:absolute;right:4%;top:28%;z-index:6">✉ ${unreadLetters}</span>`:''}<div class="state-card-stats"><div class="state-card-stat money-stat"><small>HAZİNE</small><b>${money(s.treasury)}</b></div><div class="state-card-stat"><small>NÜFUS</small><b>${num(s.population)}</b></div><div class="state-card-stat"><small>ORDU</small><b>${num(army)}</b></div><div class="state-card-stat"><small>TOP/GEMİ</small><b>${num(guns)} / ${num(ships)}</b></div></div><button class="state-card-enter" onclick="openDetail('${s.id}')">YÖNETİME GİR &nbsp;→</button></div>`
 }).join("")
}

function switchTab(tabId) {
    document.querySelectorAll('.hoi-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById('tab-btn-' + tabId);
    const content = document.getElementById('tab-content-' + tabId);
    if(btn) btn.classList.add('active');
    if(content) content.classList.add('active');
    const activeLabel=document.getElementById('mobile-active-tab');
    if(activeLabel&&btn) activeLabel.textContent=btn.textContent.trim();
    document.getElementById('player-tabs')?.classList.remove('mobile-open');
    // ✅ FIX: Mektuplar sekmesi açılınca okundu işaretle
    if(tabId === 'mektup' && currentId) {
        const letters = db.letters || [];
        let changed = false;
        letters.forEach(l => { if(l.toStateId === currentId && !l.read) { l.read = true; changed = true; } });
        if(changed) { queueSave(); if(btn) { const badge = btn.querySelector('.badge-count'); if(badge) badge.remove(); } }
    }
}

function toggleMobileTabs(){
 document.getElementById('player-tabs')?.classList.toggle('mobile-open');
}

function buildUnitCard(s, key, name, imgUrl, basePrice, baseUpkeep, capStr, canManage, isCustom, isInfrastructure=false, usePremiumStyle=false) {
    let count = s[key] || 0;
    let safeImg = cleanUrl(imgUrl);
    
    const adv = getAdvisorEffects(s);
    let disc = (isInfrastructure || key.includes("liman") || key.includes("ocak") || key === "okul" || key === "istihbarat_binasi") ? adv.infraDiscount : adv.recruitDiscount;
    let actualPrice = Math.max(1, Math.round(basePrice * (1 - (disc / 100))));

    const premiumStyle=isInfrastructure||usePremiumStyle;
    const actionsHtml = canManage && premiumStyle
    ? `<div class="population-buy-line"><div class="population-qty-control"><input id="qty_${s.id}_${key}" type="number" min="1" value="1" aria-label="Alınacak adet" oninput="document.getElementById('tot_${s.id}_${key}').innerText='Toplam: '+money(${actualPrice}*(this.value||0))"><button type="button" class="population-qty-step" aria-label="Adedi artır" onclick="adjustPopulationBuildingQty('qty_${s.id}_${key}',1)">▲</button><button type="button" class="population-qty-step" aria-label="Adedi azalt" onclick="adjustPopulationBuildingQty('qty_${s.id}_${key}',-1)">▼</button></div><button class="btn population-build-btn" onclick="${isCustom ? `buyCustomBulk('${s.id}','${key}','${esc(name)}')` : `buyBulk('${s.id}','${key}','${esc(name)}')`}">${isInfrastructure?'🔨 İNŞA ET':'⚔ AL'}</button></div><div id="tot_${s.id}_${key}" class="population-total">Toplam: ${money(actualPrice)}</div>`
    : canManage ? `<div class="unit-buy-row">
         <input id="qty_${s.id}_${key}" type="number" min="1" value="1" oninput="document.getElementById('tot_${s.id}_${key}').innerText = money(${actualPrice} * (this.value||0))">
         <button class="btn green" onclick="${isCustom ? `buyCustomBulk('${s.id}','${key}','${esc(name)}')` : `buyBulk('${s.id}','${key}','${esc(name)}')`}">AL</button>
       </div>
       <div style="text-align:center; font-size:10px; margin-top:2px; color:var(--gold);" id="tot_${s.id}_${key}">${money(actualPrice)} ${disc > 0 ? `<span style="color:var(--green);">(%${disc} İndirim)</span>` : ''}</div>` 
    : `<div style="text-align:center; padding:3px; background:var(--red); color:#fff; font-size:10px; border-radius:2px;">YETKİ YOK</div>`;

    return `
    <div class="unit-card${premiumStyle?' population-building-card':''}${isInfrastructure?' infrastructure-building-card':''}${usePremiumStyle?' military-premium-card':''}">
        ${safeImg ? `<div class="unit-img-box"><img src="${esc(safeImg)}"></div>` : ''}
        <div class="unit-details">
            <div class="unit-title">${esc(name)}</div>
            <div class="unit-info-grid">
                <div>Mevcut: <strong>${num(count)}</strong></div>
                <div>Fiyat: <strong>${num(actualPrice)}</strong></div>
                <div>Bakım: <strong style="color:var(--red)">-${num(baseUpkeep)}</strong></div>
                ${capStr ? `<div>Lmt: <strong>${capStr}</strong></div>` : ''}
            </div>
            ${actionsHtml}
        </div>
    </div>`;
}

function buildPopulationBuildingCard(s,key,name,imgUrl,canManage){
 const safeImg=cleanUrl(imgUrl)||"";
 const growth=Math.max(0,Number(db.settings.populationBuildingGrowth?.[key])||0);
 const costPerPerson=Math.max(0,Number(db.settings.populationBuildingCostPerPerson?.[key])||0);
 const price=Math.max(0,Math.round((Number(s.population)||0)*costPerPerson));
 const ownedCount = getOwnedMapProvinceIds(s.id).length; // TOPRAK KOTASI GÖRSELİ İÇİN
 const isFull = (s[key]||0) >= ownedCount; // KOTA DOLDU MU?
 
 return `<div class="unit-card population-building-card">
   ${safeImg?`<div class="unit-img-box"><img src="${esc(safeImg)}"></div>`:''}
   <div class="unit-details">
     <div class="unit-title">${esc(name)}</div>
     <div class="unit-info-grid">
       <div>Mevcut: <strong style="${isFull ? 'color:var(--red);' : 'color:var(--gold);'}">${num(s[key]||0)} / ${ownedCount}</strong></div>
       <div>Nüfus: <strong style="color:var(--green)">+%${num(growth)}</strong></div>
       <div>Fiyat: <strong style="color:var(--gold)">${money(price)}</strong></div>
     </div>
     ${canManage?`<div class="population-buy-line"><div class="population-qty-control"><input id="qty_${s.id}_${key}" type="number" min="1" value="1" aria-label="İnşa edilecek adet" oninput="document.getElementById('tot_${s.id}_${key}').innerText='Toplam: '+money(${price}*(this.value||0))"><button type="button" class="population-qty-step" aria-label="Adedi artır" onclick="adjustPopulationBuildingQty('qty_${s.id}_${key}',1)">▲</button><button type="button" class="population-qty-step" aria-label="Adedi azalt" onclick="adjustPopulationBuildingQty('qty_${s.id}_${key}',-1)">▼</button></div><button class="btn population-build-btn" onclick="buildPopulationBuilding('${s.id}','${key}','${esc(name)}')">🔨 İNŞA ET</button></div><div id="tot_${s.id}_${key}" class="population-total">Toplam: ${money(price)}</div>`:'<div style="text-align:center;padding:3px;background:var(--red);color:#fff;font-size:10px;border-radius:2px;">YETKİ YOK</div>'}
   </div>
 </div>`;
}

function openDetail(id){
 const s=getState(id);
 if(!s) return;
 if(!isAdmin && s.ownerEmail !== currentUserEmail) { alert("Bu devleti görüntüleme yetkiniz yok!"); return; }
 
 currentId=id;
 document.getElementById("home").classList.add("hidden");
 document.getElementById("mapScreen")?.classList.add("hidden");
 document.getElementById("detail").classList.remove("hidden");
 
 const bgImgClean = cleanUrl(s.bgImage);
 if(bgImgClean) {
    document.body.style.background = `linear-gradient(rgba(13,15,18,0.85), rgba(13,15,18,0.85)), url('${esc(bgImgClean)}') fixed center/cover`;
 } else {
    document.body.style.background = "var(--bg)";
 }

 const p = calcPop(s);
 const annualIncome = calcIncome(s);
 const permInc = calcPermIncome(s);
 const milUpkeep = calcMilitaryUpkeep(s);
 const artUpkeep = calcArtilleryUpkeep(s);
 const navUpkeep = calcNavyUpkeep(s);
 const cusUpkeep = calcCustomUpkeep(s);
 const advSalary = calcAdvisorExpenses(s);
 const fortressGarrisonExpense = calcFortressGarrisonExpense(s);
 const populationBuildingExpense = calcPopulationBuildingExpense(s);
 const schoolExpense = Math.max(0,Number(s.okul)||0)*Math.max(0,Number(db.settings.schoolUpkeep)||0);
 const infrastructureExpense = calcInfrastructureExpense(s);
 const totalExpenses = calcExpenses(s);
 
 let tempLedgerTotal = 0;
 if(s.customLedger && s.customLedger.length > 0) {
     s.customLedger.forEach(item => { tempLedgerTotal += item.amount; });
 }
 const netAnnualGain = annualIncome + permInc - totalExpenses + tempLedgerTotal;

 const isOwner = (s.ownerEmail === currentUserEmail);
 const canManage = isAdmin || isOwner;
 const editBtn = isAdmin ? `<button class="btn gold" onclick="openStateForm('${s.id}')">✎ DÜZENLE</button>` : ``;
 const rulerImgClean = cleanUrl(s.rulerImage);
 const imgs = db.settings.images || {};

 const myLetters = (db.letters || []).filter(l => (l.toStateId === s.id || l.fromStateId === s.id) && !(l.deletedBy || []).includes(s.id));
 const unreadCount = myLetters.filter(l => l.toStateId === s.id && !l.read).length;

 // 1. ASKERİYE SEKMESİ
 const pendingEventCount=getVisiblePendingEvents().length;
 const olaylarHtml=renderPendingEvents();
  let askeriyeHtml = `<div class="unit-grid population-building-grid">`;
 askeriyeHtml += buildUnitCard(s, 'piyade', 'Piyade', imgs.piyade, db.settings.prices.piyade, db.settings.upkeep.piyade, '', canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'suvari', 'Süvari', imgs.suvari, db.settings.prices.suvari, db.settings.upkeep.suvari, '', canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'nisanci', 'Nişancı', imgs.nisanci, db.settings.prices.nisanci, db.settings.upkeep.nisanci, '', canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'kucuk_top', 'Küçük Top', imgs.kucuk_top, db.settings.prices.kucuk_top, db.settings.upkeep.kucuk_top, `${num(gunCapacity(s))}/${num(gunCapMax(s))}`, canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'orta_top', 'Orta Top', imgs.orta_top, db.settings.prices.orta_top, db.settings.upkeep.orta_top, `${num(gunCapacity(s))}/${num(gunCapMax(s))}`, canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'buyuk_top', 'Büyük Top', imgs.buyuk_top, db.settings.prices.buyuk_top, db.settings.upkeep.buyuk_top, `${num(gunCapacity(s))}/${num(gunCapMax(s))}`, canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'kucuk_gemi', 'Küçük Gemi', imgs.kucuk_gemi, db.settings.prices.kucuk_gemi, db.settings.upkeep.kucuk_gemi, `${num(shipCapacity(s))}/${num(shipCapMax(s))}`, canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'orta_gemi', 'Orta Gemi', imgs.orta_gemi, db.settings.prices.orta_gemi, db.settings.upkeep.orta_gemi, `${num(shipCapacity(s))}/${num(shipCapMax(s))}`, canManage, false, false, true);
 askeriyeHtml += buildUnitCard(s, 'buyuk_gemi', 'Büyük Gemi', imgs.buyuk_gemi, db.settings.prices.buyuk_gemi, db.settings.upkeep.buyuk_gemi, `${num(shipCapacity(s))}/${num(shipCapMax(s))}`, canManage, false, false, true);
 
 const customUnits = (db.settings.customItems || []).filter(item => (!item.faction || item.faction === s.id) && item.category === 'asker');
 customUnits.forEach(c => {
     askeriyeHtml += buildUnitCard(s, c.id, c.name, c.icon, c.price, c.upkeep, '', canManage, true, false, true);
 });
 askeriyeHtml += `</div>`;

 // 2. ALTYAPI SEKMESİ
 let altyapiHtml = `<div class="unit-grid population-building-grid">`;
 altyapiHtml += buildUnitCard(s, 'kucuk_liman', 'Küçük Liman', imgs.kucuk_liman, db.settings.prices.kucuk_liman, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'orta_liman', 'Orta Liman', imgs.orta_liman, db.settings.prices.orta_liman, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'buyuk_liman', 'Büyük Liman', imgs.buyuk_liman, db.settings.prices.buyuk_liman, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'kucuk_ocak', 'Küçük Top Ocağı', imgs.kucuk_ocak, db.settings.prices.kucuk_ocak, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'orta_ocak', 'Orta Top Ocağı', imgs.orta_ocak, db.settings.prices.orta_ocak, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'buyuk_ocak', 'Büyük Top Ocağı', imgs.buyuk_ocak, db.settings.prices.buyuk_ocak, 0, '', canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'okul', 'Okul', imgs.okul, db.settings.prices.okul, db.settings.schoolUpkeep||0, `${s.okul||0} / ${getOwnedMapProvinceIds(s.id).length}`, canManage, false, true);
 altyapiHtml += buildUnitCard(s, 'istihbarat_binasi', 'İstihbarat Dairesi', imgs.istihbarat_binasi, db.settings.prices.istihbarat_binasi, 0, '', canManage, false, true);
 
 const customInfra = (db.settings.customItems || []).filter(item => (!item.faction || item.faction === s.id) && item.category !== 'asker');
 customInfra.forEach(c => {
     altyapiHtml += buildUnitCard(s, c.id, c.name, c.icon, c.price, c.upkeep, '', canManage, true, true);
 });
 altyapiHtml += `</div>`;

 // 3. MALİYE & DETAYLI EKONOMİ & YILLIK HASILA SEKMESİ
 let ledgerHtml = `<div class="finance-dashboard">`;
 const netSign = netAnnualGain >= 0 ? '+' : '';
 const netColor = netAnnualGain >= 0 ? 'var(--green)' : 'var(--red)';
 ledgerHtml += `
 <div class="eco-kpi-card finance-hero">
    <div class="finance-kpi-grid">
        <div class="finance-kpi"><span>MEVCUT HAZİNE</span><b class="money">${money(s.treasury)}</b></div>
        <div class="finance-kpi"><span>YILLIK NET HASILA</span><b style="color:${netColor};">${netSign}${money(netAnnualGain)} / Yıl</b></div>
    </div>
    <div class="finance-note">
       Yıl bittiğinde hazinenize eklenecek/kesilecek net tutardır. (Vergiler + Sabit Ticaret + Tek Seferlik Kalemler - Otomatik Giderler)
    </div>
    ${Number(s.treasury||0)<0?`<div class="event-result" style="margin-top:8px;color:var(--red);">⚠️ BORÇ: ${money(Math.abs(Number(s.treasury||0)))} — Borç varken yeni alım yapılamaz.</div>`:''}
 </div>`;

 const adv = getAdvisorEffects(s);
 const baseTax = (Number(s.baseTaxPerPerson)||5) * ((Number(s.tax)||0)/100);
 const actualBaseTax = baseTax * (1 + (adv.taxBonus / 100));

 ledgerHtml += `
 <div class="finance-columns">
    <!-- GELİR DETAYLARI -->
    <div class="finance-panel finance-income">
        <h4 style="color:var(--green); margin:0 0 6px; font-family:'Oswald';">📥 GELİR DETAYLARI</h4>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Eğitimli Sınıf Vergisi (${Number(db.settings.educatedTaxMultiplier??1.5)}x)</span><b style="color:var(--green)">${money(Math.floor(p.edu * actualBaseTax * Math.max(0,Number(db.settings.educatedTaxMultiplier??1.5))))}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Sıradan Halk Vergisi (1.0x)</span><b style="color:var(--green)">${money(Math.floor(p.other * actualBaseTax))}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Boştaki Elverişli Vergisi (1.0x)</span><b style="color:var(--green)">${money(Math.floor(p.elig * actualBaseTax))}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Sabit Antlaşma Gelirleri</span><b style="color:var(--green)">${money(permInc)}</b></div>
        <div class="finance-total">
            <span>TOPLAM BRÜT GELİR:</span>
            <span style="color:var(--green)">${money(annualIncome + permInc)} ${adv.taxBonus !== 0 ? `<small style="color:var(--gold)">(%+${adv.taxBonus} Danışman)</small>` : ''}</span>
        </div>
    </div>

    <!-- GİDER DETAYLARI -->
    <div class="finance-panel finance-expense">
        <h4 style="color:var(--red); margin:0 0 6px; font-family:'Oswald';">📤 GİDER DETAYLARI</h4>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Ordu Bakımı (Piyade/Süvari/Nişancı)</span><b style="color:var(--red)">-${money(milUpkeep)} ${adv.milUpkeepDiscount > 0 ? `<small style="color:var(--green)">(-%${adv.milUpkeepDiscount})</small>` : ''}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Topçu Batarya Bakımı</span><b style="color:var(--red)">-${money(artUpkeep)} ${adv.artUpkeepDiscount > 0 ? `<small style="color:var(--green)">(-%${adv.artUpkeepDiscount})</small>` : ''}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Donanma / Gemi Bakımı</span><b style="color:var(--red)">-${money(navUpkeep)} ${adv.navyUpkeepDiscount > 0 ? `<small style="color:var(--green)">(-%${adv.navyUpkeepDiscount})</small>` : ''}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Özel Birim Giderleri</span><b style="color:var(--red)">-${money(cusUpkeep)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Danışman / Vezir Maaşları</span><b style="color:var(--red)">-${money(advSalary)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Kale Garnizonu (${num(s.fortressGarrison||0)} asker)</span><b style="color:var(--red)">-${money(fortressGarrisonExpense)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Nüfus Binaları Yıllık Gideri</span><b style="color:var(--red)">-${money(populationBuildingExpense)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Okul Bakımı (${num(s.okul||0)} okul)</span><b style="color:var(--red)">-${money(schoolExpense)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Diğer Altyapı Binaları</span><b style="color:var(--red)">-${money(infrastructureExpense)}</b></div>
        <div class="list-item" style="padding:4px 6px; font-size:12px;"><span>Sivil Saray / Kamu Gideri</span><b style="color:var(--red)">-${money(s.civilExpense)}</b></div>
        <div class="finance-total">
            <span>TOPLAM OTOMATİK GİDER:</span>
            <span style="color:var(--red)">-${money(totalExpenses)}</span>
        </div>
    </div>
 </div>`;

 ledgerHtml += `<h4 style="color:var(--border-gold); margin:0 0 6px; font-family:'Oswald';">📜 UZUN SÜRELİ ANTLAŞMALAR (Yıllık Sabit)</h4>`;
 if(s.permanentLedger && s.permanentLedger.length > 0) {
    ledgerHtml += s.permanentLedger.map((item, index) => `
        <div class="list-item">
            <div><b>${esc(item.desc)}</b></div>
            <div><span style="color:${item.amount>=0?'var(--green)':'var(--red)'}; font-weight:bold;">${item.amount>=0?'+':''}${money(item.amount)}/yıl</span> 
            ${isAdmin ? `<button class="btn red small" style="margin-left:8px;" onclick="removePermLedgerItem('${s.id}', ${index})">SİL</button>` : ''}</div>
        </div>`).join('');
 } else { ledgerHtml += `<p class="sub">Aktif antlaşma yok.</p>`; }

 ledgerHtml += `<h4 style="color:var(--border-gold); margin:14px 0 6px; font-family:'Oswald';">⚡ BU YILA MAHSUS TEK SEFERLİK KALEMLER</h4>`;
 if(s.customLedger && s.customLedger.length > 0) {
    ledgerHtml += s.customLedger.map((item, index) => `
        <div class="list-item">
            <div><b>${esc(item.desc)}</b></div>
            <div><span style="color:${item.amount>=0?'var(--green)':'var(--red)'}; font-weight:bold;">${item.amount>=0?'+':''}${money(item.amount)}</span> 
            ${isAdmin ? `<button class="btn red small" style="margin-left:8px;" onclick="removeLedgerItem('${s.id}', ${index})">SİL</button>` : ''}</div>
        </div>`).join('');
 } else { ledgerHtml += `<p class="sub">Bu yıla ait kalem yok.</p>`; }

 if(isAdmin) {
    ledgerHtml += `
    <div style="margin-top:14px; background:rgba(10, 12, 14, 0.7); padding:10px; border:1px solid var(--border-gold); border-radius:3px;">
        <div style="color:var(--border-gold); font-size:12px; font-weight:bold; margin-bottom:6px; font-family:'Oswald';">➕ YENİ KALEM EKLE</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <input id="ledger_desc_${s.id}" type="text" placeholder="Açıklama (Örn: Venedik Ticareti)" style="flex:2; min-width:140px;">
            <input id="ledger_amt_${s.id}" type="number" placeholder="Tutar (Eksi/Artı)" style="flex:1; min-width:100px;">
            <select id="ledger_type_${s.id}" style="flex:1; min-width:120px;">
                <option value="temp">Tek Seferlik (Bu Yıl)</option>
                <option value="perm">Sabit (Her Yıl)</option>
            </select>
            <button class="btn green" onclick="addLedgerItem('${s.id}')">EKLE</button>
        </div>
    </div>`;
 }
 ledgerHtml += `</div>`;

 // 4. DANIŞMANLAR & DİVAN SEKMESİ (1 Yıl Çalıştırma Kuralı Dahil)
 const hiredIds = s.hiredAdvisors || [];
 const maxSlots = s.advisorSlots || 3;
 const activeAdvisors = (db.advisors||[]).filter(a => hiredIds.includes(a.id));
 
 const availableAdvisors = (db.advisors||[]).filter(a => {
     const matchesFaction = (!a.faction || a.faction === s.id || (a.targetName && s.name.includes(a.targetName)));
     return matchesFaction && !hiredIds.includes(a.id);
 });

 let divanHtml = `<div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <h4 style="color:var(--border-gold); margin:0; font-family:'Oswald';">👑 AKTİF DİVAN-I HÜMAYUN HEYETİ</h4>
        <span class="badge" style="font-size:11px;">Kontenjan: ${activeAdvisors.length} / ${maxSlots}</span>
    </div>
    <p class="sub" style="margin-bottom:10px;">Devletinize hizmet veren paşalar. 1 yıl dolmadan görevden alınamazlar!</p>`;

 if(activeAdvisors.length > 0) {
        divanHtml += activeAdvisors.map(a => {
        const hiredYears = (s.advisorHiredYears || {})[a.id] || 0;
        const locked = hiredYears < 1; 
        // Yıllık Finansal Katkı (Kâr/Zarar) Hesaplama
        let extraIncome = 0;
        let bInc = calcIncome(s) / (1 + ((getAdvisorEffects(s).taxBonus||0)/100)); 
        if(a.taxBonus) extraIncome += (bInc * (a.taxBonus/100));
        
        let pUpkeep = db.settings.upkeep || {};
        if(a.milUpkeepDiscount) extraIncome += (((s.piyade||0)*(pUpkeep.piyade||0)) + ((s.suvari||0)*(pUpkeep.suvari||0)) + ((s.nisanci||0)*(pUpkeep.nisanci||0))) * (a.milUpkeepDiscount/100);
        if(a.navyUpkeepDiscount) extraIncome += (((s.kucuk_gemi||0)*(pUpkeep.kucuk_gemi||0)) + ((s.orta_gemi||0)*(pUpkeep.orta_gemi||0)) + ((s.buyuk_gemi||0)*(pUpkeep.buyuk_gemi||0))) * (a.navyUpkeepDiscount/100);
        
        let netProfit = Math.floor(extraIncome) - (a.salary||0);
        return `<div class="advisor-card" style="border-left-color:var(--green);">
            ${a.icon ? `<img src="${esc(a.icon)}" class="advisor-avatar">` : `<div class="advisor-avatar" style="display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>`}
            <div class="advisor-info">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div><b>${esc(a.name)}</b> <span class="stars-span">${'★'.repeat(a.stars||1)}</span> <span class="badge">${esc(a.role)}</span></div>
                    <span style="color:var(--gold); font-weight:bold;">${money(a.salary)}/yıl</span>
                </div>
                <div style="font-size:10px; color:var(--muted); margin:2px 0;">Yaş: <b>${a.ageYears||5}</b> | Ölüm Yaşı: <b>${a.maxAge||20}</b> | Kalan Ömür: <b>${Math.max(0, (a.maxAge||20) - (a.ageYears||5))} Yıl</b> | Hizmet: <b>${hiredYears} Yıl</b></div>
                
                <div class="adv-buff"><b>Artı:</b> ${esc(a.buff)}</div>
                ${a.debuff ? `<div class="adv-debuff"><b>Götürü:</b> ${esc(a.debuff)}</div>` : ''}
                
                <div style="margin-top:6px; font-size:12px; padding:6px 12px; border-radius:3px; background:rgba(0,0,0,0.5); border:1px solid ${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}; width: fit-content;">
                    <b>Devlet Hazinesine Net Katkısı:</b> <span style="color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}; font-size:13px; font-weight:bold;">${netProfit >= 0 ? '+' : ''}${money(netProfit)} / yıl</span>
                    <div style="font-size:10px; color:var(--muted); margin-top:3px;">(Sağladığı ekstra vergi ve tasarruflar eksi (-) Kendi Maaşı)</div>
                </div>
                ${a.upgradeHistory && a.upgradeHistory.length > 0 ? `
                <div style="margin-top:6px; font-size:12px; padding:6px 12px; border-radius:3px; background:rgba(0,0,0,0.5); border:1px solid var(--border-gold); color:var(--green); width: fit-content;">
                    <b style="color:var(--gold);">📈 Kariyer Geçmişi:</b><br>${a.upgradeHistory.join('<br>')}
                </div>` : ''}
                
                ${canManage ? `<div style="text-align:right; margin-top:6px;">
                    ${locked ? '<span style="color:var(--gold); font-size:11px; font-weight:bold; margin-right:8px;">🔒 1 Yıl Sözleşme Sürüyor</span>' : ''}
                    <button class="btn red small" onclick="fireAdvisor('${s.id}','${a.id}')" ${locked ? 'disabled title="Aynı yıl içinde iade edilemez!" style="opacity:0.5;"' : ''}>AZLET (İADE ET)</button>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
 } else {
    divanHtml += `<p class="sub" style="margin-bottom:15px;">Şu an divanınızda atanmış bir danışman bulunmuyor.</p>`;
 }

 divanHtml += `<h4 style="color:var(--border-gold); margin:16px 0 6px; font-family:'Oswald'; border-top:1px solid var(--line); padding-top:10px;">📜 HİZMETE ALINABİLİR DANIŞMANLAR & PAŞALAR (${availableAdvisors.length} Aday)</h4>
 <p class="sub" style="margin-bottom:10px;">Ülkenizin çağırabileceği 1★ - 5★ arası paşalar.</p>`;

 if(availableAdvisors.length > 0) {
    divanHtml += availableAdvisors.map(a => `
        <div class="advisor-card">
            ${a.icon ? `<img src="${esc(a.icon)}" class="advisor-avatar">` : `<div class="advisor-avatar" style="display:flex;align-items:center;justify-content:center;font-size:20px;">👤</div>`}
            <div class="advisor-info">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div><b>${esc(a.name)}</b> <span class="stars-span">${'★'.repeat(a.stars||1)}</span> <span class="badge" style="background:#111;">${esc(a.role)}</span></div>
                    <span style="color:var(--gold); font-weight:bold;">Maaş: ${money(a.salary)}/yıl</span>
                </div>
                <div style="font-size:10px; color:var(--muted); margin:2px 0;">Yaş: ${a.ageYears||5} | Ömür Beklentisi: ${a.maxAge||20} Yıl</div>
                <div class="adv-buff"><b>Artı:</b> ${esc(a.buff)}</div>
                <div class="adv-debuff"><b>Götürü:</b> ${esc(a.debuff)}</div>
                ${a.upgradeHistory && a.upgradeHistory.length > 0 ? `<div style="margin-top:6px; font-size:10px; color:var(--green); border-top:1px dashed var(--line); padding-top:4px;"><b>📈 Kariyer Geçmişi:</b><br>${a.upgradeHistory.join('<br>')}</div>` : ''}
                ${canManage ? `<div style="text-align:right; margin-top:6px;"><button class="btn green small" onclick="hireAdvisor('${s.id}','${a.id}')" ${activeAdvisors.length >= maxSlots ? 'disabled title="Kontenjan Dolu!" style="opacity:0.5;"' : ''}>DİVANA ATA (GÖREVE ÇAĞIR)</button></div>` : ''}
            </div>
        </div>
    `).join('');
 } else {
    divanHtml += `<p class="sub">Hizmete alınabilir başka paşa kalmadı.</p>`;
 }
 divanHtml += `</div>`;

 // 5. MEKTUPLAR & DİPLOMASİ SEKMESİ
 let mektupHtml = `<div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <h4 style="color:var(--border-gold); margin:0; font-family:'Oswald';">📜 DİPLOMATİK ULAK & MEKTUPLAR</h4>
        ${canManage ? `<button class="btn gold" onclick="openLetterModal('${s.id}')">✉️ YENİ MEKTUP GÖNDER</button>` : ''}
    </div>`;
 
 if(myLetters.length > 0) {
    mektupHtml += myLetters.map(l => {
        const isIncoming = l.toStateId === s.id;
        const seal = l.sealUrl ? `<img src="${esc(l.sealUrl)}" class="letter-seal">` : '';
        let attachments = [];
        if(l.gold > 0) attachments.push(`💰 ${money(l.gold)}`);
        if(l.piyade > 0) attachments.push(`🪖 ${num(l.piyade)} Piyade`);
        if(l.suvari > 0) attachments.push(`🐎 ${num(l.suvari)} Süvari`);
        if(l.nisanci > 0) attachments.push(`🏹 ${num(l.nisanci)} Nişancı`);
        
        const replyTargetId = isIncoming ? l.fromStateId : l.toStateId;

        return `<div class="letter-box" style="border-left-color:${isIncoming ? 'var(--green)' : 'var(--blue)'};">
            <div class="letter-head">
                <div style="display:flex; align-items:center;">
                    ${seal}
                    <div>
                        <b>${isIncoming ? '📥 Gelen: ' : '📤 Gönderilen: '} ${esc(l.senderTitle || l.fromStateName)}</b>
                        <div class="sub">${esc(l.date)} ${isIncoming && !l.read ? '<span style="color:var(--red); font-weight:bold;">(YENİ)</span>' : ''}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="badge" style="border-color:${isIncoming ? 'var(--green)' : 'var(--blue)'}; color:#fff;">${isIncoming ? 'GELEN' : 'GİDEN'}</span>
                    <button class="btn red small" style="padding:2px 6px;" title="Mektubu Sil" onclick="deleteLetter('${l.id}', '${s.id}')">🗑️ SİL</button>
                </div>
            </div>
            <div style="font-size:14px; line-height:1.4; margin-bottom:8px; white-space:pre-wrap;">${esc(l.content)}</div>
            ${attachments.length > 0 ? `<div style="background:rgba(10, 12, 14, 0.6); padding:6px 10px; border-radius:3px; border:1px dashed var(--border-gold); font-size:12px; color:var(--gold); margin-bottom:8px;"><b>Ekler:</b> ${attachments.join(' | ')}</div>` : ''}
            ${isIncoming && canManage ? `
            <div style="text-align:right;">
                <button class="btn blue small" onclick="openLetterModal('${s.id}', '${replyTargetId}')">↩️ YANITLA</button>
            </div>` : ''}
        </div>`;
    }).join('');
    // ✅ FIX: Mektupları burada okundu işaretleme — switchTab('mektup') içinde yapılacak
 } else {
    mektupHtml += `<p class="sub">Gelen veya gönderilen mektup bulunmuyor.</p>`;
 }
 mektupHtml += `</div>`;

 // 6. İSTİHBARAT SEKMESİ
 let istihbaratHtml = ``;
 if((s.istihbarat_binasi || 0) > 0) {
    const targetOpts = db.states.filter(x => x.id !== s.id).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    istihbaratHtml = `<div>
        <h4 style="color:var(--border-gold); margin:0 0 6px; font-family:'Oswald';">🕵️ DEVLET İSTİHBARAT DAİRESİ</h4>
        <p class="sub" style="margin-bottom:12px;">Hedef devlete casus göndererek bilgi toplayın. Sahadaki sis perdesi sebebiyle istihbarat raporlarında %1-%20 arası sapma olabilir.</p>
        <div style="background:rgba(10, 12, 14, 0.6); padding:12px; border:1px solid var(--border-steel); border-radius:4px; margin-bottom:15px;">
            <div class="formgrid">
                <div><label>Hedef Ülke</label><select id="intel_target">${targetOpts}</select></div>
                <div><label>İstihbarat Konusu</label>
                    <select id="intel_type">
                        <option value="treasury">Hazine / Kasa Durumu</option>
                        <option value="piyade">Piyade Asker Sayısı</option>
                        <option value="suvari">Süvari Birlik Sayısı</option>
                        <option value="nisanci">Nişancı Asker Sayısı</option>
                        <option value="guns">Topçu Sayısı (Tüm Toplar)</option>
                        <option value="ships">Donanma Gücü (Tüm Gemiler)</option>
                        <option value="population">Toplam Nüfus</option>
                        <option value="fortress_garrison">Kale Garnizonu Asker Sayısı</option>
                    </select>
                </div>
                <div class="full" style="margin-top:5px;"><button class="btn gold" style="width:100%; padding:10px;" onclick="runSpyIntel('${s.id}')">CASUSLARI GÖNDER (İSTİHBARAT AL)</button></div>
            </div>
        </div>
        <div id="intel_result_box"></div>
    </div>`;
 }

 // 7. SİYASET / EYLEMLER SEKMESİ
 let eylemHtml = `<div>`;
 let tActs = ``;
 if (isAdmin) tActs = `<button class="btn red" style="flex:1; padding:10px;" onclick="openCampaign('${s.id}')">⚔️ SEFER HAZIRLIĞI</button>
                       <button class="btn gold" style="flex:1; padding:10px;" onclick="openAdminGrantModal('${s.id}')">💸 PARA GÖNDER</button>
                       <button class="btn red" style="flex:1; padding:10px;" onclick="openDeduct('${s.id}')">💰 HAZİNEDEN KES</button>
                       <button class="btn blue" style="flex:1; padding:10px;" onclick="openTransfer('${s.id}')">✉️ PARA AKTAR</button>`;
 else if (isOwner) tActs = `<button class="btn red" style="flex:1; padding:10px;" onclick="openCampaign('${s.id}')">⚔️ SEFER HAZIRLIĞI</button>
                            <button class="btn blue" style="flex:1; padding:10px;" onclick="openTransfer('${s.id}')">✉️ PARA AKTAR</button>`;
 
 eylemHtml += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">${tActs}</div>`;
 eylemHtml += `<h4 style="color:var(--border-gold); margin:0 0 8px; font-family:'Oswald';">📜 FERMANLAR (Halk Mutluluğu)</h4><div class="unit-grid">`;
 EDICTS.forEach(e => {
     let cost = Math.floor(s.population * (db.settings.edictCost[e.id] || 0));
     eylemHtml += `
     <div class="list-item" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <div><b>${e.icon} ${e.name}</b><div class="sub">${e.desc}</div></div>
            <div style="color:var(--gold); font-weight:bold;">${money(cost)}</div>
        </div>
        ${canManage ? `<button class="btn green small" style="padding:6px;" onclick="buyEdict('${s.id}', '${e.id}')">YAYINLA</button>` : `<button class="btn small" disabled>YETKİ YOK</button>`}
     </div>`;
 });
 eylemHtml += `</div></div>`;

 // 8. ÜLKE YÖNETİMİ: KALE, GARNİZON VE NÜFUS BİNALARI
 const fortressImg=cleanUrl(imgs.fortress);
 const fortressGarrisonImg=cleanUrl(imgs.fortress_garrison);
 const populationBuildings=[
   ["hastane","Hastane"],["asevi","Aşevi"],["su_degirmeni","Su Değirmeni"],["kervansaray","Kervansaray"],["pazar","Pazar"]
 ];
 const populationBuildingsHtml=populationBuildings.map(([key,name])=>buildPopulationBuildingCard(s,key,name,imgs[key],canManage)).join('');
 const mapFortressCount=getOwnedMapProvinceIds(s.id).length;
 const garrisonPerFortress=mapFortressCount?Math.floor((s.fortressGarrison||0)/mapFortressCount):0;
 const garrisonRemainder=mapFortressCount?(s.fortressGarrison||0)%mapFortressCount:0;
 let countryManagementHtml=`<div>
   <h4 style="color:var(--border-gold);margin:0 0 8px;font-family:'Oswald';">🏰 KALE VE GARNİZON YÖNETİMİ</h4>
   <p class="sub">Garnizona eklenen yeni askerler elverişli nüfustan düşer. Kale garnizon giderleri yıl sonunda hazineden kesilir.</p>
   <div class="event-result" style="margin-bottom:10px;">
     <b>Haritadaki kale/toprak:</b> ${num(mapFortressCount)} &nbsp; | &nbsp; <b>Toplam kale garnizonu:</b> ${num(s.fortressGarrison||0)} asker<br>
     <b>Kale başına dağılım:</b> ${num(garrisonPerFortress)} asker${garrisonRemainder?` (+${num(garrisonRemainder)} kaleye birer asker fazla)`:''} &nbsp; | &nbsp; <b>Boştaki elverişli asker:</b> ${num(p.elig)}
   </div>
   <div class="unit-grid">
     <div class="unit-card">${fortressImg?`<div class="unit-img-box"><img src="${esc(fortressImg)}"></div>`:''}<div class="unit-details"><div class="unit-title">Kale</div><div class="event-result"><b>${num(mapFortressCount)}</b> adet<br><span class="sub">Haritadaki ülkeye ait topraklardan hesaplanır.</span></div></div></div>
     <div class="unit-card">${fortressGarrisonImg?`<div class="unit-img-box"><img src="${esc(fortressGarrisonImg)}"></div>`:''}<div class="unit-details"><div class="unit-title">Kale Garnizonu</div>${field("country_fortressGarrison","Toplam Satın Alınacak/Mevcut Asker",s.fortressGarrison||0,"number")}</div></div>
   </div>
   <div class="event-result" style="margin-top:10px;">
     Kale garnizonu asker başı yıllık gider: <b>${money(db.settings.garrisonUpkeep.fortress)}</b><br>
     Mevcut kale garnizonu gideri: <b style="color:var(--red)">-${money(fortressGarrisonExpense)}</b>
   </div>
   ${canManage?`<button class="btn green" style="width:100%;margin-top:10px;" onclick="saveCountryManagement('${s.id}')">ÜLKE YÖNETİMİNİ KAYDET</button>`:'<p class="sub">Bu devleti düzenleme yetkiniz yok.</p>'}
   <h4 style="color:var(--border-gold);margin:18px 0 8px;font-family:'Oswald';">🏗️ NÜFUSU GELİŞTİREN BİNALAR</h4>
   <p class="sub">Her bina, inşa edildiği andaki toplam nüfusu admin panelinde belirlenen oran kadar artırır.</p>
   <div class="unit-grid population-building-grid">${populationBuildingsHtml}</div>
 </div>`;


 const detailStateKey = `${s.id||''} ${s.name||''}`.toLocaleLowerCase('tr-TR');
 const isOttomanDetail = detailStateKey.includes('osmanlı') || detailStateKey.includes('osmanli') || detailStateKey.includes('osmalı') || detailStateKey.includes('osmali') || detailStateKey.includes('ottoman');
 const isCrimeaDetail = detailStateKey.includes('kırım') || detailStateKey.includes('kirim') || detailStateKey.includes('crimea');
 const isSunDetail = detailStateKey.includes('güneş') || detailStateKey.includes('gunes') || detailStateKey.includes('sun');
 const isPremiumDetail = isOttomanDetail || isCrimeaDetail || isSunDetail;
 const detailCardClass = isCrimeaDetail?'detail-crimea':isSunDetail?'detail-sun':'detail-ottoman';
 const detailCardAsset = isCrimeaDetail?'assets/crimea-management-textured-base-v1.png':isSunDetail?'assets/sun-management-textured-base-v1.png':'assets/ottoman-management-textured-base-v1.png';
 const detailAccent = isCrimeaDetail?'#d5a0d1':isSunDetail?'#9fd3f2':'#f0cf82';
 const happinessNow=Math.max(0,Math.min(100,s.happiness+adv.happinessBonus));
 const omGClr=happinessNow>=60?'var(--green)':happinessNow>=30?'#d4a940':'var(--red)';
 const educatedRateText=Number(p.eduRate||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
 const leftPoliticalHtml=isPremiumDetail?`
   <div class="ottoman-svg-card"><svg class="ottoman-card-svg" viewBox="0 0 979 1618" role="img" aria-label="${esc(s.name)} yönetim özeti"><defs><clipPath id="omPortraitClip"><rect x="92" y="148" width="795" height="438" rx="5"/></clipPath></defs>${rulerImgClean?`<image href="${esc(rulerImgClean)}" x="92" y="148" width="795" height="438" preserveAspectRatio="xMidYMid slice" clip-path="url(#omPortraitClip)"/>`:''}<g font-family="'Playfair Display',Georgia,serif" text-anchor="middle"><text x="489.5" y="98" fill="#dfbe72" font-size="47" font-weight="800">${esc(s.name)}</text><text x="489.5" y="635" fill="#dfbe72" font-size="39" font-weight="800">${esc(s.ruler||'Lider Yok')}</text><text x="489.5" y="674" fill="#aaa399" font-family="Oswald,sans-serif" font-size="22" font-weight="700">${esc(s.title||'Devlet')}${isOwner?' (SEN)':''}</text><text x="489.5" y="757" fill="#cdb06d" font-size="30" font-weight="700">HALK MUTLULUĞU</text><text x="489.5" y="870" fill="${omGClr}" font-family="'Roboto Condensed',sans-serif" font-size="66" font-weight="900">${num(happinessNow)}%</text>${adv.happinessBonus!==0?`<text x="489.5" y="914" fill="#d4a940" font-family="'Roboto Condensed',sans-serif" font-size="30" font-weight="800">(${adv.happinessBonus>0?'+':''}${adv.happinessBonus})</text>`:''}</g><rect x="111" y="956" width="757" height="14" rx="3" fill="#090b09"/><rect x="111" y="956" width="${(757*happinessNow/100).toFixed(1)}" height="14" rx="3" fill="${omGClr}"/><g font-family="Oswald,sans-serif" text-anchor="middle"><text x="225" y="1055" fill="#c89d4d" font-size="45">⚖</text><text x="330" y="1032" fill="#b9b0a0" font-size="22">VERGİ ORANI</text><text x="330" y="1082" fill="#dfbe72" font-size="42" font-weight="800">%${num(s.tax)}</text><text x="585" y="1055" fill="#c89d4d" font-size="36">♟♟♟</text><text x="735" y="1032" fill="#b9b0a0" font-size="22">TOPLAM NÜFUS</text><text x="735" y="1082" fill="#dfbe72" font-size="39" font-weight="800">${num(s.population)}</text><text x="489.5" y="1185" fill="#cdb06d" font-family="'Playfair Display',Georgia,serif" font-size="29" font-weight="700">NÜFUS VE SINIF DAĞILIMI</text></g><g font-family="'Roboto Condensed',Arial,sans-serif" font-size="25" dominant-baseline="middle"><text x="105" y="1270" fill="#c89d4d" font-size="29">▤</text><text x="155" y="1270" fill="#d0cbc2">Eğitimli Sınıf (%${educatedRateText})</text><text x="875" y="1270" text-anchor="end" fill="#e2ddd2" font-weight="800">${num(p.edu)}</text><text x="105" y="1334" fill="#c89d4d" font-size="29">♟</text><text x="155" y="1334" fill="#d0cbc2">Sıradan Halk</text><text x="875" y="1334" text-anchor="end" fill="#e2ddd2" font-weight="800">${num(p.other)}</text><text x="105" y="1398" fill="#c89d4d" font-size="29">♜</text><text x="155" y="1398" fill="#d0cbc2">Boştaki Elverişli Asker</text><text x="875" y="1398" text-anchor="end" fill="#28d17c" font-weight="800">${num(p.elig)}</text><text x="105" y="1462" fill="#c89d4d" font-size="29">⚔</text><text x="155" y="1462" fill="#d0cbc2">Silahaltındaki Ordu</text><text x="875" y="1462" text-anchor="end" fill="#e2ddd2" font-weight="800">${num(p.armySize)}</text><text x="105" y="1526" fill="#cf4138" font-size="29">Ⓐ</text><text x="155" y="1526" fill="#d0cbc2">Anarşistler</text><text x="875" y="1526" text-anchor="end" fill="#cf4138" font-size="22" font-weight="800">${adv.stopAnarchy?'0 (Nizam Sağlandı)':num(p.anar)}</text></g></svg></div>
  `:`
 <div class="political-panel"><div class="political-header"><h1 style="color:${esc(s.color||'var(--border-gold)')};">${esc(s.name)}</h1></div><div class="ruler-portrait-container">${rulerImgClean?`<img src="${esc(rulerImgClean)}" class="big-portrait">`:'<div class="sub">Portre Yok</div>'}<div class="ruler-name-plate"><strong>${esc(s.ruler||'Lider Yok')}</strong><span>${esc(s.title||'Devlet')} ${isOwner?'<b style="color:var(--green)">(SEN)</b>':''}</span></div></div><div class="pol-stats"><div style="text-align:center;margin-bottom:10px;"><div class="sub">HALK MUTLULUĞU</div><div style="font-size:20px;font-weight:bold;color:var(--green)">${num(happinessNow)}%</div><div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${happinessNow}%"></div></div></div><div class="pol-stat-row"><span class="muted">Vergi Oranı</span><span style="color:var(--gold)">%${num(s.tax)}</span></div><div class="pol-stat-row"><span class="muted">Toplam Nüfus</span><span>${num(s.population)}</span></div><div class="population-section-title">NÜFUS VE SINIF DAĞILIMI</div><div class="pol-stat-row"><span class="muted">Eğitimli Sınıf (%${num(p.eduRate)})</span><span>${num(p.edu)}</span></div><div class="pol-stat-row"><span class="muted">Sıradan Halk</span><span>${num(p.other)}</span></div><div class="pol-stat-row"><span class="muted">Boştaki Elverişli Asker</span><span>${num(p.elig)}</span></div><div class="pol-stat-row"><span class="muted">Silahaltındaki Ordu</span><span>${num(p.armySize)}</span></div><div class="pol-stat-row"><span class="muted">Anarşistler</span><span>${adv.stopAnarchy?'0 (Nizam Sağlandı)':num(p.anar)}</span></div></div></div>`;

 // ANA DETAY DÜZENİ
 document.getElementById("detail").innerHTML = `
 <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
    <button class="btn" onclick="renderHome()">← HARİTAYA DÖN</button>
    ${editBtn}
 </div>
 
 <div class="detail-layout">
    <!-- SOL PANEL: LİDER & SİYASET & NÜFUS -->
    ${leftPoliticalHtml}
    <!--
    <div class="political-panel">
        <div class="political-header">
            <h1 style="color:${esc(s.color||"var(--border-gold)")};">${esc(s.name)}</h1>
        </div>
        <div class="ruler-portrait-container">
            ${rulerImgClean ? `<img src="${esc(rulerImgClean)}" class="big-portrait">` : `<div style="padding:30px 0; color:var(--muted); font-size:12px;">Portre Yok</div>`}
            <div class="ruler-name-plate">
                <strong>${esc(s.ruler||"Lider Yok")}</strong>
                <span>${esc(s.title||"Devlet")} ${isOwner ? '<b style="color:var(--green)">(SEN)</b>' : ''}</span>
            </div>
        </div>
        
        <div class="pol-stats">
            <div class="happiness-panel" style="text-align:center; margin-bottom:10px;">
                <div class="happiness-label" style="color:var(--muted); font-size:10px; font-family:'Oswald';">HALK MUTLULUĞU</div>
                <div class="happiness-value" style="font-size:20px; font-weight:bold; color:var(--green);">${num(s.happiness + adv.happinessBonus)}% ${adv.happinessBonus!==0?`<small style="font-size:12px; color:var(--gold)">(${adv.happinessBonus>0?'+':''}${adv.happinessBonus})</small>`:''}</div>
                <div class="prog-bar-bg"><div class="prog-bar-fill" style="width:${Math.max(0,Math.min(100,s.happiness+adv.happinessBonus))}%;"></div></div>
            </div>

            <div class="summary-grid">
              <div class="pol-stat-row summary-stat"><span class="muted">Vergi Oranı</span><span style="color:var(--gold)">%${num(s.tax)}</span></div>
              <div class="pol-stat-row summary-stat"><span class="muted">Toplam Nüfus</span><span>${num(s.population)}</span></div>
            </div>
            
            <div class="population-section-title">NÜFUS VE SINIF DAĞILIMI</div>
            <div class="pol-stat-row class-row educated-row"><span class="muted">Eğitimli Sınıf (%${num(p.eduRate)})</span><span>${num(p.edu)}</span></div>
            <div class="pol-stat-row class-row ordinary-row"><span class="muted">Sıradan Halk</span><span>${num(p.other)}</span></div>
            <div class="pol-stat-row class-row eligible-row"><span class="muted">Boştaki Elverişli Asker</span><span style="color:var(--green)">${num(p.elig)}</span></div>
            <div class="pol-stat-row class-row army-row"><span class="muted">Silahaltındaki Ordu</span><span>${num(p.armySize)}</span></div>
            <div class="pol-stat-row class-row anarchy-row"><span class="muted">Anarşistler</span><span style="color:var(--red)">${adv.stopAnarchy ? '0 (Nizam Sağlandı)' : num(p.anar)}</span></div>
        </div>
    </div> -->

    <!-- SAĞ PANEL: SEKMELER -->
    <div class="content-panel">
        <button type="button" class="mobile-tab-toggle" onclick="toggleMobileTabs()"><span>☰ <span id="mobile-active-tab">ASKERİYE</span></span></button>
        <div class="hoi-tabs" id="player-tabs">
            <div class="hoi-tab active" id="tab-btn-asker" onclick="switchTab('asker')">Askeriye</div>
            <div class="hoi-tab" id="tab-btn-altyapi" onclick="switchTab('altyapi')">Altyapı</div>
            <div class="hoi-tab" id="tab-btn-maliye" onclick="switchTab('maliye')">Maliye & Hasıla</div>
            <div class="hoi-tab" id="tab-btn-olaylar" onclick="switchTab('olaylar')">🎲 Olaylar <span class="badge-count">${pendingEventCount}</span></div>
            <div class="hoi-tab" id="tab-btn-divan" onclick="switchTab('divan')">👑 Divan (${activeAdvisors.length}/${maxSlots})</div>
            <div class="hoi-tab" id="tab-btn-mektup" onclick="switchTab('mektup')">Mektuplar ${unreadCount > 0 ? `<span class="badge-count">${unreadCount}</span>` : ''}</div>
            ${(s.istihbarat_binasi || 0) > 0 ? `<div class="hoi-tab" id="tab-btn-intel" onclick="switchTab('intel')">🕵️ İstihbarat</div>` : ''}
            <div class="hoi-tab" id="tab-btn-eylem" onclick="switchTab('eylem')">Siyaset</div>
            <div class="hoi-tab" id="tab-btn-country" onclick="switchTab('country')">Ülke Yönetimi</div>
        </div>
        
        <div class="tab-content active" id="tab-content-asker">
            ${askeriyeHtml}
        </div>
        <div class="tab-content" id="tab-content-altyapi">
            ${altyapiHtml}
        </div>
        <div class="tab-content" id="tab-content-maliye">
            ${ledgerHtml}
        </div>
        <div class="tab-content" id="tab-content-olaylar">
            ${olaylarHtml}
        </div>
        <div class="tab-content" id="tab-content-divan">
            ${divanHtml}
        </div>
        <div class="tab-content" id="tab-content-mektup">
            ${mektupHtml}
        </div>
        ${(s.istihbarat_binasi || 0) > 0 ? `
        <div class="tab-content" id="tab-content-intel">
            ${istihbaratHtml}
        </div>` : ''}
        <div class="tab-content" id="tab-content-eylem">
            ${eylemHtml}
        </div>
        <div class="tab-content" id="tab-content-country">
            ${countryManagementHtml}
        </div>
    </div>
 </div>
 `;
 if(isPremiumDetail){
   const svg=document.querySelector('.ottoman-card-svg');
   if(svg){
     svg.parentElement.classList.add(detailCardClass);
     const rulerTitle=svg.querySelector('text[y="674"]');
     if(rulerTitle){rulerTitle.setAttribute('fill','#dfbe72');rulerTitle.textContent='';const titlePart=document.createElementNS('http://www.w3.org/2000/svg','tspan');titlePart.textContent=s.title||'Devlet';rulerTitle.appendChild(titlePart);if(isOwner){const minePart=document.createElementNS('http://www.w3.org/2000/svg','tspan');minePart.setAttribute('fill','#28d17c');minePart.textContent=' (SEN)';rulerTitle.appendChild(minePart)}}
     const happinessText=svg.querySelector('text[y="870"]');if(happinessText)happinessText.setAttribute('fill','#dfbe72');
     [['225','205','1062'],['330','325','1045'],['585','575','1062'],['735','735','1045']].forEach(([oldX,newX,newY])=>{const el=svg.querySelector(`text[x="${oldX}"][y="${oldX==='330'||oldX==='735'?'1032':'1055'}"]`);if(el){el.setAttribute('x',newX);el.setAttribute('y',newY);if(oldX==='330'||oldX==='735')el.setAttribute('fill','#cdb06d')}});
     svg.querySelectorAll('text[y="1082"]').forEach(el=>el.setAttribute('y','1093'));
     const portrait=svg.querySelector('image');if(portrait){portrait.setAttribute('x','108');portrait.setAttribute('y','165');portrait.setAttribute('width','763');portrait.setAttribute('height','395');portrait.setAttribute('preserveAspectRatio','xMidYMid slice')}
     if(happinessText){happinessText.setAttribute('y','862');happinessText.setAttribute('font-family',"'Playfair Display',Georgia,serif");happinessText.setAttribute('font-size','61');happinessText.setAttribute('stroke','#3b280d');happinessText.setAttribute('stroke-width','1')}
     const barRects=[...svg.querySelectorAll('rect[y="956"]')];if(barRects[0])barRects[0].setAttribute('fill','transparent');if(barRects[1]){barRects[1].setAttribute('x','121');barRects[1].setAttribute('y','966');barRects[1].setAttribute('width',String((737*happinessNow/100).toFixed(1)));barRects[1].setAttribute('height','9');barRects[1].setAttribute('rx','2');barRects[1].setAttribute('fill','#c89a3f');barRects[1].setAttribute('stroke','#6e4a18');barRects[1].setAttribute('stroke-width','1')}
     const taxIcon=svg.querySelector('text[x="205"][y="1062"]');if(taxIcon){taxIcon.setAttribute('x','190');taxIcon.setAttribute('y','1068')}
     const taxLabel=svg.querySelector('text[x="325"][y="1045"]');if(taxLabel){taxLabel.setAttribute('x','315');taxLabel.setAttribute('y','1042')}
     const taxValue=svg.querySelector('text[x="330"][y="1093"],text[x="325"][y="1093"]');if(taxValue){taxValue.setAttribute('x','315');taxValue.setAttribute('y','1090')}
     const popIcon=svg.querySelector('text[x="575"][y="1062"]');if(popIcon){popIcon.setAttribute('x','565');popIcon.setAttribute('y','1068')}
     const popLabel=svg.querySelector('text[x="735"][y="1045"]');if(popLabel)popLabel.setAttribute('y','1042');const popValue=svg.querySelector('text[x="735"][y="1093"]');if(popValue)popValue.setAttribute('y','1090');
     if(portrait){portrait.setAttribute('x','100');portrait.setAttribute('y','155');portrait.setAttribute('width','779');portrait.setAttribute('height','430')}
     if(happinessText){happinessText.setAttribute('y','862');happinessText.setAttribute('font-family','Georgia,serif');happinessText.setAttribute('font-size','58');happinessText.setAttribute('stroke','none');happinessText.setAttribute('paint-order','normal')}
     if(barRects[1]){barRects[1].setAttribute('x','114');barRects[1].setAttribute('y','958');barRects[1].setAttribute('width',String((751*happinessNow/100).toFixed(1)));barRects[1].setAttribute('height','8');barRects[1].setAttribute('rx','1');barRects[1].setAttribute('stroke','none')}
     const svgTexts=[...svg.querySelectorAll('text')],textByValue=value=>svgTexts.find(el=>el.textContent.trim()===value);
     const taxLabelFinal=textByValue('VERGİ ORANI');if(taxLabelFinal){taxLabelFinal.setAttribute('x','318');taxLabelFinal.setAttribute('y','1052')}
     const populationLabelFinal=textByValue('TOPLAM NÜFUS');if(populationLabelFinal){populationLabelFinal.setAttribute('x','735');populationLabelFinal.setAttribute('y','1052')}
     const taxValueFinal=svgTexts.find(el=>el.textContent.trim()===`%${num(s.tax)}`);if(taxValueFinal){taxValueFinal.setAttribute('x','318');taxValueFinal.setAttribute('y','1098')}
     const populationValueFinal=svgTexts.find(el=>el.textContent.trim()===num(s.population));if(populationValueFinal){populationValueFinal.setAttribute('x','735');populationValueFinal.setAttribute('y','1098')}
     if(taxIcon){taxIcon.setAttribute('x','195');taxIcon.setAttribute('y','1080')}if(popIcon){popIcon.setAttribute('x','575');popIcon.setAttribute('y','1080')}
     if(portrait){portrait.setAttribute('x','94');portrait.setAttribute('y','148');portrait.setAttribute('width','791');portrait.setAttribute('height','455')}
     if(happinessText){happinessText.textContent=`%${num(happinessNow)}`;happinessText.setAttribute('x','489.5');happinessText.setAttribute('y','862');happinessText.setAttribute('text-anchor','middle');happinessText.setAttribute('dominant-baseline','middle')}
     if(taxLabelFinal){taxLabelFinal.setAttribute('x','315');taxLabelFinal.setAttribute('text-anchor','middle')}if(taxValueFinal){taxValueFinal.setAttribute('x','315');taxValueFinal.setAttribute('text-anchor','middle')}
     if(populationLabelFinal){populationLabelFinal.setAttribute('x','735');populationLabelFinal.setAttribute('text-anchor','middle')}if(populationValueFinal){populationValueFinal.setAttribute('x','735');populationValueFinal.setAttribute('text-anchor','middle')}
     if(taxLabelFinal){taxLabelFinal.setAttribute('x','264');taxLabelFinal.setAttribute('y','1052');taxLabelFinal.setAttribute('text-anchor','middle')}if(taxValueFinal){taxValueFinal.setAttribute('x','264');taxValueFinal.setAttribute('y','1098');taxValueFinal.setAttribute('text-anchor','middle')}
     if(populationLabelFinal){populationLabelFinal.setAttribute('x','714');populationLabelFinal.setAttribute('y','1052');populationLabelFinal.setAttribute('text-anchor','middle')}if(populationValueFinal){populationValueFinal.setAttribute('x','714');populationValueFinal.setAttribute('y','1098');populationValueFinal.setAttribute('text-anchor','middle')}
     if(taxIcon){taxIcon.setAttribute('x','112');taxIcon.setAttribute('y','1080');taxIcon.setAttribute('text-anchor','middle')}if(popIcon){popIcon.setAttribute('x','540');popIcon.setAttribute('y','1080');popIcon.setAttribute('text-anchor','middle')}
     if(taxLabelFinal){taxLabelFinal.setAttribute('x','315')}if(taxValueFinal){taxValueFinal.setAttribute('x','315')}
     if(populationLabelFinal){populationLabelFinal.setAttribute('x','755')}if(populationValueFinal){populationValueFinal.setAttribute('x','755')}
     if(taxIcon)taxIcon.setAttribute('x','115');if(popIcon)popIcon.setAttribute('x','555');
     /* v16 onaylı Osmanlı SVG yerleşimi: tüm eski düzeltmelerden sonra uygulanır. */
     svg.setAttribute('viewBox','0 0 992 1586');
     const finalText=value=>[...svg.querySelectorAll('text')].find(el=>el.textContent.trim()===String(value));
     const finalSet=(el,attrs)=>{if(el)Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)))};
     const finalPortrait=svg.querySelector('image');
     const finalClip=svg.querySelector('clipPath rect');
     finalSet(finalClip,{x:96,y:140,width:800,height:412,rx:3});
     finalSet(finalPortrait,{x:96,y:140,width:800,height:412,preserveAspectRatio:'xMidYMin slice'});
     finalSet(finalText(s.name),{x:496,y:99,'text-anchor':'middle','font-size':36,fill:'#f0cf82','font-family':"'Playfair Display',Georgia,serif"});
     finalSet(finalText(s.ruler||'Lider Yok'),{x:496,y:620,'text-anchor':'middle','font-size':34,fill:'#f0cf82'});
     if(rulerTitle){rulerTitle.textContent=s.title||'Devlet';finalSet(rulerTitle,{x:496,y:653,'text-anchor':'middle','font-size':19,fill:'#f0cf82'});}
     finalSet(finalText('HALK MUTLULUĞU'),{x:496,y:712,'text-anchor':'middle','font-size':23,fill:'#f0cf82'});
     if(happinessText){happinessText.textContent=`%${num(happinessNow)}`;finalSet(happinessText,{x:496,y:812,'text-anchor':'middle','dominant-baseline':'middle','font-size':70,fill:'#f0cf82','font-family':"'Playfair Display',Georgia,serif"});}
     const finalBonus=[...svg.querySelectorAll('text')].find(el=>/^\([+-]\d/.test(el.textContent.trim()));finalSet(finalBonus,{x:496,y:862,'text-anchor':'middle','font-size':25,fill:'#f0cf82'});
     if(barRects[0])finalSet(barRects[0],{fill:'transparent'});if(barRects[1])finalSet(barRects[1],{x:111,y:948,width:(770*happinessNow/100).toFixed(1),height:7,rx:3.5,fill:'#d4a744',stroke:'none'});
     finalSet(finalText('VERGİ ORANI'),{x:262,y:1039,'text-anchor':'middle','font-size':20,fill:'#f0cf82'});
     finalSet(taxValueFinal,{x:262,y:1090,'text-anchor':'middle','font-size':43,fill:'#f0cf82'});
     finalSet(finalText('TOPLAM NÜFUS'),{x:730,y:1039,'text-anchor':'middle','font-size':20,fill:'#f0cf82'});
     finalSet(populationValueFinal,{x:730,y:1090,'text-anchor':'middle','font-size':23,fill:'#e7dcc1','font-family':"'Roboto Condensed',Arial,sans-serif",'font-weight':800});
     finalSet(finalText('NÜFUS VE SINIF DAĞILIMI'),{x:496,y:1172,'text-anchor':'middle','font-size':21,fill:'#f0cf82'});
     [['Eğitimli Sınıf',1242,num(p.edu)],['Sıradan Halk',1309,num(p.other)],['Boştaki Elverişli Asker',1377,num(p.elig)],['Silahaltındaki Ordu',1445,num(p.armySize)],['Anarşistler',1512,adv.stopAnarchy?'0 (Nizam Sağlandı)':num(p.anar)]].forEach(([label,y,value])=>{const labelEl=[...svg.querySelectorAll('text')].find(el=>el.textContent.includes(label));const valueEl=[...svg.querySelectorAll('text')].find(el=>el!==labelEl&&el.textContent.trim()===String(value));finalSet(labelEl,{x:108,y});finalSet(valueEl,{x:881,y,'text-anchor':'end',fill:label==='Anarşistler'?'#cf4138':'#e7dcc1','font-family':"'Roboto Condensed',Arial,sans-serif",'font-size':23});});
     svg.parentElement.innerHTML=`<svg class="ottoman-card-svg" viewBox="0 0 992 1586" role="img" aria-label="${esc(s.name)} yönetim özeti"><defs><clipPath id="omFinalPortraitClip"><rect x="96" y="140" width="800" height="412" rx="3"/></clipPath><clipPath id="omFinalFrameClip"><rect x="66" y="105" width="860" height="47"/><rect x="66" y="105" width="48" height="535"/><rect x="878" y="105" width="48" height="535"/><rect x="66" y="545" width="213" height="95"/><rect x="713" y="545" width="213" height="95"/><rect x="258" y="558" width="476" height="34"/><rect x="258" y="558" width="38" height="118"/><rect x="696" y="558" width="38" height="118"/><rect x="258" y="665" width="476" height="11"/></clipPath><linearGradient id="omGoldBar" x1="0" x2="1"><stop stop-color="#6f4814"/><stop offset=".45" stop-color="#d4a744"/><stop offset="1" stop-color="#f0d47e"/></linearGradient></defs>${rulerImgClean?`<image href="${esc(rulerImgClean)}" x="96" y="140" width="800" height="412" preserveAspectRatio="xMidYMin slice" clip-path="url(#omFinalPortraitClip)"/>`:''}<g font-family="Georgia,'Times New Roman',serif" text-anchor="middle"><text x="496" y="99" fill="#f0cf82" font-size="36" font-weight="700">${esc(s.name)}</text><text x="496" y="620" fill="#f0cf82" font-size="34" font-weight="700">${esc(s.ruler||'Lider Yok')}</text><text x="496" y="653" fill="#f0cf82" font-size="19" font-weight="700">${esc(s.title||'Devlet')}</text><text x="496" y="712" fill="#f0cf82" font-size="23" font-weight="700">HALK MUTLULUĞU</text><text x="496" y="812" dominant-baseline="middle" fill="#f0cf82" font-size="70" font-weight="700">%${num(happinessNow)}</text>${adv.happinessBonus!==0?`<text x="496" y="862" fill="#f0cf82" font-size="25" font-weight="700">(${adv.happinessBonus>0?'+':''}${adv.happinessBonus})</text>`:''}<rect x="111" y="948" width="${(770*happinessNow/100).toFixed(1)}" height="7" rx="3.5" fill="url(#omGoldBar)"/><text x="262" y="1039" fill="#f0cf82" font-size="20">VERGİ ORANI</text><text x="262" y="1090" fill="#f0cf82" font-size="43" font-weight="700">%${num(s.tax)}</text><text x="730" y="1039" fill="#f0cf82" font-size="20">TOPLAM NÜFUS</text><text x="730" y="1090" fill="#f0cf82" font-size="39" font-weight="700">${num(s.population)}</text><text x="496" y="1172" fill="#f0cf82" font-size="21">NÜFUS VE SINIF DAĞILIMI</text></g><g font-family="'Roboto Condensed',Arial,sans-serif" font-size="23"><text x="108" y="1242" fill="#e7dcc1">▣  Eğitimli Sınıf (%${educatedRateText})</text><text x="881" y="1242" text-anchor="end" fill="#e7dcc1" font-weight="800">${num(p.edu)}</text><text x="108" y="1309" fill="#e7dcc1">♟  Sıradan Halk</text><text x="881" y="1309" text-anchor="end" fill="#e7dcc1" font-weight="800">${num(p.other)}</text><text x="108" y="1377" fill="#e7dcc1">♜  Boştaki Elverişli Asker</text><text x="881" y="1377" text-anchor="end" fill="#e7dcc1" font-weight="800">${num(p.elig)}</text><text x="108" y="1445" fill="#e7dcc1">⚔  Silahaltındaki Ordu</text><text x="881" y="1445" text-anchor="end" fill="#e7dcc1" font-weight="800">${num(p.armySize)}</text><text x="108" y="1512" fill="#cf4138">Ⓐ  Anarşistler</text><text x="881" y="1512" text-anchor="end" fill="#cf4138" font-weight="800">${adv.stopAnarchy?'0 (Nizam Sağlandı)':num(p.anar)}</text></g><image href="assets/ottoman-management-textured-base-v1.png" x="0" y="0" width="992" height="1586" preserveAspectRatio="none" clip-path="url(#omFinalFrameClip)"/></svg>`;
   }
 }
}

function saveCountryManagement(stateId){
 const s=getState(stateId); if(!s)return;
 if(!isAdmin && s.ownerEmail!==currentUserEmail)return;
 const garrisonEl=document.getElementById("f_country_fortressGarrison");
 if(!garrisonEl){toast("Garnizon alanı bulunamadı.");return;}
 const fortressGarrison=Math.max(0,Math.floor(Number(garrisonEl.value)||0));
 const oldTotal=s.fortressGarrison||0;
 const newTotal=fortressGarrison;
 const added=newTotal-oldTotal;
 const available=calcPop(s).elig;
 if(added>available){alert(`Elverişli nüfus yetersiz! En fazla ${num(available)} yeni garnizon askeri ekleyebilirsiniz.`);return;}
 const ownedCount=getOwnedMapProvinceIds(s.id).length;
 if(!ownedCount&&fortressGarrison>0){alert("Haritada bu devlete ait toprak bulunmadığı için garnizon askeri yerleştirilemez.");return;}
 const distribution=distributeFortressGarrisonToMap(s,fortressGarrison);
 addLog({stateId:s.id,stateName:s.name,action:`Ülke Yönetimi: ${distribution.count} harita kalesine garnizon dağıtıldı`,qty:distribution.count,cost:0,unitName:"Kale Garnizonu",oldUnit:oldTotal,newUnit:newTotal});
 queueSave();
 openDetail(stateId);
 switchTab('country');
}

function adjustPopulationBuildingQty(inputId,change){const input=document.getElementById(inputId);if(!input)return;input.value=Math.max(1,Math.floor(Number(input.value)||1)+change);input.dispatchEvent(new Event('input',{bubbles:true}));}
function buildPopulationBuilding(stateId,key,labelName){
 const s=getState(stateId); if(!s)return;
 if(!isAdmin&&s.ownerEmail!==currentUserEmail)return;
 if(rejectDebtPurchase(s))return;
 const allowed=["hastane","asevi","su_degirmeni","kervansaray","pazar"];
 if(!allowed.includes(key))return;
 
 const qty=Math.max(0,Math.floor(Number(document.getElementById(`qty_${stateId}_${key}`)?.value)||0));
 if(qty<=0) { alert("⛔ Hata: Sıfır veya eksi bir değer giremezsiniz!"); return; } // EKSİ SAYI KORUMASI
 
 // NÜFUS BİNALARI İÇİN TOPRAK KOTASI KONTROLÜ
 const ownedCount = getOwnedMapProvinceIds(stateId).length;
 const oldCount = s[key] || 0;
 if((oldCount + qty) > ownedCount){
     alert(`⛔ KOTA DOLU: Sadece sahip olduğunuz toprak sayısı kadar (${ownedCount} adet) ${labelName} inşa edebilirsiniz! Önce yeni topraklar fethedin.`);
     return;
 }
 
 const oldPopulation=Math.max(0,Math.floor(Number(s.population)||0));
 const costPerPerson=Math.max(0,Number(db.settings.populationBuildingCostPerPerson?.[key])||0);
 const unitPrice=Math.max(0,Math.round(oldPopulation*costPerPerson));
 const totalCost=unitPrice*qty;
 if((Number(s.treasury)||0)<totalCost){alert(`Hazine yetersiz! Toplam inşaat maliyeti: ${money(totalCost)}`);return;}
 
 const oldTreasury=Number(s.treasury)||0;
 
 s.treasury=oldTreasury-totalCost;
 s[key]=oldCount+qty;
 
 addLog({stateId:s.id,stateName:s.name,action:`Bina İnşası: ${labelName} x${qty}`,qty,cost:totalCost,oldTreasury,newTreasury:s.treasury,unitName:labelName,oldUnit:oldCount,newUnit:s[key]});
 queueSave();
 openDetail(stateId);
 switchTab('country');
 toast(`${labelName} inşa edildi. Nüfus artışı yıl geçince eklenecek.`,true);
}

// ---------------- DANIŞMAN ATAMA & 1 YIL KONTROLÜ ----------------
