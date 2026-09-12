window.switchStateEditTab = function(tabId) {
    document.querySelectorAll('.adm-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.adm-tab-btn').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--text)';
        el.style.borderBottom = 'none';
    });
    const target = document.getElementById('adm-tab-' + tabId);
    if(target) target.style.display = 'block';
    const activeBtn = document.getElementById('adm-tab-btn-' + tabId);
    if(activeBtn){
       activeBtn.style.background = 'var(--bg-lighter)';
       activeBtn.style.color = 'var(--gold)';
       activeBtn.style.borderBottom = '2px solid var(--gold)';
    }
};

function openStateForm(id=null){
 if(!isAdmin) return;
 const populationBreakdown=calcPop(id?getState(id):{population:0,happiness:0,education:0});
 const s=id?getState(id):{name:"",ownerEmail:"",ruler:"",rulerImage:"",bgImage:"",title:"Devlet",color:"#c5a059",treasury:0,population:0,tax:20,happiness:75,education:30,educatedPopulation:0,educatedPopulationBonus:0,anarchistPopulationBonus:0,eligiblePopulationBonus:0,baseTaxPerPerson:5,civilExpense:0,advisorSlots:3,piyade:0,suvari:0,nisanci:0,kucuk_top:0,orta_top:0,buyuk_top:0,kucuk_gemi:0,orta_gemi:0,buyuk_gemi:0,kucuk_liman:0,orta_liman:0,buyuk_liman:0,kucuk_ocak:0,orta_ocak:0,okul:0,istihbarat_binasi:0,hastane:0,asevi:0,su_degirmeni:0,kervansaray:0,pazar:0};
 
 let customFields = "";
 if(db.settings.customItems && db.settings.customItems.length > 0) {
    customFields += `<div class="full"><h4 style="margin:20px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">🌟 ÖZEL BİRİMLER</h4></div><div class="formgrid">`;
    db.settings.customItems.forEach(item => { customFields += field(item.id, item.name, s[item.id]||0, "number"); });
    customFields += `</div>`;
 }

 modal(`
  <div style="position:relative;">
    <button onclick="closeModal()" style="position:absolute; right:-10px; top:-10px; background:none; border:none; font-size:28px; color:var(--red); cursor:pointer; padding:5px; line-height:1;">&times;</button>
    <h2 style="margin-top:0; border-bottom:2px solid var(--border-gold); padding-bottom:10px;">${id?"🛠 DEVLET DÜZENLE":"➕ YENİ DEVLET EKLE"}</h2>
    
    <div style="display:flex; border-bottom:1px solid var(--line); margin-bottom:15px; overflow-x:auto;">
      <button type="button" class="adm-tab-btn" id="adm-tab-btn-genel" onclick="switchStateEditTab('genel')" style="flex:1; padding:10px; background:var(--bg-lighter); color:var(--gold); border:none; border-bottom:2px solid var(--gold); cursor:pointer; font-weight:bold;">Genel & Ekonomi</button>
      <button type="button" class="adm-tab-btn" id="adm-tab-btn-nufus" onclick="switchStateEditTab('nufus')" style="flex:1; padding:10px; background:transparent; color:var(--text); border:none; cursor:pointer; font-weight:bold;">Nüfus Yönetimi</button>
      <button type="button" class="adm-tab-btn" id="adm-tab-btn-ordu" onclick="switchStateEditTab('ordu')" style="flex:1; padding:10px; background:transparent; color:var(--text); border:none; cursor:pointer; font-weight:bold;">Ordu & Altyapı</button>
    </div>

    <div id="adm-tab-genel" class="adm-tab" style="display:block;">
      <h4 style="margin:10px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">📌 GENEL BİLGİLER</h4>
      <div class="formgrid">
        ${field("name","Devlet Adı",s.name,"text")}
        ${field("title","Unvan (İmparatorluk vb.)",s.title,"text")}
        ${field("ruler","Hükümdar İsmi",s.ruler,"text")}
        ${field("color","Tema Rengi",s.color,"color")}
        ${field("rulerImage","Hükümdar Portre URL",cleanUrl(s.rulerImage),"text")}
        ${field("bgImage","Arka Plan URL (İsteğe Bağlı)",cleanUrl(s.bgImage),"text")}
        <div class="full" style="background:rgba(231, 76, 60, 0.1); border:1px solid var(--red); padding:10px; border-radius:5px;">
           ${field("ownerEmail","Oyuncu E-postası (Sahip)",s.ownerEmail||"","email")}
           <p class="sub" style="color:#f1948a; margin:5px 0 0;">Devleti yönetecek kişinin sisteme kayıt olduğu e-posta adresini girin.</p>
        </div>
      </div>

      <h4 style="margin:20px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">💰 EKONOMİ & HAZİNE</h4>
      <div class="formgrid">
        ${field("treasury","Hazine (Altın)",s.treasury,"number")}
        ${field("tax","Vergi Oranı %",s.tax,"number")}
        ${field("happiness","Mutluluk %",s.happiness,"number")}
        ${field("baseTaxPerPerson","Kişi Başı Temel Vergi",s.baseTaxPerPerson,"number")}
        ${field("civilExpense","Sivil Gider (Yıllık)",s.civilExpense,"number")}
        ${field("education","Eski Eğitim %",s.education,"number")}
        <div class="full" style="background:rgba(197, 160, 89, 0.15); border:1px solid var(--border-gold); padding:10px; border-radius:5px;">
           ${field("advisorSlots","Divan Üyesi Kotası (Kaç Danışman Seçebilir?)",s.advisorSlots||3,"number")}
        </div>
      </div>
    </div>

    <div id="adm-tab-nufus" class="adm-tab" style="display:none;">
      <h4 style="margin:10px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">👥 NÜFUS YÖNETİMİ</h4>
      <div class="formgrid">
        ${field("population","Mevcut Toplam Nüfus",s.population,"number")}
        <div style="background:rgba(46, 204, 113, 0.15); border:1px solid var(--green); padding:10px; border-radius:5px;">
           <label style="color:var(--green); font-weight:bold;">⚡ Hızlı Nüfus Ekle/Çıkar (+ / -)</label>
           <input id="f_pop_modifier" type="number" value="0" placeholder="Örn: 50000" style="width:100%; padding:8px; border:1px solid var(--line); background:var(--bg); color:var(--text); border-radius:4px;">
           <p class="sub" style="color:var(--green); margin:5px 0 0;">Bitişik yaz! Buraya yazdığın sayı mevcuda eklenir (Eksi de yazabilirsin).</p>
        </div>
        ${field("educatedPopulation","Eğitimli Nüfus (Kişi)",s.educatedPopulation??0,"number")}
      </div>
      <div class="full" style="background:rgba(52,152,219,.1);border:1px solid var(--blue);padding:10px;border-radius:5px; margin-top:10px;">
        <b style="color:var(--blue);">🛡 EK NÜFUS BONUSLARI (Kapasite)</b>
        <div class="formgrid" style="margin-top:10px;">
          ${field("educatedPopulationBonus","Ek Eğitimli Nüfus",s.educatedPopulationBonus||0,"number")}
          ${field("anarchistPopulationBonus","Ek Anarşist Nüfus",s.anarchistPopulationBonus||0,"number")}
          ${field("eligiblePopulationBonus","Ek Elverişli Asker",s.eligiblePopulationBonus||0,"number")}
        </div>
        <p class="sub" style="margin:6px 0 0;">Bu sayılar otomatik hesaplamalardaki havuz sınırlarına (kapasiteye) eklenir.</p>
      </div>
    </div>

    <div id="adm-tab-ordu" class="adm-tab" style="display:none;">
      <h4 style="margin:10px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">⚔ TEMEL ORDU & ALTYAPI</h4>
      <div class="formgrid">
        ${field("piyade","Piyade",s.piyade,"number")}${field("suvari","Süvari",s.suvari,"number")}${field("nisanci","Nişancı",s.nisanci,"number")}
        ${field("kucuk_top","Küçük Top",s.kucuk_top,"number")}${field("orta_top","Orta Top",s.orta_top,"number")}${field("buyuk_top","Büyük Top",s.buyuk_top,"number")}
        ${field("kucuk_gemi","Küçük Gemi",s.kucuk_gemi,"number")}${field("orta_gemi","Orta Gemi",s.orta_gemi,"number")}${field("buyuk_gemi","Büyük Gemi",s.buyuk_gemi,"number")}
        ${field("kucuk_liman","Küçük Liman",s.kucuk_liman,"number")}${field("orta_liman","Orta Liman",s.orta_liman,"number")}${field("buyuk_liman","Büyük Liman",s.buyuk_liman,"number")}
        ${field("kucuk_ocak","Küçük Top Ocağı",s.kucuk_ocak,"number")}${field("orta_ocak","Orta Top Ocağı",s.orta_ocak,"number")}${field("buyuk_ocak","Büyük Top Ocağı",s.buyuk_ocak,"number")}
        ${field("okul","Okul",s.okul,"number")}
        ${field("istihbarat_binasi","İstihbarat Dairesi",s.istihbarat_binasi||0,"number")}
      </div>

      <h4 style="margin:20px 0 10px; padding-bottom:5px; border-bottom:1px solid var(--line); color:var(--border-gold);">🏥 NÜFUS BİNALARI</h4>
      <div class="formgrid">
        ${field("hastane","Hastane",s.hastane||0,"number")}${field("asevi","Aşevi",s.asevi||0,"number")}
        ${field("su_degirmeni","Su Değirmeni",s.su_degirmeni||0,"number")}${field("kervansaray","Kervansaray",s.kervansaray||0,"number")}
        ${field("pazar","Pazar",s.pazar||0,"number")}
      </div>
      
      ${customFields}
    </div>

    <div class="full actions" style="margin-top:20px; padding-top:15px; border-top:1px solid var(--line); display:flex; gap:10px; justify-content:flex-end;">
      ${id?`<button class="btn red" style="margin-right:auto;" onclick="deleteState('${id}')">SİL</button>`:""}
      <button class="btn" onclick="closeModal()">VAZGEÇ</button>
      <button class="btn green" style="padding:10px 30px; font-weight:bold;" onclick="saveState('${id||""}')">KAYDET</button>
    </div>
  </div>
 `);
}
function field(k,l,v,t="text"){return `<div><label style="font-weight:bold; margin-bottom:4px; display:block; color:var(--text);">${l}</label><input id="f_${k}" type="${t}" value="${esc(v)}" style="width:100%; padding:8px; border:1px solid var(--line); background:var(--bg); color:var(--text); border-radius:4px;"></div>`}

