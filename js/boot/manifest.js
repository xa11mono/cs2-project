/* CS2 Manager — манифест модулей. ЕДИНСТВЕННОЕ место, где перечислены стили и скрипты игры.

   • Порядок важен: модули — это слои, более поздний может расширять функции более раннего
     (через CS2.patch, см. js/core/kernel.js и ARCHITECTURE.md). Новый модуль добавляется сюда одной строкой.
   • Папка = домен: core (ядро, сохранения), data (справочники), base (исходная игра), calendar, competition
     (турниры, рейтинги), match (движок матча), radar (2D-симуляция раунда), rosters (составы, рынок ИИ),
     career (режим менеджера), awards (кубки, награды), media (новости, сообщество), fan (Pick'Em, стикеры),
     portal (интерфейс HLTV-портала).
   • BUILD — одна версия для сброса кэша браузера у всех файлов (раньше у каждого тега был свой ?v=…).
   • Сборка для релиза: node tools/build/build.mjs → dist/ (один минифицированный JS и один CSS). */
(function () {
  'use strict';
  const BUILD = '144';
  const CSS = [
    'css/base/app.css',  // base
    'css/base/match-modal.css',
    'css/base/viewport.css',
    'css/base/gsl-layout.css',
    'css/base/training-calendar.css',
    'css/base/settings-menu.css',
    'css/base/calendar-window.css',
    'css/base/hltv-hub.css',
    'css/awards/trophies.css',  // awards
    'css/portal/hltv-site.css',  // portal
    'css/portal/game-ui.css',
    'css/media/news-feed.css',  // media
    'css/portal/tokens.css',  // portal
    'css/awards/trophy-oversize.css',  // awards
    'css/awards/trophy-giant.css',
    'css/portal/home-legacy.css',  // portal
    'css/portal/immersion.css',
    'css/portal/visual-fixes.css',
    'css/portal/ranking-switch.css',
    'css/match/immersion.css',  // match
    'css/match/dynamics.css',
    'css/competition/integrity.css',  // competition
    'css/portal/quality-fixes.css',  // portal
    'css/core/autosave.css',  // core
    'css/portal/profile-performance.css',  // portal
    'css/media/publications.css',  // media
    'css/portal/polish.css',  // portal
    'css/portal/theme.css',
    'css/portal/motion.css',
    'css/portal/game-shell.css',
    'css/portal/sense.css',
    'css/career/team-select.css',  // career
    'css/career/career-windows.css',
    'css/portal/design.css',  // portal
    'css/career/squad.css',  // career
    'css/career/manager.css',
    'css/portal/arena.css',  // portal
    'css/rosters/power-and-value.css',  // rosters
    'css/media/news-sources.css',  // media
    'css/media/news-covers.css',
    'css/fan/badges.css',  // fan
    'css/core/fonts.css',  // core
    'css/fan/pickem-skin.css',  // fan
    'css/fan/capsules.css',
    'css/media/pub-posts.css',  // media
    'css/portal/event-polish.css',  // portal
    'css/calendar/tier1-calendar.css',  // calendar
    'css/portal/event-results.css',  // portal
  ];
  const JS = [
    'js/core/kernel.js',  // core
    'js/core/scheduler.js',
    'js/core/storage-guard.js',
    'js/data/real-players-2026.js',  // data
    'js/data/emdb-2026.js',
    'js/base/game.js',  // base
    'js/core/persist-tournament.js',  // core
    'js/base/auto-season.js',  // base
    'js/base/tournament-cycle.js',
    'js/base/live-repair.js',
    'js/base/live-detail-sync.js',
    'js/calendar/training-calendar.js',  // calendar
    'js/calendar/settings-and-generation.js',
    'js/calendar/smart-skip.js',
    'js/calendar/match-sync.js',
    'js/calendar/schedule-speed.js',
    'js/calendar/schedule-resync.js',
    'js/competition/hltv-hub.js',  // competition
    'js/data/trophy-arts.js',  // data: контуры кубков (вынесены из trophy-forge)
    'js/awards/trophy-forge.js',  // awards
    'js/awards/trophies.js',
    'js/rosters/roster-integrity.js',  // rosters
    'js/radar/radar-core.js',  // radar
    'js/radar/grenades.js',
    'js/radar/combat.js',
    'js/radar/bomb.js',
    'js/radar/mirage-tactics.js',
    'js/radar/fast-render.js',
    'js/radar/mirage-behavior.js',
    'js/radar/role-sync.js',
    'js/rosters/real-rosters.js',  // rosters
    'js/competition/parallel-tournaments.js',  // competition
    'js/calendar/window-and-waves.js',  // calendar
    'js/radar/hold-look.js',  // radar
    'js/radar/runtime-safety.js',
    'js/radar/bomb-recovery.js',
    'js/radar/ai-pipeline.js',
    'js/radar/boot-check.js',
    'assets/media/media-manifest.js',  // assets/media
    'js/portal/flags.js',  // portal
    'js/portal/hltv-site.js',
    'js/portal/game-ui.js',
    'js/core/config.js',  // core
    'js/core/save-profile.js',
    'js/rosters/stature.js',  // rosters
    'js/rosters/coaches.js',
    'js/competition/major-hosts.js',  // competition
    'js/rosters/replace.js',  // rosters
    'js/competition/tiers.js',  // competition
    'js/competition/draw.js',
    'js/competition/legend-clubs.js',
    'js/competition/locations.js',
    'js/rosters/orgs.js',  // rosters
    'js/core/sim-balance.js',  // core
    'js/media/news-feed.js',  // media
    'js/rosters/market.js',  // rosters
    'js/media/news-stories.js',  // media
    'js/calendar/series.js',  // calendar
    'js/career/career-core.js',  // career
    'js/portal/events.js',  // portal
    'js/portal/match-page.js',
    'js/portal/home.js',
    'js/portal/people.js',
    'js/portal/media.js',
    'js/career/career-ui.js',  // career
    'js/career/dm.js',
    'js/match/spectator.js',  // match
    'js/competition/prestige.js',  // competition
    'js/fan/pickem.js',  // fan
    'js/awards/grand-slam-top20.js',  // awards
    'js/data/icons.js',  // data
    'js/data/comments-pool.js',
    'js/media/comments.js',  // media
    'js/calendar/skip-days.js',  // calendar
    'js/competition/shows.js',  // competition
    'js/competition/nations-cup.js',
    'js/portal/player-info.js',  // portal
    'js/rosters/roster-ai.js',  // rosters
    'js/match/round-sim.js',  // match
    'js/media/headlines.js',  // media
    'js/competition/major-path-odds.js',  // competition
    'js/awards/streaks.js',  // awards
    'js/fan/betting.js',  // fan
    'js/fan/medals.js',
    'js/fan/badges.js',
    'js/media/drama.js',  // media
    'js/competition/showmatch.js',  // competition
    'js/competition/fpl.js',
    'js/awards/calendar-year-fixes.js',  // awards
    'js/portal/home-legacy.js',  // portal
    'js/portal/immersion.js',
    'js/competition/vrs.js',  // competition
    'js/rosters/visual-fixes.js',  // rosters
    'js/match/realism.js',  // match
    'js/match/match-engine.js',
    'js/portal/map-art.js',  // portal
    'js/competition/world-ranking.js',  // competition
    'js/calendar/schedule-fix.js',  // calendar
    'js/match/immersion.js',  // match
    'js/match/dynamics.js',
    'js/competition/integrity.js',  // competition
    'js/awards/season-awards.js',  // awards
    'js/core/sim-liveness.js',  // core
    'js/core/autosave.js',
    'js/rosters/player-career-stats.js',  // rosters
    'js/core/factory-reset.js',  // core
    'js/core/database-import.js',
    'js/awards/reward-registry.js',  // awards
    'js/awards/yearly-mvp.js',
    'js/awards/awards-engine.js',
    'js/core/sim-kernel.js',  // core
    'js/media/pickem-publishers.js',  // media
    'js/media/phrases.js',
    'js/media/newsroom.js',
    'js/portal/layout.js',  // portal
    'js/media/community.js',  // media
    'js/fan/sticker-art.js',  // fan
    'js/fan/stickers.js',
    'js/match/world-mods.js',  // match
    'js/portal/hltv-extra.js',  // portal
    'js/match/veto.js',  // match
    'js/core/save-compact.js',  // core
    'js/core/history-legacy.js',
    'js/portal/nav.js',  // portal
    'js/fan/pickem-history.js',  // fan
    'js/fan/pickem-skin.js',
    'js/fan/capsules.js',
    'js/media/pub-posts.js',  // media
    'js/portal/event-polish.js',  // portal
    'js/portal/watch.js',
    'assets/ui/team-tint.js',  // assets/ui
    'js/portal/game-shell.js',  // portal
    'js/data/rosters-2026.js',  // data
    'js/rosters/rosters-2026.js',  // rosters
    'js/rosters/coaches-real.js',
    'js/career/offseason-window.js',  // career
    'js/media/rumor-truth.js',  // media
    'js/portal/motion.js',  // portal
    'assets/media/player-heads.js',  // assets/media
    'js/rosters/sense.js',  // rosters
    'js/competition/fair-rating.js',  // competition
    'js/rosters/roster-engine.js',  // rosters
    'js/career/control.js',  // career
    'js/career/club-strategy.js',
    'js/rosters/expectations.js',  // rosters
    'js/career/board.js',  // career
    'js/rosters/develop.js',  // rosters
    'js/career/staff.js',  // career
    'js/match/tactics.js',  // match
    'js/rosters/careers.js',  // rosters
    'js/career/eras.js',  // career
    'js/career/fans.js',
    'js/career/economy.js',
    'js/competition/major-path.js',  // competition
    'js/career/press.js',  // career
    'js/career/desk.js',
    'js/rosters/generations.js',  // rosters
    'js/career/team-select.js',  // career
    'js/career/career-windows.js',
    'js/portal/design.js',  // portal
    'js/career/squad.js',  // career
    'js/career/talks.js',
    'js/career/scouting.js',
    'js/career/transfers.js',
    'js/match/spectator-stats.js',  // match
    'js/core/runtime-diagnostics.js',  // core
    'js/core/save-coalesce.js',
    'js/core/perf.js',
    'js/media/news-covers.js',  // media
    'js/portal/arena.js',  // portal
    'js/rosters/power-and-value.js',  // rosters
    'js/rosters/player-power.js',
    'js/media/news-sources.js',  // media
    'js/competition/bracket-ranks.js',  // competition
    'js/rosters/after-career.js',  // rosters
    'js/career/matchday.js',  // career
    'js/career/map-training.js',
    'js/calendar/tier1-calendar.js',  // calendar
  ];
  window.CS2_MANIFEST = Object.freeze({ build: BUILD, css: Object.freeze(CSS), js: Object.freeze(JS), bundled: false });
})();
