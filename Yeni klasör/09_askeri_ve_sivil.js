function buyBulk(id,key, labelName)
{
   const s=getState(id);
 if(!s) return;
 if(!isAdmin && s.ownerEmail !== currentUserEmail) return; 
 if(rejectDebtPurchase(s))return;
 
 const basePrice=db.settings.prices[key]||0;
 const adv = getAdvisorEffects(s);
 const disc = key.includes("liman") || key.includes("ocak") || key === "okul" || key === "istihbarat_binasi" ? adv.infraDiscount : adv.recruitDiscount;
 const price = Math.max(1, Math.round(basePrice * (1 - (disc / 100))));
 const qty = Math.floor(Number(document.getElementById(`qty_${id}_${key}`).value)) || 0;
 if(qty <= 0) { alert("⛔ Hata: Sıfır veya eksi bir değer giremezsiniz!"); return; } // EKSİ SAYI KORUMASI
 
 // OKUL İÇİN TOPRAK KOTASI KONTROLÜ
 if(key === "okul") {
     const ownedCount = getOwnedMapProvinceIds(id).length;
     const oldCount = s[key] || 0;
     if((oldCount + qty) > ownedCount) {
         alert(`⛔ KOTA DOLU: Haritadaki toprak sayınız kadar (${ownedCount} adet) Okul inşa edebilirsiniz! Önce yeni topraklar fethedin.`);
         return;
     }
 }
 
 const totalCost = price * qty;
 if(s.treasury<totalCost){alert(`Hazine yetersiz! Toplam maliyet: ${money(totalCost)}`);return}
 const p = calcPop(s);
 if(["piyade","suvari","nisanci"].includes(key) && p.elig < qty){alert("Elverişli nüfus yetersiz!");return}
 if(key.includes("gemi") && (shipCapacity(s) + qty) > shipCapMax(s)){alert("Limanda boş kapasite yok.");return}
 if(key.includes("top") && (gunCapacity(s) + qty) > gunCapMax(s)){alert("Top ocağında boş kapasite yok.");return}
 
 const oldT = s.treasury;
 const oldUnitCount = s[key] || 0;
 
 s.treasury -= totalCost; 
 s[key] = oldUnitCount + qty;
 if(key==="okul") {
   const currentEducated = calcPop(s).edu;
   const capacity = Math.max(0, Math.floor(Number(db.settings.schoolCapacityPerBuilding)||0));
   s.educatedPopulation = Math.min(Math.max(0, Number(s.population)||0), currentEducated + (capacity * qty));
   s.education = Math.max(0, Math.min(100, (s.educatedPopulation / Math.max(1, Number(s.population)||0)) * 100));
 }
 
 addLog({
     stateId: s.id,
     stateName: s.name,
     action: `Birim Üretimi: ${labelName}`,
     cost: totalCost,
     qty: qty,
     oldTreasury: oldT,
     newTreasury: s.treasury,
     unitName: labelName,
     oldUnit: oldUnitCount,
     newUnit: s[key]
 });
 queueSave(); openDetail(id);
}

function buyCustomBulk(id, itemId, labelName){
 const s = getState(id);
 if(!isAdmin && s.ownerEmail !== currentUserEmail) return; 
 if(rejectDebtPurchase(s))return;
 const item = (db.settings.customItems||[]).find(x=>x.id===itemId);
 if(!item) return;
 
 const adv = getAdvisorEffects(s);
 const disc = item.category === 'asker' ? adv.recruitDiscount : adv.infraDiscount;
 const price = Math.max(1, Math.round(item.price * (1 - (disc / 100))));

 const qty = Math.floor(Number(document.getElementById(`qty_${id}_${itemId}`).value)) || 0;
 if(qty <= 0) return;
 const totalCost = price * qty;
 if(s.treasury < totalCost){alert(`Hazine yetersiz! Gerekli: ${money(totalCost)}`);return;}
 const p = calcPop(s);
 if(item.category === 'asker' && p.elig < qty){alert("Elverişli nüfus yetersiz!"); return;}
 
 const oldT = s.treasury;
 const oldUnitCount = s[item.id] || 0;

 s.treasury -= totalCost; 
 s[item.id] = oldUnitCount + qty;

 addLog({
     stateId: s.id,
     stateName: s.name,
     action: `Özel Birim Üretimi: ${labelName}`,
     cost: totalCost,
     qty: qty,
     oldTreasury: oldT,
     newTreasury: s.treasury,
     unitName: labelName,
     oldUnit: oldUnitCount,
     newUnit: s[item.id]
 });

 queueSave(); openDetail(id);
}