function saveState(id){
 const keys=["name","ownerEmail","ruler","rulerImage","bgImage","title","color","treasury","population","tax","education","educatedPopulation","educatedPopulationBonus","anarchistPopulationBonus","eligiblePopulationBonus","baseTaxPerPerson","civilExpense","advisorSlots","piyade","suvari","nisanci","kucuk_top","orta_top","buyuk_top","kucuk_gemi","orta_gemi","buyuk_gemi","kucuk_liman","orta_liman","buyuk_liman","kucuk_ocak","orta_ocak","buyuk_ocak","okul","istihbarat_binasi","hastane","asevi","su_degirmeni","kervansaray","pazar"];
 if(db.settings.customItems) { db.settings.customItems.forEach(item => keys.push(item.id)); }
 const o={};
 keys.forEach(k=>o[k]=["name","ownerEmail","ruler","rulerImage","bgImage","title","color"].includes(k)?document.getElementById("f_"+k).value:Number(document.getElementById("f_"+k).value||0));
 
 // Nüfus Ekle/Çıkar İşlemi
 const popModifier = Number(document.getElementById("f_pop_modifier")?.value || 0);
 o.population += popModifier;

 if(!o.name){alert("Devlet adı gerekli.");return}
 o.ownerEmail = (o.ownerEmail || "").trim().toLowerCase();
 o.tax=Math.max(0,Math.min(75,Number(o.tax)||0));
 o.rulerImage = cleanUrl(o.rulerImage); o.bgImage = cleanUrl(o.bgImage);
 let oldTax = id ? getState(id).tax : Number(document.getElementById("f_tax").value||0);
 o.happiness = Math.max(0, Math.min(100, Number(document.getElementById("f_happiness").value||0) + ((oldTax - o.tax) * 0.4)));
 if(id){ 
    let existing = getState(id);
    o.customLedger = existing.customLedger || []; o.permanentLedger = existing.permanentLedger || [];
    o.hiredAdvisors = existing.hiredAdvisors || [];
    o.advisorHiredYears = existing.advisorHiredYears || {};
    Object.assign(existing,o); 
 } else { 
    o.customLedger = []; o.permanentLedger = []; o.hiredAdvisors = []; o.advisorHiredYears = {}; db.states.push({id:crypto.randomUUID(),...o});
 }
 closeModal();queueSave();renderHome()
}
function deleteState(id){if(confirm("Bu devlet silinsin mi?")){db.states=db.states.filter(x=>x.id!==id);closeModal();queueSave();renderHome()}}

function openDeduct(id){ 
 if(!isAdmin) return;
 modal(`<h2>HAZİNEDEN KESİNTİ</h2><label>Tutar</label><input id="deductAmt" type="number" min="0"><label>Açıklama</label><textarea id="deductDesc"></textarea><div class="actions" style="margin-top:10px"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn red" onclick="deduct('${id}')">KAYDET</button></div>`) 
}
function deduct(id){
 if(!isAdmin) return;
 let s=getState(id),a=Number(document.getElementById("deductAmt").value||0),d=document.getElementById("deductDesc").value.trim();
 if(a<=0||a>s.treasury) return;
 
 const oldT = s.treasury;
 s.treasury -= a; 

 addLog({
     stateId: s.id,
     stateName: s.name,
     action: `Hazine Kesintisi (${d})`,
     cost: a,
     qty: 1,
     oldTreasury: oldT,
     newTreasury: s.treasury
 });

 closeModal();queueSave();openDetail(id)
}
function openTransfer(id){
 const s = getState(id);
 if(!isAdmin && s.ownerEmail !== currentUserEmail) return;
 const opts=db.states.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 modal(`<h2>PARA AKTARIMI</h2><label>Hedef Devlet</label><select id="transferTarget">${opts}</select><label>Tutar</label><input id="transferAmt" type="number" min="0"><label>Açıklama</label><textarea id="transferDesc"></textarea><div class="actions" style="margin-top:10px"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn blue" onclick="transfer('${id}')">AKTAR</button></div>`)
}
function transfer(id){
 let s=getState(id);
 let t=getState(document.getElementById("transferTarget").value),a=Number(document.getElementById("transferAmt").value||0),d=document.getElementById("transferDesc").value.trim();
 if(!t||a<=0||a>s.treasury) return;
 if(rejectDebtPurchase(s))return;
 
 const oldST = s.treasury;
 const oldTT = t.treasury;
 
 s.treasury -= a;
 t.treasury += a; 
 
 addLog({
     stateId: s.id,
     stateName: s.name,
     action: `Transfer Gönderildi -> ${t.name} (${d})`,
     cost: a,
     qty: 1,
     oldTreasury: oldST,
     newTreasury: s.treasury
 });

 addLog({
     stateId: t.id,
     stateName: t.name,
     action: `Transfer Alındı <- ${s.name} (${d})`,
     cost: a,
     qty: 1,
     oldTreasury: oldTT,
     newTreasury: t.treasury
 });

 closeModal();queueSave();openDetail(id)
}

function openPurchaseLogs(){
    const myState = currentId ? getState(currentId) : null;
    let filteredLogs = db.purchaseLog || [];
    
    if(!isAdmin) {
        if(myState) {
            filteredLogs = filteredLogs.filter(l => l.stateId === myState.id || l.state === myState.name);
        } else {
            const myStateIds = db.states.filter(s => s.ownerEmail === currentUserEmail).map(s => s.id);
            filteredLogs = filteredLogs.filter(l => myStateIds.includes(l.stateId));
        }
    }
    
    let logHtml = filteredLogs.length ? filteredLogs.map(l => {
        let diffContent = [];
        
        if(l.oldTreasury !== undefined && l.newTreasury !== undefined) {
            let tDiff = l.newTreasury - l.oldTreasury;
            let diffClass = tDiff >= 0 ? 'diff-pos' : 'diff-neg';
            let diffSign = tDiff >= 0 ? '+' : '';
            diffContent.push(`<span>Hazine: <b>${money(l.oldTreasury)}</b> ➔ <b>${money(l.newTreasury)}</b> (<span class="${diffClass}">${diffSign}${money(tDiff)}</span>)</span>`);
        }
        
        if(l.unitName && l.oldUnit !== undefined && l.newUnit !== undefined) {
            let uDiff = l.newUnit - l.oldUnit;
            let diffClass = uDiff >= 0 ? 'diff-pos' : 'diff-neg';
            let diffSign = uDiff >= 0 ? '+' : '';
            diffContent.push(`<span>${esc(l.unitName)}: <b>${num(l.oldUnit)}</b> ➔ <b>${num(l.newUnit)}</b> (<span class="${diffClass}">${diffSign}${num(uDiff)}</span>)</span>`);
        }

        if(l.logType === "event" && Array.isArray(l.eventChanges)) {
            diffContent = [];
            l.eventChanges.forEach(change => {
                const oldValue=Number(change.old||0), newValue=Number(change.new||0), changeAmount=newValue-oldValue;
                if(!changeAmount) return;
                const diffClass=changeAmount>=0?'diff-pos':'diff-neg';
                const sign=changeAmount>=0?'+':'';
                const format=value=>change.kind==='money'?money(value):(change.kind==='percent'?`${Number(value).toLocaleString('tr-TR',{maximumFractionDigits:1})}%`:num(value));
                diffContent.push(`<span><b>${esc(change.label)}</b>: ${format(oldValue)} ➔ ${format(newValue)} (<span class="${diffClass}">${sign}${format(changeAmount)}</span>)</span>`);
            });
        }

        return `
        <div class="log-item">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <b>${esc(l.state)}</b>: ${esc(l.item)}
                    <div class="sub">${esc(l.user)} | ${l.date}</div>
                </div>
                <div style="text-align:right;" class="${l.logType==='event'?'hidden':''}">
                    <div>${l.qty > 1 ? l.qty + 'x ' : ''}<span style="color:var(--gold)">${money(l.cost)}</span></div>
                </div>
            </div>
            ${diffContent.length > 0 ? `<div class="log-diff-box">${diffContent.join(' | ')}</div>` : ''}
        </div>`;
    }).join("") : "<p class=\"sub\">Kayıtlı işlem bulunmuyor.</p>";

    modal(`<h2>📜 İŞLEM LOGLARI & DEĞİŞİM DEFTERİ</h2>
    <p class="sub" style="margin-bottom:12px;">Yapılan harcamalar, alımlar ve kaynak değişimleri.</p>
    <div style="max-height:60vh; overflow:auto; margin-bottom:12px;">${logHtml}</div>
    <div class="actions"><button class="btn blue" onclick="closeModal()">KAPAT</button></div>`);
}

