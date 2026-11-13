
CS2.patch('initTournamentCycle', () => function(){
    stopAllSimulations();
    createTournament();
    renderTournament();
    renderRating();
    saveSeasonState();
    stopRequested = false;
    isTVModeRunning = false;
    isFastSimRunning = false;
    isStepSimRunning = false;
    updateSimControlButtons(false);
  }, { optional: true });