function calcCampCost(id) {
    const s = getState(id);
    let total = 0;
    document.querySelectorAll('input[id^="camp_"]').forEach(el => {
        let k = el.id.replace('camp_','');
        let val = Number(el.value) || 0;
        let max = Number(el.max) || 0;
        if(val > max) { val = max; el.value = max; }
        if(val < 0) { val = 0; el.value = 0; }
        let cost = (db.settings.campaignCost||{})[k] !== undefined ? (db.settings.campaignCost||{})[k] : ((db.settings.customItems||[]).find(x=>x.id===k)?.campCost || 0);
        total += val * cost;
    });
    document.getElementById('campTotalCost').innerHTML = money(total);
}
function openCampaign(id) {
    const s = getState(id);
    const cc = db.settings.campaignCost || {};
    const units = [
        {key: 'piyade', label: 'Piyade', max: s.piyade||0, cost: cc.piyade||0},
        {key: 'suvari', label: 'Süvari', max: s.suvari||0, cost: cc.suvari||0},
        {key: 'nisanci', label: 'Nişancı', max: s.nisanci||0, cost: cc.nisanci||0},
        {key: 'kucuk_top', label: 'Küçük Top', max: s.kucuk_top||0, cost: cc.kucuk_top||0},
        {key: 'orta_top', label: 'Orta Top', max: s.orta_top||0, cost: cc.orta_top||0},
        {key: 'buyuk_top', label: 'Büyük Top', max: s.buyuk_top||0, cost: cc.buyuk_top||0}
    ];
    if(db.settings.customItems) {
        db.settings.customItems.forEach(ci => { if(ci.category === 'asker' && (!ci.faction || ci.faction === s.id)) units.push({ key: ci.id, label: ci.name, max: s[ci.id] || 0, cost: ci.campCost || 0 }); });
    }
    let html = `<h2>⚔️ SEFER LOJİSTİĞİ</h2><p class="sub">Ordunuzu sefere çıkarmak için gereken ikmal masrafı peşin ödenir.</p><div class="cards" style="margin-bottom:12px; max-height:40vh; overflow:auto;">`;
    units.forEach(u => {
        html += `<div class="list-item" style="flex-direction:column; align-items:flex-start;">
            <div style="width:100%; display:flex; justify-content:space-between; margin-bottom:4px;"><b>${u.label}</b><span style="color:var(--gold)">${money(u.cost)}/ad</span></div>
            <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                <span class="sub">Mevcut: ${num(u.max)}</span>
                <input type="number" id="camp_${u.key}" min="0" max="${u.max}" value="0" style="width:70px;" oninput="calcCampCost('${id}')">
            </div>
        </div>`;
    });
    html += `</div><div style="background:rgba(10, 12, 14, 0.6); padding:10px; border-radius:3px; text-align:center; font-size:16px; border:1px solid var(--border-gold);">
        Toplam İkmal: <b id="campTotalCost" style="color:var(--gold)">0 TL</b></div>
    <div class="actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn red" style="flex:1; font-weight:bold;" onclick="startCampaign('${id}')">SEFERİ BAŞLAT</button></div>`;
    modal(html);
}
function startCampaign(id) {
    const s = getState(id);
    let total = 0; let details = [];
    document.querySelectorAll('input[id^="camp_"]').forEach(el => {
        let k = el.id.replace('camp_','');
        let val = Number(el.value) || 0;
        if(val > 0) {
            let cost = (db.settings.campaignCost||{})[k] !== undefined ? (db.settings.campaignCost||{})[k] : ((db.settings.customItems||[]).find(x=>x.id===k)?.campCost || 0);
            let name = (db.settings.campaignCost||{})[k] !== undefined ? k.replace('_',' ') : ((db.settings.customItems||[]).find(x=>x.id===k)?.name);
            total += val * cost; details.push(`${num(val)} ${name}`); 
        }
    });
    if(total <= 0) return;
    if(s.treasury < total) { alert("Hazine yetersiz! Gerekli: " + money(total)); return; }
    
    const oldT = s.treasury;
    s.treasury -= total;
    
    addLog({
        stateId: s.id,
        stateName: s.name,
        action: `Sefer Ordusu İkmali (${details.join(', ')})`,
        cost: total,
        qty: 1,
        oldTreasury: oldT,
        newTreasury: s.treasury
    });

    closeModal(); queueSave(); openDetail(id);
}

// ---------------- DEVLET FORMU (DİVAN KOTASI AYARLI) ----------------