// ---------------- 1 YIL GEÇİR (PAŞA GELİŞİMİ, ÖMÜR VE SÖZLEŞME GÜNCELLEMESİ) ----------------
function passOneYear(){
    if(!isAdmin) return;
    if(!confirm("⏳ Tüm devletler için 1 tam yıl geçirilecek.\n\nVergiler toplanacak, paşalar yaşlanacak ve gelişim gösterecek. Onaylıyor musunuz?")) return;
    
    db.timerSeconds = 0;
    db.timerRunning = false;
    db.gameYear = (Number(db.gameYear) || 1453) + 1;
    
    // Veritabanına Yıl Sonu Raporunu Kaydetmek için Hazırlık
    db.settings.lastYearReport = { year: db.gameYear, states: {} };
    
    db.states.forEach(s => {
        let rpt = { name: s.name, events: [], rebellions: [], debts: [], advisors: [] };
        
        // ADIM 1: ÖNCE GEÇEN YILIN HAK EDİLEN PARASINI HESAPLA (Nüfus artmadan önce)
        let inc = calcIncome(s); 
        let permInc = calcPermIncome(s); 
        let exp = calcExpenses(s);
        let tempLedgerTotal = 0;
        if(s.customLedger && s.customLedger.length > 0) s.customLedger.forEach(item => { tempLedgerTotal += item.amount; });
        
        let net = inc + permInc - exp + tempLedgerTotal;
        const oldT = s.treasury; 
        s.treasury += net; 
        s.customLedger = []; 
        rpt.inc = inc; rpt.permInc = permInc; rpt.exp = exp; rpt.net = net; rpt.newT = s.treasury;
        
        addLog({stateId: s.id, stateName: s.name, action: `Yıl Sonu Hasılası`, cost: Math.abs(net), qty: 1, oldTreasury: oldT, newTreasury: s.treasury});
        
        // ADIM 2: BORÇ VE FAİZ KONTROLÜ
        s.debtYears=Math.max(0,Math.floor(Number(s.debtYears)||0));
        if(Number(s.treasury||0)<0){
            s.debtYears++;
            const interest=Math.ceil(Math.abs(Number(s.treasury||0))*0.013);
            s.treasury-=interest;
            rpt.debts.push(`${s.debtYears}. borç yılı, %1,3 faiz: -${money(interest)}`);
            if(s.debtYears>=3)s.happiness=Math.max(0,Number(s.happiness||0)-5);
        }else s.debtYears=0;
        
        // ADIM 3: NÜFUS ARTIŞI VE PATLAMA KORUMASI
        let totalGrowthPercent = 0;
        ["hastane", "asevi", "su_degirmeni", "kervansaray", "pazar"].forEach(key => {
            const count = s[key] || 0;
            if (count > 0) {
                const growthRate = Math.max(0, Number(db.settings.populationBuildingGrowth?.[key]) || 0);
                const efficiency = Math.max(0.2, 1 - (count * 0.05));
                totalGrowthPercent += (growthRate * count * efficiency);
            }
        });
        

        let newPop = Number(s.population || 0);
        if (totalGrowthPercent > 0) {
            let growthMultiplier = 1 + (totalGrowthPercent / 100);
            let calculatedPop = Math.floor(newPop * growthMultiplier);
            let extraPeople = calculatedPop - newPop;
          
            s.population = newPop + extraPeople;
            rpt.events.push(`Binalardan +${num(extraPeople)} Nüfus`);
        }
        
        // ADIM 4: İSYANLAR
        const adv = getAdvisorEffects(s);
        let hapNow = Math.max(0, Math.min(100, Number(s.happiness || 0) + Number(adv.happinessBonus || 0)));
        if(hapNow <= 70 && !adv.stopAnarchy) {
            let rebellionChance = (70 - hapNow) * 0.01;
            if(Math.random() < rebellionChance) {
                let myProvinces = getOwnedMapProvinceIds(s.id);
                if(myProvinces.length > 0) {
                    let randomProv = myProvinces[Math.floor(Math.random() * myProvinces.length)];
                    db.mapProvinceOwners = db.mapProvinceOwners || {};
                    db.mapProvinceDetails = db.mapProvinceDetails || {};
                    db.mapProvinceOwners[randomProv] = "__rebel__";
                    db.mapProvinceDetails[randomProv] = { countryName: "İsyancılar (" + s.name + " Karşıtı)", color: "#000000", garrison: 5000 + Math.floor(Math.random() * 5000) };
                    rpt.rebellions.push(`${getTurkishMapName(randomProv)} bölgesinde İSYAN çıktı ve kontrol kaybedildi!`);
                }
            }
        }
        
        // ADIM 5: OLAYLAR
        const generated = createYearEventsForState(s);
        db.pendingEvents.push(...generated);
        if(generated.length) rpt.events.push(`Yeni Yıl: Karar bekleyen ${generated.length} adet olay var.`);
        
        db.settings.lastYearReport.states[s.id] = rpt;
    });
    
    // 2. DÖNGÜ: SADECE PAŞA YAŞLANDIRMALARI VE FABRİKA AYARLARINA DÖNÜŞ
    let globallyAgedAdvisors = new Set(); 
    
    db.states.forEach(s => {
        let rpt = db.settings.lastYearReport.states[s.id];
        
        s.advisorHiredYears = s.advisorHiredYears || {};
        (s.hiredAdvisors || []).forEach(advId => { s.advisorHiredYears[advId] = (s.advisorHiredYears[advId] || 0) + 1; });
        let survivingHired = [];
        
        (s.hiredAdvisors || []).forEach(advId => {
            let adv = (db.advisors||[]).find(a => a.id === advId);
            if(!adv) return;
            if(!globallyAgedAdvisors.has(advId)) {
                globallyAgedAdvisors.add(advId);
                adv.ageYears = Number.isFinite(Number(adv.ageYears)) ? Number(adv.ageYears) + 1 : 6;
                adv.maxAge = Number.isFinite(Number(adv.maxAge)) ? Number(adv.maxAge) : Math.floor(Math.random() * 21) + 60; 
                if(adv.ageYears < adv.maxAge) {
                    adv.yearsSinceUpgrade = (adv.yearsSinceUpgrade || 0) + 1;
                    if(adv.yearsSinceUpgrade >= 3) {
                        adv.yearsSinceUpgrade = 0;
                        let boostPercent = Math.floor(Math.random() * 8) + 1; 
                        if(Number(adv.taxBonus)>0) adv.taxBonus = Number((Number(adv.taxBonus) + boostPercent).toFixed(1));
                        if(Number(adv.milUpkeepDiscount)>0) adv.milUpkeepDiscount = Number((Number(adv.milUpkeepDiscount) + boostPercent).toFixed(1));
                        if(Number(adv.navyUpkeepDiscount)>0) adv.navyUpkeepDiscount = Number((Number(adv.navyUpkeepDiscount) + boostPercent).toFixed(1));
                        if(Number(adv.artUpkeepDiscount)>0) adv.artUpkeepDiscount = Number((Number(adv.artUpkeepDiscount) + boostPercent).toFixed(1));
                        if(Number(adv.recruitDiscount)>0) adv.recruitDiscount = Number((Number(adv.recruitDiscount) + boostPercent).toFixed(1));
                        if(Number(adv.infraDiscount)>0) adv.infraDiscount = Number((Number(adv.infraDiscount) + boostPercent).toFixed(1));
                        if(Number(adv.happinessBonus)>0) adv.happinessBonus = Number((Number(adv.happinessBonus) + boostPercent).toFixed(1));
                        adv.lastUpgradeMsg = `(Gelişti! Bonuslar +%${boostPercent} arttı)`;
                        adv.upgradeHistory = adv.upgradeHistory || [];
                        adv.upgradeHistory.push(`• ${adv.ageYears} Yaşında: +%${boostPercent} Gelişim`);
                    } else { adv.lastUpgradeMsg = null; }
                }
            }
            
            // FABRİKA AYARLARINA DÖNÜŞ MEKANİĞİ
            if(adv.ageYears >= adv.maxAge) {
                rpt.advisors.push(`⚠️ <b>${adv.name}</b> yaşlılıktan vefat etti. (Yerine orijinal hali atandı)`);
                delete s.advisorHiredYears[advId];
                
                db.advisors = (db.advisors || []).filter(x => x.id !== advId); // Şişmiş eskisini sil
                
                let original = (typeof DEFAULT_45_ADVISORS !== 'undefined' ? DEFAULT_45_ADVISORS.find(x => x.id === advId) : null);
                if(original) {
                    // Hiçbir özelliğini elleme, tamamen orijinal ham halini havuza geri at!
                    db.advisors.push(structuredClone(original)); 
                }
            } else {
                survivingHired.push(advId);
                rpt.advisors.push(`👤 ${adv.name} (Yaş: ${adv.ageYears}) ${adv.lastUpgradeMsg ? `<b style="color:var(--green)">${adv.lastUpgradeMsg}</b>` : ''}`);
            }
        });
        s.hiredAdvisors = survivingHired;
    });
    
    queueMapSave();
    if(currentId) openDetail(currentId); else renderHome();
    showYearReportModal();
}
//oyuncular için açılabilir pencere ekranı 
function showYearReportModal() {
    const yr = db.settings.lastYearReport;
    if(!yr) return;
 
    localStorage.setItem('lastSeenYearReport_' + (currentUserEmail || 'guest'), yr.year);
 
    let statesToShow = [];
    if(isAdmin) {
        statesToShow = db.states.map(s => s.id);
    } else {
        const myState = getCurrentPlayerState();
        if(myState) statesToShow.push(myState.id);
    }
    
    if(statesToShow.length === 0) return;
    let html = `<h2>⏳ YENİ YIL: ${yr.year} - YIL SONU RAPORU</h2>
    <div style='max-height:70vh; overflow:auto;'><div class='cards' style='grid-template-columns:1fr;'>`;
    
    statesToShow.forEach(sid => {
        let rpt = yr.states[sid];
        if(!rpt) return;
        
        let col = rpt.net >= 0 ? 'var(--green)' : 'var(--red)';
        
        let eventHtml = '';
        if(rpt.rebellions && rpt.rebellions.length > 0) eventHtml += rpt.rebellions.map(r => `<div style="color:var(--red); font-weight:bold;">🔥 İSYAN: ${r}</div>`).join('');
        if(rpt.debts && rpt.debts.length > 0) eventHtml += rpt.debts.map(r => `<div style="color:var(--gold);">⚠️ BORÇ: ${r}</div>`).join('');
        if(rpt.events && rpt.events.length > 0) eventHtml += rpt.events.map(r => `<div>🔹 ${r}</div>`).join('');
        if(!eventHtml) eventHtml = `<div class="sub">Bu yıl özel bir gelişme olmadı.</div>`;
        
        html += `
        <div class="list-item" style="flex-direction:column; align-items:stretch; background:rgba(17, 20, 24, 0.9); border:1px solid var(--border-gold);">
            <div style="border-bottom:1px solid var(--border-gold); margin-bottom:8px; padding-bottom:6px; font-size:16px; font-family:'Playfair Display', serif; color:var(--border-gold);"><b>${esc(rpt.name)}</b></div>
            
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:10px; background:rgba(10, 12, 14, 0.6); padding:8px; border-radius:3px;">
                <div>Vergi: <span style="color:var(--green)">${money(rpt.inc)}</span> | Sabit: <span style="color:var(--green)">${money(rpt.permInc)}</span><br>Gider: <span style="color:var(--red)">-${money(rpt.exp)}</span></div>
                <div style="text-align:right;">Net Hasıla: <b style="color:${col}; font-size:15px;">${rpt.net>=0?'+':''}${money(rpt.net)}</b><br>Yeni Kasa: <b>${money(rpt.newT)}</b></div>
            </div>
            
            <div style="font-size:12px; margin-bottom:8px; border-left:3px solid var(--blue); padding-left:8px;">
                <b style="color:var(--blue)">ÜLKE GÜNDEMİ:</b><br>${eventHtml}
            </div>
            
            <div style="font-size:12px; border-left:3px solid var(--green); padding-left:8px;">
                <b style="color:var(--green)">DİVAN VE PAŞALAR:</b><br>${(rpt.advisors||[]).join('<br>') || '<span class="sub">Divanda paşa yok.</span>'}
            </div>
        </div>`;
    });
    
    // KAPAT BUTONU DÖNGÜNÜN DIŞINDA VE EN ALTTA OLMALI:
    html += "</div></div><div class='actions' style='margin-top:12px;'><button class='btn blue' style='width:100%;' onclick='closeModal(); if(currentId) openDetail(currentId); else renderHome();'>KAPAT</button></div>";
    modal(html);
}
 
