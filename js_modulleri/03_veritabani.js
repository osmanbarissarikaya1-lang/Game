async function loadDB(silent = false){
 if(!silent) toast("Veriler yeni tablolardan yükleniyor…");
 if(!sb){toast("Supabase bağlantısı kurulamadı.");return}
 
 try {
   // 5 Tablodan da verileri aynı anda (çok hızlı) çekiyoruz
   const [coreRes, statesRes, advisorsRes, lettersRes, logsRes] = await Promise.all([
     sb.from('game_core').select('*').eq('id', 1).single(),
     sb.from('game_states').select('*'),
     sb.from('game_advisors').select('*'),
     sb.from('game_letters').select('*'),
     sb.from('game_logs').select('*').order('created_at', { ascending: false }).limit(300)
   ]);
   if(coreRes.error && coreRes.error.code !== "PGRST116") throw coreRes.error;
   const core = coreRes.data || {};
   
   // Tüm parçaları toplayıp eski "db" objemizi eskisi gibi birleştiriyoruz
   // Böylece arayüz kodlarınızın hiçbirini değiştirmeye gerek kalmıyor!
   db = {
     settings: normalizeSettings(core.settings || {}),
     gameYear: core.game_year || 1453,
     timerSeconds: core.timer_seconds || 0,
     timerRunning: core.timer_running || false,
     mapProvinceOwners: core.map_data?.mapProvinceOwners || {},
     mapProvinceDetails: core.map_data?.mapProvinceDetails || {},
     valuableRegions: core.map_data?.valuableRegions || {},
     pendingEvents: core.events_data?.pendingEvents || [],
     eventHistory: core.events_data?.eventHistory || [],
     states: statesRes.data ? statesRes.data.map(r => r.data) : [],
     advisors: advisorsRes.data ? advisorsRes.data.map(r => r.data) : [],
     letters: lettersRes.data ? lettersRes.data.map(r => r.data) : [],
     purchaseLog: logsRes.data ? logsRes.data.map(r => r.data) : []
   };
   // Varsayılan paşa ve ayar yüklemeleri (eskisi gibi)
   if(!db.advisors || db.advisors.length === 0) {
      db.advisors = structuredClone(DEFAULT_45_ADVISORS);
   } else {
      const existingIds = new Set(db.advisors.map(a => a.id));
      DEFAULT_45_ADVISORS.forEach(def => {
          if(!existingIds.has(def.id)) db.advisors.push(structuredClone(def));
      });
   }
   db.states.forEach(s => { 
      s.customLedger = s.customLedger || []; 
      s.permanentLedger = s.permanentLedger || [];
      s.rulerImage = cleanUrl(s.rulerImage || "");
      s.bgImage = cleanUrl(s.bgImage || "");
      s.hiredAdvisors = s.hiredAdvisors || [];
      s.advisorHiredYears = s.advisorHiredYears || {}; 
      s.advisorSlots = s.advisorSlots || 3;
   });
   dbBaseSnapshot = structuredClone(db);
   if(!silent) toast("Yeni Sistem Aktif", true);
   
   // ✅ Eski logları temizle (300'den fazlasını veritabanından sil)
   cleanupOldLogs();
 } catch(e) {
   toast("Yükleme hatası: " + e.message);
 }
}

