const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (v, m) => { if (!v) throw new Error(m); };

// In-game public Pick'Em posts: media, streamers and two pro players from real current rosters.
const teamNames = Array.from({ length: 16 }, (_, i) => `Team ${String(i + 1).padStart(2, '0')}`);
const teams = teamNames.map((name, i) => ({
  name, pts: 800 - i * 12, form: 90 - i * 2,
  players: Array.from({ length: 5 }, (_, j) => ({
    nick: `${name.replace(/ /g, '')}-P${j + 1}`,
    firepower: 95 - i * 2 - j,
    form: 100 - i * 2 - j,
    tacticalIQ: 90 - i - j
  }))
}));
const ctx = {
  title: 'Major Test 2026', season: 1, majorId: 'Major Test 2026|1', unlocked: true, completed: false,
  stages: {
    1: { teams: teamNames, completed: false, started: false },
    2: { teams: teamNames, completed: false, started: false },
    3: { teams: teamNames, completed: false, started: false }
  },
  playoffs: teamNames.slice(0, 8), playoffsStarted: false
};
const publications = [];
const News = {
  publishPublicPickem(data) {
    const item = { cat: 'pickem-pub', icon: '🎯', imp: 5, body: [], tags: [], ...data };
    if (publications.some(x => x.id === item.id)) return null;
    publications.push(item); return item;
  },
  publicPickem() { return publications; }
};
const window = {
  V29News: News,
  V33Pickem: { publicContext: () => ctx },
  teams,
  seasonState: { calendar: { currentMs: 1_800_000_000_000 } }
};
const vmContext = { window, console, setTimeout: () => 0, setInterval: () => 0, Date, Math, Map, Set, Object, Array, Number, String };
vm.runInNewContext(read('js/manager/v70-pickem-publishers.js'), vmContext);
const Pub = window.V70PickemPublications;
assert(Pub && typeof Pub.sync === 'function', 'publisher integration must be registered');
const first = Pub.sync();
assert(first.phases === 4, `all unlocked stages and playoffs must publish; got ${first.phases} phases`);
// v84: authors publish one after another across the open window, not all at once.
assert(publications.length < 32, `staggered publishing must not post every author instantly; got ${publications.length}`);
for (let h = 0; h < 80; h++) { window.seasonState.calendar.currentMs += 3600000; Pub.sync(); }
assert(publications.length === 32, `six media/streamer accounts plus two pros per phase = 32 posts; got ${publications.length}`);
assert(publications.every(x => x.cat === 'pickem-pub' && x.publisher && x.pickemPublication), 'all generated posts must use the shared public news category');
for (const p of publications.filter(x => x.pickemPublication.stage)) {
  const picks = p.pickemPublication;
  assert(picks.threeZero.length === 2, `${p.publisher.name}: exactly two 3:0 picks`);
  assert(picks.advance.length === 6, `${p.publisher.name}: exactly six advancing picks`);
  assert(picks.zeroThree.length === 2, `${p.publisher.name}: exactly two 0:3 picks`);
  const all = [...picks.threeZero, ...picks.advance, ...picks.zeroThree];
  assert(new Set(all).size === 10, `${p.publisher.name}: stage Pick'Em groups must be disjoint`);
  assert(/симуляц/i.test(picks.note), 'simulated predictions must be disclosed, not presented as real quotes');
}
for (const p of publications.filter(x => !x.pickemPublication.stage)) {
  assert(p.pickemPublication.qf.length === 4, 'playoff Pick’Em must include four quarterfinal winners');
  assert(p.pickemPublication.sf.length === 2, 'playoff Pick’Em must include two semifinalists');
  assert(!!p.pickemPublication.champion, 'playoff Pick’Em must include a champion');
}
const proPosts = publications.filter(x => x.publisher.type === 'pro');
assert(proPosts.length >= 2, 'professional players must publish Pick’Em posts');
assert(Pub.profiles().some(x => x.type === 'pro'), 'professional players must be available in publisher filters');
const before = publications.length;
const second = Pub.sync();
assert(second.created === 0 && publications.length === before, 'repeat sync must not create duplicate public Pick’Em posts');