function switchAdminTab(tabId){
 document.querySelectorAll('#modalContent .admin-hoi-tab').forEach(el=>el.classList.remove('active'));
 document.querySelectorAll('#modalContent .admin-tab-content').forEach(el=>el.classList.remove('active'));
 document.getElementById('admin-tab-btn-'+tabId)?.classList.add('active');
 document.getElementById('admin-tab-'+tabId)?.classList.add('active');
}

function organizeAdminTabs(){
 const root=document.getElementById('modalContent');
 if(!root)return;
 const children=Array.from(root.children);
 const title=children.find(el=>el.tagName==='H2');
 const footer=children.find(el=>el.classList?.contains('actions')&&el.querySelector?.('[onclick*="saveAdmin"]'));
 const defs=[
   ['actions','⚙️ İşlemler'],['divan','👑 Divan'],['strategic','⭐ Stratejik Bölgeler'],['images','🖼️ Görseller'],
   ['custom','🌟 Özel Birimler'],['economy','💰 Fiyatlar & Ordu'],['population','🏰 Nüfus & Garnizon']
 ];
 const panels={};
 defs.forEach(([id])=>{const panel=document.createElement('div');panel.id='admin-tab-'+id;panel.className='admin-tab-content'+(id==='actions'?' active':'');panels[id]=panel;});
 let current='actions';
 children.forEach(node=>{
   if(node===title||node===footer)return;
   if(node.tagName==='H4'){
     const heading=(node.textContent||'').toLocaleUpperCase('tr-TR');
     if(heading.includes('DİVAN'))current='divan';
     else if(heading.includes('STRATEJİK'))current='strategic';
     else if(heading.includes('GÖRSEL'))current='images';
     else if(heading.includes('ÖZEL BİRİM'))current='custom';
     else if(heading.includes('GARNİZON')||heading.includes('NÜFUS'))current='population';
     else if(heading.includes('SATIN ALMA')||heading.includes('KAPASİTE')||heading.includes('BAKIM')||heading.includes('FERMAN')||heading.includes('SEFER'))current='economy';
   }
   panels[current].appendChild(node);
 });
 const tabs=document.createElement('div');
 tabs.className='hoi-tabs';
 tabs.innerHTML=defs.map(([id,label])=>`<div id="admin-tab-btn-${id}" class="admin-hoi-tab${id==='actions'?' active':''}" onclick="switchAdminTab('${id}')">${label}</div>`).join('');
 const panelWrap=document.createElement('div');
 defs.forEach(([id])=>panelWrap.appendChild(panels[id]));
 root.replaceChildren(...[title,tabs,panelWrap,footer].filter(Boolean));
}

