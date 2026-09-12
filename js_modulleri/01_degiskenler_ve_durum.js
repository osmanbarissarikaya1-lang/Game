let currentUserEmail = null;
let isAdmin = false;

const SUPABASE_URL=String(window.SUPABASE_URL||"").trim();
const SUPABASE_KEY=String(window.SUPABASE_KEY||"").trim();
let sb=null;
let db={states:[],settings:null,transfers:[], purchaseLog:[], letters:[], advisors:[], timerSeconds:0, timerRunning:false, gameYear:1453, pendingEvents:[], eventHistory:[]}, currentId=null, authMode="login", saveTimer=null, mapSaveTimer=null, mapSavePending=false, globalClockInterval=null;
let dbBaseSnapshot=null, dbServerRevision=1, saveInFlight=false, saveQueued=false, gameSyncChannel=null;
let mapSvgCache="",mapConfigCache=null,eventAssetCache=null,mapZoom=5,mapBrush=null,mapPickerMode=false,mapBatch=null,mapBatchSelection=new Set(),mapStrategicView=false;
const mapSyncChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('osmoyun-map-v57'):null;
mapSyncChannel?.addEventListener('message',event=>{const payload=event.data;if(!payload||payload.type!=='map-saved')return;db.mapProvinceOwners=payload.owners||{};db.mapProvinceDetails=payload.details||{};db.valuableRegions=payload.valuableRegions||db.valuableRegions||{};db.mapOwnershipInitialized=true;if(typeof refreshMapFortressCounts==='function')refreshMapFortressCounts();if(document.getElementById('gameMapCanvas')&&typeof applyMapOwnership==='function')applyMapOwnership();});

// 45 ÖZGÜN ADAY LİSTESİ (ÖMür ve Yıldız Sistemli)
