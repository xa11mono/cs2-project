# Карта слоёв

Создано `node tools/build/analyze.mjs --md` — не редактировать вручную. Порядок загрузки — `js/boot/manifest.js`.

Каждая строка — глобальная функция, которую расширяют модули кроме объявившего. Перед правкой функции посмотрите, кто стоит над ней:
верхний слой срабатывает первым. В игре: `CS2.chain('имя')` в консоли браузера.

Модулей: 179. Вызовов `CS2.patch`: 161. Все слои подключаются через ядро — ручные обёртки ловит тест `tests/v144-layers.test.js`.

| Функция | Объявлена | Расширяют (в порядке загрузки) |
| --- | --- | --- |
| `applyPlayerTransfer` | js/base/game.js | rosters/roster-integrity.js ✓ → rosters/orgs.js ✓ → rosters/market.js ✓ → career/career-core.js ✓ → rosters/roster-ai.js ✓ → rosters/sense.js ✓ → rosters/roster-engine.js ✓ → career/transfers.js ✓ |
| `finalizeTournamentRating` | js/base/game.js | base/auto-season.js ✓ → awards/trophies.js ✓ → competition/parallel-tournaments.js ✓ → core/sim-balance.js ✓ → career/career-core.js ✓ → portal/people.js ✓ → match/realism.js ✓ → competition/world-ranking.js ✓ |
| `createTournament` | js/base/game.js | calendar/training-calendar.js ✓ → calendar/settings-and-generation.js ✓ → calendar/match-sync.js ✓ → calendar/schedule-speed.js ✓ → calendar/schedule-fix.js ✓ |
| `broadcastAdvancePhase` | js/base/game.js | base/auto-season.js ✓ → career/career-core.js ✓ → match/spectator.js ✓ → match/immersion.js ✓ |
| `broadcastRenderDetail` | js/base/game.js | base/auto-season.js ✓ → base/live-detail-sync.js ✓ → match/immersion.js ✓ → match/dynamics.js ✓ |
| `buildBroadcastQueue` | js/base/game.js | calendar/match-sync.js ✓ → calendar/schedule-speed.js ✓ → calendar/schedule-resync.js ✓ → calendar/schedule-fix.js ✓ |
| `calcMapWinProbability` | js/base/game.js | core/sim-balance.js ✓ → career/career-core.js ✓ → match/tactics.js ✓ → career/scouting.js ✓ |
| `generateDynamicSeasonSchedule` | js/base/game.js | calendar/training-calendar.js ✓ → competition/parallel-tournaments.js ✓ → calendar/series.js ✓ → core/database-import.js ✓ |
| `initTournamentCycle` | js/base/game.js | base/auto-season.js ✓ → base/tournament-cycle.js ✓ → calendar/settings-and-generation.js ✓ → calendar/window-and-waves.js ✓ |
| `processTransferMarket` | js/base/game.js | rosters/roster-integrity.js ✓ → competition/parallel-tournaments.js ✓ → core/sim-balance.js ✓ → rosters/market.js ✓ |
| `scheduleNextBroadcastBatch` | js/base/game.js | calendar/match-sync.js ✓ → calendar/schedule-speed.js ✓ → calendar/schedule-resync.js ✓ → calendar/window-and-waves.js ✓ |
| `conductMapVeto` | js/base/game.js | base/auto-season.js ✓ → match/match-engine.js ✓ → match/veto.js ✓ |
| `finishBroadcastMatch` | js/base/game.js | calendar/schedule-speed.js ✓ → calendar/schedule-resync.js ✓ → career/career-core.js ✓ |
| `playerWillAccept` | js/base/game.js | competition/parallel-tournaments.js ✓ → career/career-core.js ✓ → rosters/expectations.js ✓ |
| `applyTemporaryStandIn` | js/base/game.js | rosters/roster-integrity.js ✓ → rosters/roster-engine.js ✓ |
| `calcMatchOdds` | js/base/game.js | core/sim-balance.js ✓ → career/career-core.js ✓ |
| `findCompatibleFreeAgent` | js/base/game.js | rosters/roster-integrity.js ✓ → rosters/sense.js ✓ |
| `generateCoach` | js/base/game.js | core/database-import.js ✓ → rosters/coaches-real.js |
| `generateFreeAgent` | js/base/game.js | rosters/roster-integrity.js ✓ → rosters/real-rosters.js ✓ |
| `maybeAutoBootcamp` | js/base/game.js | base/auto-season.js ✓ → calendar/training-calendar.js ✓ |
| `maybeTriggerBroadcastTacticalPause` | js/base/game.js | base/auto-season.js ✓ → match/immersion.js ✓ |
| `openBroadcastMatchDetail` | js/base/game.js | base/live-detail-sync.js ✓ → match/spectator.js ✓ |
| `renderBroadcastPanel` | js/base/game.js | base/auto-season.js ✓ → calendar/match-sync.js ✓ |
| `renderSeasonBanner` | js/base/game.js | base/auto-season.js ✓ → competition/parallel-tournaments.js ✓ |
| `restoreTemporaryStandIn` | js/base/game.js | rosters/roster-integrity.js ✓ → rosters/roster-engine.js ✓ |
| `showHistory` | js/base/game.js | competition/hltv-hub.js ✓ → awards/trophies.js ✓ |
| `startTVBroadcastMode` | js/base/game.js | calendar/match-sync.js ✓ → calendar/schedule-fix.js ✓ |
| `accumulateMatchRating` | js/base/game.js | media/newsroom.js ✓ |
| `addBroadcastEvent` | js/base/game.js | base/live-detail-sync.js ✓ |
| `addTeam` | js/base/game.js | core/database-import.js ✓ |
| `closeHltvHub` | js/base/game.js | competition/hltv-hub.js ✓ |
| `computePickemStageHints` | js/base/game.js | base/auto-season.js ✓ |
| `consumeBroadcastTacticalImpact` | js/base/game.js | base/auto-season.js ✓ |
| `createMatchElement` | js/base/game.js | base/auto-season.js ✓ |
| `finalizeMajorStage` | js/base/game.js | calendar/training-calendar.js ✓ |
| `finishBroadcastSeries` | js/base/game.js | match/spectator.js ✓ |
| `formatBroadcastScore` | js/base/game.js | base/auto-season.js ✓ |
| `getBroadcastStateClass` | js/base/game.js | base/auto-season.js ✓ |
| `getBroadcastStatusText` | js/base/game.js | base/auto-season.js ✓ |
| `getMapWinrate` | js/base/game.js | base/auto-season.js ✓ |
| `getMatchHype` | js/base/game.js | base/auto-season.js ✓ |
| `getMaxParallelMatches` | js/base/game.js | base/auto-season.js ✓ |
| `instantMatch` | js/base/game.js | career/career-core.js ✓ |
| `launchBroadcastMatch` | js/base/game.js | calendar/match-sync.js ✓ |
| `maybeAddBroadcastRoundHighlight` | js/base/game.js | match/round-sim.js ✓ |
| `maybeTransferCoach` | js/base/game.js | core/database-import.js ✓ |
| `prepareBroadcastRoundBuy` | js/base/game.js | base/auto-season.js ✓ |
| `publishPostPauseTactic` | js/base/game.js | career/career-core.js ✓ |
| `recordH2HWin` | js/base/game.js | base/auto-season.js ✓ |
| `renderRating` | js/base/game.js | base/auto-season.js ✓ |
| `renderTournament` | js/base/game.js | base/auto-season.js ✓ |
| `resetToDefault` | js/base/game.js | core/factory-reset.js ✓ |
| `runAutomaticBootcamps` | js/base/game.js | calendar/training-calendar.js ✓ |
| `saveSeasonState` | js/base/game.js | core/save-compact.js ✓ |
| `saveTeams` | js/base/game.js | core/database-import.js ✓ |
| `setupBracketTournament` | js/base/game.js | competition/draw.js ✓ |
| `setupGSLTournament` | js/base/game.js | competition/draw.js ✓ |
| `setupSwissTournament` | js/base/game.js | competition/draw.js ✓ |
| `stopTournamentBroadcast` | js/base/game.js | calendar/match-sync.js ✓ |
| `toggleHltvDetails` | js/base/game.js | competition/hltv-hub.js ✓ |
| `toggleTournamentBroadcastPause` | js/base/game.js | base/live-detail-sync.js ✓ |
| `tvPlaybackSpeed` | js/base/game.js | calendar/schedule-speed.js |
| `updateFatigueAndForm` | js/base/game.js | calendar/training-calendar.js ✓ |
| `updatePauseButtonsUI` | js/base/game.js | match/immersion.js ✓ |
