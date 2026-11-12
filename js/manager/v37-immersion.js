/* v37 · Competitive immersion layer.
   EMDB metadata/bench, per-match VRS forecast and premium tournament presentation.
   Career legacy and tournament editorial bundles are handled by v37-home-legacy.js. */
(function () {
'use strict';
const H = window.HS;
if (!H) return;
const esc = H.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
const S = () => (typeof seasonState !== 'undefined' && seasonState) ? seasonState : null;
const teamsNow = () => (typeof teams !== 'undefined' && Array.isArray(teams)) ? teams : [];
const N = () => window.V29News || null;
const yearFor = snap => Number(snap?.year) || (snap?.ge ? new Date(snap.ge).getFullYear() : 2026 + (Number(snap?.season || S()?.currentSeason || 1) - 1));
const fallbackDelta = (self, opp) => {
  const a = Math.max(400, Math.min(2000, Number(self?.pts) || 500));
  const b = Math.max(400, Math.min(2000, Number(opp?.pts) || 500));
  const expected = 1 / (1 + Math.pow(10, (b - a) / 400));
  return { before:a, win:Math.round(32 * (1 - expected)), lose:Math.round(32 * expected) };
};
const deltaFor = (a,b,ev) => {
  try { const fn = window.CS2VRSModel?.delta; if (typeof fn === 'function') return fn(a,b,ev); } catch (e) {}
  return fallbackDelta(a,b,ev);
};
function rankAfter(teamName, change) {
  const list = teamsNow().filter(t => !t.isAcademy).map(t => ({name:t.name,pts:(Number(t.pts)||500)+(t.name===teamName?change:0)}));
  list.sort((a,b)=>b.pts-a.pts || a.name.localeCompare(b.name));
  return list.findIndex(x=>x.name===teamName)+1;
}
function rankNow(teamName) {
  const list = H.ranked ? H.ranked().filter(t=>!t.isAcademy) : teamsNow().filter(t=>!t.isAcademy).sort((a,b)=>(b.pts||0)-(a.pts||0));
  return list.findIndex(t=>t.name===teamName)+1;
}
function vrsCard(aName,bName,ev,record,doneWinner) {
  const a=H.teamBy?.(aName), b=H.teamBy?.(bName); if(!a||!b) return '';
  const kind=String(ev?.kind || ev?.prestige || (String(ev?.tier)==='2'?'tier2':String(ev?.tier)==='3'?'tier3':'regular')).toLowerCase();
  let da=deltaFor(a,b,{...ev,kind,tier:ev?.tier,name:ev?.name,prizePool:ev?.prizePool||ev?.prize}), db=deltaFor(b,a,{...ev,kind,tier:ev?.tier,name:ev?.name,prizePool:ev?.prizePool||ev?.prize});
  const ra=record?.a, rb=record?.b;
  if(ra?.team===aName) da={...da,...ra}; if(rb?.team===bName) db={...db,...rb};
  const fmt=(t,d)=>{
    const pts=Math.round(Number(t.pts)||500), r=rankNow(t.name), rw=rankAfter(t.name,d.win), rl=rankAfter(t.name,-d.lose);
    return `<article class="v37-vrs-team"><div class="v37-vrs-name">${H.logo?H.logo(t.name,'sm'):''}<span><b>${esc(t.name)}</b><small>${pts.toLocaleString('ru-RU')} VRS · ${r?'#'+r:'без места'}</small></span></div>
      <div class="v37-vrs-outcomes"><div><small>Победа</small><b class="up">+${Math.round(d.win)} <i>${rw ? `→ #${rw}` : ''}</i></b></div><div><small>Поражение</small><b class="dn">−${Math.round(d.lose)} <i>${rl ? `→ #${rl}` : ''}</i></b></div></div>
      ${doneWinner ? `<div class="v37-vrs-result ${doneWinner===t.name?'won':'lost'}">${doneWinner===t.name?'ПОБЕДА':'ПОРАЖЕНИЕ'} · ${doneWinner===t.name?'начислено':'списано'} ${doneWinner===t.name?'+'+Math.round(d.win):'−'+Math.round(d.lose)}</div>` : ''}</article>`;
  };
  return `<section class="v37-vrs-card"><header><span><i class="v37-vrs-dot"></i> VRS MATCH IMPACT</span><small>Прогноз внутриигровой модели · ${esc(kind.toUpperCase())}</small></header><div class="v37-vrs-grid">${fmt(a,da)}${fmt(b,db)}</div><footer>Модель опирается на 4 фактора VRS: собственные призовые, ценность побеждённых соперников, их сеть побед и LAN-результаты; учитываются лучшие результаты за 6 месяцев и head-to-head. Это игровая аппроксимация, а не официальный расчёт Valve.</footer></section>`;
}
function injectBeforeGrid(html, block) {
  if (!block || html.includes('v37-vrs-card')) return html;
  const i=html.indexOf('<div class="hs-grid2"');
  return i>=0 ? html.slice(0,i)+block+html.slice(i) : html+block;
}
const origMatch = H.PAGES.match;
if (typeof origMatch === 'function' && !origMatch.__v37) {
  const wrapped = function(id) {
    let html=origMatch.apply(this,arguments);
    try {
      const fm=H.findMatch?.(id), done=(H.stats?.().ms||[]).find(x=>x.id===id), m=fm?.m||done;
      if (!m?.a || !m?.b) return html;
      const ev=fm?.snap || H.resolveEvent?.(String(id).split('~')[0]) || {name:m.ev||'Матч',kind:m.kind||'regular',tier:m.tier};
      const winner=m.w || m.winner || done?.w || null;
      const block=vrsCard(m.a,m.b,ev,m.vrs||done?.vrs,winner);
      return injectBeforeGrid(html,block);
    } catch(e) { console.warn('[v37] VRS match panel',e); return html; }
  };
  wrapped.__v37=true; H.PAGES.match=wrapped;
}

/* Apply nationality, age, role and portrait metadata consistently, including saved FAs. */
function applyEmdbPlayerMeta(p,E) {
  if (!p?.nick) return;
  const m=E.players?.[p.nick]; if(!m) return;
  if(m.realName) p.realName=m.realName;
  if(m.age) p.age=window.cs2MetaAge?window.cs2MetaAge(m.age):m.age;
  if(m.country) p.country=m.country;
  if(m.nationality) p.nationality=m.nationality;
  if(m.photo) p.photo=m.photo;
  if(m.potential) p.potential=m.potential;
  if(m.role && !p.v84roleLocked && !(p.role==='IGL' && m.role!=='IGL' && p.status!=='BENCH' && p.status!=='FREE AGENT')) p.role=m.role; // v86: капитана, назначенного в игре, база не разжалует // v84: роль, назначенная в игре (смена капитана, замена, решение менеджера), важнее базы 2026
  if(m.country) {
    try { if(typeof countryFlag==='function') p.flag=countryFlag(m.country); } catch(e) {}
    if(!p.flag || p.flag==='🌍') p.flag=m.country;
  }
}
function setupEmdbBench() {
  const E=window.CS2_EMDB_2026;
  if(!E || typeof transferState==='undefined' || !transferState) return;
  transferState.freeAgents=Array.isArray(transferState.freeAgents)?transferState.freeAgents:[];
  teamsNow().forEach(t=>(t.players||[]).forEach(p=>applyEmdbPlayerMeta(p,E)));
  transferState.freeAgents.forEach(p=>applyEmdbPlayerMeta(p,E));
  (transferState.retired||[]).forEach(p=>applyEmdbPlayerMeta(p,E));
  const teamFor = name => H.teamBy?.(name) || teamsNow().find(t=>String(t.name).toLowerCase()===String(name).toLowerCase());
  const addBench=(teamName,nick)=>{
    const t=teamFor(teamName); if(!t||!nick) return;
    const onRoster=teamsNow().some(x=>(x.players||[]).some(p=>String(p.nick).toLowerCase()===String(nick).toLowerCase()));
    if(onRoster) return;
    let p=transferState.freeAgents.find(x=>String(x.nick).toLowerCase()===String(nick).toLowerCase());
    if(!p) {
      try { if(typeof createPlayerFromNick==='function') p=createPlayerFromNick(t,nick,(t.players||[]).length); } catch(e){}
      if(!p) { const m=E.players?.[nick]||{}; p={nick,role:m.role||'Rifler',age:m.age||20,firepower:m.skill||72,tacticalIQ:m.skill||72,clutch:m.skill||72,utility:m.skill||72}; }
      p.status='BENCH'; p.benchFrom=t.name; p.reservedFor=t.name; applyEmdbPlayerMeta(p,E); transferState.freeAgents.push(p);
    } else { p.status='BENCH'; p.benchFrom=p.benchFrom||t.name; p.reservedFor=p.reservedFor||t.name; applyEmdbPlayerMeta(p,E); }
  };
  Object.entries(E.bench||{}).forEach(([teamName,list])=>(list||[]).forEach(n=>addBench(teamName,n)));
  (window.CS2_DISPLACED_BENCH||[]).forEach(x=>{
    const teamName=x.team, p=x.player; if(!p?.nick) return;
    if(teamsNow().some(t=>(t.players||[]).some(q=>String(q.nick).toLowerCase()===String(p.nick).toLowerCase()))) return;
    let old=transferState.freeAgents.find(q=>String(q.nick).toLowerCase()===String(p.nick).toLowerCase());
    if(!old){ old={...p,status:'BENCH',benchFrom:teamName,reservedFor:teamName}; transferState.freeAgents.push(old); }
    applyEmdbPlayerMeta(old,E);
  });
  if(transferState.freeAgents.length>1800) transferState.freeAgents=transferState.freeAgents.slice(0,1800);
  if(typeof saveTransferState==='function') saveTransferState();
}

/* High-end event listing hero: status, season progress, top VRS trio and subtle motion. */
const origEvents=H.PAGES.events;
if(typeof origEvents==='function'&&!origEvents.__v37){
  const wrapped=function(){
    const html=origEvents.apply(this,arguments);
    try{
      const all=H.events?.()||[], live=all.filter(x=>x.status==='live'), cur=(S()?.currentSeason||1), done=all.filter(x=>x.status==='done'&&x.season===cur).length;
      const upcoming=all.filter(x=>x.status==='scheduled'&&x.season===cur).length, top=(H.ranked?.()||[]).filter(t=>!t.isAcademy).slice(0,3);
      const hero=`<section class="v37-circuit"><div class="v37-circuit-copy"><span class="v37-eyebrow">Сезон ${2025+cur}</span><h2>Турниры сезона ${2025+cur}</h2><p>Tier-1, S-Tier и Major, а также Tier-2/3, академии и квалификации. Результаты влияют на VRS и приглашения на Major.</p><div class="v37-circuit-metrics"><span><b>${live.length}</b><small>LIVE сейчас</small></span><span><b>${upcoming}</b><small>В календаре</small></span><span><b>${done}</b><small>Завершено</small></span></div></div><div class="v37-circuit-side"><span>Рейтинг VRS · топ-3</span>${top.map((t,i)=>`<div class="v37-circuit-rank"><i>${String(i+1).padStart(2,'0')}</i>${H.logo?H.logo(t.name,'xs'):''}<b>${esc(t.name)}</b><small>${Math.round(t.pts||0)} pts</small></div>`).join('')}</div><div class="v37-circuit-glow"></div></section>`;
      const i=html.indexOf('<div class="hs-head">'); return i>=0?html.slice(0,i)+hero+html.slice(i):hero+html;
    }catch(e){return html;}
  }; wrapped.__v37=true; H.PAGES.events=wrapped;
}

/* Event detail panel reuses the editorial pieces generated by v37-home-legacy. */
function eventProgress(snap) {
  const list=H.indexSnap?H.indexSnap(snap):[]; if(!list.length) return snap.scheduled?0:100;
  return Math.round(list.filter(m=>m.w).length/list.length*100);
}
function podium(snap) {
  const rows=(snap.results||[]).slice().sort((a,b)=>(Number(a.p)||99)-(Number(b.p)||99)).filter(x=>x.n).slice(0,3);
  if(!rows.length && snap.champion) rows.push({n:snap.champion,p:1});
  const medal=['🥇','🥈','🥉'];
  return rows.map((r,i)=>`<div class="v37-podium-row rank-${i+1}" data-team="${esc(r.n)}" role="link" tabindex="0" title="Страница команды ${esc(r.n)}"><span>${medal[i]}</span>${H.logo?H.logo(r.n,'sm'):''}<b>${esc(r.n)}</b><small>${i===0?'Чемпион':r.p?`${r.p}-е место`:'Финалист'}</small></div>`).join('');
}
function eventStories(id) {
  const n=N(); if(!n?.all) return [];
  return n.all().filter(x=>x.ev===id || (x.tags||[]).some(t=>t.t==='event'&&t.v===id)).slice(0,4);
}
/* v128: итоги турнира одной строкой — чемпион, 2-е и 3-е место, MVP с портретом и статистикой турнира */
function playerObj(nick,team){ try{ return (H.teamBy?.(team)?.players||[]).find(p=>p.nick===nick) || H.playerNow?.(nick) || {nick}; }catch(e){ return {nick}; } }
function mvpLine(snap,nick){ try{ const o=H.stats?.().P?.[nick], e=o?.byEv?.[snap.id]; return e?H.line(e.s):null; }catch(e){ return null; } }
function finalOf(snap){ try{ const ms=(H.indexSnap?H.indexSnap(snap):[]).filter(m=>m.w&&!m.wo&&/Гранд|Финал \(|^Финал|Финал$/.test(String(m.__stage||'').split(' · ').pop()||'')); return ms.pop()||null; }catch(e){ return null; } }
function results(snap,mvp){
  const rows=(snap.results||[]).slice().sort((a,b)=>(Number(a.p)||99)-(Number(b.p)||99)).filter(x=>x.n).slice(0,3);
  if(!rows.length && snap.champion) rows.push({n:snap.champion,p:1});
  const fin=finalOf(snap), sc=fin&&Array.isArray(fin.s)?(fin.w===fin.a?`${Math.max(...fin.s)}:${Math.min(...fin.s)}`:`${Math.max(...fin.s)}:${Math.min(...fin.s)}`):'';
  const opp=fin?(fin.w===fin.a?fin.b:fin.a):'';
  const place=(r,i)=>{ const lab=i===0?'Чемпион':`${r.p||i+1}-е место`, sub=i===0&&opp?`Финал ${sc?sc+' ':''}vs ${esc(opp)}`:lab;
    return `<div class="v128-place p${i+1}" data-team="${esc(r.n)}" role="link" tabindex="0" title="Страница команды ${esc(r.n)}"><span class="v128-rank">${i+1}</span><span class="v128-tlogo">${H.logo?H.logo(r.n,i===0?'lg':'sm'):''}</span><span class="v128-tcopy"><small>${i===0?'Чемпион':lab}</small><b>${esc(r.n)}</b>${i===0&&opp?`<em>${sub}</em>`:''}</span></div>`; };
  let mv='';
  if(mvp){ const p=playerObj(mvp.nick,mvp.team), l=mvpLine(snap,mvp.nick);
    const stat=l?`<span class="v128-mstat"><b class="${H.ratingCls?H.ratingCls(l.rating):''}">${H.f2?H.f2(l.rating):Number(l.rating).toFixed(2)}</b><small>Rating 3.0</small></span><span class="v128-mstat"><b>${l.maps}</b><small>карт</small></span><span class="v128-mstat"><b>${l.k}–${l.d}</b><small>K–D</small></span>`:'';
    mv=`<div class="v128-mvp" data-player="${esc(mvp.nick)}" role="link" tabindex="0" title="Профиль ${esc(mvp.nick)}"><span class="v128-mph">${H.photoHtml?H.photoHtml(p):''}</span><span class="v128-mcopy"><small><i>MVP</i> турнира</small><b>${H.pFlag?H.pFlag(p)+' ':''}${esc(mvp.nick)}</b><em>${H.logo?H.logo(mvp.team||'','xs'):''} ${esc(mvp.team||'')}</em></span>${stat?`<span class="v128-mstats">${stat}</span>`:''}</div>`; }
  return `<div class="v128-results${mv?'':' no-mvp'}">${rows.map(place).join('')}${mv}</div>`;
}
const origEvent=H.PAGES.event;
if(typeof origEvent==='function'&&!origEvent.__v37){
  const wrapped=function(id){
    const html=origEvent.apply(this,arguments);
    try{
      const snap=H.resolveEvent?.(id); if(!snap) return html;
      const ev=(H.events?.()||[]).find(x=>x.id===id||x.id===snap.id), kind=snap.prestige||ev?.kind||'regular';
      const done=!snap.live&&!snap.scheduled&&(snap.champion||snap.results?.length), pct=(!snap.live&&!snap.scheduled&&snap.champion&&snap.champion!=='—')?100:eventProgress(snap), mvp=N()?.mvpOf?.(snap.id) || null;
      const stories=eventStories(snap.id), status=snap.live?'● LIVE':snap.scheduled?'Скоро':'Завершён';
      const champ=snap.champion&&snap.champion!=='—'?`<div class="v37-event-champion" data-team="${esc(snap.champion)}" role="link" tabindex="0" title="Страница команды ${esc(snap.champion)}"><small>Чемпион</small>${H.logo?H.logo(snap.champion,'lg'):''}<b>${esc(snap.champion)}</b></div>`:'';
      const mvpHtml=mvp?`<div class="v37-event-mvp"><span class="v37-mvp-medal">MVP</span><div>${H.photoHtml?H.photoHtml((H.teamBy?.(mvp.team)?.players||[]).find(p=>p.nick===mvp.nick)||{nick:mvp.nick}):''}<b>${esc(mvp.nick)}</b><small>${esc(mvp.team||'')}</small></div></div>`:'';
      const hero=`<section class="v37-event-hero k-${esc(kind)} ${snap.live?'is-live':done?'is-done':'is-upcoming'}"><div class="v37-event-hero-top"><span class="v37-eyebrow">${esc(({major:'MAJOR',elite:'S-TIER',regular:'TIER-1',tier2:'TIER-2',tier3:'TIER-3',academy:'АКАДЕМИИ',qual:'КВАЛИФИКАЦИЯ',nations:'S-TIER · СБОРНЫЕ'})[kind]||String(kind).toUpperCase())} · ${yearFor(snap)}</span><span class="v37-event-status">${status}</span></div><div class="v37-event-main"><div class="v37-event-title"><h2>${esc(snap.name||'Tournament')}</h2><p>${esc(ev?.format||snap.format||'Соревновательная сетка')} · ${snap.size||snap.participants?.length||'—'} команд · ${ev?.tier==='1'?'приглашения по VRS':'открытая квалификация'}</p><div class="v37-event-progress"><div><span>Прогресс турнира</span><b>${pct}%</b></div><i><em style="width:${pct}%"></em></i></div></div>${done?'':(champ||mvpHtml)}</div>${done?results(snap,mvp):''}${stories.length?`<div class="v37-event-stories"><div class="v37-eyebrow">Материалы о турнире</div>${stories.map(x=>`<button type="button" data-art="${esc(x.id)}"><small>${esc(N()?.CATS?.[x.cat]?.l||'Материал')}</small><b>${esc(x.title)}</b></button>`).join('')}</div>`:''}</section>`;
      // v84: одна шапка турнира — этот блок (с кубком и данными события); прежняя шапка ev-head скрывается.
      const evMeta=(()=>{ try{ const st=Number(ev?.startMs||snap.gs||0), en=Number(ev?.endMs||snap.ge||0); const meta=window.V30Series?.meta?.(snap.name)||null; const prize=Number(snap.prize||ev?.prize||window.CS2Realism?.prizeFor?.(snap.name,kind)||0);
        const cell=(k,v)=>v?`<div><small>${k}</small><b>${esc(String(v))}</b></div>`:'';
        const d=x=>new Date(x).toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric'});
        return `<div class="v84-ev-meta">${cell('Даты', st?`${d(st)}${en?' – '+d(en):''}`:'')}${(()=>{ const L=window.CS2EventLocation?.(snap.name, ev?.par||ev); if(!L) return cell('Место', meta?.city?`${meta.city}${meta.lan?' · LAN':''}`:(meta?.lan===false?'Онлайн':'')); const fl=L.cc&&H.flag?H.flag(L.cc)+' ':''; const txt=L.lan?`${L.city||''}${L.city?' · ':''}LAN`:`Онлайн${L.region?' · '+L.region:''}`; return `<div><small>Место</small><b>${fl}${esc(txt)}</b></div>`; })()}${cell('Организатор', meta?.org||'')}${cell('Призовой фонд', prize?'$'+Math.round(prize).toLocaleString('en-US'):'')}</div>`; }catch(e){ return ''; } })();
      const trophyArt=(()=>{ try{ return `<div class="v84-ev-trophy">${H.trophy?H.trophy(snap.name,snap.season,kind):''}</div>`; }catch(e){ return ''; } })();
      const full=hero.replace('<div class="v37-event-main">','<div class="v37-event-main">'+trophyArt).replace('<div class="v37-event-progress">', evMeta+'<div class="v37-event-progress">');
      const i=html.indexOf('<header class="ev-head'); return i>=0?html.slice(0,i)+full+html.slice(i):full+html;
    }catch(e){console.warn('[v37] event page',e); return html;}
  }; wrapped.__v37=true; H.PAGES.event=wrapped;
}

function tick(){ try{setupEmdbBench();}catch(e){console.warn('[v37] EMDB import',e);} }
setTimeout(tick,700); (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(() => { if(!window.v57BatchCalendarSkip) tick(); },15000);
window.V37Immersion={setupEmdbBench,vrsCard,applyEmdbPlayerMeta};
console.info('[v37] immersive tournament, VRS forecasts and EMDB metadata loaded');
})();
