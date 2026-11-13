# Карта слоёв

Создано `node tools/build/analyze.mjs --md` — не редактировать вручную. Порядок загрузки — `js/boot/manifest.js`.

Каждая строка — глобальная функция, которую расширяют модули кроме объявившего. Перед правкой функции посмотрите, кто стоит над ней:
верхний слой срабатывает первым. В игре: `CS2.chain('имя')` в консоли браузера.

Модулей: 179. Расширений через `CS2.patch`: 4; ручных `window.X = function`: 134 (переводить на CS2.patch при правке модуля).

| Функция | Объявлена | Расширяют (в порядке загрузки) |
| --- | --- | --- |
| `applyPlayerTransfer` | js/base/game.js | rosters/orgs.js ✓ → rosters/market.js ✓ → career/career-core.js ✓ → rosters/roster-ai.js ✓ → rosters/sense.js → rosters/roster-engine.js → career/transfers.js |
| `finalizeTournamentRating` | js/base/game.js | competition/parallel-tournaments.js → core/sim-balance.js → career/career-core.js → portal/people.js → match/realism.js → competition/world-ranking.js |
| `playerWillAccept` | js/base/game.js | competition/parallel-tournaments.js → core/sim-balance.js → rosters/market.js → career/career-core.js → career/career-ui.js → rosters/expectations.js |
| `createTournament` | js/base/game.js | calendar/training-calendar.js → calendar/settings-and-generation.js → calendar/match-sync.js → calendar/schedule-speed.js → calendar/schedule-fix.js |
| `buildBroadcastQueue` | js/base/game.js | calendar/match-sync.js → calendar/schedule-speed.js → calendar/schedule-resync.js → calendar/schedule-fix.js |
| `calcMapWinProbability` | js/base/game.js | core/sim-balance.js → career/career-core.js → match/tactics.js → career/scouting.js |
| `generateDynamicSeasonSchedule` | js/base/game.js | calendar/training-calendar.js → competition/parallel-tournaments.js → calendar/series.js → core/database-import.js |
| `scheduleNextBroadcastBatch` | js/base/game.js | calendar/match-sync.js → calendar/schedule-speed.js → calendar/schedule-resync.js → calendar/window-and-waves.js |
| `broadcastAdvancePhase` | js/base/game.js | career/career-core.js → match/spectator.js → match/immersion.js |
| `finishBroadcastMatch` | js/base/game.js | calendar/schedule-speed.js → calendar/schedule-resync.js → career/career-core.js |
| `initTournamentCycle` | js/base/game.js | base/tournament-cycle.js → calendar/settings-and-generation.js → calendar/window-and-waves.js |
| `processTransferMarket` | js/base/game.js | competition/parallel-tournaments.js → core/sim-balance.js → rosters/market.js |
| `broadcastRenderDetail` | js/base/game.js | match/immersion.js → match/dynamics.js |
| `calcMatchOdds` | js/base/game.js | core/sim-balance.js → career/career-core.js |
| `conductMapVeto` | js/base/game.js | match/match-engine.js → match/veto.js |
| `generateCoach` | js/base/game.js | core/database-import.js → rosters/coaches-real.js |
| `showHistory` | js/base/game.js | competition/hltv-hub.js → awards/trophies.js |
| `startTVBroadcastMode` | js/base/game.js | calendar/match-sync.js → calendar/schedule-fix.js |
| `accumulateMatchRating` | js/base/game.js | media/newsroom.js |
| `addTeam` | js/base/game.js | core/database-import.js |
| `applyTemporaryStandIn` | js/base/game.js | rosters/roster-engine.js |
| `closeHltvHub` | js/base/game.js | competition/hltv-hub.js |
| `finalizeMajorStage` | js/base/game.js | calendar/training-calendar.js |
| `findCompatibleFreeAgent` | js/base/game.js | rosters/sense.js |
| `finishBroadcastSeries` | js/base/game.js | match/spectator.js |
| `generateFreeAgent` | js/base/game.js | rosters/real-rosters.js |
| `instantMatch` | js/base/game.js | career/career-core.js |
| `launchBroadcastMatch` | js/base/game.js | calendar/match-sync.js |
| `maybeAddBroadcastRoundHighlight` | js/base/game.js | match/round-sim.js |
| `maybeAutoBootcamp` | js/base/game.js | calendar/training-calendar.js |
| `maybeTransferCoach` | js/base/game.js | core/database-import.js |
| `maybeTriggerBroadcastTacticalPause` | js/base/game.js | match/immersion.js |
| `openBroadcastMatchDetail` | js/base/game.js | match/spectator.js |
| `publishPostPauseTactic` | js/base/game.js | career/career-core.js |
| `renderBroadcastPanel` | js/base/game.js | calendar/match-sync.js |
| `renderSeasonBanner` | js/base/game.js | competition/parallel-tournaments.js |
| `resetToDefault` | js/base/game.js | core/factory-reset.js |
| `restoreTemporaryStandIn` | js/base/game.js | rosters/roster-engine.js |
| `runAutomaticBootcamps` | js/base/game.js | calendar/training-calendar.js |
| `saveSeasonState` | js/base/game.js | core/save-compact.js |
| `saveTeams` | js/base/game.js | core/database-import.js |
| `setupBracketTournament` | js/base/game.js | competition/draw.js |
| `setupGSLTournament` | js/base/game.js | competition/draw.js |
| `setupSwissTournament` | js/base/game.js | competition/draw.js |
| `stopTournamentBroadcast` | js/base/game.js | calendar/match-sync.js |
| `toggleHltvDetails` | js/base/game.js | competition/hltv-hub.js |
| `triggerRandomEvents` | js/base/game.js | calendar/settings-and-generation.js |
| `tvPlaybackSpeed` | js/base/game.js | calendar/schedule-speed.js |
| `updateFatigueAndForm` | js/base/game.js | calendar/training-calendar.js |
| `updatePauseButtonsUI` | js/base/game.js | match/immersion.js |