async function cleanupOldLogs(){
 try{
   if(!sb || !db.purchaseLog || db.purchaseLog.length < 300) return;
   // En eski korunan logun tarihini al
   const oldestKept = db.purchaseLog[db.purchaseLog.length - 1];
   if(!oldestKept?.logId) return;
   // Bu logdan daha eski olanları veritabanından sil
   const { error } = await sb.from('game_logs')
     .delete()
     .lt('created_at', oldestKept.created_at || new Date(0).toISOString());
   if(!error) console.log("Eski loglar temizlendi.");
 }catch(e){ console.warn("Log temizleme hatası:", e); }
}
async function saveDB(){
 if(!sb)return false;
 if(saveInFlight){saveQueued=true;return false;}
 saveInFlight=true;
 
 // ✅ FIX: Snapshot'ı asenkron işlemler BAŞLAMADAN ÖNCE al.
 // Böylece Promise.all çalışırken db değişse bile, snapshot
 // yalnızca kaydetmeye başladığımız anın verilerini tutar.
 const snapshotBeforeSave = structuredClone(db);
 
 try{
   const promises = [];
   // 1. SADECE DEĞİŞEN DEVLETLERİ KAYDET
   db.states.forEach(s => {
       const baseState = dbBaseSnapshot.states.find(x => x.id === s.id);
       if(!baseState || !valuesEqual(s, baseState)){
           promises.push(sb.from('game_states').upsert({ id: s.id, name: s.name, owner_email: s.ownerEmail, data: s }));
       }
   });
   dbBaseSnapshot.states.forEach(baseState => {
       if(!db.states.find(x => x.id === baseState.id)){
           promises.push(sb.from('game_states').delete().eq('id', baseState.id));
       }
   });
   // 2. SADECE DEĞİŞEN PAŞALARI KAYDET
   db.advisors.forEach(a => {
       const baseAdv = dbBaseSnapshot.advisors.find(x => x.id === a.id);
       if(!baseAdv || !valuesEqual(a, baseAdv)){
           promises.push(sb.from('game_advisors').upsert({ id: a.id, data: a })); 
       }
   });
   dbBaseSnapshot.advisors.forEach(baseAdv => {
       if(!db.advisors.find(x => x.id === baseAdv.id)){
           promises.push(sb.from('game_advisors').delete().eq('id', baseAdv.id));
       }
   });
   // 3. SADECE DEĞİŞEN MEKTUPLARI KAYDET
   db.letters.forEach(l => {
       const baseLetter = dbBaseSnapshot.letters.find(x => x.id === l.id);
       if(!baseLetter || !valuesEqual(l, baseLetter)){
           promises.push(sb.from('game_letters').upsert({ id: l.id, to_state_id: l.toStateId, from_state_id: l.fromStateId, read: l.read, data: l }));
       }
   });
   dbBaseSnapshot.letters.forEach(baseLetter => {
       if(!db.letters.find(x => x.id === baseLetter.id)){
           promises.push(sb.from('game_letters').delete().eq('id', baseLetter.id));
       }
   });
   // 4. SADECE YENİ EKLENEN LOGLARI KAYDET
   db.purchaseLog.forEach(log => {
       const baseLog = dbBaseSnapshot.purchaseLog.find(x => x.logId === log.logId);
       if(!baseLog){
           promises.push(sb.from('game_logs').insert({ id: log.logId, state_id: log.stateId, log_type: log.logType||'purchase', data: log }));
       }
   });
   // 5. MERKEZ (CORE) DEĞİŞİKLİKLERİ
   const coreChanged = 
       db.gameYear !== dbBaseSnapshot.gameYear ||
       db.timerSeconds !== dbBaseSnapshot.timerSeconds ||
       db.timerRunning !== dbBaseSnapshot.timerRunning ||
       !valuesEqual(db.settings, dbBaseSnapshot.settings) ||
       !valuesEqual(db.mapProvinceOwners, dbBaseSnapshot.mapProvinceOwners) ||
       !valuesEqual(db.mapProvinceDetails, dbBaseSnapshot.mapProvinceDetails) ||
       !valuesEqual(db.valuableRegions, dbBaseSnapshot.valuableRegions) ||
       !valuesEqual(db.pendingEvents, dbBaseSnapshot.pendingEvents) ||
       !valuesEqual(db.eventHistory, dbBaseSnapshot.eventHistory);
   if(coreChanged){
       const coreData = {
           game_year: db.gameYear,
           timer_seconds: db.timerSeconds,
           timer_running: db.timerRunning,
           settings: db.settings,
           map_data: {
               mapProvinceOwners: db.mapProvinceOwners,
               mapProvinceDetails: db.mapProvinceDetails,
               valuableRegions: db.valuableRegions
           },
           events_data: {
               pendingEvents: db.pendingEvents,
               eventHistory: db.eventHistory
           }
       };
       promises.push(sb.from('game_core').update(coreData).eq('id', 1));
   }
   // Çakışma olmadan paralelde tüm güncellemeleri saniyeler içinde yolla!
   if(promises.length > 0){
       await Promise.all(promises);
       toast("Kaydedildi " + new Date().toLocaleTimeString("tr-TR"), true);
   }
   // ✅ FIX: Kayıt başarılı olduktan sonra, save BAŞLAMADAN önceki
   // snapshot'ı kullan — save sırasında db'ye yapılan değişiklikler
   // bir sonraki save'de doğru şekilde tespit edilecek.
   dbBaseSnapshot = snapshotBeforeSave;
   return true;
 }catch(error){
   console.error(error);
   toast("Kayıt hatası: "+(error.message||error));
   return false;
 }finally{
   saveInFlight=false;
   if(saveQueued){saveQueued=false;queueSave();}
 }
}
function setupGameRealtime(){
 if(!sb||gameSyncChannel)return;
 
 // Yeni tabloların HERHANGİ birinde değişiklik olursa tetiklenir
 gameSyncChannel = sb.channel('game-sync-channel')
   .on('postgres_changes', { event: '*', schema: 'public', table: 'game_states' }, handleRealtimeUpdate)
   .on('postgres_changes', { event: '*', schema: 'public', table: 'game_core' }, handleRealtimeUpdate)
   .on('postgres_changes', { event: '*', schema: 'public', table: 'game_letters' }, handleRealtimeUpdate)
   .on('postgres_changes', { event: '*', schema: 'public', table: 'game_advisors' }, handleRealtimeUpdate)
   .subscribe();
}

 
async function handleRealtimeUpdate(payload) 
{
   if(document.getElementById('modal')?.classList.contains('show')) return;
   
   if(valuesEqual(db, dbBaseSnapshot)){
     const oldYear = dbBaseSnapshot.gameYear;
     const activeTab = document.querySelector('.hoi-tab.active')?.id?.replace('tab-btn-', '');
     const scrollTop = window.scrollY;
     
     await loadDB(true); 
     
     // YIL GEÇTİYSE DİĞER OYUNCULARA DA RAPORU OTOMATİK GÖSTER!
     if(db.gameYear > oldYear && !isAdmin) {
         showYearReportModal();
     } else if (!document.getElementById('mapScreen')?.classList.contains('hidden')) {
         if(typeof applyMapOwnership === 'function') applyMapOwnership();
     } else if(currentId) {
         openDetail(currentId); 
         if(activeTab) { switchTab(activeTab); window.scrollTo(0, scrollTop); }
     } else {
         renderHome();
     }
   }
   else {
     // Yerelde kaydedilmemiş değişiklikler var. 3-Way Merge ile birleştir!
     const oldDb = structuredClone(db);
     const oldYear = dbBaseSnapshot.gameYear;
     const activeTab = document.querySelector('.hoi-tab.active')?.id?.replace('tab-btn-', '');
     const scrollTop = window.scrollY;
     
     await loadDB(true);
     
     let conflicts = [];
     db = mergeStateThreeWay(dbBaseSnapshot, oldDb, db, "root", conflicts);
     dbBaseSnapshot = structuredClone(db);
     
     if(db.gameYear > oldYear && !isAdmin) {
         showYearReportModal();
     } else if (!document.getElementById('mapScreen')?.classList.contains('hidden')) {
         if(typeof applyMapOwnership === 'function') applyMapOwnership();
     } else if(currentId) {
         openDetail(currentId); 
         if(activeTab) { switchTab(activeTab); window.scrollTo(0, scrollTop); }
     } else {
         renderHome();
     }
   }
}
 
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveDB,250)}

