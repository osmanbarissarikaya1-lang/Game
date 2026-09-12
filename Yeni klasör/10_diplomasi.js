function hireAdvisor(stateId, advId) {
    const s = getState(stateId);
    const adv = (db.advisors||[]).find(a => a.id === advId);
    if(!s || !adv) return;
    
    s.hiredAdvisors = s.hiredAdvisors || [];
    const maxSlots = s.advisorSlots || 3;
    
    if(s.hiredAdvisors.length >= maxSlots) {
        alert(`Divan kontenjanınız dolu! (Maksimum ${maxSlots} üye seçebilirsiniz). Önce bir üyeyi azletmelisiniz.`);
        return;
    }

    if(s.hiredAdvisors.includes(advId)) return;

    if((s.treasury||0) < adv.salary) {
        alert(`Hazinede yeterli altın yok! ${adv.name} için ${money(adv.salary)} gerekli.`);
        return;
    }

    s.hiredAdvisors.push(advId);
    s.advisorHiredYears = s.advisorHiredYears || {};
    s.advisorHiredYears[advId] = 0; // 0 yıl (yani henüz 1 yılını doldurmadı, kilitli)
    
    const oldTreasury = s.treasury || 0;
    s.treasury = oldTreasury - adv.salary;

    addLog({
        stateId: s.id,
        stateName: s.name,
        action: `Divana Atandı: ${adv.name} (${adv.role})`,
        cost: adv.salary,
        qty: 1,
        oldTreasury: oldTreasury,
        newTreasury: s.treasury
    });

    queueSave();
    openDetail(stateId);
}

function fireAdvisor(stateId, advId) {
    const s = getState(stateId);
    const adv = (db.advisors||[]).find(a => a.id === advId);
    if(!s || !adv) return;
    
    s.advisorHiredYears = s.advisorHiredYears || {};
    const hiredYears = s.advisorHiredYears[advId] || 0;

    if(hiredYears < 1) {
        alert("Paşalar paşa sistemine göre en az 1 yıl çalışmak zorundadır! Aynı yıl içinde iade edemezsiniz.");
        return;
    }

    if(!confirm(`${adv.name} azledilsin (iade edilsin) mi?`)) return;

    s.hiredAdvisors = (s.hiredAdvisors || []).filter(id => id !== advId);
    delete s.advisorHiredYears[advId];
    
    addLog({
        stateId: s.id,
        stateName: s.name,
        action: `Divandan Azledildi / İade Edildi: ${adv.name}`,
        cost: 0,
        qty: 1
    });

    queueSave();
    openDetail(stateId);
}

// ---------------- ADMİN PARA GÖNDERME (HİBE) ----------------
function openAdminGrantModal(defaultStateId = null) {
    if(!isAdmin) return;
    const targetOpts = db.states.map(x => `
        <option value="${x.id}" ${defaultStateId === x.id ? 'selected' : ''}>${esc(x.name)} (Mevcut Hazine: ${money(x.treasury)})</option>
    `).join('');

    modal(`<h2>💸 ADMİN: HAZİNE HİBESİ / PARA GÖNDER</h2>
    <p class="sub" style="margin-bottom:12px;">Seçtiğiniz devletin kasasına doğrudan altın transfer edin. Bu işlem loglara yazılır.</p>
    <div class="formgrid">
        <div class="full"><label>Hedef Devlet</label><select id="grant_target">${targetOpts}</select></div>
        <div class="full"><label>Gönderilecek Tutar (TL)</label><input id="grant_amt" type="number" min="1" placeholder="Örn: 100000"></div>
        <div class="full"><label>Açıklama / Sebep</label><textarea id="grant_desc" placeholder="Örn: Venedik Seferi Savaş Desteği, Hazine Yardımı vb."></textarea></div>
        <div class="full actions" style="margin-top:12px;"><button class="btn" onclick="closeModal()">İPTAL</button><button class="btn green" onclick="executeAdminGrant()">PARAYI GÖNDER</button></div>
    </div>`);
}

function executeAdminGrant() {
    if(!isAdmin) return;
    const targetId = document.getElementById("grant_target").value;
    const target = getState(targetId);
    const amt = Math.floor(Number(document.getElementById("grant_amt").value) || 0);
    const desc = document.getElementById("grant_desc").value.trim() || "Genel Hazine Desteği";

    if(!target || amt <= 0) { alert("Geçerli bir tutar ve hedef devlet seçmelisiniz!"); return; }

    const oldT = target.treasury || 0;
    target.treasury = oldT + amt;

    addLog({
        stateId: target.id,
        stateName: target.name,
        action: `Admin Para Yardımı (${desc})`,
        cost: amt,
        qty: 1,
        oldTreasury: oldT,
        newTreasury: target.treasury
    });
    
    closeModal();
    queueSave();
    if(currentId) openDetail(currentId); else renderHome();
    alert(`Başarıyla ${target.name} hazinesine ${money(amt)} aktarıldı!`);
}