async function openAdmin(){
 if(!isAdmin) return;
 try{if(!mapConfigCache)await loadMapAssets();}catch(_){} 
 const p=db.settings.prices,u=db.settings.upkeep,c=db.settings.capacity,ec=db.settings.edictCost,cc=db.settings.campaignCost,gu=db.settings.garrisonUpkeep,pg=db.settings.populationBuildingGrowth,pc=db.settings.populationBuildingCostPerPerson,pbu=db.settings.populationBuildingUpkeep,iu=db.settings.infrastructureUpkeep;
 const img=db.settings.images||{};
 const stateOpts = `<option value="">🌍 Tümü (Herkes Alabilir)</option>` + db.states.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 
 let customHtml = (db.settings.customItems||[]).map(x => {
    let fName = x.faction ? (getState(x.faction)?.name || "Silinmiş") : "Tümü";
    let safeIcon = cleanUrl(x.icon);
    return `<div class="list-item">
      <div style="display:flex; align-items:center;">
         ${safeIcon ? `<img src="${esc(safeIcon)}" style="width:32px;height:32px;object-fit:cover;margin-right:8px;border-radius:2px;">` : ''}
         <div><b>${esc(x.name)}</b> <span class="badge">${esc(fName)}</span><br><span class="sub" style="font-size:11px;">(${x.category}) Fyt:${num(x.price)} | Bkm:${num(x.upkeep)} | İkm:${num(x.campCost||0)}</span></div>
      </div>
      <button class="btn red small" onclick="removeCustomItem('${x.id}')">SİL</button>
    </div>`
 }).join("");

 let advisorsHtml = (db.advisors||[]).map((a, idx) => {
    let fName = a.faction ? (getState(a.faction)?.name || "Özel Devlet") : (a.targetName || "Tümü");
    return `<div class="list-item" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><b>${esc(a.name)}</b> <span class="stars-span">${'★'.repeat(a.stars||1)}</span> <span class="sub">(${esc(a.role)})</span> <span class="badge">${esc(fName)}</span></div>
        <div>
            <button class="btn gold small" style="padding:2px 6px;" onclick="openEditAdvisorModal('${a.id}')">DÜZENLE</button>
            <button class="btn red small" style="padding:2px 6px;" onclick="removeAdvisor('${a.id}')">SİL</button>
        </div>
      </div>
      <div style="font-size:11px; margin-top:3px;"><span style="color:var(--green)">Artı: ${esc(a.buff)}</span> | <span style="color:var(--red)">Eksi: ${esc(a.debuff)}</span> | <span style="color:var(--gold)">Maaş: ${money(a.salary)}/yıl</span> | <span style="color:var(--muted)">Yaş: ${a.ageYears||5}/${a.maxAge||20}</span></div>
    </div>`;
 }).join("");

 modal(`<h2 style="display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:20;background:var(--panel);padding:8px 0;margin-top:0;">⚙ KÜRESEL AYARLAR <button class="btn red" style="font-size:18px;line-height:1;padding:7px 11px;" onclick="closeModal()" title="Küresel ayarları kapat">✕</button></h2>
 <div class="actions" style="margin:8px 0;"><button class="btn red" onclick="openWarGarrisonModal()">⚔️ SAVAŞ</button><button class="btn gold" onclick="openEventHistoryAdmin()">🎲 OLAY GEÇMİŞİ / SEÇİMLER</button><button class="btn blue" onclick="openEventPoolAdmin()">🗂️ 100 OLAY HAVUZU</button><button class="btn blue" onclick="openAdminLetters()">✉️ MEKTUPLAR</button></div>

 <h4 style="color:var(--border-gold); margin:12px 0 6px; font-family:'Oswald';">👑 DİVAN PAŞALARI YÖNETİMİ (${(db.advisors||[]).length} Paşa)</h4>
 <p class="sub" style="margin-bottom:8px;">Paşaların ömürlerini, yıldızlarını, maaşlarını ve çarpanlarını düzenleyin.</p>
 <div style="margin-bottom:12px; max-height:220px; overflow:auto;">${advisorsHtml || "<p class='sub'>Paşa yok.</p>"}</div>
 
 <div class="formgrid" style="background:rgba(10, 12, 14, 0.7); padding:10px; border-radius:3px; border:1px solid var(--border-gold); margin-bottom:15px;">
    <div class="full" style="color:var(--border-gold); font-size:12px; font-weight:bold; font-family:'Oswald';">➕ YENİ PAŞA / DANIŞMAN EKLE</div>
    ${field("adv_new_name", "Paşa İsmi", "", "text")}
    ${field("adv_new_role", "Unvanı / Rolü", "", "text")}
    <div><label>Yıldız Seviyesi</label><select id="f_adv_new_stars"><option value="1">1 Yıldız (★)</option><option value="2">2 Yıldız (★★)</option><option value="3" selected>3 Yıldız (★★★)</option><option value="4">4 Yıldız (★★★★)</option><option value="5">5 Yıldız (★★★★★)</option></select></div>
    <div><label>Hangi Devlete Özel?</label><select id="f_adv_new_faction">${stateOpts}</select></div>
    ${field("adv_new_salary", "Yıllık Maaş (TL)", "25000", "number")}
    ${field("adv_new_ageYears", "Başlangıç / Mevcut Yaş (Yıl)", "1", "number")}
    ${field("adv_new_maxAge", "Ölüm / Maksimum Yaş (Yıl)", "70", "number")}
    ${field("adv_new_icon", "Resim URL (İsteğe Bağlı)", "", "text")}

    <div class="full" style="color:var(--gold); font-size:11px; font-weight:bold; margin-top:6px;">MATEMATİKSEL ÇARPANLAR:</div>
    ${field("adv_new_taxBonus", "Vergi Geliri Etkisi (+/- %)", "0", "number")}
    ${field("adv_new_milUpkeepDiscount", "Ordu Bakım İndirimi (%)", "0", "number")}
    ${field("adv_new_navyUpkeepDiscount", "Donanma Bakım İndirimi (%)", "0", "number")}
    ${field("adv_new_artUpkeepDiscount", "Topçu Bakım İndirimi (%)", "0", "number")}
    ${field("adv_new_recruitDiscount", "Asker Alım İndirimi (%)", "0", "number")}
    ${field("adv_new_infraDiscount", "Bina Yapım İndirimi (%)", "0", "number")}
    ${field("adv_new_happinessBonus", "Mutluluk Bonusu (+/- Puan)", "0", "number")}
    <div><label>İsyan / Anarşiyi Sıfırla?</label><select id="f_adv_new_stopAnarchy"><option value="false">Hayır</option><option value="true">Evet (%0 Yapar)</option></select></div>
    <div class="full"><label>Casusluk Sapmasını Sıfırla (Net Bilgi)?</label><select id="f_adv_new_spyAccuracyBonus"><option value="false">Hayır</option><option value="true">Evet (Tam Kesin Veri)</option></select></div>

    <div class="full">${field("adv_new_buff", "Artı Açıklaması (Görsel Metin)", "", "text")}</div>
    <div class="full">${field("adv_new_debuff", "Eksi Açıklaması (Görsel Metin)", "", "text")}</div>
    <div class="full actions"><button class="btn green" style="width:100%;" onclick="addNewAdvisor()">➕ PAŞAYI KAYDET</button></div>
 </div>

 <h4 style="color:var(--border-gold); margin:16px 0 6px; font-family:'Oswald';">⭐ DEĞERLİ / STRATEJİK BÖLGELER</h4>
 <div class="list-item" style="display:block;">
   <p class="sub" style="margin:0 0 8px;">Haritadaki toprakları işaretle. Stratejik Görünüm'de sticker gösterilir ve oyuncu bölgeye tıkladığında açıklama, mevcut sahip ve garnizon bilgisinin yanında görünür.</p>
   <button class="btn gold" style="width:100%;" onclick="openStrategicRegionAdmin()">⭐ STRATEJİK BÖLGELERİ YÖNET</button>
 </div>

 <h4 style="color:var(--border-gold); margin:12px 0 6px; font-family:'Oswald';">🖼️ BİRLİK & BİNA GÖRSELLERİ (URL)</h4>
 <div class="formgrid" style="background:rgba(10, 12, 14, 0.7); padding:10px; border-radius:3px; border:1px solid var(--border-steel);">
    ${field("img_piyade", "Piyade Resmi URL", img.piyade||"", "text")}
    ${field("img_suvari", "Süvari Resmi URL", img.suvari||"", "text")}
    ${field("img_nisanci", "Nişancı Resmi URL", img.nisanci||"", "text")}
    ${field("img_kucuk_top", "Küçük Top Resmi URL", img.kucuk_top||"", "text")}
    ${field("img_orta_top", "Orta Top Resmi URL", img.orta_top||"", "text")}
    ${field("img_buyuk_top", "Büyük Top Resmi URL", img.buyuk_top||"", "text")}
    ${field("img_kucuk_gemi", "Küçük Gemi Resmi URL", img.kucuk_gemi||"", "text")}
    ${field("img_orta_gemi", "Orta Gemi Resmi URL", img.orta_gemi||"", "text")}
    ${field("img_buyuk_gemi", "Büyük Gemi Resmi URL", img.buyuk_gemi||"", "text")}
    ${field("img_kucuk_liman", "Küçük Liman Resmi URL", img.kucuk_liman||"", "text")}
    ${field("img_orta_liman", "Orta Liman Resmi URL", img.orta_liman||"", "text")}
    ${field("img_buyuk_liman", "Büyük Liman Resmi URL", img.buyuk_liman||"", "text")}
    ${field("img_kucuk_ocak", "Küçük Top Ocağı Resmi URL", img.kucuk_ocak||"", "text")}
    ${field("img_orta_ocak", "Orta Top Ocağı Resmi URL", img.orta_ocak||"", "text")}
    ${field("img_buyuk_ocak", "Büyük Top Ocağı Resmi URL", img.buyuk_ocak||"", "text")}
    ${field("img_okul", "Okul Resmi URL", img.okul||"", "text")}
    ${field("img_istihbarat_binasi", "İstihbarat Dairesi Resmi URL", img.istihbarat_binasi||"", "text")}
    ${field("img_fortress", "Kale Resmi URL", img.fortress||"", "text")}
    ${field("img_fortress_garrison", "Kale Garnizonu Resmi URL", img.fortress_garrison||"", "text")}
    ${field("img_hastane", "Hastane Resmi URL", img.hastane||"", "text")}
    ${field("img_asevi", "Aşevi Resmi URL", img.asevi||"", "text")}
    ${field("img_su_degirmeni", "Su Değirmeni Resmi URL", img.su_degirmeni||"", "text")}
    ${field("img_kervansaray", "Kervansaray Resmi URL", img.kervansaray||"", "text")}
    ${field("img_pazar", "Pazar Resmi URL", img.pazar||"", "text")}
 </div>

 <h4 style="color:var(--border-gold); margin:16px 0 6px; font-family:'Oswald';">🌟 ÖZEL BİRİM / BİNA EKLE</h4>
 <div style="margin-bottom:12px; max-height:180px; overflow:auto;">${customHtml || "<p class='sub'>Özel birim yok.</p>"}</div>
 <div class="formgrid" style="background:rgba(10, 12, 14, 0.7); padding:10px; border-radius:3px; border:1px solid var(--border-gold);">
    ${field("ci_name", "Birim Adı", "", "text")}
    <div class="full"><label>Hangi Devlete Özel?</label><select id="f_ci_faction">${stateOpts}</select></div>
    <div><label>Kategori</label><select id="f_ci_cat"><option value="asker">Askeri Birlik</option><option value="altyapi">Altyapı / Bina</option></select></div>
    ${field("ci_icon", "Resim URL (Direct Link)", "", "text")}
    ${field("ci_price", "Satın Alma Fiyatı", "0", "number")}
    ${field("ci_upkeep", "Yıllık Bakım Gideri", "0", "number")}
    ${field("ci_campCost", "Sefer İkmal Maliyeti", "0", "number")}
    <div class="full actions"><button class="btn green" style="width:100%;" onclick="addCustomItem()">➕ BİRİMİ KAYDET</button></div>
 </div>

 <h4 style="margin-top:14px; color:var(--border-gold); font-family:'Oswald';">SATIN ALMA FİYATLARI</h4><div class="formgrid">${Object.keys(p).map(k=>field("p_"+k,k,p[k],"number")).join("")}</div>
 <h4 style="margin-top:10px; color:var(--border-gold); font-family:'Oswald';">KAPASİTELER</h4><div class="formgrid">${Object.keys(c).map(k=>field("c_"+k,k,c[k],"number")).join("")}</div>
 <h4 style="margin-top:10px; color:var(--border-gold); font-family:'Oswald';">BAKIM GİDERLERİ</h4><div class="formgrid">${Object.keys(u).map(k=>field("u_"+k,k,u[k],"number")).join("")}</div>
 <h4 style="margin-top:10px; color:var(--blue); font-family:'Oswald';">OKUL AYARLARI</h4>
 <div class="formgrid">
   ${field("school_capacity","Okul Başına Eğitim Kapasitesi (Kişi)",db.settings.schoolCapacityPerBuilding||500,"number")}
   ${field("school_upkeep","Okul Başına Yıllık Gider",db.settings.schoolUpkeep||0,"number")}
   ${field("educated_tax_multiplier","Eğitimli Nüfus Vergi Çarpanı",db.settings.educatedTaxMultiplier??1.5,"number")}
 </div>
 <h4 style="margin-top:10px; color:var(--red); font-family:'Oswald';">ALTYAPI BİNALARI YILLIK GİDERLERİ (Bina Başı)</h4>
 <div class="formgrid">${Object.keys(iu).map(k=>field("iu_"+k,k,iu[k],"number")).join("")}</div>
 <p class="sub">Eğitimli nüfus artık yüzdeyle değil, okul kapasitesiyle kişi olarak hesaplanır. Çarpan 1,5 ise eğitimli kişi normal verginin 1,5 katını verir.</p>
 <h4 style="margin-top:10px; color:var(--red); font-family:'Oswald';">GARNİZON YILLIK GİDERLERİ (Asker Başı)</h4>
 <div class="formgrid">
   ${field("gu_fortress","Kale Garnizonu Asker Başı / Yıl",gu.fortress,"number")}
 </div>
 <h4 style="margin-top:10px; color:var(--green); font-family:'Oswald';">NÜFUS BİNALARI ARTIŞ ORANLARI (%)</h4>
 <div class="formgrid">
   ${field("pg_hastane","Hastane Nüfus Artışı (%)",pg.hastane,"number")}
   ${field("pg_asevi","Aşevi Nüfus Artışı (%)",pg.asevi,"number")}
   ${field("pg_su_degirmeni","Su Değirmeni Nüfus Artışı (%)",pg.su_degirmeni,"number")}
   ${field("pg_kervansaray","Kervansaray Nüfus Artışı (%)",pg.kervansaray,"number")}
   ${field("pg_pazar","Pazar Nüfus Artışı (%)",pg.pazar,"number")}
 </div>
 <h4 style="margin-top:10px; color:var(--red); font-family:'Oswald';">NÜFUS BİNALARI YILLIK GİDERLERİ (Bina Başı)</h4>
 <div class="formgrid">
   ${field("pbu_hastane","Hastane Yıllık Gideri",pbu.hastane,"number")}
   ${field("pbu_asevi","Aşevi Yıllık Gideri",pbu.asevi,"number")}
   ${field("pbu_su_degirmeni","Su Değirmeni Yıllık Gideri",pbu.su_degirmeni,"number")}
   ${field("pbu_kervansaray","Kervansaray Yıllık Gideri",pbu.kervansaray,"number")}
   ${field("pbu_pazar","Pazar Yıllık Gideri",pbu.pazar,"number")}
 </div>
 <h4 style="margin-top:10px; color:var(--blue); font-family:'Oswald';">HARİTA İSTİHBARATI</h4>
 <div class="formgrid">${field("map_intel_cost","İstihbaratsız Oyuncu Rapor Ücreti",db.settings.mapIntelReportCost||0,"number")}</div>
 <h4 style="margin-top:10px; color:var(--gold); font-family:'Oswald';">NÜFUSA GÖRE BİNA MALİYETİ (Kişi Başı TL)</h4>
 <p class="sub">Güncel bina fiyatı = devletin toplam nüfusu × kişi başı maliyet.</p>
 <div class="formgrid">
   ${field("pc_hastane","Hastane Kişi Başı Maliyet",pc.hastane,"number")}
   ${field("pc_asevi","Aşevi Kişi Başı Maliyet",pc.asevi,"number")}
   ${field("pc_su_degirmeni","Su Değirmeni Kişi Başı Maliyet",pc.su_degirmeni,"number")}
   ${field("pc_kervansaray","Kervansaray Kişi Başı Maliyet",pc.kervansaray,"number")}
   ${field("pc_pazar","Pazar Kişi Başı Maliyet",pc.pazar,"number")}
 </div>
 <h4 style="margin-top:10px; color:var(--gold); font-family:'Oswald';">FERMAN ÇARPANLARI</h4><div class="formgrid">${Object.keys(ec).map(k=>field("ec_"+k,k,ec[k],"number")).join("")}</div>
 <h4 style="margin-top:10px; color:var(--red); font-family:'Oswald';">SEFER & İKMAL (Birim Başı)</h4><div class="formgrid">${Object.keys(cc).map(k=>field("cc_"+k,k,cc[k],"number")).join("")}</div>
 <div class="actions" style="margin-top:14px"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn blue" onclick="saveAdmin(true)">KAYDET</button></div>`);
 organizeAdminTabs();
}