async function saveMapDB()
{
 const ok=await saveDB();
 if(ok)mapSyncChannel?.postMessage({type:"map-saved",owners:structuredClone(db.mapProvinceOwners||{}),details:structuredClone(db.mapProvinceDetails||{}),valuableRegions:structuredClone(db.valuableRegions||{})});
 return ok;
}

function queueMapSave(){mapSavePending=true;clearTimeout(mapSaveTimer);mapSaveTimer=setTimeout(()=>{mapSavePending=false;saveMapDB();},250)}

const MAP_TURKISH_NAMES = {"Achaea":"Achaia","Adana":"Adana","Aden":"Aden","Agadir":"Agadir","Ajlun":"Ajlun","Aksaray":"Aksaray","Aleppo":"Halep","Alexandria":"İskenderiye","Ankara":"Ankara","Ancona":"Ankona","Antioch":"Antakya","Arbil":"Erbil","Ardabil":"Erdebil","Ardalan":"Erdelan","Ardakan":"Ardakan","Aydin":"Aydın","Baghdad":"Bağdat","Bursa":"Bursa","Cairo":"Kahire","Constantinople":"Konstantiniyye (İstanbul)","Damascus":"Şam","Edirne":"Edirne","Isfahan":"İsfahan","Jerusalem":"Kudüs","Konya":"Konya","Mecca":"Mekke","Medina":"Medine","Mosul":"Musul","Sivas":"Sivas","Tabriz":"Tebriz","Trebizond":"Trabzon","Urfa":"Urfa","Basra":"Basra","Smyrna":"İzmir","Smyrna/İzmir":"İzmir","Belgrade":"Belgrad","Gallipoli":"Gelibolu","Rhodes":"Rodos","Chios":"Sakız","Tunis":"Tunus","Karbala":"Kerbela","Najaf":"Necef","Trabzon":"Trabzon","Tokat":"Tokat","Kayseri":"Kayseri","Diyarbakir":"Diyarbakır","Damietta":"Dimyat","Suez":"Süveyş","Jeddah":"Cidde","Aqaba":"Akabe","Muscat":"Maskat","Hormuz":"Hürmüz","Kabul":"Kabil","Kandahar":"Kandahar","Samarkand":"Semerkant","Bukhara":"Buhara","Kashgar":"Kaşgar","Lahore":"Lahor","Multan":"Multan","Shiraz":"Şiraz","Yazd":"Yezd","Kerman":"Kirman","Kashan":"Kaşan","Herat":"Herat","Amasya":"Amasya","Hüdavendigar":"Hüdavendigar"};

