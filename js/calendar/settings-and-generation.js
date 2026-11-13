
(() => {
  function getSettingsBackdrop(){ return document.getElementById('settings-drawer-backdrop'); }
  window.openSettingsMenu=function(){ const el=getSettingsBackdrop(); if(el) el.classList.add('open'); };
  window.closeSettingsMenu=function(event){ const el=getSettingsBackdrop(); if(!el) return; if(event && event.target !== el) return; el.classList.remove('open'); };
  window.toggleSettingsMenu=function(){ const el=getSettingsBackdrop(); if(el) el.classList.toggle('open'); };
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') window.closeSettingsMenu(); });

  // The old v7 Favorite Team panel is intentionally removed from the UI.
  try {
    if(typeof seasonState !== 'undefined'){ seasonState.favoriteTeam=''; seasonState.v7Welcome=true; }
    if(typeof V7 !== 'undefined'){ V7.autoSeason=false; V7.favoriteTeam=''; }
  } catch(e) {}
  const removeLegacyFavorite=()=>{ const el=document.getElementById('v7-favorite-panel'); if(el) el.remove(); };
  removeLegacyFavorite();
  (globalThis.CS2Loop?.every || ((f, ms) => (typeof setInterval === "function" ? setInterval : window.setInterval)(f, ms)))(removeLegacyFavorite, 1000);

  // Harden tournament generation against a bad saved roster / event side-effect.
  CS2.patch('createTournament', originalCreateTournamentV16 => function(customRoster=null){
      try {
        if(typeof teams!=='undefined' && Array.isArray(teams)) teams.forEach(t=>{ try{ ensurePlayerLayer(t); }catch(e){} });
        const result=originalCreateTournamentV16.apply(this,arguments);
        if(!currentTournament) throw new Error('Турнир не был создан');
        currentTournament.participants = Array.isArray(currentTournament.participants) ? currentTournament.participants.filter(Boolean) : [];
        return result;
      } catch(err){
        console.error('v16 createTournament repair:',err);
        // Second pass: suppress only the non-critical random event layer for this creation attempt.
        // v144: CS2.swap возвращает случайные события и при ошибке повтора (раньше они оставались выключенными навсегда)
        const self=this, args=arguments;
        const retry=typeof window.triggerRandomEvents==='function'
          ? CS2.swap('triggerRandomEvents', ()=>{}, ()=>originalCreateTournamentV16.apply(self,args))
          : originalCreateTournamentV16.apply(self,args);
        if(!currentTournament) throw err;
        return retry;
      }
    }, { id: '__v16Safe' });

  // Make the actual button path resilient and always expose a useful status.
  CS2.patch('initTournamentCycle', () => function(){
    try {
      stopAllSimulations();
      createTournament();
      if(!currentTournament) throw new Error('Сетка не создана');
      renderTournament();
      renderRating();
      saveSeasonState();
      stopRequested=false; isTVModeRunning=false; isFastSimRunning=false; isStepSimRunning=false;
      updateSimControlButtons(false);
      const root=document.getElementById('bracket-root-layout');
      const hasContent=!!root && !!root.querySelector('.match,.major-stage-panel,.swiss-container,.gsl-container,.bounty-layout-wrap');
      if(!hasContent) { renderTournament(); }
      const status=document.getElementById('tour-status');
      if(status && !status.innerText.trim()) status.innerText='Турнир начался';
    } catch(err){
      console.error('v16 tournament generation error:',err);
      const status=document.getElementById('tour-status');
      if(status) status.innerText=`⚠️ Не удалось создать турнир: ${err?.message || 'ошибка'}`;
    }
  }, { optional: true });
})();