// Closed or not-yet-unlocked Pick'Em must not publish premature picks.
ctx.unlocked = false;
const lockedCount = publications.length;
assert(Pub.sync().created === 0 && publications.length === lockedCount, 'locked Pick’Em must not publish forecasts');
ctx.unlocked = true;
ctx.majorId = 'Major Test 2026|started-check';
ctx.stages = { 1: { teams: teamNames, completed: false, started: true } };
ctx.playoffs = [];
const startedCount = publications.length;
assert(Pub.sync().created === 0 && publications.length === startedCount, 'a stage already in progress must not receive retroactive public Pick’Em');

// Organizer trophy silhouettes: no sharing between organizer brands, while ESL has internal variants.
const gameWindow = {};
vm.runInNewContext(read('js/manager/v26-trophies.js'), { window: gameWindow, console });
const TW = gameWindow.TW;
assert(TW && typeof TW.specFor === 'function', 'trophy generator must be available');
const specs = {
  BLAST: TW.specFor('BLAST Premier Copenhagen', 3, 'regular'),
  PGL: TW.specFor('PGL Major Copenhagen', 3, 'regular'),
  ESL: TW.specFor('IEM Katowice', 3, 'regular'),
  StarLadder: TW.specFor('StarLadder StarSeries', 3, 'regular'),
  PerfectWorld: TW.specFor('Perfect World Major', 3, 'regular'),
  EWC: TW.specFor('Esports World Cup', 3, 'regular'),
  Thunderpick: TW.specFor('Thunderpick World Championship', 3, 'regular'),
  FISSURE: TW.specFor('FISSURE Playground', 3, 'regular'),
  BetBoom: TW.specFor('BetBoom Dacha', 3, 'regular'),
  CCT: TW.specFor('CCT Global Finals', 3, 'regular'),
  RES: TW.specFor('RES Regional Series', 3, 'regular'),
  DreamHack: TW.specFor('DreamHack Open', 3, 'regular')
};
assert(new Set(Object.values(specs).map(x => x.arch)).size === Object.keys(specs).length, 'sampled organizer trophies must use distinct silhouettes');
assert(specs.BLAST.accent !== specs.PGL.accent && specs.ESL.accent !== specs.StarLadder.accent, 'organizers must visibly differ in accent colors');
const esl = ['IEM Cologne','IEM Katowice','ESL Pro League Season 21','ESL Pro League Season 22','ESL One Cologne','IEM Dallas','ESL Challenger League Finals','IEM Chengdu','ESL Pro League Season 23','IEM Rio'].map((name, i) => TW.specFor(name, i + 1, 'regular'));
assert(new Set(esl.map(x => x.arch)).size >= 3, 'ESL/IEM must have multiple trophy variations within the same brand');
for (const event of ['BLAST Premier Qualifier','PGL Regional Qualifier','ESL Open Qualifier','StarLadder Open Qualifier','Perfect World Open Qualifier','CCT Open Qualifier']) {
  const spec = TW.specFor(event, 2, 'tier2');
  assert(!['cup', 'chalice'].includes(spec.arch), `${event} must keep non-cup low-tier placeholders`);
  assert(spec.organizer, `${event} must retain organizer identity`);
  assert(TW.render(spec).startsWith('<svg'), `${event} badge should render a valid SVG`);
}

// Wiring: separate publisher tab, publisher article cards and v29 shared news API.
const site = read('js/manager/v27-hltv-site.js');
const news = read('js/manager/v29-news.js');
const pickem = read('js/manager/v33-pickem.js');
const html = read('index.html');
assert(site.includes("['publishers', 'Паблики Pick’Em']") && site.includes('publicPickemArticle'), 'Pick’Em publisher page and article renderer must be wired');
assert(news.includes("'pickem-pub'") && news.includes('publishPublicPickem') && news.includes('publicPickem:'), 'public posts must use the common news store');
assert(pickem.includes('publicContext') && pickem.includes('window.V33Pickem'), 'public Pick’Em must read the real Major roster context');
assert(html.includes('v70-pickem-publishers.js?v=111') && html.includes('v70-publications.css?v=111'), 'new module and styles must load with cache busting');
console.log('v72 public Pick’Em + organizer trophy tests passed');