// ---------------- İSTİHBARAT ----------------
function runSpyIntel(myStateId) {
    const targetId = document.getElementById("intel_target").value;
    const type = document.getElementById("intel_type").value;
    const target = getState(targetId);
    if(!target) return;

    let realVal = 0;
    let label = "";

    if(type === 'treasury') { realVal = target.treasury || 0; label = "Hazine Rezervi"; }
    else if(type === 'piyade') { realVal = target.piyade || 0; label = "Piyade Gücü"; }
    else if(type === 'suvari') { realVal = target.suvari || 0; label = "Süvari Gücü"; }
    else if(type === 'nisanci') { realVal = target.nisanci || 0; label = "Nişancı Birlikleri"; }
    else if(type === 'guns') { realVal = (target.kucuk_top||0)+(target.orta_top||0)+(target.buyuk_top||0); label = "Toplam Topçu Bataryaları"; }
    else if(type === 'ships') { realVal = (target.kucuk_gemi||0)+(target.orta_gemi||0)+(target.buyuk_gemi||0); label = "Donanma Gemi Sayısı"; }
    else if(type === 'population') { realVal = target.population || 0; label = "Toplam Nüfus"; }
    else if(type === 'fortress_garrison') { realVal = target.fortressGarrison || 0; label = "Kale Garnizonu Asker Sayısı"; }

    const myState = getState(myStateId);
    const adv = getAdvisorEffects(myState);

    let estimatedVal = realVal;
    let reportNote = "* Sahadaki sis perdesi ve yanıltma taktikleri sebebiyle raporda %1-%20 arası sapma olabilir.";

    if(adv.spyAccuracyBonus) {
        estimatedVal = realVal;
        reportNote = "👑 Divanınızdaki Casus Başı sayesinde bilgi sarayın en derin odalarından net olarak çekildi (Sapma Yok).";
    } else {
        const deviationPercent = 0.01 + (Math.random() * 0.19);
        const direction = Math.random() < 0.5 ? -1 : 1;
        estimatedVal = Math.max(0, Math.round(realVal * (1 + (direction * deviationPercent))));
    }

    const resBox = document.getElementById("intel_result_box");
    resBox.innerHTML = `
    <div style="background:rgba(17, 20, 24, 0.75); border:1px solid var(--border-gold); padding:12px; border-radius:3px;">
        <div style="color:var(--border-gold); font-weight:bold; font-size:14px; margin-bottom:5px;">🕵️ CASUSLUK RAPORU: ${esc(target.name)}</div>
        <div style="font-size:13px; margin-bottom:4px;"><b>İstihbarat Konusu:</b> ${label}</div>
        <div style="font-size:16px; color:var(--green); font-weight:bold;">Tahmini Veri: ~${type === 'treasury' ? money(estimatedVal) : num(estimatedVal)}</div>
        <div class="sub" style="font-size:11px; margin-top:4px; color:var(--muted);">${reportNote}</div>
    </div>`;
}

