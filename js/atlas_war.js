/**
 * War Sandbox Module (战争沙盘 · 西点式)
 * Ported from yutu-qiannian's war layer onto this fork's SVG atlas:
 *   · Step-driven campaign replay driven strictly by the global timeline
 *     (the only year entry, jumpToYear, is wrapped below).
 *   · West Point visual language: march-arrow width encodes recorded army
 *     strength (4 tiers), pincer axes render side-by-side in one step,
 *     control-zone polygons shift with each phase ("front line movement").
 *   · Fractions of a year (e.g. 1399.75) select exact steps; the scrubber
 *     stays integer — panel buttons/player are the precise controls.
 * All methods attach onto HistoricalAtlasController.prototype via _extendPrototype.
 */
(function () {
  'use strict';

  // Bound at install time so this file may load before or after js/app.js.
  let HistoricalAtlasController = null;

  const TAIL_YEARS = 3;           // post-war replay window (map + panel share it)
  // 战争模块的相机飞行时长：行军箭头绘制与它同步同缓动（_animateCameraTo
  // 的 duration 参数）——箭头与地图一个节奏。650 是全 app 默认，战争用慢档。
  const WAR_FLIGHT_MS = 1150;
  // 行军绘制时长：与飞行同步时取 WAR_FLIGHT_MS；沙盘内逐步推进（相机不飞）
  // 用短档——100ms 起跑、900ms 走完，箭头带着线一气呵成，不再干等 632ms。
  const WAR_DRAW_MS = 900;
  // 行军只在目标缩放下读得出来时才播：屏幕投影线长低于此值（全国视角整条
  // 线 ~20px，骑乘头恒定 ~19px）就整箭瞬时落位，不播"糊团"。
  const WAR_DRAW_MIN_PX = 90;
  const TIER_WIDTHS = [3.4, 5, 7, 9.5];       // screen px per strength tier
  const TIER_SCALES = [0.9, 1.1, 1.35, 1.65]; // battle-diamond core scales
  // 箭头头形：宽底在原点（与线端齐平）、锥尖伸向 +x 前方（行进方向）——
  // 底边（比线宽）整个盖住线的平头帽，锥部完全在线前方。
  // 上一版"M0 0L12.5 …"把尖顶留在原点、宽底朝前=箭头反着装（用户实测
  // "箭头不是反了"）；再上一版"M0 0L-12.5 …"鼻尖贴线端、底边朝后盖线，
  // 锥部变窄处线尾永远比楔形宽——深 zoom 下"线头从箭头旁钻出来"。
  // 到位态锥尖伸进终点战役菱形下方（菱形画在箭头之上）。
  const WEDGE_D = "M12.5 0L0 -5.4L0 5.4Z";
  // 头与线等比：档位系数 = 线宽/12.5×2.75——头长与底边宽恒为线宽的
  // 2.75/2.5 倍（旧 1/1.15/1.35/1.6 与线宽脱钩：细线上头过大、粗线上头
  // 缩成刺，用户实测"太丑"）。
  // 楔形头按【底衬脚印】（线宽+3.4px 底衬）的 2.2 倍定标。按裸线宽定标时小
  // 兵力档的头（t0 仅 10×8.7px）整个埋进 7px 宽的底衬带里，绘制中视觉上
  // "没有箭头"（官渡白马轴帧级实测）；2.2 倍让底边盖住线端平头帽、两翼
  // 探出底衬。此表由 JS 创建 dir/骑乘头子路径时写进 transform 属性
  // （style.css 不再持有 --dir-s 拷贝），交接像素级无缝由构造保证。
  const WEDGE_SCALES = TIER_WIDTHS.map((w) => +(((w + 3.4) * 2.2) / 12.5).toFixed(3));
  const WAR_ICONS = {
    // 传输栏五键镜像对称：|◀ ◀  ▶ ▶|（回起始/上一步 ←→ 下一步/到结束）
    rewind: '<svg class="wico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="1.9" y="3" width="1.8" height="10" fill="currentColor"/><path d="M14.1 3v10L7.1 8z" fill="currentColor"/></svg>',
    prev: '<svg class="wico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.5 3v10L4.5 8z" fill="currentColor"/></svg>',
    next: '<svg class="wico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4.5 3v10L11.5 8z" fill="currentColor"/></svg>',
    end: '<svg class="wico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 3v10L10.5 8z" fill="currentColor"/><rect x="12.3" y="3" width="1.8" height="10" fill="currentColor"/></svg>',
    // 入口胶囊：交叉双剑（线条风，currentColor）
    gate: '<svg class="wico" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.6 2.6L12 12M13.4 2.6L4 12"/><path d="M2.4 13.6l2.1-2.1M13.6 13.6l-2.1-2.1"/><path d="M3.2 10.2l2.6 2.6M12.8 10.2l-2.6 2.6"/></g></svg>',
  };

  // 相机视野标定（全局唯一换算，无每战役特调）：
  // 投影画布 1000×700 用户单位覆盖东经 66°–142°（76°），即 1° 经度 = 13.16 单位。
  // 所有战场视野参数以「度」声明、经 DEG 换算，五场战役共用一套公式。
  const DEG = 1000 / 76;
  const FIT_PAD = 0.12;           // 战场四周边距（占 bbox 尺寸比例）
  const STEP_MIN_DEG = 1.8;       // 单步聚焦最小视野（度）
  const STEP_MAX_DEG = 30;        // 单步聚焦最大视野
  const THEATER_MIN_DEG = 2.3;    // 战场全境最小视野
  const THEATER_MAX_DEG = 53;     // 战场全境最大视野
  const CANVAS_AR = 1000 / 700;   // 画布纵横比

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class WarSandboxMixin {
    // ---------------- data helpers ----------------

    _warData() {
      return Array.isArray(window.WAR_DATA) ? window.WAR_DATA : [];
    }

    _warLayerOn() {
      const chk = this._id('chk-war');
      return !chk || chk.checked;
    }

    _activeWar(year = this.year) {
      if (!this._warLayerOn() || this.challenge) return null;
      for (const w of this._warData()) {
        if (year >= w.span[0] - 1 && year <= w.span[1] + TAIL_YEARS) return w;
      }
      return null;
    }

    // 沙盘会话：年份落在战役窗口≠进入沙盘。只有明确手势（点战役事件行 /
    // 勾选沙盘图层 / 小数年份深链）才置 _warEngagedKey 接管界面；
    // 普通播放/拖轴扫过战役年份时 _warEngagedWar() 返回 null，界面照常。
    _warEngagedWar() {
      const w = this._activeWar();
      return w && this._warEngagedKey === w.key ? w : null;
    }

    // Another immersive mode (event storyline / person chronicle) is taking over.
    // Clear war ownership without flying back to the pre-war camera; the incoming
    // mode owns the next camera animation.
    _leaveWarForModeSwitch() {
      if (!this._warEngagedKey && !this._warTheaterKey) return;
      this._warEngagedKey = null;
      this._warTheaterKey = null;
      this._warTheaterFitUsed = null;
      this._warCamBefore = null;
      this._warLastAnchor = null;
      this._warSvgSig = null;
      this._syncWarOverlay();
    }

    _prepareWarEngagement(w) {
      if (!w) return false;
      if ((this.activePerson || this.activeTrace) && typeof this.closeGenealogyCard === 'function') {
        this.closeGenealogyCard();
      }
      this._warEngagedKey = w.key;
      if (this.stopAutoplay) this.stopAutoplay();
      this._warSvgSig = null;
      return true;
    }

    _engageWar(w) {
      if (!w) return false;
      // Campaigns with a formal story profile use main's storyline experience;
      // the standalone war-card shell only remains for unregistered fallbacks.
      if (this._warHasStory(w.key) && typeof this.openPersonChronicle === 'function') {
        return this.openPersonChronicle(w.key, Math.max(0, this._warStepIndex(w)));
      }
      if (!this._prepareWarEngagement(w)) return false;
      this._syncWarOverlay();
      return true;
    }

    _restoreWarFromQuery() {
      const query =
        typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
      // Main's person/journey/event deep links own the immersive state.
      if (query && (query.has('event') || query.has('person') || query.has('journey'))) {
        this._syncWarOverlay();
        return false;
      }
      const qy = query ? query.get('year') : null;
      const frac = qy
        ? qy
            .split(/[,，、;\s]+/)
            .map(Number)
            .find((n) => Number.isFinite(n) && n % 1 !== 0)
        : NaN;
      const linkWar = Number.isFinite(frac)
        ? this._warData().find(
            (x) => frac >= x.span[0] - 1 && frac <= x.span[1] + TAIL_YEARS
          )
        : null;
      if (!linkWar) {
        this._syncWarOverlay();
        return false;
      }
      if (this._warHasStory(linkWar.key) && typeof this.openPersonChronicle === 'function') {
        return this.openPersonChronicle(linkWar.key, Math.max(0, this._warStepIndex(linkWar, frac)));
      }
      this._warEngagedKey = linkWar.key;
      this._warSeekTo(frac);
      return true;
    }

    _warStepIndex(w, year = this.year) {
      let idx = -1;
      (w.steps || []).forEach((s, i) => {
        if (s.y <= year) idx = i;
      });
      return idx;
    }

    _warZoneIndex(w, year = this.year) {
      let zi = -1;
      (w.zones || []).forEach((z, i) => {
        if (z.y <= year) zi = i;
      });
      return zi;
    }

    _warForceTier(n) {
      return n >= 200000 ? 3 : n >= 50000 ? 2 : n >= 10000 ? 1 : 0;
    }

    _warField(obj, base) {
      if (!obj) return '';
      return this.locale === 'en' ? obj[base + 'En'] || obj[base + 'Zh'] : obj[base + 'Zh'];
    }

    _warSide(w, key) {
      return (w.sides || []).find((s) => s.key === key) || { key, color: '#8a7a63' };
    }

    _hydrateWarStoryProfiles() {
      const profiles = HistoricalAtlasController && HistoricalAtlasController.PERSON_PROFILES;
      if (!Array.isArray(profiles)) return false;
      this._warStoryLastCoord = null;
      let changed = false;
      for (const profile of profiles) {
        if (!profile || !profile.warKey || (Array.isArray(profile.stops) && profile.stops.length)) continue;
        const war = this._warData().find((item) => item.key === profile.warKey);
        if (!war) continue;
        profile.descZh = war.descZh;
        profile.descEn = war.descEn;
        profile.camps = (war.sides || []).map((side) => ({
          key: side.key,
          zh: side.nameZh,
          en: side.nameEn,
          color: side.color,
          calmColor: side.color,
        }));
        profile.stops = (war.steps || []).map((step, idx) => {
          const battle = (step.battles || [])[0] || null;
          const move = (step.moves || [])[0] || null;
          const pts = move ? this._warPointList(move) : [];
          // Pure-narrative steps (no move/battle, e.g. 草木皆兵) inherit the
          // previous scene's position so no scene is ever dropped from the card.
          const stepCoord = step.storyCoord || (battle && battle.at) || (pts.length ? pts[pts.length - 1] : null);
          const coord = stepCoord || this._warStoryLastCoord || null;
          if (stepCoord) this._warStoryLastCoord = stepCoord;
          const fromCoord = pts.length > 1 ? pts[0] : null;
          const titleZh = step.titleZh || (battle && (battle.nameZh || battle.titleZh)) || (move && move.titleZh) || '';
          const titleEn = step.titleEn || (battle && (battle.nameEn || battle.titleEn)) || (move && move.titleEn) || titleZh;
          const descZh = (battle && battle.descZh) || (move && move.descZh) || step.descZh || '';
          const descEn = (battle && battle.descEn) || (move && move.descEn) || step.descEn || descZh;
          const camp = (battle && battle.side) || (move && move.side) || ((war.sides || [])[0] || {}).key || '';
          return {
            year: Number.isFinite(step.storyYear) ? step.storyYear : Math.trunc(step.y),
            month: Number.isFinite(step.y) ? Math.max(1, Math.min(12, Math.round((step.y % 1) * 12) || 1)) : 6,
            subEraZh: step.subEraZh || '',
            subEraEn: step.subEraEn || '',
            actZh: step.actZh || '',
            actEn: step.actEn || '',
            camp,
            ancientZh: step.storySiteZh || (battle && String(battle.placeZh || '').replace(/^（?今/, '').replace(/（今[^）)]*）/,'')) || titleZh,
            ancientEn: step.storySiteEn || (battle && battle.placeEn) || titleEn,
            modernZh: step.storyModernZh || '',
            modernEn: step.storyModernEn || '',
            coord,
            fromCoord,
            via: pts.length > 2 ? pts.slice(1, -1) : null,
            titleZh,
            titleEn,
            descZh,
            descEn,
            warStepIdx: idx,
            warKey: war.key,
          };
        });
        changed = true;
      }
      if (changed) {
        this.searchIndex = null;
        this._soloPersonEventsCache = null;
      }
      return changed;
    }

    _warHasStory(key) {
      const profiles = HistoricalAtlasController && HistoricalAtlasController.PERSON_PROFILES;
      return Array.isArray(profiles) && profiles.some((p) => p && p.warKey === key);
    }

    _activeWarStory() {
      const profile = this.activePerson && this.activePerson.profile;
      if (!profile || !profile.warKey) return null;
      const war = this._warData().find((item) => item.key === profile.warKey);
      if (!war) return null;
      const selected = this.activePersonEventIdx;
      const idx = selected >= 0
        ? Number.isInteger((this.activePerson.events[selected] || {}).warStepIdx)
          ? this.activePerson.events[selected].warStepIdx
          : selected
        : Math.max(0, war.steps.length - 1);
      return { profile, war, idx, overview: selected < 0 };
    }

    _warStepTitle(w, s) {
      // 叙事步（无 battle/move，如"反间换将""宣战"）可直接带 step 级标题
      if (s.titleZh || s.titleEn) return this._warField(s, 'title') || '';
      const b = (s.battles || [])[0];
      if (b) return this._warField(b, 'name') || this._warField(b, 'title') || '';
      const m = (s.moves || [])[0];
      return this._warField(m || {}, 'title') || '';
    }

    _warFormatN(n, quality) {
      const zh = this.locale !== 'en';
      let out;
      if (zh) out = n >= 10000 ? `${Number((n / 10000).toFixed(1))}万` : `${n}`;
      else out = n >= 10000 ? `${Math.round(n / 1000)}k` : `${n}`;
      if (quality === 'claimed') out += zh ? '（号称）' : ' (claimed)';
      else if (quality === 'est') out += zh ? '（约）' : ' (approx.)';
      return out;
    }

    _warStepForces(w, s) {
      const list = [];
      (s.moves || []).forEach((mv) => {
        if (mv.force) list.push({ ...mv.force, side: mv.force.side || mv.side });
      });
      (s.battles || []).forEach((b) => {
        (b.forces || []).forEach((f) => list.push(f));
      });
      return list;
    }

    // ---------------- render: SVG overlay ----------------

    _warGroup() {
      if (this.grpWar && this.grpWar.isConnected) return this.grpWar;
      let grp = this.svg ? this.svg.querySelector('#grp-war') : null;
      if (!grp && this.grpCorridors && this.grpCorridors.parentNode) {
        grp = this._svgNode('g', { id: 'grp-war' }, this.grpCorridors.parentNode);
        this.grpCorridors.parentNode.insertBefore(grp, this.grpCorridors.nextSibling);
      }
      this.grpWar = grp;
      return grp;
    }

    _warPointList(mv) {
      const pts = [];
      if (Array.isArray(mv.path) && mv.path.length) mv.path.forEach((p) => p && pts.push(p));
      else {
        if (mv.from) pts.push(mv.from);
        if (mv.to) pts.push(mv.to);
      }
      return pts;
    }

    _warSegInfo(pts) {
      // 同址/极短轴按【地理距离】过滤——屏幕距离随缩放变化，
      // 用屏幕阈值会让箭头在广角下凭空消失（长平 step5/6 曾实测少箭）。
      const g0 = pts[0];
      const g1 = pts[pts.length - 1];
      if (Math.hypot(g1[0] - g0[0], g1[1] - g0[1]) < 0.1) return null;
      // 短直进轴（无途经点、弦 < 40 用户单位 ≈ 3°）：journey 构建器的最小弯幅
      // (9 单位) 对短弦是巨型钩子——末端切线甩到行进方向侧后方（官渡白马轴
      // 11 单位弦实测甩 64°），纯直线又呆板。战史沙盘的画法是【比例弯幅】
      // 柔弧：原版 yutu-qiannian 全部用 3+ 途经点天然成弧，这里给双点轴
      // 同斜率(0.165)、低下限(1.5) 的弯幅——短轴也是优雅弧线。
      if (pts.length === 2 && this.projector) {
        const a0 = this.projector.toScreen(g0[0], g0[1]);
        const b0 = this.projector.toScreen(g1[0], g1[1]);
        const chord0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
        if (chord0 < 40) {
          const bend = Math.max(1.5, Math.min(34, chord0 * 0.165));
          const cx = (a0[0] + b0[0]) * 0.5 - ((b0[1] - a0[1]) / chord0) * bend;
          const cy = (a0[1] + b0[1]) * 0.5 + ((b0[0] - a0[0]) / chord0) * bend;
          // 末端切线（t=1）：2(P2−C)；中点取 t=0.53（与 journey 构建器一致）
          const t = 0.53, mt = 1 - t;
          const mx = mt * mt * a0[0] + 2 * mt * t * cx + t * t * b0[0];
          const my = mt * mt * a0[1] + 2 * mt * t * cy + t * t * b0[1];
          const mtx = 2 * mt * (cx - a0[0]) + 2 * t * (b0[0] - cx);
          const mty = 2 * mt * (cy - a0[1]) + 2 * t * (b0[1] - cy);
          return {
            d: `M${a0[0].toFixed(1)} ${a0[1].toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b0[0].toFixed(1)} ${b0[1].toFixed(1)}`,
            mx,
            my,
            angleDeg: (Math.atan2(mty, mtx) * 180) / Math.PI,
            chord: chord0,
            endX: b0[0],
            endY: b0[1],
            endAngleDeg: (Math.atan2(b0[1] - cy, b0[0] - cx) * 180) / Math.PI,
          };
        }
      }
      const info = this._buildJourneySegmentInfo(
        g0,
        g1,
        pts.slice(1, -1)
      );
      // end tangent for the arrowhead tip (direction of the final leg)
      let endX = null, endY = null, endAngleDeg = 0;
      if (this.projector) {
        let prev = null;
        for (const pt of pts) {
          const sc = this.projector.toScreen(pt[0], pt[1]);
          if (prev && (Math.abs(sc[0] - prev[0]) > 0.4 || Math.abs(sc[1] - prev[1]) > 0.4)) {
            endAngleDeg = (Math.atan2(sc[1] - prev[1], sc[0] - prev[0]) * 180) / Math.PI;
          }
          prev = sc;
        }
        if (prev) { endX = prev[0]; endY = prev[1]; }
      }
      if (info) return { ...info, endX, endY, endAngleDeg };
      // 和弦过短时 trajectory 构建器会返回 null；退化直线段保证当前步箭头在场
      // （真同址残段已被上方 geo 门过滤；此处 chord 为用户单位，不再设屏幕阈值）
      if (!this.projector) return null;
      const a = this.projector.toScreen(pts[0][0], pts[0][1]);
      const b = this.projector.toScreen(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return {
        d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`,
        mx: (a[0] + b[0]) / 2,
        my: (a[1] + b[1]) / 2,
        angleDeg: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
        chord,
        endX: b[0],
        endY: b[1],
        endAngleDeg: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
      };
    }

    // 静态楔形头的位置与角度取【画出来的曲线】末端（getPointAtLength L 与
    // L - 屏幕2.5px 弦长），与骑乘头末帧同一算法、同口径弦长（深 zoom 下
    // 固定 2 用户单位的弦跨 ~130px 曲线，平均切向偏离端部真实方向，直楔形
    // 压不住弯线尾）——raw 航点的末段弦角在弯道上会甩离曲线方向
    // （官渡南压箭头曾实测楔形指向与线不一致），交接瞬间也会甩角。
    _warPathEnd(p, fallback) {
      try {
        const L = p.getTotalLength();
        const pt = p.getPointAtLength(L);
        const near = p.getPointAtLength(Math.max(0, L - Math.max(0.08, 2.5 / this._warKScreen())));
        if (Math.hypot(pt.x - near.x, pt.y - near.y) > 0.05) {
          return {
            endX: pt.x,
            endY: pt.y,
            endAngleDeg: (Math.atan2(pt.y - near.y, pt.x - near.x) * 180) / Math.PI,
          };
        }
      } catch (e) {
        /* fall through to raw-waypoint fallback */
      }
      return fallback && fallback.endX !== null
        ? { endX: fallback.endX, endY: fallback.endY, endAngleDeg: fallback.endAngleDeg }
        : null;
    }

    _cancelWarDraws() {
      (this._warDrawRafs || []).forEach((h) => cancelAnimationFrame(h));
      this._warDrawRafs = [];
      (this._warDrawTimers || []).forEach((h) => clearTimeout(h));
      this._warDrawTimers = [];
      this._warDrawPending = false;
      this._warDrawsLeft = 0;
    }

    // 真实屏幕缩放（screen px / 用户单位）。viewBox 默认 xMidYMid meet 是
    // 宽高两向【取小】的均匀缩放；相机恒为 CANVAS_AR（10:7），而 SVG 元素
    // 随窗口/布局变形——只看宽度会在宽扁窗口下高估缩放（实测 1440×900
    // 高估 4.6%、1512×760 高估 37.6%）：行军虚线比骑乘头超前一个固定百分比，
    // 线头从楔形鼻尖底下钻出来，静态楔形也整体偏大、行军提前画完。
    // 与里程碑气泡/缩放条的 screenScale 同式（app.js 用 Math.min 两向）。
    // camOverride：门控按目标取景（warFly fit）投影线长时传入。
    _warKScreen(camOverride) {
      const rect = this.svg && this.svg.getBoundingClientRect ? this.svg.getBoundingClientRect() : null;
      const cam = camOverride || this.camera;
      if (!rect || !cam || !cam.w || !cam.h) return 1;
      const k = Math.min(rect.width / cam.w, rect.height / cam.h);
      return k > 0 ? k : 1;
    }

    // 战术符号（楔形头/战役菱形/名签）屏幕尺寸恒定：与骑乘头同一 kScreen 全补偿。
    // 通用 _rescaleSvgTypography 给 war 符号的是 1/√z 档（里程碑钉惯例）——
    // 深 zoom 下符号涨 √z≈6.5 倍（楔形 150px、菱环 200px+），且与动画期恒定的
    // 骑乘头在交接瞬间对不上（"画完爆开"）。这里在每次相机应用后覆盖 transform。
    //
    // 战役菱形避让也在这一步做：菱形按【真址】渲染，屏距 <26px 的组成簇，
    // 簇内错开到 22px 屏距——错开量随缩放折算成用户单位，深 zoom 时菱形
    // 趋近真址（延津曾实测被 0.3° 固定偏移甩离箭头尖端 130px）。
    _warRescaleGlyphs() {
      const svg = this.svg;
      if (!svg || !this.camera || !this.camera.w) return;
      const grp = this.grpWar || svg.querySelector('#grp-war');
      if (!grp) return;
      const k = this._warKScreen();
      if (!(k > 0)) return;
      const s = (1 / k).toFixed(4);

      // --- 战役菱形：真址 + 屏幕恒定聚簇错开 ---
      const nodes = [...grp.querySelectorAll('g.war-node')];
      const placed = []; // 已占位的屏幕位置（用户单位存储，比较时乘 k）
      const MINPX = 26;
      const dirs = [[0.81, 0.6], [-0.81, 0.6], [0.74, -0.82], [-0.74, -0.82]];
      let curOff = [0, 0];
      for (const n of nodes) {
        const tx = parseFloat(n.dataset.x);
        const ty = parseFloat(n.dataset.y);
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
        let ox = 0;
        let oy = 0;
        const collide = (ax, ay) =>
          placed.some((q) => Math.hypot((q[0] - ax) * k, (q[1] - ay) * k) < MINPX);
        if (collide(tx, ty)) {
          for (let d = 1; d <= 4 && !ox && !oy; d++) {
            const stepU = (MINPX * d) / k;
            for (const [dx, dy] of dirs) {
              const ax = tx + dx * stepU;
              const ay = ty + dy * stepU;
              if (!collide(ax, ay)) {
                ox = ax - tx;
                oy = ay - ty;
                break;
              }
            }
          }
        }
        placed.push([tx + ox, ty + oy]);
        n.setAttribute('transform', `translate(${(tx + ox).toFixed(1)},${(ty + oy).toFixed(1)}) scale(${s})`);
        if (n.classList.contains('is-cur')) curOff = [ox, oy];
      }
      // 名签随当前步菱形一同避让（锚点与菱形保持对齐）
      const curN0 = grp.querySelector('g.war-node.is-cur');
      grp
        .querySelectorAll('g.war-lbl[data-x]')
        .forEach((n) => {
          let ox = 0;
          let oy = 0;
          if ((curOff[0] || curOff[1]) && curN0 &&
              n.dataset.x === curN0.dataset.x && n.dataset.y === curN0.dataset.y) {
            ox = curOff[0];
            oy = curOff[1];
          }
          const lx = parseFloat(n.dataset.x) + ox;
          const ly = parseFloat(n.dataset.y) + oy;
          n.setAttribute('transform', `translate(${lx.toFixed(1)},${ly.toFixed(1)}) scale(${s})`);
        });
      // 锚点同步：浮签/去重用的是菱形的【当前落位】
      const curN = grp.querySelector('g.war-node.is-cur');
      if (curN) {
        const t = /translate\(([\d.-]+),([\d.-]+)\)/.exec(curN.getAttribute('transform') || '');
        if (t) {
          const np = { x: +t[1], y: +t[2] };
          this._warCurSpot = np;
          if (this._warBalloonState && this._warBalloonAnchorKind === 'battle') {
            this._warBalloonState = { sx: np.x, sy: np.y };
          }
        }
      }
      const allN = nodes[nodes.length - 1];
      if (allN) {
        const t = /translate\(([\d.-]+),([\d.-]+)\)/.exec(allN.getAttribute('transform') || '');
        if (t) this._warBattleAnchor = { x: +t[1], y: +t[2] };
      }

      // --- 楔形头：位置钉真址（不参与避让），屏幕尺寸恒定 ---
      grp
        .querySelectorAll('g.war-dir[data-x]')
        .forEach((n) => {
          const x = n.getAttribute('data-x');
          const y = n.getAttribute('data-y');
          if (x === null || y === null) return;
          const rot = n.getAttribute('data-rot') || '0';
          n.setAttribute('transform', `translate(${x},${y}) rotate(${rot}) scale(${s})`);
        });
    }

    // 当前步行军箭头从起点渐进画到终点：rAF 逐帧重建部分路径 d（露头末端 =
    // 骑乘头鼻尖所在弧长，线与楔形头同几何），画完恢复原始曲线。
    // 踩过的坑，都在这条注释里：
    // ① CSS 动画会被 is-camera-moving 守卫杀掉（飞行中箭头消失重画）→ rAF 驱动；
    // ② 旧 dash 露头方案退役：non-scaling-stroke 下 dash 数值的消耗语义随
    //    DPR/页面缩放漂移（1440×900 就差 4.6%、宽扁窗口差 37%，虚线尖与
    //    骑乘头错位几十 px，用户实测"线头钻出来"），dash 只适合定长虚线
    //    （is-claimed），生长露头必须用几何重建；
    // 楔形头"骑"在生长端点上随绘制进度移动（战史动画标准做法）：
    // getPointAtLength 取当前端点 + 切线角（弦长按屏幕 2.5px 折算，与
    // _warPathEnd 同口径），相机缩放时按 kScreen 反向缩放保持屏幕尺寸恒定；
    // 画完后移除骑乘头，静态楔形在终点接管（同为 kScreen 全补偿，交接
    // 不跳变——见 _warRescaleGlyphs）。
    _startWarDraw(casing, p, dirG, rider, tier, drawMs) {
      const showFull = () => {
        for (const q of [casing, p]) {
          if (q) q.style.visibility = 'visible';
        }
      };
      const finish = () => {
        // 箭头走完：静态楔形接管；多轴步等全部箭头落位后才揭幕浮签
        //（旧实现第一个 finisher 清 pending，兄弟轴还在画浮签就跳出来）
        this._warDrawsLeft = Math.max(0, (this._warDrawsLeft || 0) - 1);
        this._warDrawPending = this._warDrawsLeft > 0;
        if (dirG) dirG.classList.add('is-arrived');
        if (rider) rider.remove();
        if (!this._warDrawPending) this._revealWarBalloon();
      };
      const reduced = reducedMotion();
      if (reduced) {
        showFull();
        finish();
        return;
      }
      let Lu = 0;
      try {
        Lu = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
      } catch (e) {
        Lu = 0;
      }
      if (!(Lu > 2)) {
        showFull();
        finish();
        return;
      }
      const t0 = performance.now();
      const ease = (k) => 1 - Math.pow(1 - k, 3);
      // 露头机制：每帧【重建部分路径 d】（终点精确落在骑乘头鼻尖所在弧长），
      // 画完恢复原始曲线。不用 dash——non-scaling-stroke 下 dash 数值的消耗
      // 语义随 DPR/页面缩放漂移（预测式永远自洽、实画却可差几十 px，宽扁
      // 窗口/Retina 下用户实测"线头从楔形底下钻出来"）；重建后线与楔形头是
      // 同一几何对象，钻头结构上不可能。采样按屏幕 2.5px 折算、单帧 ≤400 点。
      let origD = null;
      try {
        origD = p.getAttribute('d');
      } catch (e) { /* 静态兜底 */ }
      // 测量副本：可见路径的 d 每帧会被覆盖成部分折线，getPointAtLength 会被
      // 钳在当前末端、线永远长不动（实测首帧即冻结）——所有弧长采样一律走
      // 这条隐藏的原始曲线副本，可见线只负责被重建。
      let measure = null;
      if (origD && casing.parentNode) {
        measure = this._svgNode('path', { d: origD }, casing.parentNode);
        measure.style.visibility = 'hidden';
      }
      const samplePt = (arc) => (measure || p).getPointAtLength(arc);
      const stepFn = (now) => {
        let kScreen = 1;
        try {
          kScreen = this._warKScreen();
        } catch (e) {
          /* keep last scale */
        }
        // k 双侧夹紧：k<0 时 eased 为负、露头长度为负直接崩溃
        const k = Math.max(0, Math.min(1, (now - t0) / drawMs));
        const eased = ease(k);
        const headLen = Lu * eased;
        if (origD && measure) {
          try {
            const step = Math.max(Lu / 400, 2.5 / kScreen);
            const n = Math.max(1, Math.ceil(headLen / step));
            let d = null;
            if (n <= 1) {
              const pt = samplePt(headLen);
              const pt0 = samplePt(0);
              d = `M${pt0.x.toFixed(2)} ${pt0.y.toFixed(2)}L${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
            } else {
              d = '';
              for (let i = 0; i <= n; i++) {
                const pt = samplePt((headLen * i) / n);
                d += (i ? 'L' : 'M') + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2);
              }
            }
            for (const q of [casing, p]) {
              // 首帧带露头 d 显形（创建时为隐藏，避免延迟期整线裸奔）
              q.style.visibility = 'visible';
              q.setAttribute('d', d);
            }
          } catch (e) {
            /* 重建失败退回整线 */
            showFull();
          }
        } else {
          showFull();
        }
        if (rider && k < 1) {
          try {
            const pt = samplePt(headLen);
            // 切向弦长按屏幕 ~2.5px 折算（与 _warPathEnd 同口径）：深 zoom 下
            // 固定 2 用户单位的弦会跨 ~130px 曲线，平均切向偏离端部真实方向
            const near = samplePt(Math.max(0, headLen - Math.max(0.08, 2.5 / kScreen)));
            const ang = (Math.atan2(pt.y - near.y, pt.x - near.x) * 180) / Math.PI;
            const wedgeS = (WEDGE_SCALES[tier] || 1) / kScreen;
            rider.setAttribute('transform',
              `translate(${pt.x.toFixed(2)},${pt.y.toFixed(2)}) rotate(${ang.toFixed(1)}) scale(${wedgeS.toFixed(3)})`);
          } catch (e) {
            /* rider positioning is cosmetic */
          }
        }
        if (k < 1) {
          const h = requestAnimationFrame(stepFn);
          this._warDrawRafs.push(h);
        } else {
          // 画完恢复原始曲线（重建的多段线只是绘制期替身），测量副本退场
          if (origD) {
            for (const q of [casing, p]) {
              q.setAttribute('d', origD);
            }
          }
          if (measure && measure.parentNode) measure.remove();
          finish();
        }
      };
      const h = requestAnimationFrame(stepFn);
      this._warDrawRafs.push(h);
    }

    // warFly：激活进场即将飞相机时传战区取景（_warTheaterFit 结果），否则 null。
    // 由 _syncWarOverlay 在渲染前用与激活块同一谓词预判传入——飞行发生在渲染
    // 之后，渲染端只能靠预判决定绘制的延迟/时长/门控缩放基准。
    _renderWarSvg(w, idx, zi, warFly) {
      const grp = this._warGroup();
      if (!grp) return;
      const sig = [
        this.locale,
        w ? w.key : '-',
        idx,
        zi,
        this._warLayerOn() ? 1 : 0,
      ].join('|');
      if (sig === this._warSvgSig) return;
      this._warSvgSig = sig;
      // 战局变化即作废旧悬停签（内容只随 pointermove 重算，陈旧内容比没有更糟）
      if (this.hoverTip) {
        this.hoverTip.classList.add('is-hidden');
        this.hoverTip.classList.remove('is-interactive');
      }
      this._cancelWarDraws();
      grp.innerHTML = '';
      this._warCurMoveTip = null;       // 当前行军箭头落点（浮签锚，取主轴）
      this._warCurMoveTipTier = null;   // 主轴的兵力档
      this._warBattleAnchor = null;     // ≤当前步的最后一役（叙事步浮签锚）

      if (!w) return;
      const g = this._svgNode('g', { class: 'war-root' }, grp);

      // --- control zone ("front line movement", 示意复原) ---
      if (zi >= 0 && (w.zones || [])[zi]) {
        const z = w.zones[zi];
        const side = this._warSide(w, z.side);
        for (const ring of z.rings || []) {
          let d = '';
          ring.forEach((pt, i) => {
            const [sx, sy] = this.projector.toScreen(pt[0], pt[1]);
            d += (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ' ' + sy.toFixed(1);
          });
          d += 'Z';
          this._svgNode(
            'path',
            { d, class: 'war-zone', stroke: side.color, fill: side.color },
            g
          );
        }
        if (this._warZoneGhost && this._warZoneGhost.key === w.key && this._warZoneGhost.zi !== zi) {
          for (const ghostD of this._warZoneGhost.ds) {
            const gp = this._svgNode(
              'path',
              { d: ghostD, class: 'war-zone is-ghost', stroke: this._warZoneGhost.color, fill: this._warZoneGhost.color },
              g
            );
            setTimeout(() => gp.remove(), 2600);
          }
        }
        this._warZoneGhost = {
          key: w.key,
          zi,
          color: side.color,
          ds: (w.zones[zi].rings || []).map((ring) =>
            ring
              .map((pt, i) => {
                const [sx, sy] = this.projector.toScreen(pt[0], pt[1]);
                return (i === 0 ? 'M' : 'L') + sx.toFixed(1) + ' ' + sy.toFixed(1);
              })
              .join('') + 'Z'
          ),
        };
      }

      // --- march arrows: past as solid traces, current drawing progressively ---
      // 激活进场（warFly 非空）：绘制与相机飞行同速同缓动（WAR_FLIGHT_MS +
      // cubic ease-out）；沙盘内逐步推进相机不飞：100ms 起跑、WAR_DRAW_MS 走完。
      const flightMs = WAR_FLIGHT_MS;
      // 链式交接：下一支箭从本支终点出发（from ≈ 上一支 to）时，本支终点
      // 不落楔形头——走廊读作连续路线，箭头只出现在当前前沿；否则链点上
      // 会躺着一个指向前一支旧方向的楔形，下一支反向出发时被读成"箭头
      // 反了"（官渡 step3→step4 曹军折返实测）。行军动画的骑乘头不受影响。
      const chainedEnds = new Set();
      {
        const flat = [];
        for (let i = 0; i <= idx; i++) {
          for (const mv of w.steps[i].moves || []) flat.push(mv);
        }
        for (let k = 0; k + 1 < flat.length; k++) {
          const pa = this._warPointList(flat[k]);
          const pb = this._warPointList(flat[k + 1]);
          if (pa.length < 2 || pb.length < 2) continue;
          const ea = pa[pa.length - 1];
          const sb = pb[0];
          if ((ea[0] - sb[0]) ** 2 + (ea[1] - sb[1]) ** 2 < 0.0004) chainedEnds.add(flat[k]);
        }
      }
      for (let i = 0; i <= idx; i++) {
        const s = w.steps[i];
        const isCur = i === idx;
        for (const mv of s.moves || []) {
          const pts = this._warPointList(mv);
          if (pts.length < 2) continue;
          const side = this._warSide(w, mv.side);
          const info = this._warSegInfo(pts);
          if (!info) continue;
          const tier = mv.force ? this._warForceTier(mv.force.n) : 0;
          const claimed = mv.force && mv.force.quality === 'claimed';
          // 浅色底衬把彩色箭头从繁杂地形里托出来（宣纸制图惯例）
          const casing = this._svgNode(
            'path',
            { d: info.d, class: `war-march-casing t${tier}${isCur ? ' is-cur' : ''}` },
            g
          );
          const cls = `war-march t${tier}${isCur ? ' is-cur' : ' is-past'}${claimed ? ' is-claimed' : ''}`;
          const p = this._svgNode(
            'path',
            { d: info.d, class: cls, stroke: side.color },
            g
          );
          if (isCur) {
            // 当前行先隐藏：绘制延迟期间未写 dash 的全线会裸奔
            //（用户读作"先出现一根线又消失"）。_startWarDraw 首帧带 dash 显形。
            // 号称（is-claimed）当前行同样先藏后画——用户要求所有当前箭头都播
            // 骑线行军动画，虚线也不例外。
            casing.style.visibility = 'hidden';
            p.style.visibility = 'hidden';
          }
          // directional chevron at the DESTINATION tip, angled along the drawn
          // curve's end tangent (not the raw last leg — see _warPathEnd)
          let dir = null;
          const end = info.endX !== null ? this._warPathEnd(p, info) : null;
          if (end) {
            // 多箭头步（如四路分进）浮签锚定兵力最强的主轴（同强取先）
            const best = this._warCurMoveTipTier == null || tier >= this._warCurMoveTipTier;
            if (isCur && best) {
              this._warCurMoveTip = { x: end.endX, y: end.endY };
              this._warCurMoveTipTier = tier;
            }
            // 链式交接（下一支箭从本支终点出发）→ 本支不落楔形头，
            // 走廊在链点连续；行军动画的骑乘头照常（画完随下一支起步让位）
            if (!chainedEnds.has(mv)) {
              dir = this._svgNode(
                'g',
                {
                  class: `war-dir t${tier}${isCur ? ' is-cur' : ''}`,
                  'data-x': end.endX.toFixed(1),
                  'data-y': end.endY.toFixed(1),
                  'data-rot': end.endAngleDeg.toFixed(1),
                },
                g
              );
              dir.style.color = side.color;
              // 头也吃底衬：浅色大一号的同形三角垫底，与线的底衬语言一致。
              // 比例用【transform 属性】写死在子路径上（SVG 属性变换原点恒为
              // 本地 (0,0)=底边，与相机无关）；不走 CSS scale——其 origin/box
              // 语义随 reference box 漂移，深 zoom 下楔形会被画离锚点。
              this._svgNode('path', {
                d: WEDGE_D, class: 'war-chevron-under',
                transform: `scale(${((WEDGE_SCALES[tier] || 1) * 1.14).toFixed(4)})`,
              }, dir);
              this._svgNode('path', {
                d: WEDGE_D, class: 'war-chevron',
                transform: `scale(${(WEDGE_SCALES[tier] || 1).toFixed(4)})`,
              }, dir);
            }
          }
          if (isCur) {
            // 骑乘楔形头：绘制期间骑在生长端点上，画完移除、静态楔形接管。
            // 行军只在目标缩放下读得出来时才播——按目标缩放投影线长，低于
            // WAR_DRAW_MIN_PX（全国视角整条线 ~20px，骑乘头恒定 ~19px）就整箭
            // 瞬时落位，不播糊团。战役故事卡的取景由 main 的事件框定，可能比
            // 沙盘自身的步对焦更远——故事模式下取消该门槛：用户点名某一站，
            // 短箭头也要骑线生长。沙盘内逐步推进相机不飞：100ms 即起跑、
            // WAR_DRAW_MS 走完；激活进场（warFly，_syncWarOverlay 调用处传入）
            // 让线在飞行 30% 处（ease-out 已达 ~66%）开始生长、落位在定帧后
            // 不久——箭头与线从头到尾是一个整体。播放变速时整套时序同比缩放。
            let Lu0 = 0;
            try {
              Lu0 = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
            } catch (e) {
              Lu0 = 0;
            }
            const kProj = this._warKScreen(warFly || null);
            const storyMode = Boolean(
              this.activePerson && this.activePerson.profile && this.activePerson.profile.warKey
            );
            const drawMinPx = storyMode ? 0 : WAR_DRAW_MIN_PX;
            if (!(Lu0 > 2) || Lu0 * kProj < drawMinPx) {
              // 远景/退化路径：整箭瞬时落位（无骑乘头、无计时器）；
              // 浮签随其后 _syncWarBalloon 正常揭幕（pending 未置位）
              casing.style.visibility = 'visible';
              p.style.visibility = 'visible';
              if (dir) dir.classList.add('is-arrived');
            } else {
              const delay = reducedMotion() ? 0 : warFly ? Math.round(flightMs * 0.3) : 100;
              const ms = warFly ? flightMs : WAR_DRAW_MS;
              const startDraw = () => {
                let rider = null;
                if (!reducedMotion() && info.endX !== null) {
                rider = this._svgNode('g', { class: 'war-rider' }, g);
                rider.style.color = side.color;
                this._svgNode('path', { d: WEDGE_D, class: 'war-rider-wedge-under', transform: 'scale(1.14)' }, rider);
                this._svgNode('path', { d: WEDGE_D, class: 'war-rider-wedge' }, rider);
                  // 创建即钉在路径起点（首帧 rAF 会重写精确姿态）：无 transform
                  // 的骑乘头会闪到 SVG 原点
                  try {
                    const p0 = p.getPointAtLength(0);
                    const kr = this._warKScreen();
                    const back = Math.min(Math.max(0.08, 2.5 / (kr || 1)), Lu0);
                    const p1 = p.getPointAtLength(back);
                    const a0 = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
                    const s0 = (WEDGE_SCALES[tier] || 1) / (kr || 1);
                    rider.setAttribute('transform',
                      `translate(${p0.x.toFixed(1)},${p0.y.toFixed(1)}) rotate(${a0.toFixed(1)}) scale(${s0.toFixed(3)})`);
                  } catch (e) {
                    /* 起点姿态是装饰性的 */
                  }
                }
                this._startWarDraw(casing, p, dir, rider, tier, ms);
              };
              this._warDrawsLeft = (this._warDrawsLeft || 0) + 1;
              this._warDrawPending = true; // 浮签等全部箭头落位再揭幕
              if (delay > 0) {
                const h = setTimeout(() => {
                  this._warDrawTimers = (this._warDrawTimers || []).filter((t) => t !== h);
                  if (!casing.isConnected) return; // 重渲染后旧节点作废
                  startDraw();
                }, delay);
                this._warDrawTimers = this._warDrawTimers || [];
                this._warDrawTimers.push(h);
              } else {
                startDraw();
              }
            }
          } else if (isCur && claimed && dir) {
            // 号称兵力轴不播绘制动画（虚线即时呈现），楔形头直接落位
            dir.classList.add('is-arrived');
          }
          // 楔形保持【每步自然层序】（底边在本步线端之上、在后续步线之下）：
          // 链式交接点上，前一支的锥尖伸进下一支箭的起点走廊，下一支的线
          // 压在上面——经典战争地图"头对尾"衔接。旧实现把所有楔形重挂到
          // 顶层，下一支箭的起步段被前一支的底边齐平切断，读作"线头钻出"。
        }
      }

      // --- battle diamonds + labels ---
      const lblNodes = [];
      for (let i = 0; i <= idx; i++) {
        const s = w.steps[i];
        const isCur = i === idx;
        (s.battles || []).forEach((b, bi) => {
          if (!b.at) return;
          const side = this._warSide(w, b.side);
          // 真址渲染：同址避让在 _warRescaleGlyphs 里按屏幕距离逐帧处理
          //（旧版 0.3° 固定偏移在深 zoom 下把菱形甩离箭头尖端 130px）
          const [sx, sy] = this.projector.toScreen(b.at[0], b.at[1]);
          const tier = this._warForceTier(
            Math.max(0, ...(b.forces || []).filter((f) => f.quality !== 'claimed').map((f) => f.n))
          );
          const node = this._svgNode(
            'g',
            {
              class: `war-node${isCur ? ' is-cur' : ''}`,
              'data-x': sx.toFixed(1),
              'data-y': sy.toFixed(1),
              'data-war': w.key,
              'data-step': String(i),
              'data-battle': String(bi),
            },
            g
          );
          if (isCur) this._warCurSpot = { x: sx, y: sy };
          // 最近战场锚（≤当前步的最后一役）：叙事步浮签沿用它
          this._warBattleAnchor = { x: sx, y: sy };
          this._svgNode('circle', { class: 'war-ring', r: 8.5, stroke: side.color }, node);
          const core = this._svgNode(
            'g',
            { class: `war-core t${tier}` },
            node
          );
          this._svgNode(
            'polygon',
            { class: 'war-diamond', points: '0,-4.6 4.6,0 0,4.6 -4.6,0', fill: side.color },
            core
          );
          // 当前步战役名签（仅 war-deep 深 zoom 显示，广角由浮签命名）
          if (isCur) {
            lblNodes.push({
              x: sx,
              y: sy,
              text: this._warField(b, 'name') || this._warStepTitle(w, s),
              color: side.color,
            });
          }
        });
      }
      for (const lb of lblNodes) {
        const lg = this._svgNode(
          'g',
          { class: 'war-lbl', 'data-x': lb.x.toFixed(1), 'data-y': lb.y.toFixed(1) },
          g
        );
        const t = this._svgNode(
          'text',
          { class: 'war-lbl-text', x: 11, y: 4 },
          lg
        );
        t.textContent = lb.text;
        t.style.fill = lb.color;
      }
      this._rescaleSvgTypography();
      // 新符号由通用 rescale 定位，随后立即覆盖为屏幕恒定档
      this._warRescaleGlyphs();
    }

    // ---------------- render: campaign card ----------------

    _warCardEl() {
      return this._id('war-card');
    }

    // ---------------- render: sandbox entry gate (情境入口胶囊) ----------------

    _warGateEl() {
      return this._id('war-gate');
    }

    _bindWarGate() {
      const gate = this._warGateEl();
      if (!gate || gate._warGateBound) return;
      gate._warGateBound = true;
      const enter = () => {
        const w = this._activeWar();
        if (!w) return;
        // Story/person trace and campaign replay both own the camera and journey
        // layer. The shared entry helper clears the previous immersive mode first.
        this._engageWar(w);
      };
      gate.addEventListener('click', enter);
      gate.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enter();
        }
      });
    }

    _warStoryForcesHtml(profile, ev) {
      if (!profile || !profile.warKey || !ev || !Number.isInteger(ev.warStepIdx)) return '';
      const w = this._warData().find((item) => item.key === profile.warKey);
      const step = w && w.steps[ev.warStepIdx];
      return step ? this._warForceBarsHtml(w, step) : '';
    }

    _warForceBarsHtml(w, s) {
      const forces = this._warStepForces(w, s);
      if (!forces.length) return '';
      const warMax = Math.max(
        1,
        ...this._warStepForces(w, { moves: (w.steps || []).map((st) => (st.moves || [])[0]).filter(Boolean), battles: [] })
      );
      const rows = forces
        .map((f) => {
          const side = this._warSide(w, f.side);
          const pct = Math.max(6, Math.round((f.n / warMax) * 100));
          const qCls = f.quality === 'claimed' ? 'is-claimed' : f.quality === 'est' ? 'is-est' : 'is-recorded';
          const tip = [f.srcZh, f.srcEn].filter(Boolean).join(' / ').replace(/"/g, '&quot;');
          return (
            `<div class="war-fbar-row" title="${tip}">` +
            `<span class="war-fbar-name" style="color:${side.color}">${esc(this._warField(side, 'name'))}</span>` +
            `<span class="war-fbar-track"><i class="war-fbar-bar ${qCls}" style="width:${pct}%;background:${side.color}"></i></span>` +
            `<span class="war-fbar-num">${esc(this._warFormatN(f.n, f.quality))}</span>` +
            `</div>`
          );
        })
        .join('');
      return (
        `<div class="war-fbars"><div class="war-fbars-head">${esc(
          this.locale === 'en' ? 'Recorded strength (with sources)' : '兵力对比（附史料出处）'
        )}</div>${rows}</div>`
      );
    }

    _renderWarCard(w, idx) {
      const card = this._warCardEl();
      if (!card) return;
      const showCard = Boolean(w) && !this.activePerson && !this.activeTrace && !this.challenge;
      if (!showCard) {
        if (!card.classList.contains('is-hidden')) {
          card.classList.add('is-hidden');
        }
        this._warCardBuildSig = null;
        this._warCardStepSig = null;
        return;
      }
      const folded = card.classList.contains('is-folded');
      const last = (w.steps || []).length - 1;
      // 两级签名：换战役/换语言/折叠态才整卡重建；换步只做局部刷新
      //（旧版签名含 idx，每步 innerHTML 全卡重建——用户实测"每步都刷新/闪烁"）
      const buildSig = [this.locale, w.key, folded ? 1 : 0].join('|');
      if (buildSig !== this._warCardBuildSig) {
        this._warCardBuildSig = buildSig;
        this._warCardStepSig = null;
        const prevScroll = card.classList.contains('is-hidden') ? 0 : (card.querySelector('.war-steps') || {}).scrollTop || 0;
        const spanTxt = `${this.formatYear(w.span[0], true)} — ${this.formatYear(w.span[1], true)}`;
        const sidesHtml = (w.sides || [])
          .map((sd) => `<span class="war-side"><i style="background:${sd.color}"></i>${esc(this._warField(sd, 'name'))}</span>`)
          .join('');
        const listHtml = (w.steps || [])
          .map((s, i) => {
            const b0 = (s.battles || [])[0];
            const side = this._warSide(w, b0 ? b0.side : ((s.moves || [])[0] || {}).side);
            return (
              `<div class="war-step" data-act="step" data-idx="${i}">` +
              `<span class="wy" style="color:${side.color}">${this.formatYear(s.y, true)}</span>` +
              `<span class="wt">${esc(this._warStepTitle(w, s))}</span></div>`
            );
          })
          .join('');
        card.innerHTML =
          `<div class="war-head" data-act="fold-toggle">` +
          `<span class="war-title">${esc(this._warField(w, 'title'))}</span>` +
          `<span class="war-years">${spanTxt}</span>` +
          `<button class="war-exit" data-act="exit" title="${esc(this._warTxt('exit'))}" aria-label="${esc(this._warTxt('exit'))}">×</button>` +
          `<button class="war-fold" data-act="fold" aria-expanded="${folded ? 'false' : 'true'}" title="${esc(this._warTxt('fold'))}">▾</button>` +
          `</div>` +
          `<div class="war-body${folded ? ' is-folded' : ''}">` +
          `<div class="war-sides">${sidesHtml}</div>` +
          `<div class="war-narr"></div>` +
          `<div class="war-fbars-slot"></div>` +
          `<div class="war-steps">${listHtml}</div>` +
          `<div class="war-ctrl">` +
          `<button class="war-btn is-ico" data-act="rewind" title="${esc(this._warTxt('rewind'))}">${WAR_ICONS.rewind}</button>` +
          `<button class="war-btn is-ico" data-act="prev" title="${esc(this._warTxt('prev'))}">${WAR_ICONS.prev}</button>` +
          `<span class="war-stepcount"></span>` +
          `<button class="war-btn is-ico" data-act="next" title="${esc(this._warTxt('next'))}">${WAR_ICONS.next}</button>` +
          `<button class="war-btn is-ico" data-act="end" title="${esc(this._warTxt('end'))}">${WAR_ICONS.end}</button>` +
          `</div>` +
          `<div class="war-foot">${esc(this._warTxt('foot'))}</div>` +
          `</div>`;
        card.classList.remove('is-hidden');
        if (prevScroll) {
          const listEl = card.querySelector('.war-steps');
          if (listEl) listEl.scrollTop = prevScroll;
        }
      }
      if (idx === this._warCardStepSig) return;
      this._warCardStepSig = idx;

      // ---- 局部刷新：叙述 / 兵力条 / 步数 / 按钮禁用态 / 列表高亮 ----
      const step = idx >= 0 ? w.steps[idx] : null;
      const zi = this._warZoneIndex(w);
      const zone = zi >= 0 ? (w.zones || [])[zi] : null;
      const zoneNoteHtml =
        idx >= 0 && zone
          ? `<span class="war-zone-note">◈ ${esc(this._warTxt('zone'))} · ${esc(
              this.locale === 'en' ? this._warField(zone, 'note') : zone.noteZh
            )}</span>`
          : '';
      const narrHtml = idx < 0
        ? `<b>${this.formatYear(w.span[0])}</b> · ${esc(this._warTxt('upcoming'))}`
        : `<b>${this.formatYear(step.y)} · ${esc(this._warStepTitle(w, step))}</b><br>${esc(
            this._warField(step.battles && step.battles[0] ? step.battles[0] : (step.moves || [])[0] || {}, 'desc') ||
              this._warField(step.moves && step.moves[0] ? step.moves[0] : {}, 'desc')
          )}${zoneNoteHtml}`;
      card.querySelector('.war-narr').innerHTML = narrHtml;
      card.querySelector('.war-fbars-slot').innerHTML = idx >= 0 ? this._warForceBarsHtml(w, step) : '';
      card.querySelector('.war-stepcount').innerHTML = `${Math.max(0, idx + 1)}<i>/</i>${w.steps.length}`;
      const setDis = (act, dis) => {
        const b = card.querySelector(`[data-act="${act}"]`);
        if (b) b.classList.toggle('is-disabled', dis);
      };
      setDis('rewind', idx <= 0);
      setDis('prev', idx <= 0);
      setDis('next', idx >= last);
      setDis('end', idx >= last);
      card.querySelectorAll('.war-step').forEach((r, i) => r.classList.toggle('is-cur', i === idx));
      const curRow = card.querySelector('.war-step.is-cur');
      if (curRow) {
        const listEl = card.querySelector('.war-steps');
        const top = curRow.offsetTop;
        if (listEl && (top < listEl.scrollTop || top > listEl.scrollTop + listEl.clientHeight - 24)) {
          listEl.scrollTop = top - 40;
        }
      }
      if (this.locale === 'zh-tw') this._applyZhHantDom(card);
    }

    _warTxt(key) {
      const zh = this.locale !== 'en';
      const dict = {
        prev: zh ? '上一步' : 'Prev step',
        next: zh ? '下一步' : 'Next step',
        end: zh ? '跳到最后一幕' : 'Skip to the final step',
        upcoming: zh ? '大战将启——拖动时间轴逐步推进战局。' : 'The campaign is about to begin — drag the timeline.',
        fold: zh ? '折叠/展开战报' : 'Fold/unfold the report',
        foot: zh ? '路线与控制区为示意复原 · 兵力附出处（实录 / 号称 / 约数） · ◆ 战役点按得手方着色' : 'Routes & zones are schematic · strengths sourced (recorded / claimed / approx.) · ◆ diamonds colored by the winning side',
        zone: zh ? '当前控制区' : 'Front line',
        jumpHint: zh ? '点击跳到该步' : 'Click to jump to this step',
        rewind: zh ? '回到起始' : 'Back to the start',
        gate: zh ? '进入战争沙盘' : 'Enter the war sandbox',
        exit: zh ? '退出战争沙盘' : 'Exit the war sandbox',
      };
      return dict[key] || key;
    }

    // ---------------- step navigation ----------------
    // 沙盘不再有自动播放：时间轴是唯一主时钟（Space/拖轴/年份播放都照常驱动
    // 战况），卡片传输栏只做步进——回起始/上一步/下一步/到结束，无键位冲突。

    _warSeekTo(y) {
      // 未进入沙盘的小数年份（手输年份框等）不再劫持界面——只做普通同步
      const wRaw = this._activeWar(y);
      if (!wRaw || this._warEngagedKey !== wRaw.key) {
        this._syncWarOverlay();
        return;
      }
      const yi = Math.round(y) || (this.year < 0 ? 1 : -1);
      this._warInternalSeek = true;
      try {
        if (yi !== this.year) this.jumpToYear(yi);
        if (y !== this.year) {
          this.year = y; // fractional override: exact step landing
          this._scheduleUrlSync();
          this._syncScrubberUi();
          this._syncWarOverlay();
        }
      } finally {
        this._warInternalSeek = false;
      }
    }

    _gotoWarStep(w, i) {
      if (!w || i < 0 || i >= (w.steps || []).length) return;
      const s = w.steps[i];
      this._warSeekTo(s.y);
      if (!reducedMotion()) this._warFocusStep(w, s);
    }

    _warFocusStep(w, s) {
      const pts = [];
      (s.moves || []).forEach((mv) => this._warPointList(mv).forEach((p) => pts.push(p)));
      (s.battles || []).forEach((b) => b.at && pts.push(b.at));
      if (!pts.length || !this.projector) return;
      const scr = pts.map((p) => this.projector.toScreen(p[0], p[1]));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      scr.forEach(([sx, sy]) => {
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx > maxX) maxX = sx;
        if (sy > maxY) maxY = sy;
      });
      // 取景中心向到达端偏移 25%：行动终点是叙事焦点
      //（修"相机对准巨钉/标签，当前箭头被切出画外"）
      const tip = scr[scr.length - 1];
      let cx = (minX + maxX) / 2 * 0.75 + tip[0] * 0.25;
      let cy = (minY + maxY) / 2 * 0.75 + tip[1] * 0.25;
      // 手动聚焦：度标定的 AABB 适配（pad 12%、最小 1.8°、最大 30°）。
      // 旧版裸数字 430 单位 ≈ 32°，是"战场纵深小"事故的源头。
      const padW = (maxX - minX) * FIT_PAD;
      const padH = (maxY - minY) * FIT_PAD;
      let bw = Math.max(maxX - minX + padW * 2, STEP_MIN_DEG * DEG);
      let bh = Math.max(maxY - minY + padH * 2, (STEP_MIN_DEG * DEG) / CANVAS_AR);
      bw = Math.min(bw, STEP_MAX_DEG * DEG);
      if (bw / bh > CANVAS_AR) bh = bw / CANVAS_AR;
      else bw = bh * CANVAS_AR;
      this._animateCameraTo(
        {
          x: cx - bw / 2,
          y: cy - bh / 2,
          w: bw,
          h: bh,
        },
        { duration: WAR_FLIGHT_MS }
      );
    }

    // 战场全境适配：全场步骤所有坐标点的 AABB，pad 12%、最小 2.3°、最大 53°。
    _warTheaterFit(w) {
      const pts = [];
      (w.steps || []).forEach((s) => {
        (s.moves || []).forEach((mv) => this._warPointList(mv).forEach((p) => pts.push(p)));
        (s.battles || []).forEach((b) => b.at && pts.push(b.at));
      });
      if (!pts.length || !this.projector) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach((p) => {
        const [sx, sy] = this.projector.toScreen(p[0], p[1]);
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx > maxX) maxX = sx;
        if (sy > maxY) maxY = sy;
      });
      const padW = (maxX - minX) * FIT_PAD;
      const padH = (maxY - minY) * FIT_PAD;
      let bw = Math.max(maxX - minX + padW * 2, THEATER_MIN_DEG * DEG);
      let bh = Math.max(maxY - minY + padH * 2, (THEATER_MIN_DEG * DEG) / CANVAS_AR);
      bw = Math.min(bw, THEATER_MAX_DEG * DEG);
      if (bw / bh > CANVAS_AR) bh = bw / CANVAS_AR;
      else bw = bh * CANVAS_AR;
      return {
        x: (minX + maxX) / 2 - bw / 2,
        y: (minY + maxY) / 2 - bh / 2,
        w: bw,
        h: bh,
      };
    }

    // ---------------- sync entry ----------------

    _bindWarCardEvents(card) {
      if (!card || card._warBound) return;
      card._warBound = true;
      card.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'exit') {
          // 退出战争沙盘：清会话 → _syncWarOverlay 的退出分支收卡、展开
          // 相位条、相机对称飞回进战前取景；年份仍在窗口内则入口胶囊重现
          this._warEngagedKey = null;
          this._syncWarOverlay();
          return;
        }
        if (a === 'fold' || a === 'fold-toggle') {
          card.classList.toggle('is-folded');
          const w2 = this._activeWar();
          this._renderWarCard(w2, w2 ? this._warStepIndex(w2) : -1);
          return;
        }
        const w = this._activeWar();
        if (!w) return;
        const idx = this._warStepIndex(w);
        const last = (w.steps || []).length - 1;
        // 边界禁用（is-disabled 按钮不响应）
        if ((a === 'rewind' || a === 'prev') && idx <= 0) return;
        if ((a === 'next' || a === 'end') && idx >= last) return;
        if (a === 'rewind') {
          this._gotoWarStep(w, 0);
        } else if (a === 'prev') {
          this._gotoWarStep(w, idx - 1);
        } else if (a === 'next') {
          this._gotoWarStep(w, idx + 1);
        } else if (a === 'end') {
          this._gotoWarStep(w, last);
        } else if (a === 'step') {
          this._gotoWarStep(w, parseInt(act.dataset.idx, 10));
        }
      });
    }

    _syncWarOverlay() {
      if (!this.svg || !this.projector || !this.grpCorridors) return;
      const card = this._warCardEl();
      this._bindWarCardEvents(card);
      if (!this._warChkBound) {
        const chk = this._id('chk-war');
        if (chk) {
          chk.addEventListener('change', () => {
            // 勾选=进入沙盘的手势之一：当年有战役则立即接管并飞入；
            // 取消勾选=退出沙盘（战役故事模式则连同故事卡一起收起）
            const w0 = chk.checked ? this._activeWar() : null;
            if (w0) {
              this._engageWar(w0);
            } else {
              this._warEngagedKey = null;
              if (
                this.activePerson && this.activePerson.profile && this.activePerson.profile.warKey &&
                typeof this.closeGenealogyCard === 'function'
              ) {
                this.closeGenealogyCard();
              }
            }
            const grp = this._warGroup();
            if (grp) grp.classList.toggle('is-hidden', !chk.checked);
            this._warSvgSig = null;
            this._syncWarOverlay();
            this._rescaleSvgTypography();
            this._warRescaleGlyphs();
          });
          this._warChkBound = true;
        }
        // 点时间轴战役事件行=进入该战役沙盘（明确手势；capture 阶段先于
        // 行自身的 jumpToYear 登记，随后的 _syncWarOverlay 即接管）
        if (!this._warEvRowBound) {
          document.addEventListener(
            'click',
            (e) => {
              try {
                const t = e.target;
                if (
                  t && t.closest &&
                  t.closest('.ev-story-tag, .ep-story-seal, button, a, input, select, textarea, [role="button"]')
                ) return;
                const row = t && t.closest ? t.closest('[data-ev-year]') : null;
                if (!row) return;
                const y = Number(row.dataset.evYear);
                if (!Number.isFinite(y)) return;
                const war = this._warData().find((x) => y >= x.span[0] && y <= x.span[1]);
                if (!war) return;
                if (this._warHasStory(war.key) && typeof this.openPersonChronicle === 'function') {
                  this.openPersonChronicle(war.key, Math.max(0, this._warStepIndex(war, y)));
                } else {
                  this._prepareWarEngagement(war);
                }
              } catch (err) {
                /* non-fatal */
              }
            },
            true
          );
          this._warEvRowBound = true;
        }
      }
      const wRaw = this._activeWar();
      const storyWar = this._activeWarStory();
      // Standalone sandbox ownership and story-driven campaign rendering are
      // separate. Guandu uses the main story card but still supplies the SVG war.
      const shellWar = wRaw && this._warEngagedKey === wRaw.key ? wRaw : null;
      const w = storyWar ? storyWar.war : shellWar;
      const idx = storyWar ? storyWar.idx : w ? this._warStepIndex(w) : -1;
      // 故事模式不渲染控制区多边形：当前疆域态势由 main 的政区图层表达，
      // 粗虚线 zone 在精细地图上没有文字说明（旧沙盘的说明随 war-card 退役），
      // 只会被读成莫名的选框。箭头与战役菱形不受影响。
      const zi = storyWar ? -1 : w ? this._warZoneIndex(w) : -1;
      // Only the standalone shell condenses the legend and renders war-card.
      const vf = this._id('viewport-frame');
      const warActive = Boolean(shellWar) && !this.activePerson && !this.activeTrace && !this.challenge;
      if (vf) vf.classList.toggle('has-active-war', warActive);
      const mk = this._id('map-key');
      if (mk) mk.classList.toggle('is-condensed', warActive);
      const grp = this._warGroup();
      if (grp) {
        const chk = this._id('chk-war');
        if (!w || (!storyWar && chk && !chk.checked)) grp.classList.add('is-hidden');
        else grp.classList.remove('is-hidden');
      }
      // 情境入口胶囊：年份落在战役窗口且未接管时，地图底缘给出显眼入口
      // （上一版入口藏在编年行/图层弹层里，用户找不到——这是主入口）
      this._bindWarGate();
      const gate = this._warGateEl();
      if (gate) {
        const showGate =
          Boolean(wRaw) && !w &&
          !this.activePerson && !this.activeTrace && !this.challenge &&
          this._warLayerOn();
        gate.classList.toggle('is-hidden', !showGate);
        const gateSig = showGate
          ? [this.locale, wRaw.key, wRaw.span[0], wRaw.span[1]].join('|')
          : null;
        if (showGate && gateSig !== this._warGateSig) {
          this._warGateSig = gateSig;
          const spanTxt = `${this.formatYear(wRaw.span[0], true)} — ${this.formatYear(wRaw.span[1], true)}`;
          gate.innerHTML =
            WAR_ICONS.gate +
            `<b>${esc(this._warField(wRaw, 'title'))}</b>` +
            `<i>${esc(spanTxt)}</i>` +
            `<em>${esc(this._warTxt('gate'))} ›</em>`;
          gate.title = esc(this._warTxt('gate'));
          if (this.locale === 'zh-tw') this._applyZhHantDom(gate);
        } else if (!showGate) {
          this._warGateSig = null;
        }
      }
      // 激活进场飞行预判：与下方激活块同一谓词（勿两处维护）——飞行发生在
      // 渲染之后，渲染端只能靠预判决定行军绘制的延迟/时长/门控缩放基准
      const warFly =
        shellWar && this._warTheaterKey !== shellWar.key && !reducedMotion() &&
        !this.isScrubbing && !this.challenge && !this.activePerson && !this.activeTrace
          ? this._warTheaterFit(shellWar)
          : null;
      this._renderWarSvg(w, idx, zi, warFly);
      this._renderWarCard(storyWar ? null : shellWar, idx);
      if (storyWar) this._hideWarBalloon();
      else this._syncWarBalloon(shellWar, idx);
      this._dedupeMilestonePins();
      this._syncZoomDependentState();
      // 战局激活（从无到有）→ 相机自动飞入战场全境，并登记进战前取景；
      // 战局失活→若用户没在战役期间手动挪过相机（仍在战区取景附近），
      // 对称飞回进战前取景——拖轴进出战役是一个完整的"推近/拉回"镜头，
      // 只进不回会让人拖回 195 后地图还停在官渡特写（逻辑不顺畅实测）。
      // 拖轴途中不抢相机。
      if (shellWar && this._warTheaterKey !== shellWar.key) {
        this._warTheaterKey = shellWar.key;
        this._warLastAnchor = null; // 换战役：叙事步锚点不跨场沿用
        const fit = this._warTheaterFit(shellWar);
        this._warTheaterFitUsed = fit || null;
        this._warCamBefore = { ...this.camera };
        if (fit && !this.isScrubbing && !this.challenge && !this.activePerson && !this.activeTrace) {
          if (reducedMotion()) {
            this.camera = { ...fit, zoom: 1000 / fit.w };
            this._applyCamera(false);
          } else {
            this._animateCameraTo(fit, { duration: WAR_FLIGHT_MS });
          }
        }
      } else if (!shellWar) {
        const hadTheater = this._warTheaterKey != null;
        const fitUsed = this._warTheaterFitUsed;
        const camBefore = this._warCamBefore;
        this._warTheaterKey = null;
        this._warLastAnchor = null;
        this._warTheaterFitUsed = null;
        this._warCamBefore = null;
        // 沙盘会话随窗口结束：年份离开战役窗口或换到别的战役窗口，
        // 都算退出沙盘——再次进入需要新的明确手势（点事件行/勾选/深链）
        if (this._warEngagedKey && (!wRaw || wRaw.key !== this._warEngagedKey)) {
          this._warEngagedKey = null;
        }
        if (hadTheater && fitUsed && camBefore &&
            !this.isScrubbing && !this.challenge && !this.activePerson && !this.activeTrace) {
          // 用户仍在战区取景附近（没手动漫游走）才回位
          const c = this.camera;
          const dx = Math.hypot((c.x - fitUsed.x) / fitUsed.w, (c.y - fitUsed.y) / fitUsed.w);
          const ratio = c.w / fitUsed.w;
          if (dx < 0.55 && ratio > 0.4 && ratio < 3) {
            if (reducedMotion()) {
              this.camera = { ...camBefore, zoom: 1000 / camBefore.w };
              this._applyCamera(false);
            } else {
              this._animateCameraTo({ ...camBefore }, { duration: 650 });
            }
          }
        }
      }
    }

    // ---------------- war situation balloon (战争态势浮签) ----------------
    // 接管战争年份的自动叙事气泡：锚定当前战役、内容逐步跟随战局；
    // 里程碑系统本体不动（手动点钉照常，浮签自动避让）。

    _warBalloonEl() {
      return this._id('war-balloon');
    }

    _hideWarBalloon() {
      const el = this._warBalloonEl();
      if (el && !el.classList.contains('is-hidden')) el.classList.add('is-hidden');
      this._warBalloonState = null;
    }

    _syncWarBalloon(w, idx) {
      const el = this._warBalloonEl();
      if (!el) return;
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        this._hideWarBalloon();
        return;
      }
      const step = w && idx >= 0 ? w.steps[idx] : null;
      const battle = step ? (step.battles || [])[0] : null;
      const milestoneOpen =
        this.milestoneBalloon && !this.milestoneBalloon.classList.contains('is-hidden');
      // 锚点：战步用战役点；行军步用箭头落点；叙事步沿用最近战场
      if (battle && this._warCurSpot) this._warLastAnchor = this._warCurSpot;
      const anchor = battle
        ? this._warCurSpot
        : (this._warCurMoveTip || this._warBattleAnchor || this._warLastAnchor);
      if (anchor) this._warLastAnchor = anchor;
      const usable =
        step &&
        (battle || this._warStepTitle(w, step)) &&
        anchor &&
        this._warLayerOn() &&
        !this.challenge &&
        !this.activePerson &&
        !this.activeTrace &&
        !milestoneOpen;
      if (!usable || this._warBalloonDismissedIdx === `${w.key}:${idx}`) {
        this._hideWarBalloon();
        return;
      }
      const sig = [this.locale, w.key, idx].join('|');
      if (sig !== this._warBalloonSig) {
        this._warBalloonSig = sig;
        const title = battle
          ? (this._warField(battle, 'name') || this._warStepTitle(w, step))
          : this._warStepTitle(w, step);
        const zh = this.locale !== 'en';
        const side = battle ? this._warSide(w, battle.side) : null;
        // 战果行优先 battle.resultZh/En（每役实况），退回通用得手方行；
        // 叙事步没有胜负，标题+描述自立。地点行每役必异。
        const result = battle ? this._warField(battle, 'result') : '';
        const sideNote = battle
          ? (result ||
             (zh
               ? `此役${esc(this._warField(side, 'name'))}得手/占优`
               : `${esc(this._warField(side, 'name'))} held the field`))
          : '';
        const place = battle ? this._warField(battle, 'place') : '';
        // 详细描述：战步取战例 desc，行军步取 move desc，叙事步取 step desc
        const dsrc = battle || (step.moves || [])[0] || step;
        const desc = this._warField(dsrc, 'desc');
        const forces = this._warStepForces(w, step)
          .map((f) => {
            const sd = this._warSide(w, f.side);
            return `<span class="war-bf-item"><i style="background:${sd.color}"></i>${esc(this._warField(sd, 'name'))} ${esc(this._warFormatN(f.n, f.quality))}</span>`;
          })
          .join('');
        el.innerHTML =
          `<div class="ep-head"><span class="ep-year">${esc(this.formatYear(step.y))} · ${esc(title)}</span></div>` +
          (sideNote ? `<div class="war-balloon-side" style="color:${side.color}">${sideNote}</div>` : '') +
          (place ? `<div class="war-balloon-place">${esc(place)}</div>` : '') +
          (desc ? `<div class="war-balloon-desc">${esc(desc)}</div>` : '') +
          (forces ? `<div class="war-balloon-forces">${forces}</div>` : '') +
          `<button type="button" class="ep-close" aria-label="${zh ? '关闭战报浮签' : 'Dismiss campaign callout'}">×</button>`;
        const closeBtn = el.querySelector('.ep-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._warBalloonDismissedIdx = `${w.key}:${idx}`;
            this._hideWarBalloon();
          });
        }
        if (this.locale === 'zh-tw') this._applyZhHantDom(el);
      }
      this._warBalloonState = {
        sx: anchor.x,
        sy: anchor.y,
      };
      // 锚种类：菱形避让逐帧微调时，浮签只跟随同源锚（battle/叙事锚随菱形动，
      // 主轴箭头尖锚不随菱形动）
      this._warBalloonAnchorKind = battle ? 'battle' : (this._warCurMoveTip ? 'movetip' : 'battleanchor');
      // 浮签等箭头：本步有行军箭头在画（或延迟待画）时先藏着，
      // 画完由 _startWarDraw 的 finish() 揭幕——「箭头过去了，动画结束了再出现」
      const dirEl = (this.grpWar || (this.svg && this.svg.querySelector('#grp-war')));
      const curDir = dirEl && dirEl.querySelector('g.war-dir.is-cur');
      const arrived = !curDir || curDir.classList.contains('is-arrived');
      this._warBalloonPendingSig = `${w.key}:${idx}`;
      if (this._warDrawPending && !arrived) {
        el.classList.add('is-hidden');
        return;
      }
      el.classList.remove('is-hidden', 'is-offscreen');
      this._positionWarBalloon();
    }

    _revealWarBalloon() {
      const el = this._warBalloonEl();
      if (!el || !this._warBalloonState) return;
      if (typeof window !== 'undefined' && window.innerWidth <= 900) {
        el.classList.add('is-hidden');
        return;
      }
      if (this._warBalloonDismissedIdx === this._warBalloonPendingSig) return;
      el.classList.remove('is-hidden', 'is-offscreen');
      this._positionWarBalloon();
    }

    // 态势浮签逐帧跟随相机（与里程碑气泡同一重定位通道）；
    // 同时承担两项随缩放的联动：war-deep 类切换 + 战局激活时地形贴图淡出
    // （深 zoom 下位图地形糊成软泥，淡出后露素底，战争层全矢量不受影响）。
    _syncZoomDependentState() {
      const svg = this.svg;
      if (!svg || !this.camera) return;
      const w = this.camera.w;
      svg.classList.toggle('war-deep', w < 120);
      const warActive = Boolean(this._warEngagedWar && this._warEngagedWar());
      const terrain = document.getElementById('terrain-relief-layer');
      if (!terrain) return;
      let targetOpacity = 1;
      if (warActive && w < 150) {
        targetOpacity = Math.max(0.3, Math.min(1, (w - 45) / 105));
      }
      const cur = parseFloat(terrain.style.opacity || '1');
      if (Math.abs(cur - targetOpacity) > 0.01) terrain.style.opacity = targetOpacity.toFixed(2);
    }

    // 里程碑钉与战役菱形同事件去重：钉落在任一战役点 10 用户单位（≈0.76°）内
    // 即加 .war-shadowed 降透明度（同一事件两套"红菱+白环"是双标记混淆的根源）。
    _dedupeMilestonePins() {
    const grp = this.grpMilestones || (this.svg && this.svg.querySelector('#grp-milestones'));
    if (!grp) return;
    const active = Boolean(this._warEngagedWar && this._warEngagedWar());
      const nodes = active
        ? Array.from((this.grpWar || this.svg.querySelector('#grp-war') || { querySelectorAll: () => [] }).querySelectorAll('.war-node[data-x]'))
        : [];
      grp.querySelectorAll('.milestone-pin.war-shadowed').forEach((n) => n.classList.remove('war-shadowed'));
      if (!active || !nodes.length) return;
      grp.querySelectorAll('.milestone-pin[data-x]').forEach((pin) => {
        const px = parseFloat(pin.dataset.x);
        const py = parseFloat(pin.dataset.y);
        if (!Number.isFinite(px)) return;
        for (const nd of nodes) {
          const nx = parseFloat(nd.dataset.x);
          const ny = parseFloat(nd.dataset.y);
          if (Math.hypot(nx - px, ny - py) < 10) {
            pin.classList.add('war-shadowed');
            return;
          }
        }
      });
    }

    _positionWarBalloon() {
      const el = this._warBalloonEl();
      if (!el || el.classList.contains('is-hidden') || !this._warBalloonState) return;
      const { sx, sy } = this._warBalloonState;
      const rect =
        (this.dragState && this.dragState.rect) ||
        (this.pinchState && this.pinchState.rect) ||
        this._cameraViewportRect ||
        this.svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this._cameraViewportRect = rect;
      const scale = Math.min(rect.width / this.camera.w, rect.height / this.camera.h);
      const padX = (rect.width - this.camera.w * scale) * 0.5;
      const padY = (rect.height - this.camera.h * scale) * 0.5;
      const px = padX + (sx - this.camera.x) * scale;
      const py = padY + (sy - this.camera.y) * scale;
      if (px < -16 || px > rect.width + 16 || py < -16 || py > rect.height + 16) {
        el.classList.add('is-offscreen');
        return;
      }
      el.classList.remove('is-offscreen');
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 900;
      const bW = el.offsetWidth || 260;
      const bH = el.offsetHeight || 70;
      const minLeft = isMobile ? 8 : 12;
      const rightLimit = Math.max(minLeft, rect.width - bW - (isMobile ? 8 : 12));
      const minTop = isMobile ? 48 : 12;
      const maxTop = Math.max(minTop, rect.height - bH - (isMobile ? 56 : 16));
      const pinGap = isMobile ? 10 : 12;
      // 战报卡片（z 更高）占左下一大块：浮签压在卡片底下=展示不全。
      // 桌面布局下浮签的可放左界 = 卡片右缘 + 间距。
      let leftFloor = minLeft;
      if (!isMobile) {
        const cardEl = this._warCardEl();
        if (cardEl && !cardEl.classList.contains('is-hidden')) {
          const cr = cardEl.getBoundingClientRect();
          const sr = this.svg.getBoundingClientRect();
          leftFloor = Math.max(minLeft, cr.right - sr.left + 10);
        }
      }
      // 候选侧按「与箭头行进方向同向」优先：线在箭头身后，前方是空的——
      // 浮签放到行进方向那一侧就不会压住线（旧逻辑固定先右后左，常压线）。
      const dirEl = this.grpWar
        ? this.grpWar.querySelector('g.war-dir.is-cur')
        : null;
      const rotRad = ((parseFloat(dirEl && dirEl.dataset.rot) || 0) * Math.PI) / 180;
      const advX = Math.cos(rotRad);
      const advY = Math.sin(rotRad);
      // 候选：side=浮签相对锚的方位；caret=data-caret 值（箭头指向锚的那条边）
      const cands = [
        { side: 'right', caret: 'left', dx: 1, dy: 0 },
        { side: 'left', caret: 'right', dx: -1, dy: 0 },
        { side: 'bottom', caret: 'top', dx: 0, dy: 1 },
        { side: 'top', caret: 'bottom', dx: 0, dy: -1 },
      ].map((c) => ({ ...c, score: c.dx * advX + c.dy * advY }))
        .sort((a, b) => b.score - a.score);
      let placed = null;
      for (const c of cands) {
        if (c.side === 'right') {
          // 右候选同样吃 leftFloor：锚点水平落在卡片带内时 px+gap 会把
          // 浮签放进卡片底下（赤壁乘桑定盟步实测压住标题一行）
          const left = Math.max(leftFloor, px + pinGap);
          if (left + bW <= rightLimit) { placed = { left, top: Math.max(minTop, Math.min(maxTop, py - bH * 0.42)), caretDir: c.caret }; break; }
        } else if (c.side === 'left') {
          const left = px - pinGap - bW;
          if (left >= leftFloor) { placed = { left, top: Math.max(minTop, Math.min(maxTop, py - bH * 0.42)), caretDir: c.caret }; break; }
        } else if (c.side === 'bottom') {
          const top = py + pinGap;
          if (top + bH <= maxTop) { placed = { left: Math.max(leftFloor, Math.min(rightLimit, px - bW / 2)), top, caretDir: c.caret }; break; }
        } else {
          const top = py - pinGap - bH;
          if (top >= minTop) { placed = { left: Math.max(leftFloor, Math.min(rightLimit, px - bW / 2)), top, caretDir: c.caret }; break; }
        }
      }
      if (!placed) {
        // 四侧都放不下：退回旧逻辑（右→左→居中）
        let left;
        let top = Math.max(minTop, Math.min(maxTop, py - bH * 0.42));
        let caretDir = 'left';
        if (Math.max(leftFloor, px + pinGap) + bW <= rightLimit) {
          left = Math.max(leftFloor, px + pinGap);
        } else if (px - bW - pinGap >= leftFloor) {
          left = px - bW - pinGap;
          caretDir = 'right';
        } else {
          left = Math.max(leftFloor, Math.min(rightLimit, px - bW / 2));
          caretDir = py < rect.height / 2 ? 'top' : 'bottom';
        }
        placed = { left, top, caretDir };
      }
      el.style.left = `${placed.left.toFixed(1)}px`;
      el.style.top = `${placed.top.toFixed(1)}px`;
      el.style.setProperty('--caret-y', `${Math.max(14, Math.min(bH - 14, py - placed.top)).toFixed(1)}px`);
      el.dataset.caret = placed.caretDir;
    }

    _onWarLocaleChange() {
      this._warSvgSig = null;
      this._warCardBuildSig = null;
      this._warCardStepSig = null;
      this._warBalloonSig = null;
      const chk = this._id('chk-war');
      const lbl = this._id('lbl-war');
      if (lbl) {
        lbl.textContent = this.uiStr('toggle_war', '战争沙盘');
        if (lbl.parentElement) {
          lbl.parentElement.title = this.locale === 'en'
            ? 'Campaign replay: march arrows sized by recorded strength, battle diamonds, front-zone shifts'
            : '战争进程复现：行军箭头按兵力定宽 · 战役点 · 战线推移';
        }
      }
      if (chk && chk.parentElement && this.locale === 'zh-tw') this._applyZhHantDom(chk.parentElement);
      this._syncWarOverlay();
    }

    // ---------------- map hover / click hooks (from app.js whitelists) ----------------

    _warHoverTip(nodeEl, e) {
      const w = this._warData().find((x) => x.key === nodeEl.dataset.war);
      if (!w) return;
      const i = parseInt(nodeEl.dataset.step, 10);
      const bi = parseInt(nodeEl.dataset.battle, 10);
      const b = ((w.steps[i] || {}).battles || [])[bi];
      if (!b) return;
      const zh = this.locale !== 'en';
      const side = this._warSide(w, b.side);
      const forces = (b.forces || [])
        .map((f) => {
          const sd = this._warSide(w, f.side);
          return `${esc(this._warField(sd, 'name'))} ${esc(this._warFormatN(f.n, f.quality))}`;
        })
        .join(zh ? ' · ' : ' · ');
      const place = this._warField(b, 'place');
      const title = esc(this._warField(b, 'name')) || esc(this._warStepTitle(w, w.steps[i]));
      const yr = this.formatYear(w.steps[i].y);
      const sideNote = zh
        ? `此役${esc(this._warField(side, 'name'))}得手/占优`
        : `${esc(this._warField(side, 'name'))} held the field`;
      this._showHoverTip(
        e,
        `<b style="color:${side.color}">◆ ${title}</b>` +
        `<div class="tt-sub">${yr}${place ? ' · ' + esc(place) : ''}</div>` +
        (forces ? `<div class="tt-sub">${forces}</div>` : '') +
        `<div class="tt-sub" style="color:${side.color}">${sideNote}</div>` +
        `<div class="tt-sub">${esc(this._warTxt('jumpHint'))}</div>`
      );
    }

    _warClickNode(nodeEl) {
      const w = this._warData().find((x) => x.key === nodeEl.dataset.war);
      if (!w) return;
      const i = parseInt(nodeEl.dataset.step, 10);
      const storyWar = this._activeWarStory();
      if (storyWar && storyWar.war.key === w.key && typeof this.selectPersonEvent === 'function') {
        const eventIdx = this.activePerson.events.findIndex((ev) => ev.warStepIdx === i);
        if (eventIdx >= 0) this.selectPersonEvent(eventIdx, true);
        return;
      }
      this._gotoWarStep(w, i);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function install(Ctrl) {
    HistoricalAtlasController = Ctrl;

    // War state is driven strictly by the single year entry point: wrap jumpToYear.
    // Fractional-year inputs (deep links like ?year=1399.75) that fall inside a
    // campaign window re-seek to the exact step after the integer-year base sync.
    const baseJump = Ctrl.prototype.jumpToYear;
    Ctrl.prototype.jumpToYear = function (...args) {
      const r = baseJump.apply(this, args);
      try {
        // 沙盘内部跳步不等相位变化：吞掉边界幽灵残影，避免与行军动画打架
        if (this._warInternalSeek && this.grpGhostDiff && this.grpGhostDiff.childNodes.length) {
          this.grpGhostDiff.innerHTML = '';
          if (this.ghostTimer) {
            clearTimeout(this.ghostTimer);
            this.ghostTimer = null;
          }
        }
        const raw = args.length ? Number(args[0]) : NaN;
        if (
          Number.isFinite(raw) &&
          raw % 1 !== 0 &&
          Math.round(raw) === this.year &&
          this._warData().some((x) => raw >= x.span[0] - 1 && raw <= x.span[1] + TAIL_YEARS)
        ) {
          this._warSeekTo(raw);
        } else {
          this._syncWarOverlay();
        }
      } catch (e) {
        /* war overlay must never break timeline sync */
      }
      return r;
    };

    // Re-render on language switch (chip label + card + svg signatures reset).
    const baseApplyLocale = Ctrl.prototype.applyLocale;
    Ctrl.prototype.applyLocale = function (...args) {
      const r = baseApplyLocale.apply(this, args);
      try {
        this._onWarLocaleChange();
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };

    // Deep links (?year=1399.75): _parseYearList rounds before jumpToYear sees the
    // value, so after the base restore re-read the raw query and land exactly.
    const baseRestore = Ctrl.prototype._restoreFromQuery;
    Ctrl.prototype._restoreFromQuery = function (...args) {
      const r = baseRestore.apply(this, args);
      try {
        this._restoreWarFromQuery();
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };

    // Person chronicles and the An-Shi storyline are separate immersive modes.
    // Let them take ownership without a competing war-camera return animation.
    const baseOpenPerson = Ctrl.prototype.openPersonChronicle;
    if (typeof baseOpenPerson === 'function') {
      Ctrl.prototype.openPersonChronicle = function (...args) {
        let targetWarProfile = null;
        try {
          const profiles = typeof this._resolvePersonProfiles === 'function'
            ? this._resolvePersonProfiles(args[0])
            : [];
          targetWarProfile = profiles.find((profile) => profile && profile.warKey) || null;
          if (targetWarProfile) {
            this._warEngagedKey = null;
            this._warTheaterKey = null;
            this._warTheaterFitUsed = null;
            this._warCamBefore = null;
            this._warSvgSig = null;
          } else if (this._leaveWarForModeSwitch) {
            this._leaveWarForModeSwitch();
          }
        } catch (e) {
          /* non-fatal */
        }
        const result = baseOpenPerson.apply(this, args);
        try {
          this._syncWarOverlay();
        } catch (e) {
          /* non-fatal */
        }
        return result;
      };
    }

    const baseRenderPersonPins = Ctrl.prototype._renderPersonPinsOverlay;
    if (typeof baseRenderPersonPins === 'function') {
      Ctrl.prototype._renderPersonPinsOverlay = function (...args) {
        const profile = this.activePerson && this.activePerson.profile;
        if (profile && profile.warKey) {
          if (this.grpJourney) this.grpJourney.innerHTML = '';
          try {
            this._warSvgSig = null;
            this._syncWarOverlay();
          } catch (e) {
            /* non-fatal */
          }
          return;
        }
        return baseRenderPersonPins.apply(this, args);
      };
    }

    const baseCloseGenealogy = Ctrl.prototype.closeGenealogyCard;
    if (typeof baseCloseGenealogy === 'function') {
      Ctrl.prototype.closeGenealogyCard = function (...args) {
        const closingWarStory = Boolean(
          this.activePerson && this.activePerson.profile && this.activePerson.profile.warKey
        );
        const result = baseCloseGenealogy.apply(this, args);
        try {
          if (closingWarStory) {
            this._warEngagedKey = null;
            this._warSvgSig = null;
          }
          this._syncWarOverlay();
        } catch (e) {
          /* non-fatal */
        }
        return result;
      };
    }

    // 战争年份：沙盘接管中才让自动里程碑气泡让位（普通播放照常显示）
    const baseAutoSync = Ctrl.prototype._syncAutoMilestoneBalloon;
    Ctrl.prototype._syncAutoMilestoneBalloon = function (...args) {
      if (this._warEngagedWar && this._warEngagedWar()) {
        if (this.activeMilestone && this.activeMilestone.isAuto) this.closeMilestoneBalloon();
        return;
      }
      return baseAutoSync.apply(this, args);
    };

    // 手动里程碑气泡打开 → 战争浮签避让；关闭 → 战争浮签复位
    const baseOpenMb = Ctrl.prototype.openMilestoneBalloon;
    Ctrl.prototype.openMilestoneBalloon = function (...args) {
      const r = baseOpenMb.apply(this, args);
      try {
        if (this.milestoneBalloon && !this.milestoneBalloon.classList.contains('is-hidden')) {
          this._hideWarBalloon();
        }
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };
    const baseCloseMb = Ctrl.prototype.closeMilestoneBalloon;
    Ctrl.prototype.closeMilestoneBalloon = function (...args) {
      const r = baseCloseMb.apply(this, args);
      try {
        const w = this._warEngagedWar ? this._warEngagedWar() : null;
        if (w) this._syncWarBalloon(w, this._warStepIndex(w));
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };

    // 态势浮签逐帧跟随相机（与里程碑气泡同一重定位通道）
    const baseApplyCam = Ctrl.prototype._applyCamera;
    Ctrl.prototype._applyCamera = function (...args) {
      const r = baseApplyCam.apply(this, args);
      try {
        this._syncZoomDependentState();
        // 通用 rescale 先写 1/√z 档，这里随后覆盖为 1/kScreen 全补偿档；
        // 菱形避让会挪动锚点，须先于浮签定位执行
        this._warRescaleGlyphs();
        this._positionWarBalloon();
        this._dedupeMilestonePins();
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };

    Ctrl._extendPrototype(WarSandboxMixin);
  }

  if (typeof window === 'undefined') return;
  const readyCtrl = window.HistoricalAtlasController;
  if (readyCtrl && typeof readyCtrl._extendPrototype === 'function') {
    install(readyCtrl);
  } else {
    (window.__ATLAS_MIXINS = window.__ATLAS_MIXINS || []).push(install);
  }
})();
