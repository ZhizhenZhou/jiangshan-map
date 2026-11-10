'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LAZY_ATTR_ASSETS, STATIC_TAG_ASSETS } = require('../sync_version');

async function runWarSandboxSuite(ctx) {
  const { ROOT, JS_DIR, sandbox, loreData, indexHtml, styleCss } = ctx;
  const warDataPath = path.join(JS_DIR, 'war_data.js');
  const warCode = fs.readFileSync(warDataPath, 'utf8');
  vm.runInContext(warCode, sandbox, { filename: 'war_data.js' });

  const wars = sandbox.window.WAR_DATA;
  assert(Array.isArray(wars), 'war_data.js must expose window.WAR_DATA');
  assert.strictEqual(wars.length, 22, 'War sandbox must ship exactly 22 curated campaigns');

  const keys = wars.map((w) => w.key);
  assert.strictEqual(new Set(keys).size, keys.length, 'WAR_DATA keys must be unique');
  for (const required of ['an-shi', 'sui-chen', 'mengsong', 'sanfan', 'yashan']) {
    assert(keys.includes(required), `WAR_DATA must include ${required}`);
  }

  const coord = (pt, label) => {
    assert(Array.isArray(pt) && pt.length === 2, `${label} must be a [lng, lat] pair`);
    const [lng, lat] = pt;
    assert(
      Number.isFinite(lng) && Number.isFinite(lat) && lng >= 60 && lng <= 145 && lat >= 10 && lat <= 56,
      `${label} coordinate out of bounds: ${JSON.stringify(pt)}`
    );
  };
  const qualities = new Set(['recorded', 'claimed', 'est']);

  for (const w of wars) {
    for (const field of ['key', 'titleZh', 'titleEn', 'descZh', 'descEn']) {
      assert(w[field], `${w.key || '<war>'}.${field} is required`);
    }
    assert(
      Array.isArray(w.span) && w.span.length === 2 && Number.isFinite(w.span[0]) && Number.isFinite(w.span[1]) && w.span[0] <= w.span[1],
      `${w.key}.span must be an ordered [from, to] pair`
    );
    assert(Array.isArray(w.sides) && w.sides.length >= 2, `${w.key} must define at least two sides`);
    const sideKeys = new Set();
    for (const side of w.sides) {
      for (const field of ['key', 'nameZh', 'nameEn', 'color']) {
        assert(side[field], `${w.key}.side.${field} is required`);
      }
      assert(/^#[0-9a-f]{6}$/i.test(side.color), `${w.key}.${side.key} has invalid color ${side.color}`);
      assert(!sideKeys.has(side.key), `${w.key} repeats side key ${side.key}`);
      sideKeys.add(side.key);
    }

    let previousYear = -Infinity;
    assert(Array.isArray(w.steps) && w.steps.length > 0, `${w.key} must contain steps`);
    for (let i = 0; i < w.steps.length; i++) {
      const step = w.steps[i];
      assert(Number.isFinite(step.y) && step.y > previousYear, `${w.key}.steps must be strictly ordered at index ${i}`);
      assert(
        step.y >= w.span[0] - 1 && step.y <= w.span[1] + 3,
        `${w.key}.steps[${i}].y=${step.y} lies outside the campaign activation window`
      );
      previousYear = step.y;
      assert(
        step.titleZh || step.titleEn || (step.moves && step.moves.length) || (step.battles && step.battles.length),
        `${w.key}.steps[${i}] must contain narrative, moves, or battles`
      );

      for (const [mi, move] of (step.moves || []).entries()) {
        assert(sideKeys.has(move.side), `${w.key}.steps[${i}].moves[${mi}] references unknown side ${move.side}`);
        for (const field of ['titleZh', 'titleEn', 'descZh', 'descEn']) {
          assert(move[field], `${w.key}.steps[${i}].moves[${mi}].${field} is required`);
        }
        const pts = Array.isArray(move.path) && move.path.length ? move.path : [move.from, move.to].filter(Boolean);
        assert(pts.length >= 2, `${w.key}.steps[${i}].moves[${mi}] needs path or from/to`);
        pts.forEach((pt, pi) => coord(pt, `${w.key}.steps[${i}].moves[${mi}].path[${pi}]`));
        if (move.force) {
          assert(Number.isFinite(move.force.n) && move.force.n > 0, `${w.key}.move force must be positive`);
          assert(qualities.has(move.force.quality), `${w.key}.move force has invalid quality`);
          assert(move.force.srcZh && move.force.srcEn, `${w.key}.move force must carry bilingual sources`);
        }
      }

      for (const [bi, battle] of (step.battles || []).entries()) {
        assert(sideKeys.has(battle.side), `${w.key}.steps[${i}].battles[${bi}] references unknown side ${battle.side}`);
        coord(battle.at, `${w.key}.steps[${i}].battles[${bi}].at`);
        for (const field of ['nameZh', 'nameEn', 'placeZh', 'placeEn', 'descZh', 'descEn']) {
          assert(battle[field], `${w.key}.steps[${i}].battles[${bi}].${field} is required`);
        }
        for (const [fi, force] of (battle.forces || []).entries()) {
          assert(sideKeys.has(force.side), `${w.key}.battle force references unknown side ${force.side}`);
          assert(Number.isFinite(force.n) && force.n > 0, `${w.key}.battle force must be positive`);
          assert(qualities.has(force.quality), `${w.key}.battle force has invalid quality`);
          assert(force.srcZh && force.srcEn, `${w.key}.battle force must carry bilingual sources`);
        }
      }
    }

    for (const [zi, zone] of (w.zones || []).entries()) {
      assert(sideKeys.has(zone.side), `${w.key}.zones[${zi}] references unknown side ${zone.side}`);
      assert(Number.isFinite(zone.y), `${w.key}.zones[${zi}].y is required`);
      assert(zone.noteZh && zone.noteEn, `${w.key}.zones[${zi}] needs bilingual notes`);
      assert(Array.isArray(zone.rings) && zone.rings.length, `${w.key}.zones[${zi}] needs rings`);
      let pointCount = 0;
      const visitZoneCoords = (node, trail) => {
        if (
          Array.isArray(node) &&
          node.length === 2 &&
          Number.isFinite(node[0]) &&
          Number.isFinite(node[1])
        ) {
          coord(node, `${w.key}.zones[${zi}].rings${trail}`);
          pointCount++;
          return;
        }
        assert(Array.isArray(node) && node.length, `${w.key}.zones[${zi}].rings${trail} must contain coordinates`);
        node.forEach((child, childIdx) => visitZoneCoords(child, `${trail}[${childIdx}]`));
      };
      visitZoneCoords(zone.rings, '');
      assert(pointCount >= 3, `${w.key}.zones[${zi}] must contain at least three coordinate points`);
    }
  }

  const activeAt = (year) => {
    const hit = wars.find((w) => year >= w.span[0] - 1 && year <= w.span[1] + 3);
    return hit ? hit.key : null;
  };
  assert.strictEqual(activeAt(1276), 'mengsong', 'Mongol-Song tail window must own 1276');
  assert.strictEqual(activeAt(1277), 'yashan', 'Yashan must take ownership from 1277');
  assert.strictEqual(activeAt(1279), 'yashan', 'Yashan must own its 1279 climax');

  const guanduWar = wars.find((w) => w.key === 'guandu');
  const guanduStory = (loreData.PERSON_PROFILES || []).find((p) => p.key === 'guandu');
  assert(guanduStory && guanduStory.isStory && guanduStory.warKey === 'guandu', 'Guandu must be registered as a formal war-backed story profile');
  assert.deepStrictEqual(Array.from(guanduStory.span), [199, 202], 'Guandu story span must include Yuan Shao\'s death in 202');
  assert.strictEqual(guanduStory.evCount, 7, 'Guandu story must advertise seven scenes before lazy war hydration');
  assert.deepStrictEqual(Array.from(guanduWar.span), [199, 202], 'Guandu war span must end in 202');
  assert.strictEqual(guanduWar.steps.length, 7, 'Guandu war must retain seven tactical steps');
  assert.strictEqual(guanduWar.steps[6].y, 202.2, 'Guandu aftermath must place Yuan Shao\'s death in 202');
  guanduWar.steps.forEach((step, idx) => {
    assert(Number.isFinite(step.storyYear), `Guandu step ${idx} needs an integer storyYear`);
    assert(step.storySiteZh && step.storySiteEn, `Guandu step ${idx} needs bilingual story site labels`);
  });
  assert(guanduWar.steps[0].actZh && guanduWar.steps[3].actZh && guanduWar.steps[4].actZh, 'Guandu story must define three act boundaries');

  const anshiWar = wars.find((w) => w.key === 'an-shi');
  const anshiStory = (loreData.PERSON_PROFILES || []).find((p) => p.key === 'anshi');
  assert(anshiStory && Array.isArray(anshiStory.camps), 'Main An-Shi storyline must be available');
  for (const side of anshiWar.sides) {
    const camp = anshiStory.camps.find((c) => c.key === side.key);
    assert(camp, `An-Shi storyline is missing camp ${side.key}`);
    assert.strictEqual(side.color.toLowerCase(), camp.color.toLowerCase(), `An-Shi ${side.key} color must match storyline`);
  }

  for (const id of ['chk-war', 'lbl-war', 'grp-war', 'war-card', 'war-balloon', 'war-gate']) {
    assert(indexHtml.includes(`id="${id}"`), `index.html missing #${id}`);
  }
  assert(styleCss.includes('War Sandbox Overlay'), 'style.css must contain the war sandbox styles');
  assert(styleCss.includes('.war-rider-wedge'), 'style.css must retain the rider wedge styles');

  const lazyWarPaths = new Set(
    LAZY_ATTR_ASSETS.filter((a) => a.datasetKey === 'vWarData' || a.datasetKey === 'vWar').map(
      (a) => a.relPath
    )
  );
  assert.deepStrictEqual(
    [...lazyWarPaths].sort(),
    ['js/atlas_war.js', 'js/war_data.js'],
    'War data and controller must be registered as lazy assets'
  );
  assert(
    !STATIC_TAG_ASSETS.includes('js/atlas_war.js') && !STATIC_TAG_ASSETS.includes('js/war_data.js'),
    'War bundles must stay out of the synchronous first-paint asset list'
  );
  assert(
    !/<script[^>]+src="js\/(?:atlas_war|war_data)\.js/i.test(indexHtml),
    'index.html must not synchronously load the war bundles'
  );
  assert(
    /data-v-war-data="[a-f0-9]{8}"/.test(indexHtml) && /data-v-war="[a-f0-9]{8}"/.test(indexHtml),
    'atlas-app-script must publish content hashes for both lazy war bundles'
  );

  const warModule = fs.readFileSync(path.join(JS_DIR, 'atlas_war.js'), 'utf8');
  assert(warModule.includes("document.getElementById('terrain-relief-layer')"), 'War zoom fade must target main terrain wrapper');
  assert(warModule.includes('{ duration: WAR_FLIGHT_MS }'), 'War camera flights must use main object options API');
  assert(warModule.includes("query.has('event') || query.has('person') || query.has('journey')"), 'Story/person deep links must own immersive state');
  assert(warModule.includes('_hydrateWarStoryProfiles()'), 'War module must hydrate formal story profiles from WAR_DATA');
  assert(warModule.includes('_activeWarStory()'), 'War module must expose story-driven campaign state');
  assert(warModule.includes('storyWar ? storyWar.war : shellWar'), 'Story-driven SVG rendering must be separate from the standalone war shell');
  assert(warModule.includes('_warHasStory(w.key)') && warModule.includes('_warHasStory(linkWar.key)'), 'Gate, chronicle rows and deep links must route story-backed campaigns to the unified experience');

  const warKeys = new Set(wars.map((w) => w.key));
  const storyByWarKey = new Map();
  for (const profile of loreData.PERSON_PROFILES || []) {
    if (profile && profile.warKey) storyByWarKey.set(profile.warKey, profile);
  }
  // An-Shi keeps its curated 10-stop editorial storyline and standalone
  // tactical sandbox; every other campaign must use the unified experience.
  for (const w of wars) {
    if (w.key === 'an-shi') {
      assert(!storyByWarKey.has('an-shi'), 'An-Shi must keep its curated storyline (no warKey profile)');
      continue;
    }
    const profile = storyByWarKey.get(w.key);
    assert(profile, `Campaign ${w.key} must have a formal isStory profile`);
    assert.strictEqual(profile.isStory, true, `Campaign ${w.key} profile must be a storyline`);
    assert.deepStrictEqual(Array.from(profile.span), Array.from(w.span), `Campaign ${w.key} story span must match the war span`);
    assert.strictEqual(profile.evCount, w.steps.length, `Campaign ${w.key} story must advertise one scene per war step`);
  }
  assert.strictEqual(storyByWarKey.size, wars.length - 1, 'Exactly the non-An-Shi campaigns carry warKey story profiles');
  assert(
    warModule.includes("window.innerWidth <= 900") && /#war-balloon[\s\S]*display:\s*none\s*!important/.test(styleCss),
    'Tablet/mobile war mode must keep the narrative in the bottom sheet and suppress the duplicate map balloon'
  );
}

module.exports = { runWarSandboxSuite };