// ---------------- MEKTUPLAR ----------------
function getLetterRecipients(excludeStateId=null){
 const recipients=[],seen=new Set();
 const add=(recipient)=>{
   const key=normalizeMapName(recipient.name||"");
   if(!key||seen.has(key))return;
   seen.add(key);recipients.push(recipient);
 };
 db.states.forEach(state=>{if(state.id!==excludeStateId)add({id:state.id,name:state.name,ruler:state.ruler||"Lider",type:"state"});});
 const mapCountries=new Map();
 Object.keys(db.mapProvinceOwners||{}).forEach(provinceId=>{
   const owner=getState(db.mapProvinceOwners[provinceId]);
   const detail=db.mapProvinceDetails?.[provinceId]||{};
   const name=detail.countryName||owner?.name||"";
   if(name)mapCountries.set(normalizeMapName(name),name);
 });
 Object.values(db.mapProvinceDetails||{}).forEach(detail=>{
   const name=detail?.countryName||"";
   if(name)mapCountries.set(normalizeMapName(name),name);
 });
 mapCountries.forEach((name,key)=>{
   if(!recipients.some(recipient=>normalizeMapName(recipient.name)===key))add({id:"map:"+key,name,ruler:"Harita Devleti",type:"map"});
 });
 return recipients.sort((a,b)=>a.name.localeCompare(b.name,"tr"));
}
function getLetterRecipientById(id,excludeStateId=null){
 return getLetterRecipients(excludeStateId).find(recipient=>recipient.id===id)||null;
}
function openLetterModal(fromStateId, defaultTargetId = null) {
 const isAdminLetter=fromStateId==="__admin__";
 const sender=isAdminLetter?null:getState(fromStateId);
 if(!isAdminLetter&&!sender)return;
 const recipients=getLetterRecipients(isAdminLetter?null:fromStateId);
 const targetOpts=recipients.map(recipient=>`<option value="${esc(recipient.id)}" ${defaultTargetId===recipient.id?'selected':''}>${esc(recipient.name)}${recipient.type==="map"?" (Harita Devleti)":" ("+esc(recipient.ruler||"Lider")+")"}</option>`).join("");
 if(!targetOpts){alert("Mektup gönderilebilecek bir devlet bulunamadı.");return;}
 const senderField=isAdminLetter
   ? `<div><label>Gönderici Başlığı / Unvanı</label><input id="letter_sender_title" type="text" value="Devlet Yönetim Paneli"></div>`
   : isAdmin
     ? `<div><label>Gönderici Başlığı / Unvanı</label><input id="letter_sender_title" type="text" value="Devlet-i Aliyye Divanı"></div>`
     : `<div><label>Gönderen</label><input id="letter_sender_title" type="text" value="${esc(sender.name)} (${esc(sender.ruler||"Hükümdar")})" readonly></div>`;
 const attachments=isAdminLetter?"":`<div id="letter_attachments" class="full"><h4 style="margin:8px 0 4px; color:var(--border-gold); font-family:'Oswald';">EKLER (Yalnızca devlet kartı olan alıcılara)</h4><div class="formgrid"><div><label>Altın Gönder (Mevcut: ${money(sender.treasury)})</label><input id="letter_gold" type="number" min="0" value="0"></div><div><label>Piyade Gönder (Mevcut: ${num(sender.piyade||0)})</label><input id="letter_piyade" type="number" min="0" value="0"></div><div><label>Süvari Gönder (Mevcut: ${num(sender.suvari||0)})</label><input id="letter_suvari" type="number" min="0" value="0"></div><div><label>Nişancı Gönder (Mevcut: ${num(sender.nisanci||0)})</label><input id="letter_nisanci" type="number" min="0" value="0"></div></div><p class="sub">Harita devleti seçildiğinde ek gönderilemez; yalnızca diplomatik mektup kaydedilir.</p></div>`;
 modal(`<h2>✉️ DİPLOMATİK MEKTUP</h2><div class="formgrid">${senderField}<div><label>Alıcı Devlet</label><select id="letter_target">${targetOpts}</select></div><div class="full"><label>Mühür / Logo URL (İsteğe Bağlı)</label><input id="letter_seal" type="text" placeholder="https://.../muhur.png"></div><div class="full"><label>Mektup Metni</label><textarea id="letter_body" placeholder="Hükümdara iletmek istediğiniz diplomatik mesaj..."></textarea></div>${attachments}<div class="full actions" style="margin-top:12px"><button class="btn" onclick="${isAdminLetter?'openAdminLetters()':'closeModal()'}">İPTAL</button><button class="btn gold" onclick="sendLetter('${fromStateId}')">ULAKLA GÖNDER</button></div></div>`);
}

