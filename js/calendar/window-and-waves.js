
(() => {
  'use strict';
  const DAY=864e5, MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const COL={'1':'#f0b429','2':'#4bcffa','3':'#9b59b6','academy':'#58c58a'}, TL={'1':'Tier-1','2':'Tier-2','3':'Tier-3','academy':'Академии'};
  const FL={single:'Single Elim',double:'Double Elim',swiss:'Swiss',gsl:'GSL Groups'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowMs=()=>Number((seasonState.calendar||{}).currentMs)||Date.now();
  const sod=ms=>{const d=new Date(ms);d.setHours(0,0,0,0);return d.getTime();};
  const fdt=ms=>{const d=new Date(ms);return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});};
  let view=null, sel=0, filt={'1':true,'2':true,'3':true,'academy':true};

  // ---------- 1) Матчи идут волнами по 2: следующая пара не стартует, пока не закончились ОБА матча текущей ----------
  function regroup(b){
    // Волна объединяет только матчи, которым планировщик уже назначил один batchId.
    // Нельзя склеивать соседние batchId: так четвертьфинал/полуфинал мог стартовать
    // одновременно с матчем следующего раунда, а очередь теряла интервалы по дням.
    const q=(b.queue||[]).filter(x=>x.status==='scheduled'||!x.status);
    const groups=new Map();
    q.forEach((item,index)=>{
      if(item.batchId==null||item.batchId===''||!Number.isFinite(Number(item.batchId))||Number(item.batchId)<=0) item.batchId=1000000+index;
      const key=String(item.batchId);
      if(!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(item);
    });
    groups.forEach(items=>{
      if(items.length<2) return;
      const at=Math.min(...items.map(x=>Number(x.time)||Infinity).filter(Number.isFinite));
      if(!Number.isFinite(at)) return;
      items.forEach(x=>{ x.time=at; x.v18PlannedTime=at; x.gameScheduledAt=at; });
    });
  }
  CS2.patch('scheduleNextBroadcastBatch', priorSched => function(...a){
      const b=currentTournament&&currentTournament.broadcast;
      if(b&&b.running){
        if(b.active&&b.active.length) return;            // волна ещё играется — ждём второй матч пары
        try{ if(typeof buildBroadcastQueue==='function') buildBroadcastQueue(); regroup(b); }catch(e){ console.warn('[v22] regroup',e); }
      }
      return priorSched.apply(this,a);
    }, { id: '__v22' });

  // Ручная генерация Tier-1 раньше даты больше не «съедает» расписание: часы переходят к дате старта.
  CS2.patch('initTournamentCycle', priorInit => function(...a){
      try{
        if(!(currentTournament&&!currentTournament.completed)){
          const st=(seasonState.seasonSchedule||[])[Number(seasonState.tournamentIndex)||1], t=st&&st.calendar&&Number(st.calendar.startMs), c=seasonState.calendar;
          if(t&&c&&Number(c.currentMs)<t){ c.currentMs=t; c.lastAdvanceReason='переход к началу турнира'; }
        }
      }catch(e){}
      return priorInit.apply(this,a);
    }, { id: '__v23' });

  // ---------- 2) Кнопка «Создать турнир» вместо постоянного меню ----------
  window.v22ToggleCreate=function(){
    const c=document.querySelector('.controls'); if(!c) return;
    const open=c.classList.toggle('v22-create-open');
    const b=document.getElementById('v22-create-toggle'); if(b) b.textContent=open?'🛠 Создать турнир ▴':'🛠 Создать турнир ▾';
  };

  // ---------- 3) Календарь в отдельном окне ----------
  function events(){
    const out=[], S=seasonState, idx=Number(S.tournamentIndex)||1, act=!!(currentTournament&&!currentTournament.completed);
    const activeIdx=act?(Number(currentTournament?.tourIndex)||idx):idx;
    (S.seasonSchedule||[]).forEach((st,i)=>{ if(!st||!st.calendar||!st.calendar.startMs) return;
      // Турнир определяется по индексу события: имя могло измениться после применения шаблона.
      const live=i===activeIdx&&act;
      const forecast=live&&typeof window.v42TournamentForecastEnd==='function'?Number(window.v42TournamentForecastEnd(currentTournament))||0:0;
      const endMs=Math.max(Number(st.calendar.endMs)||st.calendar.startMs+DAY,forecast);
      out.push({id:'t1-'+i,tier:'1',name:st.name,startMs:st.calendar.startMs,endMs,status:i<activeIdx?'done':(live?'live':'scheduled'),format:st.format,sub:st.type,main:i===activeIdx}); });
    (S.parallelSchedule||[]).filter(e=>e.season===S.currentSeason).forEach(e=>out.push({id:e.id,par:true,tier:e.kind==='academy'?'academy':e.tier,name:e.name,startMs:e.startMs,endMs:e.endMs||e.startMs+DAY,status:e.status==='completed'?'done':(e.status==='live'?'live':'scheduled'),format:e.format}));
    return out.sort((a,b)=>a.startMs-b.startMs);
  }
  const col=e=>e.tier==='1'&&e.sub==='major'?'#eb4d4b':COL[e.tier];
  const short=n=>{n=String(n).replace(/ 20\d\d$/,'');return n.length>17?n.slice(0,16)+'…':n;};
  const icon=e=>e.status==='done'?'✅':e.status==='live'?'🔴':'🗓';
  function item(e){
    return `<div class="v22-ev ${e.status}" style="border-left-color:${col(e)}"><div style="min-width:0"><b>${esc(e.name)}</b><span>${icon(e)} ${fdt(e.startMs)} → ${fdt(e.endMs)}<br>${TL[e.tier]}${e.format?' • '+(FL[e.format]||e.format):''}</span></div>${e.par?`<button type="button" class="secondary" onclick="v21OpenTournament('${e.id}')">Открыть</button>`:''}</div>`;
  }
  function render(){
    const box=document.getElementById('v22-cal-body'); if(!box||!view) return;
    const now=nowMs(), y=view.getFullYear(), mo=view.getMonth(), off=(new Date(y,mo,1).getDay()+6)%7;
    const evs=events().filter(e=>filt[e.tier]);
    const matches=typeof window.v42CalendarMatches==='function'?window.v42CalendarMatches():[];
    let cells='';
    for(let i=0;i<42;i++){
      const d=new Date(y,mo,1-off+i), ds=d.getTime(), de=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();
      const list=evs.filter(e=>e.startMs<de&&e.endMs>ds);
      const matchCount=matches.filter(m=>Number(m.at)>=ds&&Number(m.at)<de).length;
      cells+=`<div class="v22-day ${d.getMonth()!==mo?'other':''} ${now>=ds&&now<de?'today':''} ${sel===ds?'sel':''}" onclick="v22CalSel(${ds})"><div class="dn">${d.getDate()}</div>${list.slice(0,3).map(e=>`<div class="v22-chip ${e.status}" style="border-left-color:${col(e)}">${esc(short(e.name))}</div>`).join('')}${list.length>3?`<div class="v22-more">+${list.length-3}</div>`:''}${matchCount?`<div class="v22-match-count">⚔ ${matchCount} матч.</div>`:''}</div>`;
    }
    const dayEvs=evs.filter(e=>e.startMs<sel+DAY&&e.endMs>sel), live=evs.filter(e=>e.status==='live'), soon=evs.filter(e=>e.status==='scheduled'&&e.startMs>now).slice(0,8);
    const dayMatches=matches.filter(m=>Number(m.at)>=sel&&Number(m.at)<sel+DAY).sort((a,b)=>Number(a.at)-Number(b.at));
    const matchHtml=m=>`<div class="v22-match-row ${m.status||'scheduled'}"><b>${fdt(m.at).split(' ').slice(-1)[0]} · ${esc(m.stage||'Матч')}</b><span>${esc(m.a||'TBD')} vs ${esc(m.b||'TBD')}</span><small>${m.status==='live'?'🔴 LIVE':m.status==='done'?'✅ Завершён':m.preview?'⏳ Предварительный слот':'🕒 Запланирован'}</small></div>`;
    const sec=(t,l,em)=>`<div class="v22-sec"><h4>${t}</h4>${l.length?l.map(item).join(''):`<div class="v22-empty">${em}</div>`}</div>`;
    document.getElementById('v22-cal-title').textContent=`${MN[mo]} ${y}`;
    document.getElementById('v22-cal-now').textContent=`Сейчас: ${fdt(now)}`;
    box.innerHTML=`<div class="v22-grid-wrap"><div class="v22-dow">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>`<div>${x}</div>`).join('')}</div><div class="v22-grid">${cells}</div></div><div class="v22-side">${sec('🔴 Идут сейчас',live,'Сейчас турниров нет')}${sec('📆 '+new Date(sel).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}),dayEvs,'В этот день турниров нет')}<div class="v22-sec"><h4>⚔️ Матчи на выбранный день</h4>${dayMatches.length?dayMatches.map(matchHtml).join(''):`<div class="v22-empty">Матчи на эту дату пока не назначены</div>`}</div>${sec('⏭ Скоро',soon,'Ближайших турниров нет')}</div>`;
  }
  window.v22CalSel=ms=>{ sel=ms; render(); };
  window.v22CalNav=n=>{ view=new Date(view.getFullYear(),view.getMonth()+n,1); render(); };
  window.v22CalToday=()=>{ const d=new Date(nowMs()); view=new Date(d.getFullYear(),d.getMonth(),1); sel=sod(nowMs()); render(); };
  window.v22CalFilt=(k,v)=>{ filt[k]=v; render(); };
  window.v22CalClose=ev=>{ if(ev&&ev.target!==ev.currentTarget) return; document.getElementById('v22-cal-modal')?.classList.remove('open'); };
  window.v22OpenCalendar=()=>{ ensureDom(); window.v22CalToday(); document.getElementById('v22-cal-modal').classList.add('open'); };

  function ensureDom(){
    if(document.getElementById('v22-cal-modal')) return;
    const m=document.createElement('div'); m.id='v22-cal-modal'; m.className='v22-cal-modal'; m.onclick=window.v22CalClose;
    m.innerHTML=`<div class="v22-cal-box" onclick="event.stopPropagation()"><div class="v22-cal-head"><div><div class="v22-cal-h1">🗓 Календарь сезона</div><div id="v22-cal-now" class="v22-cal-sub"></div></div><div class="v22-cal-nav"><button type="button" class="secondary" onclick="v22CalNav(-1)">◀</button><b id="v22-cal-title"></b><button type="button" class="secondary" onclick="v22CalNav(1)">▶</button><button type="button" class="secondary" onclick="v22CalToday()">Сегодня</button></div><div class="v22-cal-filt">${Object.keys(TL).map(k=>`<label style="color:${COL[k]}"><input type="checkbox" checked onchange="v22CalFilt('${k}',this.checked)"> ${TL[k]}</label>`).join('')}</div><button type="button" class="secondary" style="color:var(--loss);border-color:var(--loss);" onclick="v22CalClose()">✕ Закрыть</button></div><div id="v22-cal-body" class="v22-cal-main"></div></div>`;
    document.body.appendChild(m);
  }
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(()=>{ try{ if(document.getElementById('v22-cal-modal')?.classList.contains('open')) render(); }catch(e){} },2000);
})();