// ---------------- SAVAŞTA GARNİZON KAYIPLARI (ADMİN) ----------------
function openWarGarrisonModal()
{
 if(!isAdmin) return;
 const opts=`<option value="">Devlet seçin…</option>`+db.states.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
 modal(`<h2>⚔️ SAVAŞ VE ASKERİ KAYIPLAR</h2>
   <p class="sub">Buradan sildiğiniz askerler "Terhis" edilmiş sayılmaz, "Şehit/Ölü" sayılır. Yani elverişli nüfus havuzuna geri dönmezler ve ülkenin toplam nüfusundan kalıcı olarak düşülürler.</p>
   <div class="formgrid">
     <div class="full"><label>Hedef Devlet</label><select id="war_state" onchange="renderWarGarrisonFields()">${opts}</select></div>
   </div>
   <div id="war_garrison_fields"><p class="sub">İşlem yapmak için önce bir devlet seçin.</p></div>
   <div class="actions" style="margin-top:14px"><button class="btn" onclick="openAdmin()">GERİ</button></div>`);
}

function renderWarGarrisonFields()
{
 const stateId=document.getElementById("war_state")?.value;
 const box=document.getElementById("war_garrison_fields");
 const s=getState(stateId);
 if(!box) return;
 if(!s){box.innerHTML='<p class="sub">İşlem yapmak için önce bir devlet seçin.</p>';return;}
 
 let customUnits = (db.settings.customItems||[]).filter(x => x.category === 'asker' && (!x.faction || x.faction === s.id));
 let customStatus = ""; let customInputs = "";
 customUnits.forEach(c => {
    customStatus += `${esc(c.name)}: <b>${num(s[c.id]||0)}</b> | `;
    customInputs += field("war_death_" + c.id, "Ölen " + esc(c.name), 0, "number");
 });
 box.innerHTML=`<div class="event-result" style="margin-top:10px; font-size:12px;">
     <b>${esc(s.name)} Mevcut Ordusu:</b><br>
     Piyade: <b>${num(s.piyade||0)}</b> | Süvari: <b>${num(s.suvari||0)}</b> | Nişancı: <b>${num(s.nisanci||0)}</b><br>
     K. Top: <b>${num(s.kucuk_top||0)}</b> | O. Top: <b>${num(s.orta_top||0)}</b> | B. Top: <b>${num(s.buyuk_top||0)}</b><br>
     K. Gemi: <b>${num(s.kucuk_gemi||0)}</b> | O. Gemi: <b>${num(s.orta_gemi||0)}</b> | B. Gemi: <b>${num(s.buyuk_gemi||0)}</b><br>
     Kale Garnizonu: <b>${num(s.fortressGarrison||0)}</b><br>
     ${customStatus ? customStatus + '<br>' : ''}
     <div class="sub" style="margin-top:4px; color:var(--red);">Bugüne kadar verilen toplam SAVAŞ ŞEHİDİ (Nüfustan düşülen): ${num((s.warCasualties||0)+(s.garrisonWarDeaths||0))} İnsan</div>
   </div>
   <div class="formgrid" style="margin-top:10px;">
     ${field("war_death_piyade","Ölen Piyade",0,"number")}
     ${field("war_death_suvari","Ölen Süvari",0,"number")}
     ${field("war_death_nisanci","Ölen Nişancı",0,"number")}
     ${customInputs}
     <div class="full" style="border-top:1px dashed var(--line); margin-top:5px; padding-top:5px;"></div>
     ${field("war_death_kucuk_top","Patlayan K. Top",0,"number")}
     ${field("war_death_orta_top","Patlayan O. Top",0,"number")}
     ${field("war_death_buyuk_top","Patlayan B. Top",0,"number")}
     ${field("war_death_kucuk_gemi","Batan K. Gemi",0,"number")}
     ${field("war_death_orta_gemi","Batan O. Gemi",0,"number")}
     ${field("war_death_buyuk_gemi","Batan B. Gemi",0,"number")}
     ${field("war_death_garrison","Ölen Kale Garnizonu",0,"number")}
   </div>
   <button class="btn red" style="width:100%;margin-top:10px;" onclick="applyWarGarrisonDeaths('${s.id}')">KAYIPLARI UYGULA (NÜFUSTAN DÜŞ)</button>`;
}

