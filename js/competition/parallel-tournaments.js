
(() => {
  'use strict';

  const V21_VERSION = 3;
  const V21_T2_COUNT = 26; // v35: команд стало больше (108) — больше турниров для набора очков
  const V21_T3_COUNT = 26;
  const V21_ACADEMY_COUNT = 8;
  const V21_DAY = 24*60*60*1000;
  const V21_SLOT_MIN = 10;

  const V21_ACADEMIES = [
    {name:'Spirit Academy', parent:'Team Spirit', pts:245, flag:'🇷🇺', language:'Russian', roster:['VILBy','Kiryasoo','Netrix','s1nside','k0gaSs'], coach:'Flash_1'},
    {name:'NAVI Junior', parent:'NAVI', pts:225, flag:'🇺🇦', country:'UA', language:'English', roster:['MahaR','FAZERY','skizzyee','yoki','kodak'], coach:'snatchie'},
    {name:'G2 Ares', parent:'G2', pts:215, flag:'🇪🇺', language:'English', roster:['SHiNE','hitori','Junyme','yksjupe','kl1m'], coach:'innersh1ne'},
    {name:'MOUZ NXT', parent:'MOUZ', pts:205, flag:'🇪🇺', language:'English', roster:['opdust','ay0k','Nikodeon','eSx','mixer'], coach:'lmbt'},
    // v33: ещё семь академий; составы — молодые игроки, которых генерирует игра (реальных данных о юниорах нет)
    {name:'Astralis Talent', parent:'Astralis', pts:200, flag:'🇩🇰', country:'DK', language:'Danish', coach:'—'},
    {name:'HEROIC Academy', parent:'HEROIC', pts:190, flag:'🇩🇰', country:'DK', language:'Danish', coach:'—'},
    {name:'FURIA Academy', parent:'FURIA', pts:195, flag:'🇧🇷', country:'BR', language:'Portuguese', coach:'—'},
    {name:'Falcons Force', parent:'Team Falcons', pts:210, flag:'🇸🇦', countries:['SA','DK','SE','FI','EE'], language:'English', coach:'—'},
    {name:'BIG Academy', parent:'BIG', pts:180, flag:'🇩🇪', country:'DE', language:'German', coach:'—'},
    {name:'fnatic Rising', parent:'fnatic', pts:175, flag:'🇬🇧', countries:['GB','SE','DK','PL'], language:'English', coach:'—'},
    {name:'paiN Academy', parent:'paiN', pts:170, flag:'🇧🇷', country:'BR', language:'Portuguese', coach:'—'}
  ];
  // уникальные ники для юниоров: слоги, без совпадений с уже существующими игроками
  function v33YouthNicks(seed, n){
    const A=['zy','kr','v','sh','n','bl','r','fl','x','dr','j','st','k','qu','m','tr','h','sk','l','gr'], B=['a','e','i','o','u','y','ai','ex','ix','on','an','er'], C=['n','x','k','z','r','ss','nt','kk','lo','ro','ne','ze','ka','ty','yx','th','1x','0n','v1','ky'];
    const taken=new Set(teams.flatMap(t=>(t.players||[]).map(p=>String(p.nick).toLowerCase())).concat((transferState.freeAgents||[]).map(p=>String(p.nick).toLowerCase())));
    const mix=x=>{ x=Math.imul(x^(x>>>16),0x45d9f3b); x=Math.imul(x^(x>>>16),0x45d9f3b); return (x^(x>>>16))>>>0; };
    const out=[]; for(let i=0;out.length<n&&i<500;i++){ const h=mix(hashTeamName(seed+':'+i)+i*0x9e3779b9); let s=A[h%A.length]+B[(h>>>5)%B.length]+C[(h>>>10)%C.length]; if((h>>>15)%3===0) s=s[0].toUpperCase()+s.slice(1); if(!taken.has(s.toLowerCase())){ taken.add(s.toLowerCase()); out.push(s); } }
    return out;
  }
  const V21_T2_NAMES = ['CCT Europe Series','European Pro League','ESL Challenger','RES Regional Championship','United21 League','Thunderpick Regional Cup','YaLLa Compass Contenders','Pinnacle Regional Masters','CCT Online Europe'];
  const V21_T3_NAMES = ['CCT Rising Series','United21 Division','Open Challenger Cup','Rookie Clash','European Pro League 2nd Division','Future Stars Cup','Regional Academy Cup','Grassroots CS2 Cup','Entry League'];
  const V21_ACADEMY_NAMES = ['European Academy League','Academy Cup Europe','CCT Academy Series','Young Guns Championship','MOUZ Academy Invitational','Rising Academy League','Prospects Clash','Academy Open'];
  // v59: safe extension point for imported Tier-2/Tier-3/academy tournament databases.
  window.CS2ParallelTournamentPools = {
    extend(groups) {
      const add = (target, list) => { const seen = new Set(target.map(x => String(x).toLowerCase().trim())); (list || []).forEach(x => { const n = String(x || '').trim(); const k = n.toLowerCase(); if (n && !seen.has(k)) { target.push(n); seen.add(k); } }); };
      add(V21_T2_NAMES, groups?.tier2); add(V21_T3_NAMES, groups?.tier3); add(V21_ACADEMY_NAMES, groups?.academy);
      return { tier2: V21_T2_NAMES.length, tier3: V21_T3_NAMES.length, academy: V21_ACADEMY_NAMES.length };
    },
    list() { return { tier2: V21_T2_NAMES.slice(), tier3: V21_T3_NAMES.slice(), academy: V21_ACADEMY_NAMES.slice() }; }
  };

  function v21Esc(s){ return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function v21Clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function v21Cal(){ try{return typeof v15EnsureCalendar==='function'?v15EnsureCalendar():seasonState.calendar||(seasonState.calendar={});}catch(e){return seasonState.calendar||(seasonState.calendar={});} }
  function v21Now(){ return Number(v21Cal().currentMs)||Date.now(); }
  function v21Ceil10(ms){ const d=new Date(Number(ms)||v21Now()); d.setSeconds(0,0); const m=d.getMinutes(); d.setMinutes(m+((V21_SLOT_MIN-(m%V21_SLOT_MIN))%V21_SLOT_MIN),0,0); return d.getTime(); }
  function v21YearStart(){
    const year=2026+(Number(seasonState.currentSeason||1)-1);
    const c=v21Cal(), saved=Number(c.seasonAnchorMs)||0;
    if(Number(c.seasonPlanSeason)===Number(seasonState.currentSeason||1) && saved>0) return saved;
    const jan2=new Date(year,0,2,9,0,0,0).getTime(), now=v21Now();
    // When a season rolls over in February (the final Tier-1 event is around
    // day 400), don't anchor the new calendar back to January 2 in the past.
    if(new Date(now).getFullYear()===year && now>=jan2){
      const next=new Date(now); next.setHours(9,0,0,0);
      if(next.getTime()<=now) next.setDate(next.getDate()+1);
      return next.getTime();
    }
    if(new Date(now).getFullYear()>year){
      const next=new Date(now); next.setHours(9,0,0,0); next.setDate(next.getDate()+1); return next.getTime();
    }
    return jan2;
  }
  function v21NormalizeState(){
    if(!seasonState || typeof seasonState!=='object') return;
    seasonState.maxTournaments=9999;
    if(!Array.isArray(seasonState.parallelSchedule)) seasonState.parallelSchedule=[];
    if(!seasonState.parallelState || typeof seasonState.parallelState!=='object') seasonState.parallelState={version:V21_VERSION,lastRunMs:0};
  }

  function v21MakeAcademyTeam(def){
    if(teams.some(t=>t.name===def.name)) return;
    if(def.parent && !teams.some(t=>t.name===def.parent && !t.isAcademy)) return;   // академия только при основной команде в пуле
    if(!def.roster){ const R=window.V33Reserve, cs=def.countries||(def.country?[def.country]:null), real=[]; if(R) for(let i=0;i<5;i++){ const x=R.take({countries:cs,max:66,young:true})||R.take({countries:cs,young:true}); if(x) real.push(x); } def=Object.assign({},def,{roster:real.length===5?real.map(x=>x.nick):v33YouthNicks(def.name,5),_real:real.length===5?real:null}); }
    const t={name:def.name,pts:def.pts,style:'Tactical',maps:generateMapStats(),mapStats:{},mapStatsVersion:2,mapHistory:[],history:[],streak:0,form:100,fatigue:0,prevRank:null,lastBootcampSeason:0,trophies:{majors:0,elite:0,regular:0,grandFinalsWon:0},activeModifier:null,seasonStartRank:null,seasonChampionships:0,players:[],coach:{name:def.coach,flag:def.flag},playerLayerVersion:PLAYER_LAYER_VERSION,rosterLastChange:null,tempStandIn:null,isAcademy:true,academyParent:def.parent,academyLanguage:def.language};
    MAP_POOL.forEach(m=>{ const wr=Number(t.maps[m])||50; const wins=Math.round(20*wr/100); t.mapStats[m]={wins,losses:20-wins}; });
    t.players=def.roster.map((nick,idx)=>{ const p=createPlayerFromNick(t,nick,idx); p.status='STARTER'; p.country=(def._real&&def._real[idx]?def._real[idx].country:'')||(PLAYER_META_2026[nick]||{}).country||def.country||(def.countries?def.countries[idx%def.countries.length]:(def.flag==='🇷🇺'?'RU':'')); p.language=def.language; p.flag=p.country?countryFlag(p.country):def.flag; if(!def.roster0) p.age=p.age||(17+(hashTeamName(nick)%3)); p.form=v21Clamp(Number(p.form)||100,88,108); return p; });
    ensurePlayerLayer(t);
    TEAM_REGION_FLAG[def.name]=def.flag;
    TEAM_ROSTER_2026[def.name]=def.roster.slice();
    teams.push(t);
  }
  function v21EnsureAcademies(){ V21_ACADEMIES.forEach(v21MakeAcademyTeam); }
  // v84: настоящие академии клубов — по ним идут повышения «академия → основа»
  window.V21AcademyParent = Object.fromEntries(V21_ACADEMIES.map(a=>[a.name,a.parent]));

  function v21EligiblePool(kind){
    v21EnsureAcademies();
    const academies=teams.filter(t=>t.isAcademy);
    if(kind==='academy') return academies.slice().sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0));
    // Непересекающиеся эшелоны по текущему рейтингу: топ-10 — Tier-1,
    // места 11–40 — Tier-2, места 41+ — Tier-3. Академии участвуют только
    // в собственных academy-соревнованиях и не вытесняют обычные команды.
    const ranked=teams.filter(t=>!t.isAcademy).slice().sort((a,b)=>(Number(b.pts)||0)-(Number(a.pts)||0)||a.name.localeCompare(b.name));
    // v84: эшелон — по статусу команды с инерцией (CS2TeamTier), а не по мгновенному месту в VRS
    if(typeof window.CS2TeamTier==='function'){ const want=kind==='tier2'?2:3, pool=ranked.filter(t=>window.CS2TeamTier(t.name)===want); if(pool.length>=8) return pool; }
    if(kind==='tier2') return ranked.slice(10,40);
    return ranked.slice(40);
  }

  function v21PickParticipants(kind, seed, n, busy){
    let pool=v21EligiblePool(kind);
    if(busy&&busy.size) pool=pool.filter(t=>!busy.has(t.name));
    if(!pool.length) return [];
    let count=n||(kind==='academy'?4:8);
    if(pool.length<count) count=pool.length;
    // Циклическая ротация по всему пулу вместо постоянного выбора первых 18-25 команд.
    // Шаг 37 обеспечивает, что следующие турниры постепенно добираются до нижних мест рейтинга.
    const ordered=pool.slice().sort((a,b)=>b.pts-a.pts||a.name.localeCompare(b.name));
    const offset=ordered.length?Math.abs(Math.trunc(Number(seed)||0)*37)%ordered.length:0;
    const arr=ordered.slice(offset).concat(ordered.slice(0,offset));
    if(kind==='academy') return arr.slice(0,Math.min(count,arr.length));
    // Академии участвуют только в academy-соревнованиях.
    return arr.filter(t=>!t.isAcademy).slice(0,count);
  }

  function v21BuildParallelSchedule(){
    v21NormalizeState();
    const year=2026+(Number(seasonState.currentSeason||1)-1);
    const anchor=v21YearStart();
    const events=[];
    const push=(tier,kind,name,dayOffset,durationDays,idx)=>{
      const start=new Date(anchor+dayOffset*V21_DAY); start.setHours(kind==='academy'?10:tier==='3'?12:14,0,0,0);
      const startMs=start.getTime();
      const metaKey = value => String(value || '').replace(/\b(?:19|20)\d{2}\b/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      const catalog = window.CS2_CUSTOM_TOURNAMENT_META || {};
      const customMeta = catalog[metaKey(name)] || Object.values(catalog).find(x => metaKey(x?.name) === metaKey(name)) || null;
      const fmtRaw = String(customMeta?.format || '').toLowerCase();
      const customFormat = ['single','double','swiss','gsl','bounty'].includes(fmtRaw) ? fmtRaw : '';
      const fmt = customFormat || v22Fmt(kind,tier,idx);
      const customSize = Number(customMeta?.size);
      const ev={
        id:`S${seasonState.currentSeason}-${tier}-${idx}-${hashTeamName(name+dayOffset)}`,
        season:seasonState.currentSeason, year, tier, kind, name:`${name} ${year}`, fieldProfile:tier==='2'?'medium':'weak',
        startMs,endMs:startMs+durationDays*V21_DAY, prize:Number(customMeta?.prize)|| (tier==='2'?50000:(kind==='academy'?25000:15000)), size:customSize>=4&&customSize<=64?Math.round(customSize):v22Size(kind,fmt,tier),
        pointsMult:tier==='2'?0.35:(kind==='academy'?0.18:0.12), participants:[], format:fmt,
        status:'scheduled', currentRound:0, matches:[], results:[], standings:[], winner:null, nextRoundAt:startMs+30*60000,
        academyOnly:kind==='academy', initialized:false, completedAt:0,
        organizer:customMeta?.organizer || '', city:customMeta?.city || '', country:customMeta?.country || '', region:customMeta?.region || '', location:customMeta?.location || ''
      };
      events.push(ev);
    };
    for(let i=0;i<V21_T2_COUNT;i++) push('2','tier2',V21_T2_NAMES[i%V21_T2_NAMES.length],8+i*13,2+(i%3===0?1:0),i);
    for(let i=0;i<V21_T3_COUNT;i++) push('3','tier3',V21_T3_NAMES[i%V21_T3_NAMES.length],4+i*13,2+(i%4===0?1:0),100+i);
    for(let i=0;i<V21_ACADEMY_COUNT;i++) push('2','academy',V21_ACADEMY_NAMES[i%V21_ACADEMY_NAMES.length],6+i*42,2,200+i);
    events.sort((a,b)=>a.startMs-b.startMs);
    try{ v22Assign(events,[]); }catch(e){ console.warn('[v23] assign',e); }
    // Keep already completed parallel tournaments from previous seasons in the
    // history; replace only the current season's generated calendar.
    const historical=(seasonState.parallelSchedule||[]).filter(e=>Number(e?.season)!==Number(seasonState.currentSeason));
    seasonState.parallelSchedule=historical.concat(events);
    seasonState.parallelState={version:V21_VERSION,lastRunMs:v21Now(),v23:true};
    try{saveSeasonState();}catch(e){}
  }

  function v21BgOdds(a,b){
    const ea=(Number(a.pts)||500)*(Number(a.form||100)/100)*(1-(Number(a.fatigue)||0)*0.006);
    const eb=(Number(b.pts)||500)*(Number(b.form||100)/100)*(1-(Number(b.fatigue)||0)*0.006);
    const d=ea-eb; const p=1/(1+Math.pow(10,-d/1150));
    return v21Clamp(p,0.18,0.82);
  }
  // All background match deltas are delegated to the shared VRS model; no tier-based point bonus.
  function v21VrsDelta(self,opp,ev){
    if(window.CS2VRSModel?.version>=2) return window.CS2VRSModel.delta(self,opp,ev);
    const a=Math.max(50,Number(self?.pts)||500), b=Math.max(50,Number(opp?.pts)||500);
    const expected=1/(1+Math.pow(10,(b-a)/400)), win=Math.round(32*(1-expected)), lose=Math.round(32*expected);
    return {before:a,win,lose,afterWin:a+win,afterLoss:a-lose};
  }
  window.CS2VRSModel=window.CS2VRSModel||{};
  window.CS2VRSModel.delta=v21VrsDelta;
  function v21ApplyBgMatch(a,b,winner,ev,match){
    if(!a || typeof a!=='object' || !b || typeof b!=='object' || Array.isArray(a) || Array.isArray(b)) {
      console.warn('[v21] пропущено некорректное состояние команды в фоновом матче', {a,b,event:ev?.name});
      return false;
    }
    [a,b].forEach(t=>{ ensurePlayerLayer(t); if(!Array.isArray(t.players)) t.players=[]; t.players.forEach(p=>{ p.fatigue=v21Clamp(Number(p.fatigue||0)+1.0,0,100); p.form=v21Clamp(Number(p.form||100)+(t.name===winner?0.08:-0.05),80,120); p.morale=v21Clamp(Number(p.morale||90)+(t.name===winner?0.25:-0.15),45,100); }); ensurePlayerLayer(t); t.streak = t.name===winner ? Math.max(0,Number(t.streak||0))+1 : Math.min(0,Number(t.streak||0))-1; });
    if(window.CS2VRSModel?.version>=2) {
      window.CS2VRSModel.applyMatch(a,b,winner,ev,match);
    } else {
      const da=v21VrsDelta(a,b,ev), db=v21VrsDelta(b,a,ev);
      const winTeam=a.name===winner?a:b, loser=a.name===winner?b:a;
      winTeam.pts=Math.min(2200,Number(winTeam.pts||500)+(a.name===winner?da.win:db.win));
      loser.pts=Math.max(50,Number(loser.pts||500)-(a.name===winner?db.lose:da.lose));
      if(match) match.vrs={a:{team:a.name,...da},b:{team:b.name,...db},winner,appliedAt:v21Now()};
    }
    // v84: в статистику карт идут реально сыгранные карты серии, а не случайная карта из пула.
    try{
      const played=Array.isArray(match?.maps)&&match.maps.length?match.maps:[{map:MAP_POOL[0],w:a.name===winner?1:2}];
      played.forEach(m=>recordMapResult(a.name,b.name,m.map,m.w===1?a.name:b.name,m.s1!=null?`${m.s1}-${m.s2}`:'',ev.name,'Фоновый матч'));
    }catch(e){}
    return true;
  }
  // ===== v22: реальные сетки Tier-2/3 и академий (single/double/swiss/gsl), привязанные к игровому календарю =====
  const V22_RESOLVE_MIN=150, V22_SLOT_MIN=180, V22_PER_DAY=3;
  // One timing contract is shared by the parallel resolver and every UI that displays its matches.
  window.CS2ParallelMatchTiming = Object.freeze({
    resolveMinutes: V22_RESOLVE_MIN, slotMinutes: V22_SLOT_MIN,
    dueAt(match) { const at=Number(match?.at); return Number.isFinite(at)&&at>0 ? at+V22_RESOLVE_MIN*60000 : 0; },
    nextWake(match, now) { const due=this.dueAt(match); return due>0 ? Math.max(Number(now)||0,due) : Number(now)||0; },
    state(match, now) {
      if(match?.w) return 'completed';
      const at=Number(match?.at)||0, t=Number(now)||0, due=this.dueAt(match);
      if(!at) return 'unscheduled';
      if(t<at) return 'scheduled';
      if(due>t) return 'simulating';
      return 'overdue';
    }
  });
  // Qualification rounds are deliberately spread out: two simultaneous series
  // per in-game day, instead of the faster cadence used by regular Tier-2/3 events.
  const V22_QUAL_SLOTS_PER_DAY=1;
  const V22_FMT_LABEL={single:'Single Elim',double:'Double Elim',swiss:'Swiss',gsl:'GSL Groups'};
  function v22Names(arr){ return (arr||[]).map(x=>typeof x==='string'?x:x.name); }
  function v22Fmt(kind,tier,idx){
    if(kind==='academy') return ['single','gsl','double'][idx%3];
    // Обычные Tier-2/3 турниры чаще получают большую single-elimination сетку.
    // Небольшие GSL и 16-командные double-elimination оставлены для разнообразия.
    const formats=kind==='tier2'?['single','single','single','double','single','swiss']:['single','single','single','double','single','swiss'];
    return formats[Math.abs(Number(idx)||0)%formats.length];
  }
  function v22Size(kind,fmt,tier){
    if(kind==='academy') return teams.filter(t=>t.isAcademy).length>=8?8:4;
    if(fmt==='single') return 32;
    if(fmt==='double') return 16;
    if(fmt==='swiss') return 16;
    return 8; // GSL / небольшие региональные события
  }
  // Tier-2 имеет 30 команд по рейтинговой границе 11–40, поэтому сетку на 32
  // заполняем реальными 20–30 участниками и BYE, а не оставляем турнир пустым.
  function v22MinField(ev){
    const target=Math.max(4,Math.min(64,Number(ev.size)||v22Size(ev.kind,ev.format,ev.tier)));
    if(ev.kind==='academy') return Math.min(target,Math.max(4,v21EligiblePool('academy').length));
    const pool=v21EligiblePool(ev.kind).length;
    return Math.min(pool,Math.max(12,Math.ceil(target*.60))); 
  }
  function v22Idx(br){ const o={}; br.matches.forEach(m=>{o[m.id]=m;}); return o; }
  function v22Fill(br,ix){ br.matches.forEach(m=>{ ['1','2'].forEach(k=>{ if(m['t'+k]) return; const s=m['s'+k]||{}; if(s.w&&ix[s.w]&&ix[s.w].w) m['t'+k]=ix[s.w].w; else if(s.l&&ix[s.l]&&ix[s.l].l) m['t'+k]=ix[s.l].l; else if(s.ss!=null&&br.swissSeeds) m['t'+k]=br.swissSeeds[s.ss]||null; }); }); }
  // v89: Swiss — запись результата, Бухгольц (сумма побед соперников) и посев плей-офф
  const v89IsSwissM=(br,m)=>br.swiss&&br.rounds[m.r]&&br.rounds[m.r].grp==='Швейцарка';
  function v89SwissRecord(ev,w,l){
    const br=ev.br, K=br.swissK||3, sw=ev.standings.find(x=>x.team===w), sl=ev.standings.find(x=>x.team===l);
    if(sw){ sw.wins++; sw.pts+=3; if(sl) (sw.opp=sw.opp||[]).push(l); if(br.swissV===2&&sw.wins>=K) sw.st='adv'; }
    if(sl){ sl.losses++; if(sw) (sl.opp=sl.opp||[]).push(w); if(br.swissV===2&&sl.losses>=K) sl.st='out'; }
  }
  function v89Buchholz(ev,x){ return (x.opp||[]).reduce((a,n)=>a+((ev.standings.find(y=>y.team===n)||{}).wins||0),0); }
  function v89SwissRank(ev){ return ev.standings.slice().sort((a,b)=>b.wins-a.wins||a.losses-b.losses||v89Buchholz(ev,b)-v89Buchholz(ev,a)||(a.seed||99)-(b.seed||99)); }
  function v89SwissSeeds(ev){
    const br=ev.br; if(br.swissV!==2||br.swissSeeds) return;
    if(!br.matches.filter(m=>v89IsSwissM(br,m)).every(m=>m.w)) return;
    br.swissSeeds=v89SwissRank(ev).filter(x=>x.st==='adv').map(x=>x.team);
  }
  function v22Fmtd(ms){ const d=new Date(ms); return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }

  window.v22BuildBracketRef=ev=>v22BuildBracket(ev);
  window.v22AdvanceRef=(ev,now,ff)=>v22Advance(ev,now,ff!==false); // v89: для тестов Swiss
  function v22BuildBracket(ev){
    const all=v22Names(ev.participants);
    const seeds=all.map(n=>teams.find(t=>t.name===n)).filter(Boolean).sort((a,b)=>b.pts-a.pts).map(t=>t.name);
    const actualSeeds=seeds.slice(), count=seeds.length;
    let n=0;
    if(ev.format==='single') n=count>16?32:count>8?16:count>4?8:count>=4?4:0;
    else if(ev.format==='double') n=count>8?16:count>=4?8:0;
    else if(ev.format==='swiss') n=count>=16?16:count>=8?8:0;
    else n=count>=8?8:count>=4?4:0;
    if(ev.format==='double'&&n<4) n=0;
    // Свободные BYE-слоты дают корректную сетку при 17–31 участнике и не отбрасывают команды.
    if(n&&seeds.length<n) seeds.length=n;
    ev.participants=actualSeeds;
    const br={format:ev.format,rounds:[],matches:[],swiss:ev.format==='swiss',final:null};
    ev.br=br; ev.results=[]; ev.matches=[]; ev.winner=null; ev.standings=[]; ev.initialized=true;
    if(!n){ ev.status='completed'; ev.completedAt=Date.now(); return; }
    const T=t=>({t}),W=w=>({w}),L=l=>({l});
    const add=(id,grp,rname,wave,s1,s2)=>{ let r=br.rounds.find(x=>x.name===rname&&x.grp===grp); if(!r){ r={name:rname,grp,wave,ids:[]}; br.rounds.push(r); }
      br.matches.push({id,r:br.rounds.indexOf(r),wave,s1,s2,t1:s1.t||null,t2:s2.t||null,w:null,l:null,sc:'',at:0}); r.ids.push(id); return id; };
    const rn=s=>s===1?'Финал':s===2?'Полуфинал':`1/${s} финала`;
    const f=ev.format;
    if(f==='single'){
      let size=n/2,wave=0,cur=[]; for(let k=0;k<size;k++) cur.push(add(`s0_${k}`,'',rn(size),0,T(seeds[k]),T(seeds[n-1-k])));
      while(size>1){ size/=2; wave++; const nx=[]; for(let k=0;k<size;k++) nx.push(add(`s${wave}_${k}`,'',rn(size),wave,W(cur[2*k]),W(cur[2*k+1]))); cur=nx; }
      br.finalId=cur[0];
    } else if(f==='double'){
      const UB='Верхняя сетка',LB='Нижняя сетка',GF='Финал';
      if(n>=16){
        const u1=Array.from({length:8},(_,k)=>add(`u1_${k}`,UB,'UB R1 · 1/8 финала',0,T(seeds[k]),T(seeds[15-k])));
        const u2=Array.from({length:4},(_,k)=>add(`u2_${k}`,UB,'UB R2 · четвертьфинал',1,W(u1[2*k]),W(u1[2*k+1])));
        const u3=Array.from({length:2},(_,k)=>add(`u3_${k}`,UB,'UB полуфинал',2,W(u2[2*k]),W(u2[2*k+1])));
        const uf=add('uf',UB,'UB финал',3,W(u3[0]),W(u3[1]));
        const l1=Array.from({length:4},(_,k)=>add(`l1_${k}`,LB,'LB R1',1,L(u1[2*k]),L(u1[2*k+1])));
        const l2=Array.from({length:4},(_,k)=>add(`l2_${k}`,LB,'LB R2',2,W(l1[k]),L(u2[k])));
        const l3=Array.from({length:2},(_,k)=>add(`l3_${k}`,LB,'LB R3',3,W(l2[2*k]),W(l2[2*k+1])));
        const l4=Array.from({length:2},(_,k)=>add(`l4_${k}`,LB,'LB R4',4,W(l3[k]),L(u3[k])));
        const l5=add('l5',LB,'LB R5',5,W(l4[0]),W(l4[1]));
        const l6=add('l6',LB,'LB финал',6,W(l5),L(uf));
        br.finalId=add('gf',GF,'Гранд-финал',7,W(uf),W(l6));
      } else if(n>=8){
        const u1=[0,1,2,3].map(k=>add(`u1_${k}`,UB,'UB R1',0,T(seeds[k]),T(seeds[7-k])));
        const u2=[0,1].map(k=>add(`u2_${k}`,UB,'UB Полуфинал',1,W(u1[2*k]),W(u1[2*k+1])));
        const l1=[0,1].map(k=>add(`l1_${k}`,LB,'LB R1',1,L(u1[2*k]),L(u1[2*k+1])));
        const l2=[0,1].map(k=>add(`l2_${k}`,LB,'LB R2',2,W(l1[k]),L(u2[1-k])));
        const uf=add('uf',UB,'UB Финал',2,W(u2[0]),W(u2[1]));
        const l3=add('l3',LB,'LB R3',3,W(l2[0]),W(l2[1]));
        const lf=add('lf',LB,'LB Финал',4,W(l3),L(uf));
        br.finalId=add('gf',GF,'Гранд-финал',5,W(uf),W(lf));
      } else {
        const u1=[0,1].map(k=>add(`u1_${k}`,UB,'UB Полуфинал',0,T(seeds[k]),T(seeds[3-k])));
        const uf=add('uf',UB,'UB Финал',1,W(u1[0]),W(u1[1]));
        const l1=add('l1',LB,'LB R1',1,L(u1[0]),L(u1[1]));
        const lf=add('lf',LB,'LB Финал',2,W(l1),L(uf));
        br.finalId=add('gf',GF,'Гранд-финал',3,W(uf),W(lf));
      }
    } else if(f==='gsl'){
      const groups=n>=8?[[0,3,4,7],[1,2,5,6]]:[[0,1,2,3]], gid=[];
      groups.forEach((g,gi)=>{ const G='Группа '+'AB'[gi], tt=g.map(i=>seeds[i]);
        const o1=add(`g${gi}o1`,G,'Открытие',0,T(tt[0]),T(tt[3])), o2=add(`g${gi}o2`,G,'Открытие',0,T(tt[1]),T(tt[2]));
        const wn=add(`g${gi}w`,G,'Победителей',1,W(o1),W(o2)), el=add(`g${gi}e`,G,'Элиминация',1,L(o1),L(o2));
        const dc=add(`g${gi}d`,G,'Decider',2,L(wn),W(el)); gid.push({wn,dc}); });
      if(n>=8){ const a=add('ps1','Плей-офф','Полуфинал',3,W(gid[0].wn),W(gid[1].dc)), b=add('ps2','Плей-офф','Полуфинал',3,W(gid[1].wn),W(gid[0].dc)); br.finalId=add('pf','Плей-офф','Финал',4,W(a),W(b)); }
      else br.finalId=add('pf','Плей-офф','Финал',3,W(gid[0].wn),W(gid[0].dc));
    } else if(actualSeeds.length===n){
      // v89: настоящий CS Swiss — до K побед (выход) или K поражений (вылет): 16 команд — до 3, 8 — до 2.
      // Пары — внутри одинакового счёта, без повторных встреч; вышедшие (n/2) играют плей-офф с посевом по итогам Swiss.
      const K=n>=16?3:2; br.swissV=2; br.swissK=K;
      let dist={'0-0':n}, r=0;
      while(true){
        let m=0; const next={};
        Object.entries(dist).forEach(([key,c])=>{ const [w,l]=key.split('-').map(Number);
          if(w>=K||l>=K){ next[key]=(next[key]||0)+c; return; }
          m+=c/2; const a=(w+1)+'-'+l, b=w+'-'+(l+1); next[a]=(next[a]||0)+c/2; next[b]=(next[b]||0)+c/2; });
        if(!m) break;
        for(let k=0;k<m;k++) add(`w${r}_${k}`,'Швейцарка','Тур '+(r+1),r,r===0?T(seeds[k]):{sw:1},r===0?T(seeds[n/2+k]):{sw:1});
        dist=next; r++;
      }
      ev.standings=seeds.map((t,i)=>({team:t,wins:0,losses:0,pts:0,seed:i+1,opp:[],st:''}));
      // плей-офф: 1–8, 2–7, 3–6, 4–5 (у 8 команд — 1–4, 2–3)
      const q=n/2, S=i=>({ss:i}); let cur=[], size=q/2, wave=r;
      for(let k=0;k<size;k++) cur.push(add(`ps${wave}_${k}`,'Плей-офф',rn(size),wave,S(k),S(q-1-k)));
      while(size>1){ size/=2; wave++; const nx=[]; for(let k=0;k<size;k++) nx.push(add(`ps${wave}_${k}`,'Плей-офф',rn(size),wave,W(cur[2*k]),W(cur[2*k+1]))); cur=nx; }
      br.finalId=cur[0];
    } else {
      const R=Math.round(Math.log2(n));
      for(let r=0;r<R;r++) for(let k=0;k<n/2;k++) add(`w${r}_${k}`,'Швейцарка','Тур '+(r+1),r,r===0?T(seeds[k]):{sw:1},r===0?T(seeds[n/2+k]):{sw:1});
      ev.standings=seeds.map(t=>({team:t,wins:0,losses:0,pts:0}));
    }
    // Слоты: пары матчей одной волны стартуют одновременно; новая волна — только после полного слота предыдущей.
    br.matches.sort((a,b)=>a.wave-b.wave);
    let slot=0,lastWave=-1,inSlot=0;
    const slotsPerDay=ev.qual?V22_QUAL_SLOTS_PER_DAY:V22_PER_DAY;
    br.matches.forEach(m=>{ if(m.wave!==lastWave){ if(lastWave!==-1&&inSlot>0) slot++; inSlot=0; lastWave=m.wave; } if(inSlot===2){ slot++; inSlot=0; }
      m.at=ev.startMs+Math.floor(slot/slotsPerDay)*V21_DAY+(slot%slotsPerDay)*V22_SLOT_MIN*60000; inSlot++; });
    ev.endMs=Math.max(...br.matches.map(m=>m.at))+V22_SLOT_MIN*60000;
    ev.nextRoundAt=ev.startMs; ev.status='scheduled';
  }
  // Repair incomplete timestamps in older/imported parallel brackets without touching played matches or valid slots.
  function v22RepairMatchTimes(ev){
    const matches=ev?.br?.matches; const start=Number(ev?.startMs)||0;
    if(!Array.isArray(matches)||!matches.length||!start) return false;
    // This path runs for active tournaments on every due scheduler pulse.
    // Most brackets already have valid timestamps: return after a single linear scan.
    let hasMissing=false;
    for(const m of matches){ const at=Number(m?.at); if(!Number.isFinite(at)||at<=0){ hasMissing=true; break; } }
    if(!hasMissing) return false;
    // Rebuild missing slots in O(matches + waves), not waves × matches.
    const groups=new Map();
    for(const m of matches){
      const wave=Number(m?.wave)||0;
      if(!groups.has(wave)) groups.set(wave,[]);
      groups.get(wave).push(m);
    }
    const waves=[...groups.keys()].sort((a,b)=>a-b);
    const perDay=ev.qual?V22_QUAL_SLOTS_PER_DAY:V22_PER_DAY;
    let baseSlot=0, changed=false;
    waves.forEach(wave=>{
      const group=groups.get(wave);
      group.forEach((m,i)=>{
        const at=Number(m.at);
        if(!Number.isFinite(at)||at<=0){
          const slot=baseSlot+Math.floor(i/2);
          m.at=start+Math.floor(slot/perDay)*V21_DAY+(slot%perDay)*V22_SLOT_MIN*60000;
          changed=true;
        }
      });
      baseSlot+=Math.max(1,Math.ceil(group.length/2));
    });
    return changed;
  }
  function v22Migrate(ev){
    if(!ev.format) ev.format=v22Fmt(ev.kind,ev.tier,Number(String(ev.id).split('-')[2])||0);
    const need=v22Size(ev.kind,ev.format,ev.tier); ev.participants=v22Names(ev.participants).slice(0,need);
    ev.status='scheduled'; ev.completedAt=0; v22BuildBracket(ev);
  }
  function v22SwissPair(ev,ix,m){
    const rd=ev.br.rounds[m.r]; if(rd.paired) return; rd.paired=true;
    if(ev.br.swissV===2){
      // v89: пары внутри одинакового счёта (2-0 с 2-0, 1-1 с 1-1…), сильнейший по посеву/Бухгольцу — со слабейшим, без повторов
      const played=new Set(ev.br.matches.filter(x=>x.w&&x.t1&&x.t2).map(x=>[x.t1,x.t2].sort().join('|')));
      const active=v89SwissRank(ev).filter(x=>!x.st);
      const groups=new Map(); active.forEach(x=>{ const k=x.wins+'-'+x.losses; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(x.team); });
      const ok=(x,y)=>!played.has([x,y].sort().join('|'));
      // перебор с возвратом: сильнейший — с самым слабым возможным соперником без повторной встречи
      const pairUp=list=>{ if(!list.length) return []; const [a,...rest]=list;
        for(let i=rest.length-1;i>=0;i--){ if(!ok(a,rest[i])) continue; const sub=pairUp(rest.filter((_,k)=>k!==i)); if(sub) return [[a,rest[i]],...sub]; }
        return null; };
      const greedy=list=>{ const left=list.slice(), out=[]; while(left.length>1){ const a=left.shift(); let j=left.length-1; for(let i=left.length-1;i>=0;i--) if(ok(a,left[i])){ j=i; break; } out.push([a,left.splice(j,1)[0]]); } return out; };
      const pairs=[]; let carry=[];
      [...groups.values()].forEach(g=>{ let list=carry.concat(g); carry=[];
        if(list.length%2){ carry=[list.pop()]; }            // нечётная группа: слабейший «спускается» в следующую
        let got=pairUp(list);
        if(!got&&carry.length){ // попробуем спустить другого
          for(let i=list.length-1;i>=0&&!got;i--){ const alt=list.slice(); const [x]=alt.splice(i,1,carry[0]); const g2=pairUp(alt); if(g2){ got=g2; carry=[x]; } } }
        pairs.push(...(got||greedy(list))); });
      if(carry.length>1) pairs.push(...greedy(carry));
      rd.ids.forEach((id,i)=>{ if(pairs[i]){ ix[id].t1=pairs[i][0]; ix[id].t2=pairs[i][1]; } });
      return;
    }
    const played=new Set(ev.br.matches.filter(x=>x.w).map(x=>[x.t1,x.t2].sort().join('|')));
    const left=ev.standings.slice().sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.pts-a.pts).map(x=>x.team), pairs=[];
    while(left.length>1){ const a=left.shift(); let j=left.findIndex(b=>!played.has([a,b].sort().join('|'))); if(j<0) j=0; pairs.push([a,left.splice(j,1)[0]]); }
    rd.ids.forEach((id,i)=>{ if(pairs[i]){ ix[id].t1=pairs[i][0]; ix[id].t2=pairs[i][1]; } });
  }
  function v22Finish(ev,now){
    const br=ev.br; ev.status='completed'; ev.completedAt=now;
    const wins={},loss={}; br.matches.forEach(m=>{ if(m.w&&m.l&&m.sc!=='w/o'){ wins[m.w]=(wins[m.w]||0)+1; loss[m.l]=(loss[m.l]||0)+1; } });
    let order;
    if(br.swiss&&br.swissV===2){
      // v89: места — по плей-офф (финал, полуфиналы, четвертьфиналы — по посеву Swiss), затем по итогам Swiss
      const ix=v22Idx(br), seedOf=n=>(br.swissSeeds||[]).indexOf(n), po=br.matches.filter(m=>!v89IsSwissM(br,m)&&m.w&&m.l&&m.l!=='—');
      const fin=ix[br.finalId]||{}; order=[]; const push=n=>{ if(n&&n!=='—'&&!order.includes(n)) order.push(n); };
      push(fin.w); push(fin.l);
      const byWave=new Map(); po.forEach(m=>{ if(m.id===br.finalId) return; if(!byWave.has(m.wave)) byWave.set(m.wave,[]); byWave.get(m.wave).push(m.l); });
      [...byWave.keys()].sort((a,b)=>b-a).forEach(w=>byWave.get(w).sort((a,b)=>seedOf(a)-seedOf(b)).forEach(push));
      v89SwissRank(ev).forEach(x=>push(x.team));
    }
    else if(br.swiss){ ev.standings.sort((a,b)=>b.pts-a.pts||b.wins-a.wins||a.losses-b.losses); order=ev.standings.map(x=>x.team); }
    else { const f=v22Idx(br)[br.finalId]||{};
      order=ev.participants.slice().sort((a,b)=>(a===f.w?-1:b===f.w?1:a===f.l?-1:b===f.l?1:0)||((wins[b]||0)-(wins[a]||0))||((loss[a]||0)-(loss[b]||0)));
      ev.standings=order.map(t=>({team:t,wins:wins[t]||0,losses:loss[t]||0,pts:(wins[t]||0)*3})); }
    ev.winner=order[0]; ev.placements=order;
    if (typeof window.hubArchiveParallel === 'function') {
      try { window.hubArchiveParallel(ev); } catch (e) { console.warn('[HLTV Hub] parallel archive failed', e); }
    }
    const hubArchiveId = 'P-' + ev.id;
    const vrsChanges=window.CS2VRSModel?.version>=2 ? window.CS2VRSModel.recordParallelFinish(ev,order,teams) : {};
    try { window.V41?.recordParallel?.(ev,order); } catch(e){ console.warn('[v89] HLTV ranking parallel',e); } // v89: HLTV World Ranking видит и фоновые турниры
    order.forEach((name,i)=>{ const t=teams.find(x=>x.name===name); if(!t) return; t.history=t.history||[];
      const award=Number(vrsChanges[name])||0;
      t.history.unshift({tournament:ev.name,season:ev.season,place:i+1,placeTitle:i===0?'🏆 Фоновый турнир':'Фоновый турнир',fieldProfile:ev.fieldProfile,delta:award,archiveId:hubArchiveId}); });
  }
  function v22Advance(ev,now,fastForward=false,maxMatches=Infinity){
    const br=ev.br, ix=v22Idx(br); let ch=false, processed=0;
    const budget=Number.isFinite(Number(maxMatches))?Math.max(1,Math.floor(Number(maxMatches))):Infinity;
    for(const m of br.matches){
      if(m.w) continue;
      if(now<m.at+V22_RESOLVE_MIN*60000) continue;
      if(processed>=budget) break;
      processed++;
      if(br.swiss&&!m.t1&&(br.swissV!==2||v89IsSwissM(br,m))) v22SwissPair(ev,ix,m);
      if(br.swissV===2) v89SwissSeeds(ev);
      v22Fill(br,ix);
      if(!m.t1||!m.t2){ m.w=m.t1||m.t2||'—'; m.l='—'; m.sc='w/o'; ch=true; continue; }
      const a=teams.find(t=>t.name===m.t1), b=teams.find(t=>t.name===m.t2);
      if(!a||!b){ m.w=a?m.t1:m.t2; m.l=a?m.t2:m.t1; m.sc='w/o'; ch=true; continue; }
      if(!fastForward){ try{ const q=calcMatchOdds(m.t1,m.t2,false); if(q) m.o={c1:q.c1,c2:q.c2,p1:q.pct1,p2:q.pct2}; }catch(e){} }
      const res=v22Series(a,b);
      m.w=res.winner; m.l=res.loser; m.sc=res.score; m.maps=res.maps; ch=true;
      if(br.swiss&&(br.swissV!==2||v89IsSwissM(br,m))) v89SwissRecord(ev,m.w,m.l);
      v21ApplyBgMatch(a,b,res.winner,ev,m);
      ev.results.unshift({round:m.r+1,at:m.at,t1:m.t1,t2:m.t2,winner:m.w,loser:m.l,score:m.sc,vrs:m.vrs||null});
    }
    v22Fill(br,ix);
    if(br.matches.length&&br.matches.every(m=>m.w)){
      if(!ev.winner){ v22Finish(ev,now); ch=true; }
      else if(ev.status!=='completed'){
        // Some old/imported saves persisted the winner before the completion status.
        // Mark it terminal once; otherwise the wake index would keep returning `now`
        // and the scheduler would poll the same finished bracket forever.
        ev.status='completed'; ev.completedAt=Number(ev.completedAt)||now; ch=true;
      }
    }
    ev.__v21AdvanceProcessed=processed;
    return ch;
  }
  let v22OpenId=null, v22Sig='';
  // Перестраивает только будущие незавершённые Tier-2/3 события старых сохранений.
  // Уже начатые и завершённые турниры остаются нетронутыми.
  function v22ExpandFutureFields(now){
    const S=seasonState, all=(S.parallelSchedule||[]), live=all.filter(e=>e.status==='live');
    let changed=false;
    const occupied=[];
    live.forEach(e=>occupied.push(e));
    try{ if(currentTournament&&!currentTournament.completed) occupied.push({startMs:now-1,endMs:now+6*V21_DAY,participants:v22Names(currentTournament.participants),status:'live'}); }catch(e){}
    const future=all.filter(e=>e&&e.season===S.currentSeason&&!e.qual&&e.kind!=='academy'&&e.status==='scheduled'&&Number(e.startMs)>now)
      .sort((a,b)=>a.startMs-b.startMs);
    future.forEach((ev,index)=>{
      if(Number(ev.fieldVersion)>=5) { occupied.push(ev); return; }
      // Старые 8-командные GSL-турниры больше не должны ограничивать региональный календарь.
      if(ev.kind!=='academy' && ev.format==='gsl') ev.format=(index%4===1)?'double':'single';
      const need=v22Size(ev.kind,ev.format,ev.tier), minNeed=v22MinField(ev);
      const busy=new Set();
      occupied.forEach(o=>{
        const os=Number(o.startMs)||0, oe=Number(o.endMs)||os+3*V21_DAY;
        if(os<Number(ev.startMs)+3*V21_DAY&&oe>Number(ev.startMs)) v22Names(o.participants).forEach(n=>busy.add(n));
      });
      v22Tier1Windows().forEach(w=>{ if(w[0]<Number(ev.startMs)+3*V21_DAY&&w[1]>Number(ev.startMs)) teams.filter(t=>!t.isAcademy).sort((a,b)=>b.pts-a.pts).slice(0,20).forEach(t=>busy.add(t.name)); });
      const seed=(Number(String(ev.id).split('-')[2])||index)+Number(S.currentSeason||1)*29;
      let picked=v22Names(v21PickParticipants(ev.kind,seed,need,busy));
      // Если расписание старого сейва уже заняло часть пула, постепенно расширяем поиск.
      if(picked.length<need){
        const relaxed=new Set([...busy]);
        const top=teams.filter(t=>!t.isAcademy).sort((a,b)=>b.pts-a.pts).slice(0,8).map(t=>t.name);
        top.forEach(n=>relaxed.delete(n));
        picked=v22Names(v21PickParticipants(ev.kind,seed+17,need,relaxed));
      }
      if(picked.length>=minNeed){
        ev.participants=picked.slice(0,need);
        v22BuildBracket(ev);
        ev.fieldVersion=5;
        changed=true;
      } else {
        // Повторяем подбор при следующем тике; не фиксируем неполное поле как обновлённое.
        ev.fieldVersion=2;
      }
      occupied.push(ev);
    });
    return changed;
  }

  let v21NextParallelWakeAt = 0, v21LastParallelSeason = 0;
  let v21LastTier1SyncDay = -1, v21LastSwitcherWall = 0, v21ImportReconcilePromise = null;
  function v21InvalidateParallelWake(reason='state changed'){
    v21NextParallelWakeAt = 0;
    v21LastParallelSeason = 0;
    v21LastTier1SyncDay = -1;
    window.__CS2_PARALLEL_WAKE_INVALID_REASON = String(reason || 'state changed');
    return true;
  }
  window.v21InvalidateParallelWake = v21InvalidateParallelWake;
  function v21ComputeNextParallelWake(now){
    const S=seasonState, season=Number(S.currentSeason)||1, idx=Math.max(1,Number(S.tournamentIndex)||1);
    let next=Infinity;
    const events=S.parallelSchedule||[];
    // Не проверяем 70+ фоновых турниров каждые 1.5 секунды: просыпаемся только
    // к старту события или к моменту готовности следующего матча.
    events.forEach(ev=>{
      if(!ev||Number(ev.season)!==season||ev.status==='completed'||ev.status==='cancelled') return;
      if(ev.status==='scheduled') next=Math.min(next,Math.max(now,Number(ev.startMs)||now));
      else if(ev.status==='live'){
        const matches=Array.isArray(ev.br?.matches)?ev.br.matches:[];
        let eventWake=Infinity, hasPending=false;
        // Imported brackets can have unsorted legacy slots. Wake on the earliest
        // unresolved match, not simply the first array item, or an overdue match
        // later in the array can remain stuck behind a future timestamp.
        for(const match of matches){
          if(match?.w) continue;
          hasPending=true;
          eventWake=Math.min(eventWake,window.CS2ParallelMatchTiming.nextWake(match,now));
        }
        if(hasPending && Number.isFinite(eventWake)) next=Math.min(next,eventWake);
        else if(matches.length) next=Math.min(next,now);
      }
    });
    // Квалификации создаются за 42 дня, Major roster lock — за сутки.
    const sch=S.seasonSchedule||[];
    for(let i=idx;i<sch.length;i++){
      const st=sch[i], start=Number(st?.calendar?.startMs)||0; if(!start) continue;
      if(st.type==='major'){
        if(!st.v45RosterLockedAt) next=Math.min(next,Math.max(now,start-V21_DAY));
        continue;
      }
      if(String(st.format||'').toLowerCase()==='bounty') continue;
      const slots=(Number(st.size)||16)-V35_INVITES;
      if(slots<=0) continue;
      const has=events.some(e=>e?.qual&&Number(e.qual.step)===i&&Number(e.season)===season);
      if(!has && now<start) next=Math.min(next,Math.max(now,start-42*V21_DAY));
    }
    return Number.isFinite(next)?next:Infinity;
  }
  function v21CountOverdueMatches(now=v21Now(), eventIds=null){
    const season=Number(seasonState.currentSeason)||1; let count=0;
    for(const ev of (seasonState.parallelSchedule||[])){
      if(!ev || Number(ev.season)!==season || ['completed','cancelled'].includes(ev.status)) continue;
      if(ev.status==='scheduled' && Number(ev.startMs||0)>now) continue;
      if(eventIds && !eventIds.has(String(ev.id))) continue;
      for(const m of (ev.br?.matches||[])){
        if(m?.w) continue;
        const due=(Number(m?.at)||0)+V22_RESOLVE_MIN*60000;
        if(due<=now) count++;
      }
    }
    return count;
  }
  function v21HasOverdueMatches(now=v21Now(), eventIds=null){ return v21CountOverdueMatches(now,eventIds)>0; }
  function v21CollectOverdueEventIds(now=v21Now()){
    const season=Number(seasonState.currentSeason)||1, out=[];
    for(const ev of (seasonState.parallelSchedule||[])){
      if(!ev || Number(ev.season)!==season || ['completed','cancelled'].includes(ev.status)) continue;
      if(ev.status==='scheduled' && Number(ev.startMs||0)>now) continue;
      let earliest=Infinity, count=0;
      for(const m of (ev.br?.matches||[])){
        if(m?.w) continue;
        const due=(Number(m?.at)||0)+V22_RESOLVE_MIN*60000;
        if(due<=now){ count++; if(due<earliest) earliest=due; }
      }
      if(count) out.push({id:String(ev.id),earliest,count});
    }
    out.sort((a,b)=>a.earliest-b.earliest || a.id.localeCompare(b.id));
    return out;
  }
  function v21YieldBatchFrame(){
    return new Promise(resolve=>{
      try{
        if(document.visibilityState!=='hidden' && typeof requestAnimationFrame==='function') requestAnimationFrame(()=>resolve());
        else setTimeout(resolve,4);
      }catch(e){setTimeout(resolve,4);}
    });
  }
  async function v21ProcessOverdueCooperative(options={}){
    if(window.__CS2_IMPORT_RECONCILING || window.__CS2_FACTORY_RESET_IN_PROGRESS || v21Cal().paused){
      const blocked={processedMatches:0,yields:0,maxSliceMs:0,remainingOverdue:v21CountOverdueMatches(v21Now()),blockedEvents:[],elapsedMs:0,stopped:true};
      window.v21LastCooperativeCatchup=blocked;
      return {changed:false,result:blocked};
    }
    const now=v21Now(), started=window.performance?.now?window.performance.now():Date.now();
    const shouldStop=typeof options.shouldStop==='function'?options.shouldStop:()=>false;
    let changed=false, processedMatches=0, yields=0, maxSliceMs=0, blockedEvents=[];
    const maxMatches=Math.max(1,Math.min(20000,Number(options.maxMatches)||12000));
    const events=v21CollectOverdueEventIds(now);
    for(const item of events){
      if(shouldStop() || processedMatches>=maxMatches) break;
      const eventId=item.id;
      let guard=0;
      while(guard++<maxMatches && processedMatches<maxMatches && !shouldStop()){
        const before=v21CountOverdueMatches(now,new Set([eventId]));
        if(!before) break;
        const sliceStart=window.performance?.now?window.performance.now():Date.now();
        let stepChanged=false;
        try{
          stepChanged=v21ProcessParallel(now,true,{deferIO:true,eventIds:[eventId],skipGlobalMaintenance:true,skipWakeRecompute:true,skipBacklogRecompute:true,matchBudget:1});
        }catch(e){console.warn('[v21] cooperative overdue match failed',eventId,e);}
        const after=v21CountOverdueMatches(now,new Set([eventId]));
        const sliceMs=Math.max(0,(window.performance?.now?window.performance.now():Date.now())-sliceStart);
        maxSliceMs=Math.max(maxSliceMs,sliceMs);
        if(after>=before || !stepChanged){ blockedEvents.push({id:eventId,before,after}); break; }
        processedMatches+=Math.max(1,before-after); changed=true;
        // One match per browser frame keeps long skips responsive and lets the
        // user stop the operation without waiting for an entire tournament batch.
        yields++;
        await v21YieldBatchFrame();
      }
    }
    const backlog=v21HasOverdueMatches(now);
    window.__CS2_PARALLEL_CATCHUP=backlog;
    if(changed){
      window.v21DeferredParallelChanges=true;
      if(!v21DeferredSinceWall) v21DeferredSinceWall=Date.now();
    }
    // Rebuild the next-wake index once after the cooperative drain, not after
    // every individual match.
    v21NextParallelWakeAt=v21ComputeNextParallelWake(now);
    v21LastParallelSeason=Number(seasonState.currentSeason)||1;
    const elapsed=Math.max(0,(window.performance?.now?window.performance.now():Date.now())-started);
    const result={processedMatches,yields,maxSliceMs:Math.round(maxSliceMs*100)/100,remainingOverdue:v21CountOverdueMatches(now),blockedEvents,elapsedMs:Math.round(elapsed),stopped:!!shouldStop()};
    window.v21LastCooperativeCatchup=result;
    return {changed,result};
  }
  window.v21ProcessOverdueCooperative=v21ProcessOverdueCooperative;
  window.CS2ParallelSchedulerDiagnostics=()=>{
    const now=v21Now(), season=Number(seasonState.currentSeason)||1;
    const events=(seasonState.parallelSchedule||[]).filter(e=>e&&Number(e.season)===season&&!['completed','cancelled'].includes(e.status));
    const pending=events.reduce((n,e)=>n+(e.br?.matches||[]).filter(m=>!m.w).length,0);
    const overdueEvents=v21CollectOverdueEventIds(now);
    return {now,nextWakeAt:v21NextParallelWakeAt,activeEvents:events.filter(e=>e.status==='live').length,pendingMatches:pending,overdueMatches:v21CountOverdueMatches(now),overdueEventIds:overdueEvents.map(x=>x.id),overdueEventCount:overdueEvents.length,lastCooperativeCatchup:window.v21LastCooperativeCatchup||null,importReconciling:!!window.__CS2_IMPORT_RECONCILING,catchup:!!window.__CS2_PARALLEL_CATCHUP,paused:!!v21Cal().paused};
  };
  let v21DeferredSinceWall=0;
  function v21ProcessParallel(now, force=false, options={}){
    const opts = options && typeof options === 'object' ? options : {};
    const eventIds = Array.isArray(opts.eventIds) ? new Set(opts.eventIds.map(String)) : null;
    // During import catch-up, the yielding owner processes explicit event batches.
    // Never let the regular timer start a second pass over the same imported state.
    if (window.__CS2_IMPORT_RECONCILING && !opts.importBatch) return false;
    // Background brackets share the same virtual clock as the main calendar.
    if (window.__CS2_FACTORY_RESET_IN_PROGRESS) return false;
    if (v21Cal().paused) return false;
    const activeSeason=Number(seasonState.currentSeason)||1;
    if (!opts.skipGlobalMaintenance) {
      if(!force && activeSeason===v21LastParallelSeason && Array.isArray(seasonState.parallelSchedule) && seasonState.parallelSchedule.length && now < v21NextParallelWakeAt) return false;
      v21NormalizeState(); if(!seasonState.parallelSchedule.length) v21BuildParallelSchedule();
      if(activeSeason!==v21LastParallelSeason){ v21LastParallelSeason=activeSeason; force=true; }
      if(!force && now < v21NextParallelWakeAt) return false;
    } else if (!Array.isArray(seasonState.parallelSchedule)) return false;
    let changed=false;
    // Process a bounded number of overdue background series per dispatcher pulse.
    // This prevents a large imported save from monopolising Chromium's main thread.
    let matchBudget=Number.isFinite(Number(opts.matchBudget))?Math.max(1,Math.floor(Number(opts.matchBudget))):8;
    if(!opts.skipGlobalMaintenance && !seasonState.parallelState.v23){
      const evs=seasonState.parallelSchedule.filter(e=>e.season===seasonState.currentSeason);
      const fixed=evs.filter(e=>e.status==='live'||e.status==='completed'||now>=e.startMs);
      const flex=evs.filter(e=>!fixed.includes(e)).sort((a,b)=>a.startMs-b.startMs);
      flex.forEach(e=>{ if(!e.format) e.format=v22Fmt(e.kind,e.tier,Number(String(e.id).split('-')[2])||0); e.participants=v22Names(e.participants); });
      try{ v22Assign(flex,fixed); }catch(e){ console.warn('[v23] reassign',e); }
      seasonState.parallelState.v23=true; changed=true;
    }
    if(!opts.skipGlobalMaintenance){
      try{ if(v35EnsureQuals(now)) changed=true; if(v35Realign()) changed=true; }catch(e){ console.warn('[v35] quals',e); }
      try{ if(v22ExpandFutureFields(now)) changed=true; }catch(e){ console.warn('[v27] field expansion',e); }
    }
    // v84: бюджет матчей ограничивает только число сыгранных матчей. Старт всех турниров, чья дата наступила,
    // от бюджета не зависит — раньше цикл обрывался на первом событии, и квалификации Америк/Азии
    // стартовали с опозданием на дни (а в многодневной перемотке — не стартовали вовсе).
    let budgetDone=false;
    for(const ev of seasonState.parallelSchedule){
      if(eventIds && !eventIds.has(String(ev?.id))) continue;
      if(ev.season!==seasonState.currentSeason||ev.status==='completed'||ev.status==='cancelled') continue;
      if(!ev.br&&!ev.qual){ v22Migrate(ev); changed=true; }
      if(ev.br && v22RepairMatchTimes(ev)) changed=true;
      if(now<ev.startMs) continue;
      if(ev.status==='scheduled'){ try{ if(ev.qual) v35QualFill(ev); else v22SwapBusy(ev); }catch(e){ console.warn('[v23] swap',e); } if(ev.status!=='completed') ev.status='live'; changed=true; }
      if(ev.status==='completed') continue;
      if(budgetDone) continue;
      // После большого пропуска odds-проценты фоновых матчей не нужны для истории;
      // не запускаем тяжёлый live-расчёт коэффициентов на сотнях догоняющих матчей.
      const fastForward = now - (Number(ev.startMs)||now) >= 2*V21_DAY;
      const beforeCount=Number(matchBudget);
      if(v22Advance(ev,now,fastForward,matchBudget)) changed=true;
      const used=Math.max(0,Number(ev.__v21AdvanceProcessed)||0); delete ev.__v21AdvanceProcessed;
      matchBudget=Math.max(0,beforeCount-used);
      if(matchBudget<=0) budgetDone=true;
    }
    seasonState.parallelState.lastRunMs=now;
    if (!opts.skipWakeRecompute) {
      v21NextParallelWakeAt=v21ComputeNextParallelWake(now);
      v21LastParallelSeason=activeSeason;
    }
    // During one-at-a-time cooperative catch-up the caller already tracks the
    // selected event's progress. Avoid rescanning every bracket (often 1,700+
    // matches in old saves) after each single match; do one global scan at the end.
    const backlog=opts.skipBacklogRecompute ? true : v21HasOverdueMatches(now);
    if(!opts.skipBacklogRecompute) window.__CS2_PARALLEL_CATCHUP=backlog;
    if(changed && (opts.deferIO || backlog)){
      window.v21DeferredParallelChanges=true;
      if(!v21DeferredSinceWall) v21DeferredSinceWall=Date.now();
    }
    const hadDeferred=!!window.v21DeferredParallelChanges;
    // Do not serialise the entire league or repaint the full rating table after
    // every small catch-up batch. Save a checkpoint at most every 20 s during a
    // very large backlog, then perform one full render when the queue is clear.
    const checkpoint=backlog && hadDeferred && v21DeferredSinceWall && Date.now()-v21DeferredSinceWall>=20000;
    const shouldCommit=!opts.deferIO && !backlog && (changed || hadDeferred);
    if(!opts.deferIO && (shouldCommit || checkpoint)){
      try{saveTeams();saveSeasonState();if(shouldCommit) renderRating();}catch(e){}
      window.v21DeferredParallelChanges=backlog;
      v21DeferredSinceWall=backlog?Date.now():0;
    }
    if(!opts.deferIO && !backlog){
      v21RenderSwitcher();
      if(v22OpenId&&document.getElementById('v21-parallel-modal')?.classList.contains('open')) v21OpenTournament(v22OpenId,true);
    }
    return changed || (!opts.deferIO && hadDeferred && !backlog);
  }
  function v22Progress(e){ const ms=e.br?.matches||[]; return `${ms.filter(m=>m.w).length}/${ms.length} матчей`; }
  // В таблице «Турниры сейчас» — только основной турнир и реально идущие параллельные. Остальные смотрим в календаре.
  function v21CurrentItems(){
    const arr=[]; const now=v21Now();
    if(currentTournament&&!currentTournament.completed){ const run=!!currentTournament.broadcast?.running; arr.push({main:true,id:'main',name:currentTournament.name,tier:'1',status:run?'live':'scheduled',meta:run?'Эфир идёт • основной турнир':'Основной турнир • ожидание слота'}); }
    (seasonState.parallelSchedule||[]).filter(e=>e.season===seasonState.currentSeason&&e.status==='live'&&now>=e.startMs).forEach(e=>arr.push({id:e.id,name:e.name,tier:e.kind==='academy'?'academy':e.tier,status:'live',meta:`${V22_FMT_LABEL[e.format]||''} • ${v22Progress(e)}`}));
    return arr;
  }
  function v21RenderSwitcher(){
    const box=document.getElementById('v21-ts-list'), count=document.getElementById('v21-ts-count'); if(!box) return;
    const items=v21CurrentItems(); if(count) count.textContent=`${items.length} идут сейчас`;
    if(!items.length){ const now=v21Now(); const nx=(seasonState.parallelSchedule||[]).filter(e=>e.season===seasonState.currentSeason&&e.startMs>now).sort((a,b)=>a.startMs-b.startMs)[0];
      box.innerHTML=`<div style="font-size:8px;color:var(--text-muted);padding:4px;">Параллельных турниров сейчас нет${nx?` • ближайший: ${v21Esc(nx.name)} (${v22Fmtd(nx.startMs)})`:''}. Всё расписание — в календаре.</div>`; return; }
    box.innerHTML=items.map(x=>{ const live=x.status==='live', dot=x.tier==='2'?'t2':x.tier==='3'?'t3':x.tier==='academy'?'academy':'';
      return `<div class="v21-ts-card ${live?'live':''} ${x.main?'focus':''}"><span class="v21-ts-dot ${dot} ${live?'live':''}"></span><div class="v21-ts-main"><div class="v21-ts-name">${v21Esc(x.name)}</div><div class="v21-ts-meta">${v21Esc(x.meta)}</div></div><button type="button" class="secondary v21-ts-open" onclick="v21OpenTournament('${x.id}')">${x.main?'Фокус':'Открыть'}</button></div>`; }).join('');
  }
  // ===== v23: без двойных участий, реальные детали матчей, ремонт расписания Tier-1 =====
  function v22Sod(ms){ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
  function v22Tier1Windows(){
    const idx=Number(seasonState.tournamentIndex)||1;
    return (seasonState.seasonSchedule||[]).map((s,i)=>(s&&s.calendar&&s.calendar.startMs&&i>=idx)?[s.calendar.startMs-V21_DAY,(s.calendar.endMs||s.calendar.startMs+4*V21_DAY)+V21_DAY]:null).filter(Boolean);
  }
  // ===== v35: квалификации к турнирам Tier-1 (как в реальности: прямые инвайты + места из региональных квалификаций) =====
  // Турнир на N команд: 12 прямых приглашений по рейтингу, остальные места — закрытые квалификации Европы, Америки и Азии
  // (Европа — половина мест, остаток поровну Америке и Азии). Перед европейской и американской закрытыми — открытые:
  // их финалисты попадают в закрытую. Квалификации создаются заранее в 42-дневном окне; приглашения фиксируются, когда
  // стартует первая квалификация; составы квалификаций — по рейтингу региона на момент старта.
  const V35_INVITES = 12, V35_ASIA = new Set(['CN','MN','KR','JP','AU','NZ','ID','TH','PH','MY','SG','IN','VN','HK','TW','KH','PK']),
    V35_AM = new Set(['BR','AR','US','CA','CL','UY','MX','PE','CO','VE','EC','PY','BO','GT','CR']), V35_RN = { EU: 'Europe', AM: 'Americas', AS: 'Asia' };
  function v35Region(t){
    // One region classifier for qualifier invitations and Major quotas.
    // v40 loads after this file, but qualification events are generated later.
    try { const r=window.CS2Realism?.regionOfTeam?.(t); if(r) return r; } catch(e) {}
    const def=(window.CS2_REAL?.newTeams||[]).find(d=>d.name===t.name); if(def?.region) return def.region;
    const cc=(t.players||[]).slice(0,5).map(p=>p.country);
    if(cc.filter(c=>V35_ASIA.has(c)).length>=3) return 'AS'; if(cc.filter(c=>V35_AM.has(c)).length>=3) return 'AM'; return 'EU';
  }
  window.v35Region=v35Region;
  function v35Split(slots){ const eu=Math.ceil(slots/2), rest=slots-eu, am=Math.ceil(rest/2); return { EU: eu, AM: am, AS: rest-am }; }
  function v35QualEvent(step,i,region,stage,startMs,slots,feeds){
    const year=2026+(Number(seasonState.currentSeason||1)-1), size=stage==='open'?(region==='EU'?16:8):8;
    return { id:`S${seasonState.currentSeason}-Q-${i}-${region}-${stage}`, season:seasonState.currentSeason, year, tier:stage==='open'?'3':'2', kind:'qual',
      name:`${step.name} — ${V35_RN[region]} ${stage==='open'?'Open':'Closed'} Qualifier`, fieldProfile:'weak', startMs, endMs:startMs+2*V21_DAY,
      prize:stage==='open'?5000:20000, pointsMult:stage==='open'?0.12:0.3, participants:[], format:'single', status:'scheduled', currentRound:0, matches:[], results:[],
      standings:[], winner:null, nextRoundAt:startMs, academyOnly:false, initialized:false, completedAt:0, size,
      qual:{ step:i, main:step.name, region, stage, slots, feeds:feeds||null } };
  }
  // Состав Major закрывается в отдельный Pick'Em Day — ровно за сутки до первого матча.
  // До этого момента список остаётся предварительным и пересчитывается по актуальному VRS.
  function v45PoolNames(pools){
    if(!pools) return null;
    const names = key => (pools[key] || []).map(t => typeof t === 'string' ? t : t?.name).filter(Boolean);
    const out = { stage3:names('stage3'), stage2:names('stage2'), stage1:names('stage1') };
    const flat = [...out.stage3, ...out.stage2, ...out.stage1];
    return out.stage3.length===8 && out.stage2.length===8 && out.stage1.length===16 && new Set(flat).size===32 ? out : null;
  }
  function v45StoredStagePools(st){
    if(!st) return null;
    const saved = v45PoolNames(st.v45StagePools);
    if(saved) return saved;
    // Старые сохранения v45 уже хранили канонический порядок: Stage 3, Stage 2, Stage 1.
    // Однократно мигрируем его в явные пулы, чтобы последующие изменения VRS не меняли стадии.
    const n = Array.isArray(st.v45Participants) ? st.v45Participants.filter(Boolean) : [];
    if(n.length < 32 || new Set(n.slice(0,32)).size !== 32) return null;
    const migrated = { stage3:n.slice(0,8), stage2:n.slice(8,16), stage1:n.slice(16,32) };
    st.v45StagePools = migrated;
    return migrated;
  }
  function v45LockMajorRoster(i, now){
    const st=(seasonState.seasonSchedule||[])[Number(i)]; if(!st||st.type!=='major'||!st.calendar?.startMs) return false;
    const start=Number(st.calendar.startMs), lockAt=start-(window.CS2_PICKEM_LEAD_DAYS||4)*V21_DAY, clock=Number(now)||v21Now(); // v84: состав и Pick'Em — за 4 дня до старта
    if(clock<lockAt) return false;
    if(st.v45RosterLockedAt && Array.isArray(st.v45Participants) && st.v45Participants.length){
      const hadPools = !!v45PoolNames(st.v45StagePools);
      const migrated = v45StoredStagePools(st);
      if(migrated && !hadPools) try{saveSeasonState();}catch(e){}
      return false;
    }
    try{
      const invited=window.CS2Realism?.majorInvites?.(teams)||teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,32);
      const names=invited.map(t=>typeof t==='string'?t:t.name).filter(Boolean).slice(0,32);
      const objs=names.map(n=>teams.find(t=>t.name===n)).filter(Boolean);
      let pools=null;
      try{ pools=window.CS2Realism?.majorPools?.(objs)||null; }catch(e){}
      const saved=v45PoolNames(pools);
      st.v45Participants=saved?[...saved.stage3,...saved.stage2,...saved.stage1]:names;
      st.v45StagePools=saved || (names.length===32?{stage3:names.slice(0,8),stage2:names.slice(8,16),stage1:names.slice(16,32)}:null);
      st.v45RosterLockedAt=lockAt; st.v45RosterLockVersion=2;
      try{saveSeasonState();}catch(e){}
      return true;
    }catch(e){ console.warn('[v45] lock major roster',e); return false; }
  }
  window.v45LockMajorRoster=v45LockMajorRoster;
  window.v45MajorStagePools=i=>v45StoredStagePools((seasonState.seasonSchedule||[])[Number(i)]);
  function v45MajorRosterState(i, now){
    const st=(seasonState.seasonSchedule||[])[Number(i)]; if(!st||st.type!=='major') return {locked:false,names:[],pools:null,lockAt:0};
    v45LockMajorRoster(i,now);
    const start=Number(st.calendar?.startMs)||0, lockAt=start?start-V21_DAY:0;
    const locked=!!(st.v45RosterLockedAt&&Array.isArray(st.v45Participants)&&st.v45Participants.length);
    const pools=locked?v45StoredStagePools(st):null;
    const names=locked?(pools?[...pools.stage3,...pools.stage2,...pools.stage1]:st.v45Participants.slice()):((window.CS2Realism?.majorInvites?.(teams)||teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,32)).map(t=>typeof t==='string'?t:t.name).filter(Boolean).slice(0,32));
    return {locked,names,pools,lockAt,lockedAt:Number(st.v45RosterLockedAt)||0};
  }
  window.v45MajorRosterState=v45MajorRosterState;

  function v35EnsureQuals(now, forceStep){
    const S=seasonState, sch=S.seasonSchedule||[], idx=Number(S.tournamentIndex)||1; let ch=false;
    S.parallelSchedule=S.parallelSchedule||[];
    for(let i=idx;i<sch.length;i++){
      if(forceStep!=null && i!==Number(forceStep)) continue;
      const st=sch[i]; if(!st||!st.calendar?.startMs) continue;
      const start=Number(st.calendar.startMs);
      if(st.type==='major'){
        if(v45LockMajorRoster(i,now)) ch=true;
        continue;
      }
      if(String(st.format||'').toLowerCase()==='bounty') continue;
      const size=Number(st.size)||16, slots=size-V35_INVITES; if(slots<=0) continue;
      // Создаём квалификации в любом оставшемся окне до старта. Пропуск с 5-го на 2-й день
      // больше не должен обходить окно и запускать скрытый случайный отбор вместо победителей.
      if(forceStep==null && (start-now>42*V21_DAY || now>=start)) continue;
      if(S.parallelSchedule.some(e=>e.qual&&e.qual.step===i&&e.season===S.currentSeason)) continue;
      const at=(d,h)=>{ const x=new Date(start-d*V21_DAY); x.setHours(h,0,0,0); return x.getTime(); };
      const split=v35Split(slots);
      // Open starts 18 days before Tier-1, Closed starts 9 days before.
      // This gives the 16-team Open bracket enough real calendar slots to finish
      // before Closed and keeps the qualifier path visible during manual skips.
      ['EU','AM','AS'].forEach(r=>{ if(!split[r]) return;
        const closed=v35QualEvent(st,i,r,'closed',at(9,13),split[r]);
        if(r!=='AS'){ const op=v35QualEvent(st,i,r,'open',at(18,12),2,closed.id); S.parallelSchedule.push(op); }
        S.parallelSchedule.push(closed); });
      ch=true;
    }
    if(ch) S.parallelSchedule.sort((a,b)=>a.startMs-b.startMs);
    return ch;
  }
  window.v45EnsureQuals = function(now){ try { return v35EnsureQuals(Number(now)||v21Now()); } catch(e) { console.warn('[v45] ensure quals',e); return false; } };
  function v35Invites(i){ // приглашения фиксируются в момент старта первой квалификации; до этого — актуальный прогноз
    const st=(seasonState.seasonSchedule||[])[i]; if(!st) return { list:[], frozen:false };
    if(Array.isArray(st.v35Roster?.invites)) return { list:st.v35Roster.invites.slice(), frozen:true };
    if(Array.isArray(st.v35Invites)) return { list:st.v35Invites.slice(), frozen:true };
    // v84: приглашения — VRS + партнёрство с организатором + недавние титулы + представители регионов (CS2InviteList)
    try { const L=window.CS2InviteList?.(V35_INVITES, st); if(Array.isArray(L)&&L.length) return { list:L, frozen:false }; } catch(e){}
    return { list:teams.filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,V35_INVITES).map(t=>t.name), frozen:false };
  }
  function v35QualFill(ev){
    const q=ev.qual, st=(seasonState.seasonSchedule||[])[q.step];
    if(st&&!Array.isArray(st.v35Invites)) st.v35Invites=v35Invites(q.step).list;
    const inv=new Set(st?.v35Invites||[]), same=(seasonState.parallelSchedule||[]).filter(e=>e.qual&&e.qual.step===q.step&&e.season===ev.season);
    const pool=teams.filter(t=>!t.isAcademy&&!inv.has(t.name)&&v35Region(t)===q.region).sort((a,b)=>b.pts-a.pts).map(t=>t.name);
    let list;
    if(q.stage==='closed'){
      const op=same.find(e=>e.qual.feeds===ev.id), adv=op?(op.placements||[]).slice(0,op.qual.slots).filter(Boolean):[];
      // Закрытая квалификация состоит только из посева (верх рейтинга региона)
      // и фактических победителей Open. Нельзя повторно запускать участников Open.
      const openSlots=Number(op?.qual?.slots)||Number(q.slots)||0;
      const seededCount=Math.max(0,(ev.size||8)-openSlots);
      const seeded=pool.filter(n=>!adv.includes(n)).slice(0,seededCount);
      list=[...adv,...seeded];
      if(list.length<(ev.size||8)) list.push(...pool.filter(n=>!list.includes(n)).slice(0,(ev.size||8)-list.length));
      list=list.slice(0,ev.size||8);
    }else{
      const cl=same.find(e=>e.id===q.feeds), seededCount=Math.max(0,(cl?.size||8)-q.slots);
      // Верх рейтинга уже посеян в Closed; Open играет следующий слой регионального пула.
      list=pool.slice(seededCount,seededCount+(ev.size||16));
    }
    ev.participants=list; v22BuildBracket(ev);
  }
  // даты ещё не начавшихся квалификаций следуют за датой турнира (её двигают перемотки и раскладка календаря)
  function v35Realign(){
    const sch=seasonState.seasonSchedule||[]; let ch=false;
    (seasonState.parallelSchedule||[]).forEach(e=>{ if(!e.qual||e.status!=='scheduled'||e.season!==seasonState.currentSeason||e.qual.rebasedAt) return;
      const st=sch[e.qual.step], start=Number(st?.calendar?.startMs); if(!start) return;
      const x=new Date(start-(e.qual.stage==='open'?18:9)*V21_DAY); x.setHours(e.qual.stage==='open'?12:13,0,0,0);
      if(x.getTime()!==e.startMs){ e.startMs=x.getTime(); e.endMs=e.startMs+2*V21_DAY; e.nextRoundAt=e.startMs; ch=true; } });
    return ch;
  }
  // При запуске основного турнира фиксируем только те результаты квалификаций,
  // чьи игровые слоты действительно наступили. Никакого MAX_SAFE_INTEGER:
  // пропущенные пользователем матчи не должны завершаться мгновенно или на паузе.
  window.v35FinishQuals=i=>{
    const now=v21Now();
    const paused=!!v21Cal().paused;
    // Never simulate missed qualification matches from the Tier-1 tournament
    // creation callback. The parallel scheduler resolves them on their own
    // calendar slots; this method only locks the already-earned results.
    if(!paused){ try{ v35EnsureQuals(now); }catch(e){ console.warn('[v35] qualifier schedule sync',e); } }
    const qs=(seasonState.parallelSchedule||[]).filter(e=>e.qual&&e.qual.step===i&&e.season===seasonState.currentSeason);
    const st=(seasonState.seasonSchedule||[])[Number(i)];
    if(st){
      const invites=v35Invites(i).list.slice(0,V35_INVITES);
      const qualified=[...new Set(qs.filter(q=>q.qual.stage==='closed'&&q.status==='completed').flatMap(q=>(q.placements||[]).slice(0,q.qual.slots)))].filter(n=>!invites.includes(n));
      const used=new Set([...invites,...qualified]);
      const size=Number(st.size)||16;
      const atLarge=teams.filter(t=>!t.isAcademy&&!used.has(t.name)).sort((a,b)=>(b.pts||0)-(a.pts||0)).slice(0,Math.max(0,size-invites.length-qualified.length)).map(t=>t.name);
      const participants=[...new Set([...invites,...qualified,...atLarge])].slice(0,size);
      st.v35Roster={version:1,lockedAt:now,invites,qualified:[...new Set(qualified)],atLarge,participants,
        pendingQualifiers:qs.filter(q=>q.status!=='completed').map(q=>q.id)};
      st.v35Invites=invites.slice();
    }
    if(qs.length){ try{saveTeams();saveSeasonState();}catch(e){} }
    return (st && st.v35Roster) || null;
  };
  window.v35QualInfo=i=>{
    const st=(seasonState.seasonSchedule||[])[Number(i)], inv=v35Invites(i), quals=(seasonState.parallelSchedule||[]).filter(e=>e.qual&&e.qual.step===i&&e.season===seasonState.currentSeason);
    const winners=quals.filter(q=>q.qual.stage==='closed'&&q.status==='completed').flatMap(q=>(q.placements||[]).slice(0,q.qual.slots));
    const roster=st?.v35Roster||null;
    const invites=roster?.invites?.length?roster.invites.slice():inv.list.slice();
    const qualified=(roster?.qualified?.length?roster.qualified.slice():[...new Set(winners)]).filter(n=>!invites.includes(n));
    const atLarge=roster?.atLarge?.slice()||[];
    const participants=roster?.participants?.length?roster.participants.slice():[...new Set([...invites,...qualified,...atLarge])];
    return { invites, qualified, atLarge, participants, rosterLocked:!!roster, frozen:!!roster||inv.frozen, quals:quals.map(e=>({ id:'P-'+e.id, name:e.name, region:e.qual.region, stage:e.qual.stage, slots:e.qual.slots, status:e.status, startMs:e.startMs,
      winners:e.status==='completed'?(e.placements||[]).slice(0,e.qual.slots):[], placements:e.status==='completed'?(e.placements||[]).slice():[] })) };
  };
  // Для createTournament: только фактически приглашённые, победители закрытых квалификаций и прозрачные at-large слоты.
  window.v35QualSlots=i=>{ const info=window.v35QualInfo(i); if(!info.quals.length&&!info.rosterLocked) return null;
    return { invites:info.invites, qualified:info.qualified, atLarge:info.atLarge, participants:info.participants }; };

  // Команда не может играть два турнира одновременно: окна событий не пересекаются по составам.
  function v22Assign(list,fixed){
    const done=fixed.slice(), t1w=v22Tier1Windows();
    const top=new Set(teams.filter(t=>!t.isAcademy).sort((a,b)=>b.pts-a.pts).slice(0,20).map(t=>t.name));
    list.forEach((ev,i)=>{
      if(ev.qual) return;
      const need=Math.max(4,Math.min(64,Number(ev.size)||v22Size(ev.kind,ev.format,ev.tier))), minNeed=v22MinField(ev), seed=Number(String(ev.id).split('-')[2])||i, base=ev.startMs; let picked=null;
      for(let a=0;a<45&&!picked;a++){
        const s=base+a*V21_DAY, busy=new Set();
        done.forEach(o=>{ if(o.startMs<s+6*V21_DAY&&(o.endMs||o.startMs+3*V21_DAY)>s) v22Names(o.participants).forEach(n=>busy.add(n)); });
        if(t1w.some(w=>w[0]<s+5*V21_DAY&&w[1]>s)) top.forEach(n=>busy.add(n));
        ev.startMs=s;
        const p=v22Names(v21PickParticipants(ev.kind,seed,need,busy));
        if(p.length>=minNeed) picked=p;
      }
      if(picked){ ev.participants=picked.slice(0,need); v22BuildBracket(ev); ev.fieldVersion=5; }
      else { const dur=Math.max(2*V21_DAY,(Number(ev.endMs)||base+3*V21_DAY)-base); ev.participants=[]; ev.br=null; ev.matches=[]; ev.results=[]; ev.winner=null; ev.initialized=false; ev.status='scheduled'; ev.startMs=base+7*V21_DAY; ev.endMs=ev.startMs+dur; ev.nextRoundAt=ev.startMs+30*60000; }
      done.push(ev);
    });
  }
  // Перед стартом события заменяем команды, которые в этот момент уже играют основной турнир или другое live-событие.
  function v22SwapBusy(ev){
    if(ev.qual) return; // состав квалификации собирает v35QualFill
    const busy=new Set();
    try{ if(currentTournament&&!currentTournament.completed) v22Names(currentTournament.participants).forEach(n=>busy.add(n)); }catch(e){}
    (seasonState.parallelSchedule||[]).forEach(o=>{ if(o!==ev&&o.status==='live') v22Names(o.participants).forEach(n=>busy.add(n)); });
    // занятых нет и участников хватает — ничего не меняем; турнир из старого сейва (составлен, когда академий было 4) добираем до полного размера
    const inReg=n=>!(Array.isArray(ev.v84Region)&&ev.v84Region.length&&typeof window.v84TeamInRegion==='function')||window.v84TeamInRegion(teams.find(t=>t.name===n),ev.v84Region);
    if(!v22Names(ev.participants).some(n=>busy.has(n)||!inReg(n)) && v22Names(ev.participants).length>=v22MinField(ev)) return;
    const keep=v22Names(ev.participants).filter(n=>!busy.has(n)&&inReg(n)), all=new Set(keep);
    busy.forEach(n=>all.add(n));
    const need=Math.max(4,Math.min(64,Number(ev.size)||v22Size(ev.kind,ev.format,ev.tier)));
    let extra=v22Names(v21PickParticipants(ev.kind,7,need+keep.length+4,busy)).filter(n=>!keep.includes(n));
    // v84: региональный турнир (CIS LAN, Nordic…) добирает замены только из команд своего региона
    if(Array.isArray(ev.v84Region)&&ev.v84Region.length&&typeof window.v84TeamInRegion==='function'){
      const lvl=n=>typeof window.CS2TeamTier==='function'?window.CS2TeamTier(n):3, need=String(ev.tier)==='2'?2:3;
      const reg=teams.filter(t=>t&&!t.isAcademy&&!keep.includes(t.name)&&!busy.has(t.name)&&lvl(t.name)>=need&&window.v84TeamInRegion(t,ev.v84Region)).sort((a,b)=>(b.pts||0)-(a.pts||0)).map(t=>t.name);
      if(reg.length) extra=reg.concat(extra.filter(n=>!reg.includes(n)));
    }
    ev.participants=keep.concat(extra).slice(0,need); v22BuildBracket(ev); ev.fieldVersion=5;
  }
  function v22SetStepDay(s,day){
    const c=v21Cal(), st=new Date(Number(c.seasonAnchorMs)+day*V21_DAY); st.setHours(15,0,0,0);
    const dur=Number(s.calendar.durationDays)||4;
    s.calendar.dayOffset=day; s.calendar.startMs=st.getTime(); s.calendar.endMs=st.getTime()+dur*V21_DAY;
  }
  // Ремонт: старая функция applySeasonFieldProfiles переименовывала Tier-1 №2/5/7 в «слабые» турниры.
  function v22RepairTier1(){
    const S=seasonState; if(S.tier1FixV23) return; S.tier1FixV23=true;
    if(!Array.isArray(S.seasonSchedule)||S.seasonSchedule.length<14) return;
    const old=S.seasonSchedule, arr=v21GenerateTier1Schedule(true);
    arr.forEach((s,i)=>{ if(!s||!old[i]) return; Object.keys(old[i]).forEach(k=>{ if(!(k in s)) s[k]=old[i][k]; }); });
  }
  // Ремонт: если Tier-1 сыграны раньше своих дат — переносим их в прошлое, а следующий ставим через ~5 дней.
  // v24: раньше это чинилось один раз за сейв (флаг tier1SyncV23) и только когда были
  // «просроченные» прошлые турниры. Из-за этого разрыв в 150+ дней до следующего Tier-1
  // мог появиться снова после починки (или вообще без просроченных турниров) и больше
  // никогда не исправлялся. Теперь функция идемпотентна (повторный вызов на уже
  // синхронизированном расписании ничего не меняет) и вызывается регулярно, а не один раз.
  function v22SyncTier1(){
    const S=seasonState;
    const arr=S.seasonSchedule, c=v21Cal(), now=v21Now(), idx=Math.max(1,Number(S.tournamentIndex)||1), anchor=Number(c.seasonAnchorMs)||0;
    if(!Array.isArray(arr)||arr.length<3||!anchor||idx<=1) return;
    const dayNow=Math.floor((v22Sod(now)-v22Sod(anchor))/V21_DAY);
    let changed=false;
    const past=arr.slice(1,idx).filter(s=>s&&s.calendar&&s.calendar.startMs>now);
    if(past.length){ past.forEach((s,j)=>v22SetStepDay(s,dayNow-(past.length-j)*3)); changed=true; }
    const nx=arr[idx];
    if(nx&&nx.calendar){
      // v133: подтягиваем расписание только при аномальном разрыве (как старая «дыра» в 150+ дней). Раньше порог был
      // 5 дней: любой плановый перерыв в 2–3 недели «закрывался», все оставшиеся турниры сдвигались раньше, и к
      // концу сезона календарь сжимался на 2,5 месяца — Мейджор ноября шёл в сентябре, сезон менялся в октябре.
      const GAP=(window.CS2Config?CS2Config.get('calendar.tier1MaxGapDays',45):45), LEAD=(window.CS2Config?CS2Config.get('calendar.tier1PullLeadDays',14):14);
      const target=dayNow+LEAD, cur=Number(nx.calendar.dayOffset);
      if(cur>dayNow+GAP){
        const d=cur-target;
        for(let i=idx;i<arr.length;i++) if(arr[i]&&arr[i].calendar) v22SetStepDay(arr[i],Number(arr[i].calendar.dayOffset)-d);
        changed=true;
      }
    }
    if(!changed) return;
    // Даты сдвинулись — составы, набранные под старое расписание, могли задвоиться
    // между основным Tier-1 и параллельными Tier-2/3/академиями. Пересобираем составы
    // у ближайших ещё не сыгранных параллельных турниров, чтобы команда не оказалась
    // одновременно в двух турнирах.
    try{ (S.parallelSchedule||[]).forEach(ev=>{ if(ev&&ev.status!=='completed'&&Number(ev.startMs)<now+10*V21_DAY) v22SwapBusy(ev); }); }catch(e){ console.warn('[v24] swap busy after sync',e); }
    try{saveSeasonState();}catch(e){}
  }
  // v84: фоновые серии используют общий движок CS2MatchEngine (та же сила, вето и симуляция карты, что и Tier-1).
  function v22Series(a,b){
    if(window.CS2MatchEngine) return window.CS2MatchEngine.playSeries(a.name,b.name,{bo:3});
    const p=v21BgOdds(a,b); let aw=0,bw=0; const maps=[], pool=MAP_POOL.slice().sort(()=>Math.random()-.5);
    for(let i=0;i<3&&aw<2&&bw<2;i++){
      const map=pool[i], pa=v21Clamp(p+((Number(a.maps&&a.maps[map])||50)-(Number(b.maps&&b.maps[map])||50))/800,0.08,0.92);
      const aWin=Math.random()<pa, ot=Math.random()<0.13, win=ot?16:13, lose=ot?14:3+Math.floor(Math.random()*9);
      maps.push({map,s1:aWin?win:lose,s2:aWin?lose:win,ot,w:aWin?1:2}); if(aWin) aw++; else bw++;
    }
    return {winner:aw>bw?a.name:b.name,loser:aw>bw?b.name:a.name,score:`${Math.max(aw,bw)}-${Math.min(aw,bw)}`,maps};
  }
  function v22Rounds(seed,s1,s2,w){
    let x=seed>>>0; const rnd=()=>{ x=(x+0x6D2B79F5)>>>0; let t=x; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return((t^(t>>>14))>>>0)/4294967296; };
    const arr=[...Array(s1).fill(1),...Array(s2).fill(2)];
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    if(arr.length&&arr[arr.length-1]!==w){ const k=arr.lastIndexOf(w); if(k>=0) [arr[k],arr[arr.length-1]]=[arr[arr.length-1],arr[k]]; }
    return arr;
  }
  window.v22Detail=function(evId,mid){
    const ev=(seasonState.parallelSchedule||[]).find(x=>x.id===evId), m=ev&&ev.br&&ev.br.matches.find(x=>x.id===mid);
    if(!m||!m.w||!m.maps) return;
    const maps=m.maps.map((x,i)=>({map:x.map,t1Score:x.s1,t2Score:x.s2,overtime:!!x.ot,winner:x.w===1?m.t1:m.t2,rounds:v22Rounds(hashTeamName(ev.id+mid+i),x.s1,x.s2,x.w)}));
    const s1=m.maps.filter(x=>x.w===1).length, s2=m.maps.length-s1;
    const fake={t1:m.t1,t2:m.t2,winner:m.w,score:`Счет: ${s1} - ${s2}`,event:ev.name,broadcastResult:{mode:'BO3',t1:m.t1,t2:m.t2,series1:s1,series2:s2,maps,vetoLog:[]}};
    const dm=document.getElementById('dice-modal'); if(dm) dm.style.zIndex=13500;
    try{ openCompletedMatchResult(fake); }catch(e){ console.warn('[v23] detail',e); }
  };
  function v22MatchHtml(ev,m,now){
    const done=!!m.w, both=m.t1&&m.t2, live=!done&&both&&now>=m.at, sc=String(m.sc||'').split('-'), hasMaps=done&&m.maps&&m.maps.length;
    let o=done?m.o:null;
    if(!o&&both){ try{ const q=calcMatchOdds(m.t1,m.t2,false); if(q) o={c1:q.c1,c2:q.c2,p1:q.pct1,p2:q.pct2}; }catch(e){} }
    const row=k=>{
      const nm=m['t'+k]; if(!nm) return '<div class="team-btn tbd-slot" style="cursor:default"><span><i style="color:var(--text-muted)">TBD</i></span></div>';
      const t=teams.find(x=>x.name===nm), rank=t?teams.indexOf(t)+1:0, fat=(!done&&t&&Number(t.fatigue)>0)?`<span class="team-fatigue-badge">💤${Math.round(t.fatigue)}%</span>`:'';
      return `<div class="team-btn ${done&&m.w===nm?'winner':''}" style="cursor:inherit"><span>${v21Esc(nm)}${rank?` <span class="bracket-team-rank">#${rank}</span>`:''}${fat}</span><span>${o?`<span class="team-coeff">${o['c'+k]}x</span>`:''}${done?` <b>${m.w===nm?(sc[0]||''):(sc[1]||'')}</b>`:''}</span></div>`;
    };
    const bar=(!done&&o)?`<div class="betting-bar-container"><div class="prob-bar"><div class="prob-bar-fill" style="width:${o.p1}%"></div></div><div class="bet-info-row"><span>${o.p1}%</span><span>${o.p2}%</span></div></div>`:'';
    const foot=done?'✓ '+v22Fmtd(m.at):live?'🔴 идёт • '+v22Fmtd(m.at):'🗓 '+v22Fmtd(m.at);
    const click=hasMaps?` onclick="v22Detail('${ev.id}','${m.id}')" title="Открыть результаты карт" style="width:205px;cursor:pointer"`:' style="width:205px"';
    return `<div class="match ${live?'live-broadcast':''}"${click}>${row(1)}${row(2)}${bar}<div class="match-broadcast-state">${foot}</div>${hasMaps?`<div style="font-size:9px;text-align:center;color:var(--text-muted);padding:2px 3px">${m.maps.map(x=>`${x.map} ${x.s1}:${x.s2}${x.ot?' OT':''}`).join(' • ')}</div><button type="button" class="secondary broadcast-detail-btn" onclick="event.stopPropagation();v22Detail('${ev.id}','${m.id}')">📺 Детали матча</button>`:''}</div>`;
  }
  function v22BracketHtml(ev){
    const br=ev.br; if(!br||!br.matches.length) return '<div style="font-size:10px;color:var(--text-muted)">Сетка ещё не сформирована.</div>';
    const ix=v22Idx(br); v22Fill(br,ix); const now=v21Now(), groups=[];
    br.rounds.forEach(r=>{ let g=groups.find(x=>x.name===r.grp); if(!g){ g={name:r.grp,rounds:[]}; groups.push(g); } g.rounds.push(r); });
    let html=groups.map(g=>`${g.name?`<div class="v22-grp">${v21Esc(g.name)}</div>`:''}<div class="v22-cols">${g.rounds.map(r=>`<div class="round" style="min-width:196px"><div class="round-title">${v21Esc(r.name)}</div><div class="round-matches-container">${r.ids.map(id=>v22MatchHtml(ev,ix[id],now)).join('')}</div></div>`).join('')}</div>`).join('');
    if(br.swiss&&ev.standings.length) html=`<div class="v21-parallel-section" style="margin-bottom:8px"><h4>Таблица Swiss</h4>${ev.standings.slice().sort((a,b)=>b.pts-a.pts||b.wins-a.wins||a.losses-b.losses).map((x,i)=>`<div class="v21-standing-row"><span>#${i+1}</span><b>${v21Esc(x.team)}</b><span>${x.wins}-${x.losses}</span></div>`).join('')}</div>`+html;
    return html;
  }
  function v21OpenTournament(id,silent){
    if(id==='main'){ try{document.getElementById('v21-parallel-modal')?.classList.remove('open'); document.querySelector('.bracket-scroll-area')?.scrollTo({top:0,behavior:'smooth'});}catch(e){} return; }
    const ev=(seasonState.parallelSchedule||[]).find(x=>x.id===id); if(!ev) return;
    const modal=document.getElementById('v21-parallel-modal'), body=document.getElementById('v21-parallel-body'), title=document.getElementById('v21-parallel-title'), kicker=document.getElementById('v21-parallel-kicker'); if(!modal||!body) return;
    if(!ev.br&&ev.status==='completed'){ title.textContent=ev.name; kicker.textContent='Завершён (старый формат)'; body.innerHTML=`<div class="v21-parallel-section"><h4>Итог</h4>${(ev.standings||[]).slice(0,12).map((x,i)=>`<div class="v21-standing-row"><span>#${i+1}</span><b>${v21Esc(x.team)}</b><span>${x.wins}-${x.losses}</span></div>`).join('')}</div>`; v22OpenId=null; modal.classList.add('open'); return; }
    if(!ev.br) v22Migrate(ev);
    const done=(ev.br.matches||[]).filter(m=>m.w).length, sig=`${ev.id}|${ev.status}|${done}|${Math.floor(v21Now()/600000)}`;
    if(silent&&sig===v22Sig) return; v22Sig=sig; v22OpenId=id;
    title.textContent=ev.name;
    const st=ev.status==='completed'?'✅ завершён':ev.status==='live'?'🔴 идёт':`⏳ старт ${v22Fmtd(ev.startMs)}`;
    kicker.textContent=`${ev.kind==='academy'?'🎓 Академии':ev.tier==='2'?'🔷 Tier-2':'🟣 Tier-3'} • ${V22_FMT_LABEL[ev.format]||ev.format} • ${(ev.participants||[]).length} команд • $${Math.round(ev.prize).toLocaleString('en-US')} • ${v22Progress(ev)} • ${st}`;
    const win=ev.winner?`<div class="v21-parallel-section" style="margin-bottom:8px">🏆 Победитель: <b>${v21Esc(ev.winner)}</b>${ev.placements?` • 2 место: ${v21Esc(ev.placements[1]||'—')} • 3 место: ${v21Esc(ev.placements[2]||'—')}`:''}</div>`:'';
    body.innerHTML=win+`<div class="v22-wrap">${v22BracketHtml(ev)}</div>`;
    modal.classList.add('open');
  }
  window.v21GenerateTier1Schedule = v21GenerateTier1Schedule;
  window.v21BuildParallelSchedule = v21BuildParallelSchedule;
  window.v21RebuildParallelEvent = function(ev){
    if(!ev || ev.status!=='scheduled' || Number(ev.startMs)<=v21Now()) return false;
    const need=Math.max(4,Math.min(64,Number(ev.size)||v22Size(ev.kind,ev.format,ev.tier)));
    const busy=new Set();
    try{ if(currentTournament&&!currentTournament.completed) v22Names(currentTournament.participants).forEach(n=>busy.add(n)); }catch(e){}
    (seasonState.parallelSchedule||[]).forEach(o=>{ if(o!==ev && o.status==='live') v22Names(o.participants).forEach(n=>busy.add(n)); });
    const seed=Number(String(ev.id).split('-')[2])||0;
    const picked=v22Names(v21PickParticipants(ev.kind,seed,need,busy));
    if(picked.length < Math.min(need, Math.max(4,Math.ceil(need*.6)))) return false;
    ev.participants=picked.slice(0,need); v22BuildBracket(ev); ev.fieldVersion=6; return true;
  };
  window.v21OpenTournament=v21OpenTournament;
  window.v27TournamentFieldInfo=()=>({teams:teams.filter(t=>!t.isAcademy).length,tier2:v21EligiblePool('tier2').length,tier3:v21EligiblePool('tier3').length,sizes:{single:v22Size('tier3','single','3'),double:v22Size('tier3','double','3'),gsl:v22Size('tier3','gsl','3')}});
  window.v21CloseParallel=function(ev){ if(ev&&ev.target!==ev.currentTarget) return; v22OpenId=null; v22Sig=''; document.getElementById('v21-parallel-modal')?.classList.remove('open'); };

  function v21GenerateTier1Schedule(noParallel){
    v21NormalizeState();
    const y=2026+(Number(seasonState.currentSeason||1)-1);
    const defs=[
      ['elite',`IEM Katowice (Spodek Arena) ${y}`,15,4,16,'double','elite'],
      ['regular',`BLAST Premier Spring Groups ${y}`,42,4,16,'single','open'],
      ['elite',`ESL Pro League Season ${y}`,68,5,16,'gsl','elite'],
      ['major',`PGL Major Spring ${y}`,98,7,16,'swiss','major'],
      ['regular',`CCT Season Finals Europe ${y}`,135,4,16,'single','open'],
      ['elite',`IEM Dallas ${y}`,160,4,16,'double','elite'],
      ['elite',`BLAST Premier Spring Final ${y}`,188,4,16,'double','elite'],
      ['major',`Perfect World Major Summer ${y}`,215,7,16,'swiss','major'],
      ['elite',`IEM Cologne (Lanxess Arena) ${y}`,255,5,16,'double','elite'],
      ['regular',`BLAST Premier Fall Groups ${y}`,288,4,16,'single','open'],
      ['elite',`ESL Pro League Playoffs ${y}`,315,5,16,'gsl','elite'],
      ['major',`BLAST.tv Winter Major ${y}`,340,7,16,'swiss','major'],
      ['elite',`IEM Chengdu ${y}`,365,5,16,'double','elite'],
      ['elite',`BLAST Premier World Final ${y}`,400,4,16,'double','elite']
    ];
    const arr=[null];
    const anchor=v21YearStart();
    const cal=v21Cal();
    cal.seasonAnchorMs=anchor; cal.seasonPlanSeason=seasonState.currentSeason;
    defs.forEach((d,i)=>{ const [type,name,day,dur,size,format,field]=d; const start=new Date(anchor+day*V21_DAY); start.setHours(15,0,0,0); const startMs=start.getTime(); arr[i+1]={type,name,min:type==='major'?500:type==='elite'?450:250,max:2000,size,format,fieldProfile:field,calendar:{dayOffset:day,durationDays:dur,restBeforeDays:Math.max(1,Math.min(3,Math.floor(dur/2))),startTime:'15:00',startMs,endMs:startMs+dur*V21_DAY}}; });
    seasonState.seasonSchedule=arr; seasonState.tournamentIndex=Math.min(Math.max(1,Number(seasonState.tournamentIndex)||1),arr.length-1); seasonState.maxTournaments=9999;
    if(typeof v15DecorateSeasonSchedule==='function') v15DecorateSeasonSchedule(false);
    // v84: любое построение сезона (включая смену сезона и ремонт календаря) получает
    // единое расписание v29 (сезон = календарный год, реальные длительности) и ротацию названий v30.
    try{ if(typeof window.v29RewriteSchedule==='function') window.v29RewriteSchedule(); }catch(e){ console.warn('[v84] schedule rewrite',e); }
    try{ seasonState.v30RotSeason=0; window.V30CalendarRefresh?.(); }catch(e){}
    try{saveSeasonState();}catch(e){}
    if(!noParallel) v21BuildParallelSchedule();
    return arr;
  }
  const oldGenerate=window.generateDynamicSeasonSchedule;
  window.generateDynamicSeasonSchedule=v21GenerateTier1Schedule;

  // Make academy players promotable even when the parent language differs from the buyer.
  const oldAccept=window.playerWillAccept;
  if(typeof oldAccept==='function' && !oldAccept.__v21Wrapped){
    const wrapped=function(p,fromTeam,toTeam){
      if(fromTeam?.isAcademy && !toTeam?.isAcademy && teamRankValue(toTeam)>=teamRankValue(fromTeam)+80){ return true; }
      return oldAccept.apply(this,arguments);
    };
    wrapped.__v21Wrapped=true; window.playerWillAccept=wrapped; try{playerWillAccept=wrapped;}catch(e){}
  }
  const oldProcess=window.processTransferMarket;
  if(typeof oldProcess==='function' && !oldProcess.__v21Wrapped){
    const wrapped=function(reason){
      const result=oldProcess.apply(this,arguments);
      // Academy promotion window: one high-potential academy player may be promoted or sold after market runs.
      try{
        v21EnsureAcademies();
        const buyers=teams.filter(t=>!t.isAcademy && teamRankValue(t)>=650 && Number(t.fatigue||0)>=18).sort((a,b)=>teamRankValue(b)-teamRankValue(a)).slice(0,4);
        for(const to of buyers){
          const out=to.players?.filter(p=>p.status==='STARTER').sort((a,b)=>playerPower(a)-playerPower(b))[0]; if(!out) continue;
          const candidates=[];
          for(const from of teams.filter(t=>t.isAcademy)){
            ensurePlayerLayer(from);
            for(const p of from.players.filter(p=>p.status==='STARTER')){
              const imp=playerPower(p)-playerPower(out); if(imp<5) continue;
              candidates.push({from,p,imp});
            }
          }
          candidates.sort((a,b)=>b.imp-a.imp);
          if(candidates[0] && Math.random()<0.28) applyPlayerTransfer(candidates[0].from,to,candidates[0].p,'академическое продвижение / продажа');
        }
      }catch(e){console.warn('[v21] academy market',e);}
      return result;
    };
    wrapped.__v21Wrapped=true; window.processTransferMarket=wrapped; try{processTransferMarket=wrapped;}catch(e){}
  }

  // End the season by the last scheduled Tier-1 tournament, not an arbitrary cap of 10.
  window.v21ShouldEndSeason=function(){
    const len=Math.max(0,(seasonState.seasonSchedule||[]).length-1);
    return len>0 && Number(seasonState.tournamentIndex||1)>=len;
  };
  const oldFinalize=window.finalizeTournamentRating;
  if(typeof oldFinalize==='function' && !oldFinalize.__v21Wrapped){
    const wrapped=function(...args){
      const len=Math.max(1,(seasonState.seasonSchedule||[]).length-1);
      seasonState.maxTournaments=(Number(seasonState.tournamentIndex||1)>=len)?len:9999;
      const r=oldFinalize.apply(this,args);
      seasonState.maxTournaments=9999;
      try{saveSeasonState();}catch(e){}
      return r;
    };
    wrapped.__v21Wrapped=true; window.finalizeTournamentRating=wrapped; try{finalizeTournamentRating=wrapped;}catch(e){}
  }

  // Keep the season progress compact and explicit.
  const oldRenderBanner=window.renderSeasonBanner;
  if(typeof oldRenderBanner==='function' && !oldRenderBanner.__v21Wrapped){
    const wrapped=function(...args){ const r=oldRenderBanner.apply(this,args); const el=document.getElementById('season-progress'); if(el) el.textContent=`Tier-1: ${seasonState.tournamentIndex}/${Math.max(0,(seasonState.seasonSchedule||[]).length-1)} • T2/3: ${(seasonState.parallelSchedule||[]).filter(e=>e.season===seasonState.currentSeason).length}`; return r; };
    wrapped.__v21Wrapped=true; window.renderSeasonBanner=wrapped; try{renderSeasonBanner=wrapped;}catch(e){}
  }

  // Parallel layer piggybacks on the same calendar clock. When time is skipped, all background events catch up.
  const oldAdvance=window.v15AdvanceMinutes;
  if(typeof oldAdvance==='function' && !oldAdvance.__v21Wrapped){
    const wrapped=function(...args){
      const r=oldAdvance.apply(this,args);
      if(!window.v57BatchCalendarSkip){
        const reason=String(args[1]||'');
        try{ if(window.CS2SimulationKernel) window.CS2SimulationKernel.pulse('clock-advance',{force:false,reason}); else v21ProcessParallel(v21Now(),false); }catch(e){console.warn('[v21] parallel tick',e);}
      }
      return r;
    };
    wrapped.__v21Wrapped=true; window.v15AdvanceMinutes=wrapped;
  }
  // The multi-day skip runs this once for every virtual day with storage/rendering
  // deferred, then performs one final commit. `allowPaused` is only for explicit
  // Calendar pause is unconditional. Explicit skips advance the clock first,
  // then call this method only while the calendar is running.
  window.v21ProcessParallelNow=function(options={}){ return v21ProcessParallel(v21Now(),true,options); };
  window.v21TickParallel=function(force=false,options={}){ return v21ProcessParallel(v21Now(),!!force,options); };
  window.CS2ParallelSchedulerPulse=function(options={}){
    if(window.__CS2_FACTORY_RESET_IN_PROGRESS || window.__CS2_IMPORT_RECONCILING) return false;
    const now=v21Now(), wall=Date.now(); let changed=false;
    // Tier-1 calendar reconciliation runs once per virtual day, not on every
    // 1.5-second background pulse. Explicit clock jumps/imports invalidate it.
    const day=Math.floor(now/V21_DAY);
    if(day!==v21LastTier1SyncDay){
      try{ v22SyncTier1(); }catch(e){ console.warn('[v21] Tier-1 calendar sync failed',e); }
      v21LastTier1SyncDay=day;
    }
    if(now>=v21NextParallelWakeAt) changed=v21ProcessParallel(now,false,options);
    // The switcher is informational UI. Refresh at most once per 5 s unless a
    // result changed; match processing itself is never delayed by this cadence.
    const backlog=v21HasOverdueMatches(now);
    window.__CS2_PARALLEL_CATCHUP=!v21Cal().paused && backlog;
    if(!v21Cal().paused && !backlog && (changed || wall-v21LastSwitcherWall>=5000)){
      v21RenderSwitcher(); v21LastSwitcherWall=wall;
    }
    return changed;
  };

  window.v21ReconcileImportedSave = function(reason='save import'){
    if(v21ImportReconcilePromise) return v21ImportReconcilePromise;
    v21ImportReconcilePromise = (async()=>{
      const started=Date.now();
      window.__CS2_IMPORT_RECONCILING = true;
      v21InvalidateParallelWake(reason);
      try {
        v21NormalizeState();
        if(!seasonState.parallelSchedule.length) v21BuildParallelSchedule();
        const now=v21Now(), season=Number(seasonState.currentSeason)||1;
        // One-time global repairs are performed once, before event batches.
        if(!seasonState.parallelState.v23){
          const evs=seasonState.parallelSchedule.filter(e=>Number(e?.season)===season);
          const fixed=evs.filter(e=>e.status==='live'||e.status==='completed'||now>=Number(e.startMs||0));
          const flex=evs.filter(e=>!fixed.includes(e)).sort((a,b)=>Number(a.startMs)-Number(b.startMs));
          flex.forEach(e=>{ if(!e.format) e.format=v22Fmt(e.kind,e.tier,Number(String(e.id).split('-')[2])||0); e.participants=v22Names(e.participants); });
          try{ v22Assign(flex,fixed); }catch(e){ console.warn('[v23] import reassign',e); }
          seasonState.parallelState.v23=true;
        }
        try{ v35EnsureQuals(now); v35Realign(); }catch(e){ console.warn('[v35] import qualifier repair',e); }
        try{ v22ExpandFutureFields(now); }catch(e){ console.warn('[v27] import field repair',e); }
        const due=seasonState.parallelSchedule.filter(e=>Number(e?.season)===season && !['completed','cancelled'].includes(e.status) && (e.status==='live'||Number(e.startMs||0)<=now));
        let processed=0, batches=0, reconciledMatches=0;
        const BATCH=2, MAX_PASSES=160;
        for(let i=0;i<due.length;i+=BATCH){
          const batchEvents=due.slice(i,i+BATCH);
          const ids=batchEvents.map(e=>String(e.id));
          let previousDue=Infinity;
          for(let pass=0;pass<MAX_PASSES;pass++){
            const dueMatches=()=>batchEvents.reduce((n,e)=>n+(e.br?.matches||[]).filter(m=>!m.w&&Number(m.at||0)+V22_RESOLVE_MIN*60000<=now).length,0);
            const beforeDue=dueMatches();
            if(!beforeDue || v21Cal().paused) break;
            v21ProcessParallel(now,true,{deferIO:true,importBatch:true,eventIds:ids,skipGlobalMaintenance:true,skipWakeRecompute:true,matchBudget:8});
            const afterDue=dueMatches();
            reconciledMatches+=Math.max(0,beforeDue-afterDue);
            batches++;
            // A no-progress pass signals malformed/paused data; leave it for the
            // normal scheduler rather than spinning indefinitely during import.
            if(afterDue>=beforeDue || afterDue===previousDue && pass>0) break;
            previousDue=afterDue;
            await new Promise(resolve=>setTimeout(resolve,0));
          }
          processed+=ids.length;
          await new Promise(resolve=>setTimeout(resolve,0));
        }
        v21NextParallelWakeAt=v21ComputeNextParallelWake(now);
        v21LastParallelSeason=season;
        v21LastTier1SyncDay=Math.floor(now/V21_DAY);
        if(window.v21DeferredParallelChanges){
          try{ saveTeams(); saveSeasonState(); renderRating(); }catch(e){ console.warn('[v21] imported schedule save failed',e); }
          window.v21DeferredParallelChanges=false;
        } else { try{ saveSeasonState(); }catch(e){} }
        try{ v21RenderSwitcher(); }catch(e){}
        const result={processedEvents:processed,batches,reconciledMatches,elapsedMs:Date.now()-started,nextWakeAt:v21NextParallelWakeAt};
        window.__CS2_IMPORT_RECONCILE_RESULT=result;
        console.info('[v21] imported save schedule reconciled',result);
        return result;
      } finally {
        window.__CS2_IMPORT_RECONCILING = false;
        window.__CS2_PARALLEL_CATCHUP = !v21Cal().paused && v21HasOverdueMatches(v21Now());
        if(!window.__CS2_PARALLEL_CATCHUP) v21DeferredSinceWall=0;
        v21ImportReconcilePromise=null;
        if(!window.__CS2_PARALLEL_CATCHUP){
          try{ setTimeout(()=>window.v56AutosaveNow?.(),500); }catch(e){}
        }
      }
    })();
    return v21ImportReconcilePromise;
  };

  // Build the larger scene immediately and migrate old saves.
  v21NormalizeState();
  v21EnsureAcademies();
  if(!Array.isArray(seasonState.seasonSchedule) || seasonState.seasonSchedule.length<14) v21GenerateTier1Schedule();
  try{ v22RepairTier1(); v22SyncTier1(); }catch(e){ console.warn('[v23] tier1 repair',e); }
  if(!Array.isArray(seasonState.parallelSchedule) || !seasonState.parallelSchedule.length) v21BuildParallelSchedule();
  try{saveTeams();saveSeasonState();}catch(e){}
  v21ProcessParallel(v21Now(),true);
  v21RenderSwitcher();

  // Recurring parallel scheduling is owned by the v63 Simulation Kernel.
  // This layer exports the resolver/pulse but no longer starts its own timer.
})();