function sendLetter(fromStateId) 
{
 const isAdminLetter=fromStateId==="__admin__";
 const sender=isAdminLetter?null:getState(fromStateId);
 if(!isAdminLetter&&!sender)return;
 const targetId=document.getElementById("letter_target")?.value||"";
 const recipient=getLetterRecipientById(targetId,isAdminLetter?null:fromStateId);
 if(!recipient)return;
 const target=recipient.type==="state"?getState(recipient.id):null;
 const senderTitle=document.getElementById("letter_sender_title")?.value.trim()||(isAdminLetter?"Devlet Yönetim Paneli":sender.name);
 const sealUrl=cleanUrl(document.getElementById("letter_seal")?.value||"");
 const content=document.getElementById("letter_body")?.value.trim()||"";
 if(!content){alert("Mektup metni boş olamaz!");return;}
 const gold=Math.max(0,Number(document.getElementById("letter_gold")?.value)||0);
 const piyade=Math.max(0,Number(document.getElementById("letter_piyade")?.value)||0);
 const suvari=Math.max(0,Number(document.getElementById("letter_suvari")?.value)||0);
 const nisanci=Math.max(0,Number(document.getElementById("letter_nisanci")?.value)||0);
 if(!target&&(gold||piyade||suvari||nisanci)){alert("Harita devletlerine yalnızca mektup gönderilebilir; altın veya birlik ekleyemezsin.");return;}
 if(sender&&!isAdmin){
   if(gold>sender.treasury){alert("Hazinenizde yeterli altın yok!");return;}
   if(piyade>(sender.piyade||0)){alert("Yeterli piyadeniz yok!");return;}
   if(suvari>(sender.suvari||0)){alert("Yeterli süvariniz yok!");return;}
   if(nisanci>(sender.nisanci||0)){alert("Yeterli nişancınız yok!");return;}
 }
 const oldSenderT=sender?.treasury||0,oldTargetT=target?.treasury||0,oldSenderP=sender?.piyade||0,oldTargetP=target?.piyade||0;
 if(sender&&target){
   if(gold>0){sender.treasury-=gold;target.treasury=(target.treasury||0)+gold;}
    if(piyade>0){sender.piyade=Math.max(0,(sender.piyade||0)-piyade);target.piyade=(target.piyade||0)+piyade; sender.population=Math.max(0,(sender.population||0)-piyade); target.population=(target.population||0)+piyade;}
    if(suvari>0){sender.suvari=Math.max(0,(sender.suvari||0)-suvari);target.suvari=(target.suvari||0)+suvari; sender.population=Math.max(0,(sender.population||0)-suvari); target.population=(target.population||0)+suvari;}
    if(nisanci>0){sender.nisanci=Math.max(0,(sender.nisanci||0)-nisanci);target.nisanci=(target.nisanci||0)+nisanci; sender.population=Math.max(0,(sender.population||0)-nisanci); target.population=(target.population||0)+nisanci;}
 }
 db.letters=db.letters||[];
 db.letters.unshift({id:crypto.randomUUID(),fromStateId:isAdminLetter?"__admin__":sender.id,fromStateName:isAdminLetter?"Devlet Yönetim Paneli":sender.name,senderTitle,toStateId:recipient.id,toStateName:recipient.name,toType:recipient.type,sealUrl,content,gold,piyade,suvari,nisanci,date:new Date().toLocaleDateString("tr-TR")+" "+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}),read:false});
 if(sender)addLog({stateId:sender.id,stateName:sender.name,action:`Mektup & Yardım Gönderildi -> ${recipient.name}`,cost:gold,qty:1,oldTreasury:oldSenderT,newTreasury:sender.treasury,unitName:piyade>0?"Piyade":(suvari>0?"Süvari":(nisanci>0?"Nişancı":"")),oldUnit:oldSenderP,newUnit:sender.piyade||0});
 if(target)addLog({stateId:target.id,stateName:target.name,action:`Mektup & Yardım Alındı <- ${isAdminLetter?"Yönetim Paneli":sender.name}`,cost:gold,qty:1,oldTreasury:oldTargetT,newTreasury:target.treasury,unitName:piyade>0?"Piyade":(suvari>0?"Süvari":(nisanci>0?"Nişancı":"")),oldUnit:oldTargetP,newUnit:target.piyade||0});
 queueSave();
 if(isAdminLetter){openAdminLetters();}else{closeModal();openDetail(sender.id);}
 toast(`Mektup ${recipient.name} için kaydedildi.`,true);
}

 
function openAdminLetters()
{
 if(!isAdmin)return;
 const letters=db.letters||[];
 const list=letters.length?letters.map(letter=>`<div class="letter-box"><div class="letter-head"><b>${esc(letter.fromStateName||"Bilinmeyen")} → ${esc(letter.toStateName||"Bilinmeyen")}</b><span class="sub">${esc(letter.date||"")}</span></div><div class="sub" style="margin-bottom:6px;">${esc(letter.senderTitle||"")}${letter.toType==="map"?" • Harita Devleti":""}</div><div style="white-space:pre-wrap;">${esc(letter.content||"")}</div>${letter.gold||letter.piyade||letter.suvari||letter.nisanci?`<div class="sub" style="margin-top:7px;">Ekler: ${money(letter.gold||0)} • Piyade ${num(letter.piyade||0)} • Süvari ${num(letter.suvari||0)} • Nişancı ${num(letter.nisanci||0)}</div>`:""}</div>`).join(""):"<p class='sub'>Henüz gönderilmiş mektup yok.</p>";
 modal(`<h2>✉️ TÜM MEKTUPLAR</h2><div class="actions" style="margin:8px 0 12px;"><button class="btn gold" onclick="openLetterModal('__admin__')">✉️ YENİ YÖNETİCİ MEKTUBU</button><button class="btn" onclick="openAdmin()">← AYARLARA DÖN</button></div><div style="max-height:65vh;overflow:auto;">${list}</div>`);
}


function deleteLetter(letterId, currentStateId) 
{
 if(!confirm("Bu mektubu posta kutunuzdan silmek istediğinize emin misiniz?"))return;
 const letter = db.letters.find(l => l.id === letterId);
 if(letter) {
   letter.deletedBy = letter.deletedBy || [];
   letter.deletedBy.push(currentStateId);
   // Eğer her iki taraf da sildiyse veya sileyen kişi adminse veritabanından tamamen uçur
   if((letter.deletedBy.includes(letter.fromStateId) && letter.deletedBy.includes(letter.toStateId)) || currentStateId === '__admin__') {
      db.letters = db.letters.filter(l => l.id !== letterId);
   }
 }
 queueSave();openDetail(currentStateId);
}