function applyWarGarrisonDeaths(stateId)
{
 if(!isAdmin) return;
 const s=getState(stateId);
 if(!s) return;
 
 let totalHumanDeaths = 0;
 let totalEquipmentLost = 0;
 let details = [];
 
 // İnsan kayıpları (Nüfustan Düşecekler)
 const humanKeys = ["piyade", "suvari", "nisanci"];
 let customUnits = (db.settings.customItems||[]).filter(x => x.category === 'asker' && (!x.faction || x.faction === s.id));
 customUnits.forEach(c => humanKeys.push(c.id));
 
 for(const k of humanKeys) {
     const lost = Math.max(0, Math.floor(Number(document.getElementById("f_war_death_" + k)?.value)||0));
     if(lost > 0) {
         if(lost > (s[k]||0)) { alert(`${k} kaybı mevcut ordudan fazla olamaz!`); return; }
         s[k] -= lost;
         totalHumanDeaths += lost;
         details.push(`${num(lost)} ${k}`);
     }
 }
 
 // Garnizon kaybı (İnsan - Nüfustan Düşer)
 const dGarrison = Math.max(0, Math.floor(Number(document.getElementById("f_war_death_garrison")?.value)||0));
 if(dGarrison > 0) {
     if(dGarrison > (s.fortressGarrison||0)) { alert("Ölen garnizon mevcut garnizondan fazla olamaz!"); return; }
     s.fortressGarrison -= dGarrison;
     totalHumanDeaths += dGarrison;
     details.push(`${num(dGarrison)} garnizon`);
 }
 
 // Ekipman kayıpları (Toplar ve Gemiler - Nüfustan DÜŞMEZ)
 const equipmentKeys = ["kucuk_top", "orta_top", "buyuk_top", "kucuk_gemi", "orta_gemi", "buyuk_gemi"];
 for(const k of equipmentKeys) {
     const lost = Math.max(0, Math.floor(Number(document.getElementById("f_war_death_" + k)?.value)||0));
     if(lost > 0) {
         if(lost > (s[k]||0)) { alert(`${k} kaybı mevcuttan fazla olamaz!`); return; }
         s[k] -= lost;
         totalEquipmentLost += lost;
         details.push(`${num(lost)} ${k}`);
     }
 }
 
 if(totalHumanDeaths === 0 && totalEquipmentLost === 0){alert("En az bir kayıp sayısı girin.");return;}
 
 // Sadece ölen "İnsanlar" toplam nüfustan düşülür ve havuza dönmeleri engellenir.
 if(totalHumanDeaths > 0) {
     s.population = Math.max(0, (s.population||0) - totalHumanDeaths);
     s.warCasualties = (s.warCasualties || 0) + totalHumanDeaths;
 }
 
 if(dGarrison > 0) redistributeMapGarrisonsForStateIds([s.id]);
 
 addLog({stateId:s.id,stateName:s.name,action:`Savaş Zayiatı: ${details.join(', ')}`,qty:totalHumanDeaths + totalEquipmentLost,cost:0});
 queueSave();
 toast(`${s.name} savaş kayıpları işlendi.`);
 openWarGarrisonModal();
 const selector=document.getElementById("war_state");
 if(selector){selector.value=s.id;renderWarGarrisonFields();}
}

