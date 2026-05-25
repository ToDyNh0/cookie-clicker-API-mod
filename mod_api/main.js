(function(){"use strict";

var PORT=8000,MAX_LOGS=300,_logs=[],_panelOpen=false,_panelEl=null,_logAreaEl=null,_statusEl=null;
var _paused=false,_backoffUntil=0,_pauseBtn=null,_needSlowRebuild=false;
var _lastSlowState={};

// Mapeamento: nome da API → chave real no Game.prefs (e se é invertida)
var PREF_MAP={
  fancy:{key:"fancy",inv:false},filters:{key:"filters",inv:false},milk:{key:"milk",inv:false},
  cursors:{key:"cursors",inv:false},particles:{key:"particles",inv:false},numbers:{key:"numbers",inv:false},
  wobbly:{key:"wobbly",inv:false},animate:{key:"animate",inv:false},crates:{key:"crates",inv:false},
  monospace:{key:"monospace",inv:false},cookiesound:{key:"cookiesound",inv:false},
  format:{key:"format",inv:false},warn:{key:"warn",inv:false},focus:{key:"focus",inv:false},
  extraButtons:{key:"extraButtons",inv:false},lumpConfirm:{key:"askLumps",inv:false},
  screenReader:{key:"screenreader",inv:false},fastNotes:{key:"notifs",inv:false},
  scary:{key:"notScary",inv:true},customGrandmas:{key:"customGrandmas",inv:false},
  autosave:{key:"autosave",inv:false},timeout:{key:"timeout",inv:false},
  cloudSave:{key:"cloudSave",inv:false},bgMusic:{key:"bgMusic",inv:false},
  fullscreen:{key:"fullscreen",inv:false},discordPresence:{key:"discordPresence",inv:false}
};

function log(lv,msg){
  var e={t:new Date().toLocaleTimeString("pt-BR"),level:lv,msg:String(msg)};
  _logs.push(e);if(_logs.length>MAX_LOGS)_logs.shift();
  if(lv==="error")console.error("[API] "+msg);
  else if(lv==="warn")console.warn("[API] "+msg);
  else console.log("[API] "+msg);
  if(_panelOpen&&_logAreaEl)_appendLog(e);
}
function _esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function _appendLog(e){
  var c={info:"#90ee90",warn:"#f5e642",error:"#ff6b6b"};
  var d=document.createElement("div");
  d.style.cssText="padding:2px 0;border-bottom:1px solid #111;word-break:break-all";
  d.innerHTML="<span style='color:#555'>["+e.t+"]</span> <span style='color:"+(c[e.level]||"#ccc")+"'>"+_esc(e.msg)+"</span>";
  _logAreaEl.appendChild(d);_logAreaEl.scrollTop=_logAreaEl.scrollHeight;
}
function _renderLogs(){if(!_logAreaEl)return;_logAreaEl.innerHTML="";_logs.forEach(_appendLog);_logAreaEl.scrollTop=_logAreaEl.scrollHeight;}
function setStatus(ok,msg){if(!_statusEl)return;_statusEl.textContent=msg;_statusEl.style.background=ok?"#1a3a1a":"#3a1a1a";_statusEl.style.color=ok?"#2d9e54":"#ff6b6b";}

function createPanel(){
  var btn=document.createElement("div");
  btn.id="cookiebridge-toggle";btn.textContent="API";
  btn.style.cssText="position:fixed;bottom:60px;right:10px;z-index:999999;background:#1a1a2e;color:#f5e642;border:2px solid #f5e642;border-radius:6px;padding:5px 13px;cursor:pointer;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;user-select:none";
  btn.addEventListener("click",function(){
    _panelOpen=!_panelOpen;
    _panelEl.style.display=_panelOpen?"flex":"none";
    btn.style.background=_panelOpen?"#f5e642":"#1a1a2e";
    btn.style.color=_panelOpen?"#1a1a2e":"#f5e642";
    if(_panelOpen)_renderLogs();
  });
  document.body.appendChild(btn);

  var panel=document.createElement("div");
  panel.id="cookiebridge-panel";
  panel.style.cssText="position:fixed;bottom:100px;right:10px;z-index:999998;width:430px;max-height:360px;background:#0d0d1a;border:2px solid #f5e642;border-radius:8px;font-family:monospace;font-size:12px;display:none;flex-direction:column;box-shadow:0 4px 24px rgba(0,0,0,0.8)";

  var hdr=document.createElement("div");
  hdr.style.cssText="background:#1a1a2e;padding:8px 12px;color:#f5e642;font-weight:bold;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;flex-shrink:0";
  var ttl=document.createElement("span");ttl.textContent="Cookie Bridge v2";
  var sbadge=document.createElement("span");
  sbadge.style.cssText="font-size:11px;padding:2px 9px;border-radius:3px;background:#222;color:#888";
  sbadge.textContent="iniciando...";_statusEl=sbadge;
  hdr.appendChild(ttl);hdr.appendChild(sbadge);

  var tbar=document.createElement("div");
  tbar.style.cssText="background:#111;padding:5px 8px;border-bottom:1px solid #222;display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;align-items:center";

  function mkBtn(label,fn){
    var b=document.createElement("button");b.textContent=label;
    b.style.cssText="background:#1a1a2e;color:#ccc;border:1px solid #444;border-radius:3px;padding:3px 9px;cursor:pointer;font-size:11px;font-family:monospace";
    b.addEventListener("click",fn);return b;
  }

  tbar.appendChild(mkBtn("Limpar",function(){_logs=[];if(_logAreaEl)_logAreaEl.innerHTML="";}));

  // Pausar / Retomar loop de fetch
  _pauseBtn=mkBtn("Pausar",function(){
    _paused=!_paused;
    _pauseBtn.textContent=_paused?"Retomar":"Pausar";
    _pauseBtn.style.color=_paused?"#ff6b6b":"#ccc";
    if(!_paused)_backoffUntil=0;
    setStatus(!_paused,_paused?"pausado":"ativo");
    log("info",_paused?"API pausada.":"API retomada.");
  });
  tbar.appendChild(_pauseBtn);

  tbar.appendChild(mkBtn("Ping",function(){
    fetch("http://localhost:"+PORT+"/").then(function(r){return r.json();})
    .then(function(d){log("info","Ping OK · jogo="+d.jogo_conectado+" · bakery="+d.confeitaria);})
    .catch(function(e){log("error","Ping: "+e.message);});
  }));

  tbar.appendChild(mkBtn("State",function(){
    fetch("http://localhost:"+PORT+"/state").then(function(r){return r.json();})
    .then(function(d){log("info","cookies="+d.cookies_na_conta+" · cps="+d.cookies_por_segundo);})
    .catch(function(e){log("error","State: "+e.message);});
  }));

  tbar.appendChild(mkBtn("Fila",function(){
    fetch("http://localhost:"+PORT+"/action/queue").then(function(r){return r.json();})
    .then(function(d){log("info","Fila: "+d.total+" ação(ões) pendente(s)");})
    .catch(function(e){log("error","Fila: "+e.message);});
  }));

  tbar.appendChild(mkBtn("Wrink",function(){
    var ws=(Game.wrinklers||[]).filter(function(w){return w.phase>0;});
    log("info","Wrinklers: "+ws.length+" ativos · sucked="+ws.reduce(function(a,w){return a+w.sucked;},0).toFixed(0));
  }));

  // Copia o state atual para a área de transferência (útil para depuração offline)
  tbar.appendChild(mkBtn("Copiar",function(){
    var state=buildState();
    navigator.clipboard.writeText(JSON.stringify(state,null,2)).then(function(){
      log("info","State copiado para a área de transferência!");
    }).catch(function(err){
      log("error","Erro ao copiar: "+err);
    });
  }));

  // Input de porta (salvo/restaurado via save/load do mod)
  var portLabel=document.createElement("span");
  portLabel.textContent="Porta:";
  portLabel.style.cssText="color:#888;font-size:10px;white-space:nowrap";
  var portInput=document.createElement("input");
  portInput.id="cookiebridge-port-input";
  portInput.type="text";portInput.value=PORT;
  portInput.style.cssText="width:50px;background:#1a1a2e;color:#ccc;border:1px solid #333;border-radius:3px;padding:2px 5px;font-size:11px;font-family:monospace";
  portInput.addEventListener("change",function(){
    var np=parseInt(portInput.value,10);
    if(!isNaN(np)&&np>0&&np<65536){
      PORT=np;
      ft.innerHTML="<a href='http://localhost:"+PORT+"/docs' target='_blank' style='color:#5bc8f5'>Swagger UI</a> &nbsp;|&nbsp; porta "+PORT;
      log("info","Porta alterada para "+PORT+". Salve o jogo para persistir.");
    } else {
      portInput.value=PORT;
      log("warn","Porta inválida (1–65535).");
    }
  });
  tbar.appendChild(portLabel);
  tbar.appendChild(portInput);

  var la=document.createElement("div");
  la.style.cssText="overflow-y:auto;flex:1;padding:8px 10px;color:#ccc;min-height:80px";
  _logAreaEl=la;

  // var ft é usado no closure acima; declarado aqui, já está disponível quando o handler rodar
  var ft=document.createElement("div");
  ft.style.cssText="background:#111;padding:4px 10px;border-top:1px solid #222;color:#555;font-size:11px;flex-shrink:0";
  ft.innerHTML="<a href='http://localhost:"+PORT+"/docs' target='_blank' style='color:#5bc8f5'>Swagger UI</a> &nbsp;|&nbsp; porta "+PORT;

  panel.appendChild(hdr);panel.appendChild(tbar);panel.appendChild(la);panel.appendChild(ft);
  document.body.appendChild(panel);_panelEl=panel;
}

// ─── Estado rápido: campos que mudam a cada ~500ms ─────────────────────────
function buildFastState(){
  var buffsAtivos={};
  Object.keys(Game.buffs||{}).forEach(function(k){
    var b=Game.buffs[k];
    if(b&&b.time)buffsAtivos[k]={timeLeft:b.time,multCpS:b.multCpS||1,multClick:b.multClick||1};
  });
  var shimmers=(Game.shimmers||[]).map(function(s,i){
    return{index:i,type:s.type||"golden",timeLeft:s.life||0,
      pos_x:s.pos?s.pos[0]:null,pos_y:s.pos?s.pos[1]:null};
  });
  var sl={disponiveis:Game.lumps||0,tipo_crescendo:Game.lumpCurrentType||null,tempo_para_maduro_ms:null};
  if(Game.lumpRipeAge&&Game.lumpT)sl.tempo_para_maduro_ms=Math.max(0,Game.lumpRipeAge-(Date.now()-Game.lumpT));
  var wrinklers=(Game.wrinklers||[]).map(function(w,i){
    return{id:i,phase:w.phase||0,sucked:w.sucked||0,type:w.type||0,hp:w.hp||0,close:w.close||0};
  });
  return{
    timestamp:Date.now(),
    bakery_name:Game.bakeryName||"Unknown",
    cookies_na_conta:Game.cookies||0,
    cookies_por_segundo:Game.globalCookiesPs||0,
    cookies_por_segundo_raw:Game.cookiesPsRaw||Game.globalCookiesPs||0,
    cookies_por_click:Game.computedMouseCps||0,
    estatisticas:{
      total_cookies_ganhos:Game.cookiesEarned||0,total_cookies_reset:Game.cookiesReset||0,
      total_cliques:Game.cookieClicks||0,cookies_manuais:Game.handmadeCookies||0,
      cookies_com_wrinklers:Game.cookiesSucked||0,
      ascensoes:Game.resets||0,prestige:Game.prestige||0,
      heavenly_chips:Game.heavenlyChips||0,heavenly_chips_gastos:Game.heavenlyChipsSpent||0,
      fps:Game.fps||30,estacao:Game.season||"none",versao_jogo:Game.version||"?",nivel_dragao:Game.dragonLevel||0
    },
    buffs_ativos:buffsAtivos,
    shimmers:shimmers,
    sugar_lumps:sl,
    wrinklers:wrinklers,
    estacao_ativa:{nome:Game.season||"",tempo_restante_frames:Game.seasonT||0,usos:Game.seasonUses||0},
    volume:{sfx:Game.volume!==undefined?Game.volume:75,music:Game.volumeMusic!==undefined?Game.volumeMusic:50}
  };
}

// ─── Estado lento: campos caros que mudam raramente ────────────────────────
// Reconstruído a cada ~5s (10 polls × 15 frames) ou logo após qualquer ação.
function buildSlowState(){
  function bp(obj,n){var t=0;for(var i=0;i<n;i++)t+=obj.basePrice*Math.pow(1.15,obj.amount+i);return Math.ceil(t);}
  function sp(obj,n){var t=0;for(var i=0;i<n;i++)t+=obj.basePrice*Math.pow(1.15,obj.amount-1-i)*0.2875;return Math.floor(Math.max(t,0));}

  var buildings=(Game.ObjectsById||[]).map(function(o){
    return{id:o.id,name:o.name,amount:o.amount,level:o.level||0,baseCps:o.baseCps,
      totalCookiesPushed:o.totalCookiesPushed||0,locked:!!o.locked,muted:!!o.muted,
      has_minigame:!!(o.minigame),
      buy_price_1:bp(o,1),buy_price_10:bp(o,10),buy_price_100:bp(o,100),
      sell_price_1:sp(o,1),sell_price_10:sp(o,10),sell_price_100:sp(o,100)};
  });
  var upgradesInStore=(Game.UpgradesInStore||[]).map(function(u){
    var p=u.getPrice?u.getPrice():u.basePrice;
    return{id:u.id,name:u.name,price:p,pool:u.pool||"tech",description:u.desc||"",canAfford:Game.cookies>=p,icon:u.icon||[0,0]};
  });
  var upgradesBought=Object.values(Game.Upgrades||{}).filter(function(u){return u.bought;}).map(function(u){return{id:u.id,name:u.name,pool:u.pool||""};});
  var achievements=Object.values(Game.Achievements||{}).map(function(a){return{id:a.id,name:a.name,won:!!a.won,pool:a.pool||""};});

  // Grimório
  var grimorio=null;
  var wt=Game.Objects["Wizard tower"];
  if(wt&&wt.minigame){var g=wt.minigame;
    grimorio={available:true,magic:g.magic||0,magicMax:g.magicM||100,
      spells:Object.values(g.spells||{}).map(function(sp2,i){
        var c=(sp2.costMin||0)+((g.magicM||0)*(sp2.costPercent||0));
        var fc=0;
        if((g.magic||0)<(g.magicM||100)){fc=1-(g.magic||0)/(g.magicM||100);fc=Math.pow(fc,0.5)*0.9;}
        if(sp2.failMult)fc*=sp2.failMult;
        fc+=(sp2.failChnc||0);
        return{index:i,name:sp2.name||"Spell "+i,cost:Math.round(c*10)/10,
          failChance:Math.round(fc*100),icon:sp2.icon||[0,0],canCast:(g.magic||0)>=c};
      })};
  }

  // Panteão
  var panteao=null;
  var temple=Game.Objects["Temple"];
  if(temple&&temple.minigame){var pm=temple.minigame;
    var spirits=[];
    Object.values(pm.gods||{}).forEach(function(s2){
      spirits.push({id:s2.id,name:s2.name||s2.id,slot:(pm.slot||[]).indexOf(s2.id),desc:s2.desc||"",icon:s2.icon||[0,0]});
    });
    panteao={available:true,slots:pm.slot||[null,null,null],swapsDisponiveis:pm.swaps||0,spirits:spirits};
  }

  // Jardim
  var jardim=null;
  var farm=Game.Objects["Farm"];
  if(farm&&farm.minigame){var gm=farm.minigame;var grid=[];
    var gW=gm.W||gm.width||6;var gH=gm.H||gm.height||6;
    for(var x=0;x<gW;x++){grid[x]=[];
      for(var y=0;y<gH;y++){
        var cell=gm.plot&&gm.plot[y]?gm.plot[y][x]:null;
        if(!cell||cell[0]===0){grid[x][y]=null;continue;}
        var pl=gm.plantsById?gm.plantsById[cell[0]-1]:null;
        grid[x][y]={seedId:cell[0]-1,seedName:pl?pl.name:"?",growthStage:cell[1],mature:pl?cell[1]>=(pl.mature||100):false,icon:pl?pl.icon||[0,0]:[0,0]};
      }
    }
    var seeds=Object.values(gm.plants||{}).map(function(pl2,i){
      return{id:i,name:pl2.name,unlocked:!!pl2.unlocked,cost:pl2.cost||0};
    });
    jardim={available:true,width:gW,height:gH,soil:gm.soilType||0,grid:grid,seeds:seeds};
  }

  // Bolsa de Valores
  var bolsa=null;
  var bank=Game.Objects["Bank"];
  if(bank&&bank.minigame){var sm=bank.minigame;var goods={};
    Object.keys(sm.goods||{}).forEach(function(tk){var gd=sm.goods[tk];
      goods[tk]={name:gd.name||tk,price:gd.val||0,delta:gd.d||0,restingValue:gd.resting||0,portfolio:gd.stock||0,maxPortfolio:gd.cap||0,icon:gd.icon||null};
    });
    bolsa={available:true,goods:goods};
  }

  // Dragão
  var dragao=null;
  if(Game.dragonLevel!==undefined){
    dragao={nivel:Game.dragonLevel||0,aura1:Game.dragonAura||0,aura2:Game.dragonAura2||0,
      pode_evoluir:Game.dragonLevel<((Game.dragonLevels||[]).length-1)};
  }

  // Papai Noel
  var SANTA_NAMES=['Festive test tube','Festive ornament','Festive wreath','Festive tree',
    'Festive present','Festive elf fetus','Elf toddler','Elfling','Young elf','Bulky elf',
    'Nick','Santa Claus','Elder Santa','True Santa','Final Claus'];
  var santa={nivel:Game.santaLevel||0,nivel_maximo:14,
    nome:SANTA_NAMES[Game.santaLevel||0]||'?',pode_evoluir:(Game.santaLevel||0)<14};

  // Interruptores
  var pr=Game.prefs||{};var interruptores={};
  Object.keys(PREF_MAP).forEach(function(apiName){
    var info=PREF_MAP[apiName];
    var rawVal=pr[info.key]?1:0;
    interruptores[apiName]=info.inv?(rawVal?0:1):rawVal;
  });

  // Legado (Prestige / Ascensão)
  var hChips=Game.heavenlyChips||0;
  var legadoUpgs=Object.values(Game.Upgrades||{}).filter(function(u){return u.pool==="prestige";}).map(function(u){
    var p=u.getPrice?u.getPrice():u.basePrice;
    return{id:u.id,name:u.name,bought:!!u.bought,price:p,canAfford:hChips>=p,desc:u.desc||""};
  });
  var cookiesTotal=(Game.cookiesEarned||0)+(Game.cookiesReset||0);
  var prestigePotencial=Math.floor(Math.pow(cookiesTotal/1e12,1/3));
  var ganhoPrest=Math.max(0,prestigePotencial-(Game.prestige||0));
  var tempoRunMs=Date.now()-(Game.startDate||Date.now());
  var legado={prestige:Game.prestige||0,heavenly_chips:hChips,heavenly_chips_gastos:Game.heavenlyChipsSpent||0,
    ascensoes:Game.resets||0,modo_ascensao:Game.ascensionMode||0,
    prestige_potencial:prestigePotencial,ganho_prestige:ganhoPrest,ganho_chips:ganhoPrest,
    tempo_run_ms:tempoRunMs,cookies_this_run:Game.cookiesEarned||0,
    cookies_para_proximo_prestige:null,upgrades:legadoUpgs};
  if(legado.prestige!==undefined){
    var np=legado.prestige+1;
    legado.cookies_para_proximo_prestige=Math.max(0,Math.pow(np,3)*1e12-cookiesTotal);
  }

  return{
    buildings:buildings,upgrades_na_loja:upgradesInStore,upgrades_comprados:upgradesBought,
    achievements:achievements,grimorio:grimorio,panteao:panteao,jardim:jardim,bolsa:bolsa,
    dragao:dragao,santa:santa,interruptores:interruptores,legado:legado,
    save_string:(Game.WriteSave&&Game.prefs&&Game.ready)?Game.WriteSave(1):null
  };
}

// ─── Estado completo = merge slow (caro) + fast (barato) ──────────────────
function buildState(){
  return Object.assign({},_lastSlowState,buildFastState());
}

// ─── Dispatcher de ações (com validação estrita de métodos) ───────────────
function executeAction(action){
  if(!action||!action.type)return;
  try{
    switch(action.type){
      case "click_cookie":Game.ClickCookie();break;

      case "buy_building":{
        var bO=Game.Objects[action.name];
        if(bO&&typeof bO.buy==='function')bO.buy(action.quantidade||1);
        break;}
      case "sell_building":{
        var sO=Game.Objects[action.name];
        if(sO&&typeof sO.sell==='function')sO.sell(action.quantidade||1);
        break;}
      case "buy_upgrade":{
        var up=Game.UpgradesById[action.id];
        if(up&&!up.bought&&typeof up.buy==='function')up.buy();
        break;}

      case "click_shimmer":{
        var sh=(Game.shimmers||[])[action.index||0];
        if(sh&&typeof sh.pop==='function')sh.pop();
        break;}
      case "sugarlump_use":{
        var slO=Game.Objects[action.build_name];
        if(slO&&typeof slO.levelUp==='function')slO.levelUp();
        break;}

      // Grimório
      case "cast_spell":{
        var wt2=Game.Objects["Wizard tower"];
        if(wt2&&wt2.minigame&&typeof wt2.minigame.castSpell==='function'){
          var spx=Object.values(wt2.minigame.spells||{})[action.spell_index];
          if(spx)wt2.minigame.castSpell(spx);
        }
        break;}
      case "grimoire_recharge":{
        var wt3=Game.Objects["Wizard tower"];
        if(wt3&&wt3.minigame&&Game.lumps>0&&wt3.minigame.magic<wt3.minigame.magicM){
          wt3.minigame.magic=wt3.minigame.magicM;Game.lumps--;
          if(Game.lumpT)Game.lumpT=Date.now();
        }
        break;}

      // Panteão
      case "pantheon_set":{
        var tm=Game.Objects["Temple"];
        if(tm&&tm.minigame&&typeof tm.minigame.slotSomething==='function')
          tm.minigame.slotSomething(action.spirit_index,action.slot_index);
        break;}
      case "pantheon_remove":{
        var tm2=Game.Objects["Temple"];
        if(tm2&&tm2.minigame){
          var pm2=tm2.minigame;
          if(pm2.slots)pm2.slots[action.slot_index]=null;
          if(typeof pm2.slot==='function')pm2.slot(null,action.slot_index);
        }
        break;}
      case "pantheon_recharge":{
        var tm3=Game.Objects["Temple"];
        if(tm3&&tm3.minigame&&Game.lumps>0&&tm3.minigame.swaps<3){
          tm3.minigame.swaps=3;Game.lumps--;
        }
        break;}

      // Jardim
      case "garden_plant":{
        var fm=Game.Objects["Farm"];
        if(fm&&fm.minigame&&typeof fm.minigame.plantSeed==='function')
          fm.minigame.plantSeed(action.seed_index,action.x,action.y);
        break;}
      case "garden_harvest":{
        var fh=Game.Objects["Farm"];
        if(fh&&fh.minigame&&typeof fh.minigame.harvestPlant==='function')
          fh.minigame.harvestPlant(action.x,action.y);
        break;}
      case "garden_harvest_all":{
        var fa=Game.Objects["Farm"];
        if(fa&&fa.minigame&&typeof fa.minigame.harvestAll==='function')fa.minigame.harvestAll();
        break;}
      case "garden_soil":{
        var fs=Game.Objects["Farm"];
        if(fs&&fs.minigame){
          if(typeof fs.minigame.setSoil==='function')fs.minigame.setSoil(action.tipo);
          else fs.minigame.soilType=action.tipo;
        }
        break;}

      // Bolsa
      case "stock_buy":{
        var bk=Game.Objects["Bank"];
        if(bk&&bk.minigame&&typeof bk.minigame.buyGood==='function')
          bk.minigame.buyGood(action.ticker,action.quantidade);
        break;}
      case "stock_sell":{
        var bs=Game.Objects["Bank"];
        if(bs&&bs.minigame&&typeof bs.minigame.sellGood==='function')
          bs.minigame.sellGood(action.ticker,action.quantidade);
        break;}

      // Dragão
      case "dragon_set_aura":{
        if(typeof Game.SetDragonAura==='function')Game.SetDragonAura(action.aura_id,action.slot||0);
        break;}

      // Wrinklers
      case "wrinkler_pop":{
        var wl=Game.wrinklers||[];
        var wr=wl[action.id];
        if(wr&&wr.phase>0){if(wr.phase===1)wr.phase=2;wr.close=1;}
        break;}
      case "wrinkler_pop_all":{
        (Game.wrinklers||[]).forEach(function(wr2){if(wr2.phase>0){if(wr2.phase===1)wr2.phase=2;wr2.close=1;}});
        break;}

      // Estação
      case "set_season":{
        if(Game.seasons&&(action.nome in Game.seasons||action.nome==="")){
          Game.season=action.nome;
          if(typeof Game.getSeasonDuration==='function')Game.seasonT=Game.getSeasonDuration();
        }
        break;}

      // Volume / Áudio
      case "set_volume":{
        if(action.tipo==="sfx"&&Game.volume!==undefined)Game.volume=Math.max(0,Math.min(100,action.valor));
        else if(action.tipo==="music"&&Game.volumeMusic!==undefined)Game.volumeMusic=Math.max(0,Math.min(100,action.valor));
        if(typeof Game.UpdateMenu==='function')Game.UpdateMenu();
        break;}
      case "mute_building":{
        var mb=Game.Objects[action.nome];if(mb)mb.muted=mb.muted?0:1;
        break;}

      // Reencarnação (retorna ao jogo após ascensão)
      case "reincarnate":{
        if(typeof Game.Reincarnate==='function')Game.Reincarnate(1);
        break;}

      // Dragão — evolução (sacrifica cookies e/ou edifícios)
      case "upgrade_dragon":{
        if(typeof Game.UpgradeDragon==='function')Game.UpgradeDragon();
        break;}

      // Papai Noel — evolução (requer Christmas, custa cookies)
      case "upgrade_santa":{
        if(typeof Game.UpgradeSanta==='function')Game.UpgradeSanta();
        break;}

      // Sugar Lump — colheita manual (controla o tipo do próximo lump)
      case "harvest_lump":{
        if(typeof Game.clickLump==='function')Game.clickLump();
        break;}

      // Venda total de um tipo (combo essencial com Godzamok)
      case "sell_all_of_type":{
        var bOA=Game.Objects[action.name];
        if(bOA&&typeof bOA.sell==='function'&&bOA.amount>0)bOA.sell(bOA.amount);
        break;}

      // Força salvamento imediato no disco
      case "force_save":{
        if(typeof Game.WriteSave==='function')Game.WriteSave();
        break;}

      // Legado
      case "buy_heavenly_upgrade":{
        var hu=Game.UpgradesById[action.id];
        if(hu&&hu.pool==="prestige"&&!hu.bought&&typeof hu.buy==='function')hu.buy();
        break;}
      case "ascend":{
        if(action.confirmar===true&&typeof Game.Ascend==='function')Game.Ascend(1);
        break;}

      // Interruptores
      case "toggle_pref":{
        var pfInfo=PREF_MAP[action.nome];
        var gameKey=pfInfo?pfInfo.key:action.nome;
        if(Game.prefs&&gameKey in Game.prefs){
          Game.prefs[gameKey]=Game.prefs[gameKey]?0:1;
          if(typeof Game.UpdateMenu==='function')Game.UpdateMenu();
        }
        break;}

      default:log("warn","Acao desconhecida: "+action.type);return;
    }
    _needSlowRebuild=true; // estado lento desatualizado após qualquer ação
    log("info","OK "+action.type+(action.name?" "+action.name:"")+(action.quantidade?" x"+action.quantidade:""));
  }catch(e){log("error","Erro ["+action.type+"]: "+e.message);}
}

Game.registerMod("cookie_ai_bridge",{
  init:function(){
    createPanel();
    log("info","Mod v2 iniciado — Cookie Clicker "+(Game.version||"?"));
    setStatus(true,"ativo");
    Game.Notify("Cookie Bridge v2","API em http://localhost:"+PORT+" | Swagger: /docs",[0,0],8000);

    var fc=0,sc=0;
    Game.registerHook("logic",function(){
      fc++;
      if(fc%15!==0)return;
      if(_paused||Date.now()<_backoffUntil)return;

      // Estado lento: primeira vez, a cada 10 polls (~5s) ou após ação
      sc++;
      if(sc===1||sc%10===0||_needSlowRebuild){
        _lastSlowState=buildSlowState();
        _needSlowRebuild=false;
      }

      var state=buildState();

      fetch("http://localhost:"+PORT+"/state",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(state)
      }).then(function(r){
        if(r.ok)setStatus(true,"ativo");
      }).catch(function(){
        // Backoff de 5s para não poluir a aba Network quando o servidor estiver offline
        _backoffUntil=Date.now()+5000;
        setStatus(false,"offline (5s)");
        log("warn","Servidor offline — aguardando 5s antes de tentar novamente.");
      });

      fetch("http://localhost:"+PORT+"/action/next")
        .then(function(r){if(r.status===204)return null;return r.ok?r.json():null;})
        .then(function(a){if(a)executeAction(a);})
        .catch(function(){});
    });

    // Exposição global para depuração no console do DevTools (F12)
    window.CookieBridge={
      testarAcao:function(a){log("info","[Debug] Testando: "+a.type);executeAction(a);},
      verEstado:buildState,
      pausar:function(){
        _paused=true;
        if(_pauseBtn){_pauseBtn.textContent="Retomar";_pauseBtn.style.color="#ff6b6b";}
        setStatus(false,"pausado");log("info","API pausada via console.");
      },
      retomar:function(){
        _paused=false;_backoffUntil=0;
        if(_pauseBtn){_pauseBtn.textContent="Pausar";_pauseBtn.style.color="#ccc";}
        setStatus(true,"ativo");log("info","API retomada via console.");
      }
    };
  },

  // Persiste a porta configurada pelo usuário no save do jogo
  save:function(){return JSON.stringify({porta:PORT});},
  load:function(str){
    if(str){
      try{
        var d=JSON.parse(str);
        if(d&&typeof d.porta==='number'&&d.porta>0&&d.porta<65536){
          PORT=d.porta;
          // Sync the panel input if it was already created (init ran before load)
          var inp=document.getElementById("cookiebridge-port-input");
          if(inp)inp.value=PORT;
        }
      }catch(e){}
    }
  },
});

})();