// ---------------- DANIŞMAN DÜZENLEME & KAYDETME (ADMİN) ----------------
function openEditAdvisorModal(advId) {
    const a = (db.advisors||[]).find(x => x.id === advId);
    if(!a) return;
    const stateOpts = `<option value="" ${!a.faction ? 'selected' : ''}>🌍 Tümü (Herkes Alabilir)</option>` + db.states.map(x=>`<option value="${x.id}" ${a.faction===x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join("");

    modal(`<h2>👑 PAŞAYI DÜZENLE</h2>
    <div class="formgrid">
        ${field("adv_edit_name", "Paşa İsmi", a.name, "text")}
        ${field("adv_edit_role", "Unvanı / Rolü", a.role, "text")}
        <div><label>Yıldız Seviyesi</label><select id="f_adv_edit_stars">
            <option value="1" ${a.stars===1?'selected':''}>1 Yıldız (★)</option>
            <option value="2" ${a.stars===2?'selected':''}>2 Yıldız (★★)</option>
            <option value="3" ${a.stars===3?'selected':''}>3 Yıldız (★★★)</option>
            <option value="4" ${a.stars===4?'selected':''}>4 Yıldız (★★★★)</option>
            <option value="5" ${a.stars===5?'selected':''}>5 Yıldız (★★★★★)</option>
        </select></div>
        <div><label>Hangi Devlete Özel?</label><select id="f_adv_edit_faction">${stateOpts}</select></div>
        ${field("adv_edit_salary", "Yıllık Maaş (TL)", a.salary, "number")}
        ${field("adv_edit_ageYears", "Mevcut Yaş (Yıl)", a.ageYears||5, "number")}
        ${field("adv_edit_maxAge", "Ölüm / Maksimum Yaş (Yıl)", a.maxAge||20, "number")}
        ${field("adv_edit_icon", "Resim URL", a.icon||"", "text")}
        
        <div class="full" style="color:var(--gold); font-size:11px; font-weight:bold; margin-top:6px;">MATEMATİKSEL ÇARPANLAR:</div>
        ${field("adv_edit_taxBonus", "Vergi Geliri Etkisi (+/- %)", a.taxBonus||0, "number")}
        ${field("adv_edit_milUpkeepDiscount", "Ordu Bakım İndirimi (%)", a.milUpkeepDiscount||0, "number")}
        ${field("adv_edit_navyUpkeepDiscount", "Donanma Bakım İndirimi (%)", a.navyUpkeepDiscount||0, "number")}
        ${field("adv_edit_artUpkeepDiscount", "Topçu Bakım İndirimi (%)", a.artUpkeepDiscount||0, "number")}
        ${field("adv_edit_recruitDiscount", "Asker Alım İndirimi (%)", a.recruitDiscount||0, "number")}
        ${field("adv_edit_infraDiscount", "Bina Yapım İndirimi (%)", a.infraDiscount||0, "number")}
        ${field("adv_edit_happinessBonus", "Mutluluk Bonusu (+/- Puan)", a.happinessBonus||0, "number")}
        <div><label>İsyan / Anarşiyi Sıfırla?</label><select id="f_adv_edit_stopAnarchy"><option value="false" ${!a.stopAnarchy?'selected':''}>Hayır</option><option value="true" ${a.stopAnarchy?'selected':''}>Evet (%0 Yapar)</option></select></div>
        <div class="full"><label>Casusluk Sapmasını Sıfırla (Net Bilgi)?</label><select id="f_adv_edit_spyAccuracyBonus"><option value="false" ${!a.spyAccuracyBonus?'selected':''}>Hayır</option><option value="true" ${a.spyAccuracyBonus?'selected':''}>Evet (Tam Kesin Veri)</option></select></div>

        <div class="full">${field("adv_edit_buff", "Artı Açıklaması", a.buff, "text")}</div>
        <div class="full">${field("adv_edit_debuff", "Eksi Açıklaması", a.debuff, "text")}</div>
        <div class="full actions" style="margin-top:10px;">
            <button class="btn" onclick="openAdmin()">GERİ</button>
            <button class="btn green" onclick="saveAdvisorEdit('${a.id}')">KAYDET</button>
        </div>
    </div>`);
}

function saveAdvisorEdit(advId) {
    const a = (db.advisors||[]).find(x => x.id === advId);
    if(!a) return;
    a.name = document.getElementById("f_adv_edit_name").value.trim() || a.name;
    a.role = document.getElementById("f_adv_edit_role").value.trim() || a.role;
    a.stars = Number(document.getElementById("f_adv_edit_stars").value) || 1;
    a.faction = document.getElementById("f_adv_edit_faction").value;
    a.salary = Number(document.getElementById("f_adv_edit_salary").value) || 0;
    a.ageYears = Math.max(0, Number(document.getElementById("f_adv_edit_ageYears").value) || 0);
    a.maxAge = Math.max(a.ageYears + 1, Number(document.getElementById("f_adv_edit_maxAge").value) || 20);
    a.icon = cleanUrl(document.getElementById("f_adv_edit_icon").value);
    
    a.taxBonus = Number(document.getElementById("f_adv_edit_taxBonus").value) || 0;
    a.milUpkeepDiscount = Number(document.getElementById("f_adv_edit_milUpkeepDiscount").value) || 0;
    a.navyUpkeepDiscount = Number(document.getElementById("f_adv_edit_navyUpkeepDiscount").value) || 0;
    a.artUpkeepDiscount = Number(document.getElementById("f_adv_edit_artUpkeepDiscount").value) || 0;
    a.recruitDiscount = Number(document.getElementById("f_adv_edit_recruitDiscount").value) || 0;
    a.infraDiscount = Number(document.getElementById("f_adv_edit_infraDiscount").value) || 0;
    a.happinessBonus = Number(document.getElementById("f_adv_edit_happinessBonus").value) || 0;
    a.stopAnarchy = document.getElementById("f_adv_edit_stopAnarchy").value === 'true';
    a.spyAccuracyBonus = document.getElementById("f_adv_edit_spyAccuracyBonus").value === 'true';

    a.buff = document.getElementById("f_adv_edit_buff").value.trim();
    a.debuff = document.getElementById("f_adv_edit_debuff").value.trim();
    queueSave();
    openAdmin();
}

function addNewAdvisor() {
    const name = document.getElementById("f_adv_new_name").value.trim();
    const role = document.getElementById("f_adv_new_role").value.trim();
    const stars = Number(document.getElementById("f_adv_new_stars").value) || 1;
    const faction = document.getElementById("f_adv_new_faction").value;
    const salary = Number(document.getElementById("f_adv_new_salary").value) || 0;
    const ageYears = Math.max(0, Number(document.getElementById("f_adv_new_ageYears").value) || 0);
    const maxAge = Math.max(ageYears + 1, Number(document.getElementById("f_adv_new_maxAge").value) || 20);
    const icon = cleanUrl(document.getElementById("f_adv_new_icon").value);
    
    const taxBonus = Number(document.getElementById("f_adv_new_taxBonus").value) || 0;
    const milUpkeepDiscount = Number(document.getElementById("f_adv_new_milUpkeepDiscount").value) || 0;
    const navyUpkeepDiscount = Number(document.getElementById("f_adv_new_navyUpkeepDiscount").value) || 0;
    const artUpkeepDiscount = Number(document.getElementById("f_adv_new_artUpkeepDiscount").value) || 0;
    const recruitDiscount = Number(document.getElementById("f_adv_new_recruitDiscount").value) || 0;
    const infraDiscount = Number(document.getElementById("f_adv_new_infraDiscount").value) || 0;
    const happinessBonus = Number(document.getElementById("f_adv_new_happinessBonus").value) || 0;
    const stopAnarchy = document.getElementById("f_adv_new_stopAnarchy").value === 'true';
    const spyAccuracyBonus = document.getElementById("f_adv_new_spyAccuracyBonus").value === 'true';

    const buff = document.getElementById("f_adv_new_buff").value.trim();
    const debuff = document.getElementById("f_adv_new_debuff").value.trim();
    
    if(!name || !role) { alert("Paşa ismi ve rolü boş olamaz!"); return; }
    
    db.advisors = db.advisors || [];
    db.advisors.push({
        id: "adv_" + crypto.randomUUID().split("-")[0],
        name, role, stars, faction, salary, maxAge, icon,
        ageYears, yearsSinceUpgrade: 0,
        taxBonus, milUpkeepDiscount, navyUpkeepDiscount, artUpkeepDiscount,
        recruitDiscount, infraDiscount, happinessBonus, stopAnarchy, spyAccuracyBonus,
        buff, debuff
    });
    queueSave();
    openAdmin();
}

function removeAdvisor(advId) {
    if(!confirm("Bu paşayı silmek istediğinize emin misiniz?")) return;
    db.advisors = (db.advisors||[]).filter(x => x.id !== advId);
    db.states.forEach(s => {
        if(s.hiredAdvisors) s.hiredAdvisors = s.hiredAdvisors.filter(id => id !== advId);
    });
    queueSave();
    openAdmin();
}

function addCustomItem(){
   const name = document.getElementById("f_ci_name").value.trim(), cat = document.getElementById("f_ci_cat").value, faction = document.getElementById("f_ci_faction").value;
   const price = Number(document.getElementById("f_ci_price").value)||0, upkeep = Number(document.getElementById("f_ci_upkeep").value)||0, campCost = Number(document.getElementById("f_ci_campCost").value)||0, icon = cleanUrl(document.getElementById("f_ci_icon").value);
   if(!name){alert("İsim gerekli!"); return;}
   const id = "c_" + crypto.randomUUID().split("-")[0];
   db.settings.customItems = db.settings.customItems || [];
   db.settings.customItems.push({id, name, category: cat, price, upkeep, campCost, icon, faction});
   saveAdmin(false);
}
function removeCustomItem(id){
   if(!confirm("Emin misiniz?")) return;
   db.settings.customItems = db.settings.customItems.filter(x => x.id !== id);
   saveAdmin(false);
}
function saveAdmin(doClose = true){
 const mapIntelCostEl=document.getElementById("f_map_intel_cost"); if(mapIntelCostEl)db.settings.mapIntelReportCost=Math.max(0,Number(mapIntelCostEl.value)||0);
 const schoolCapacityEl=document.getElementById("f_school_capacity"); if(schoolCapacityEl)db.settings.schoolCapacityPerBuilding=Math.max(0,Math.floor(Number(schoolCapacityEl.value)||0));
 const schoolUpkeepEl=document.getElementById("f_school_upkeep"); if(schoolUpkeepEl)db.settings.schoolUpkeep=Math.max(0,Number(schoolUpkeepEl.value)||0);
 const educatedMultiplierEl=document.getElementById("f_educated_tax_multiplier"); if(educatedMultiplierEl)db.settings.educatedTaxMultiplier=Math.max(0,Number(educatedMultiplierEl.value)||0);
 Object.keys(db.settings.prices).forEach(k=>{ const el=document.getElementById("f_p_"+k); if(el) db.settings.prices[k]=Number(el.value||0); });
 Object.keys(db.settings.capacity).forEach(k=>{ const el=document.getElementById("f_c_"+k); if(el) db.settings.capacity[k]=Number(el.value||0); });
 Object.keys(db.settings.upkeep).forEach(k=>{ const el=document.getElementById("f_u_"+k); if(el) db.settings.upkeep[k]=Number(el.value||0); });
 Object.keys(db.settings.garrisonUpkeep).forEach(k=>{ const el=document.getElementById("f_gu_"+k); if(el) db.settings.garrisonUpkeep[k]=Math.max(0,Number(el.value||0)); });
 Object.keys(db.settings.populationBuildingGrowth).forEach(k=>{ const el=document.getElementById("f_pg_"+k); if(el) db.settings.populationBuildingGrowth[k]=Math.max(0,Number(el.value||0)); });
 Object.keys(db.settings.populationBuildingCostPerPerson).forEach(k=>{ const el=document.getElementById("f_pc_"+k); if(el) db.settings.populationBuildingCostPerPerson[k]=Math.max(0,Number(el.value||0)); });
 Object.keys(db.settings.populationBuildingUpkeep).forEach(k=>{ const el=document.getElementById("f_pbu_"+k); if(el) db.settings.populationBuildingUpkeep[k]=Math.max(0,Number(el.value||0)); });
 Object.keys(db.settings.infrastructureUpkeep).forEach(k=>{ const el=document.getElementById("f_iu_"+k); if(el) db.settings.infrastructureUpkeep[k]=Math.max(0,Number(el.value||0)); });
 Object.keys(db.settings.edictCost).forEach(k=>{ const el=document.getElementById("f_ec_"+k); if(el) db.settings.edictCost[k]=Number(el.value||0); });
 Object.keys(db.settings.campaignCost).forEach(k=>{ const el=document.getElementById("f_cc_"+k); if(el) db.settings.campaignCost[k]=Number(el.value||0); });
 
 db.settings.images = db.settings.images || {};
 const imgKeys = ["piyade","suvari","nisanci","kucuk_top","orta_top","buyuk_top","kucuk_gemi","orta_gemi","buyuk_gemi","kucuk_liman","orta_liman","buyuk_liman","kucuk_ocak","orta_ocak","buyuk_ocak","okul","istihbarat_binasi","fortress","fortress_garrison","hastane","asevi","su_degirmeni","kervansaray","pazar"];
 imgKeys.forEach(k => {
     const el = document.getElementById("f_img_" + k);
     if(el) db.settings.images[k] = cleanUrl(el.value);
 });

 if(doClose){ closeModal(); queueSave(); if(currentId) openDetail(currentId); } else { queueSave(); openAdmin(); }
}

window.addEventListener("load",init);
