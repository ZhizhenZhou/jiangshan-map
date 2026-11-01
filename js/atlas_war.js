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
  const PLAY_INTERVAL = 2600;     // ms per step while playing (1× 档，叙事节奏)
  const TIER_WIDTHS = [3, 4.6, 6.6, 9.2];     // screen px per strength tier
  const TIER_SCALES = [1, 1.3, 1.6, 2];       // battle-diamond core scales

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
      const info = this._buildJourneySegmentInfo(
        pts[0],
        pts[pts.length - 1],
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
      // 和弦过短（<8px）时 trajectory 构建器会返回 null；
      // 沙盘短轴（如城内出击）退化为直线段，保证当前步箭头始终在场。
      if (!this.projector) return null;
      const a = this.projector.toScreen(pts[0][0], pts[0][1]);
      const b = this.projector.toScreen(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (chord < 0.8) return null;
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

    // 同场战争内多役同址时做微小偏移（登记偏移后落点，避免二次重叠）。
    _warOffset(w, coord) {
      const offs = [
        [0, 0],
        [0.15, 0.11],
        [-0.15, 0.11],
        [0.13, -0.14],
        [-0.13, -0.14],
      ];
      if (!this._warUsedSpots) this._warUsedSpots = {};
      const list = this._warUsedSpots[w.key] || (this._warUsedSpots[w.key] = []);
      for (const [dx, dy] of offs) {
        const cand = [coord[0] + dx, coord[1] + dy];
        if (!list.some((s) => Math.hypot(s[0] - cand[0], s[1] - cand[1]) < 0.34)) {
          list.push(cand);
          return cand;
        }
      }
      return coord;
    }

    _cancelWarDraws() {
      (this._warDrawRafs || []).forEach((h) => cancelAnimationFrame(h));
      this._warDrawRafs = [];
    }

    // 当前步行军箭头从起点渐进画到终点：rAF 逐帧写 dashoffset。
    // 三个踩过的坑，都在这条注释里：
    // ① CSS 动画会被 is-camera-moving 守卫杀掉（飞行中箭头消失重画）→ rAF 驱动；
    // ② non-scaling-stroke 下 dasharray 按【屏幕像素】解释且 pathLength 不生效
    //    （放大地图后箭头断成数截的根因）→ 每帧按当前缩放把用户单位长度
    //    换算成屏幕像素再写 dash，缩放变化下一帧立即跟上；
    // ③ 画完立即清除 dash——否则完成后用户再缩放，固定的 dash 值又会切碎线。
    _startWarDraw(casing, p, dirG, drawMs) {
      const reduced = reducedMotion();
      if (reduced) {
        if (dirG) dirG.classList.add('is-arrived');
        return;
      }
      let Lu = 0;
      try {
        Lu = typeof p.getTotalLength === 'function' ? p.getTotalLength() : 0;
      } catch (e) {
        Lu = 0;
      }
      if (!(Lu > 2)) {
        if (dirG) dirG.classList.add('is-arrived');
        return;
      }
      const t0 = performance.now();
      const ease = (k) => 1 - Math.pow(1 - k, 3);
      const stepFn = (now) => {
        let kScreen = 1;
        try {
          const rect = this.svg.getBoundingClientRect();
          kScreen = rect.width > 0 ? rect.width / this.camera.w : 1;
        } catch (e) {
          /* keep last scale */
        }
        const Ls = Lu * kScreen;
        const k = Math.min(1, (now - t0) / drawMs);
        const off = Ls * (1 - ease(k));
        for (const q of [casing, p]) {
          q.style.strokeDasharray = `${Ls.toFixed(1)}`;
          q.style.strokeDashoffset = `${off.toFixed(1)}`;
        }
        if (k < 1) {
          const h = requestAnimationFrame(stepFn);
          this._warDrawRafs.push(h);
        } else {
          for (const q of [casing, p]) {
            q.style.strokeDasharray = 'none';
            q.style.strokeDashoffset = '0';
          }
          if (dirG) dirG.classList.add('is-arrived');
        }
      };
      const h = requestAnimationFrame(stepFn);
      this._warDrawRafs.push(h);
    }

    _renderWarSvg(w, idx, zi) {
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
      this._warUsedSpots = {};

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
      const drawMs = Math.max(
        420,
        Math.min(1900, PLAY_INTERVAL / (this._warPlaySpeed || 1) - 550)
      );
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
          // directional chevron at the DESTINATION tip, angled along the final leg
          let dir = null;
          if (info.endX !== null) {
            dir = this._svgNode(
              'g',
              {
                class: `war-dir t${tier}${isCur ? ' is-cur' : ''}`,
                'data-x': info.endX.toFixed(1),
                'data-y': info.endY.toFixed(1),
                'data-rot': info.endAngleDeg.toFixed(1),
              },
              g
            );
            dir.style.color = side.color;
            this._svgNode(
              'path',
              { d: 'M-7 -5.2L8 0L-7 5.2L-3 0Z', class: 'war-chevron' },
              dir
            );
          }
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
          if (isCur && !claimed) {
            this._startWarDraw(casing, p, dir, drawMs);
          }
          // dir 创建于线之下，重挂到顶层保证楔形头盖住线端
          if (dir) g.appendChild(dir);
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
          const spot = this._warOffset(w, b.at);
          const [sx, sy] = this.projector.toScreen(spot[0], spot[1]);
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
          this._svgNode('circle', { class: 'war-ring', r: 10, stroke: side.color }, node);
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
          // 当前步战役名交给态势浮签，SVG 只留起兵锚点标签
          if (i === 0 && idx > 0) {
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
    }

    // ---------------- render: campaign card ----------------

    _warCardEl() {
      return this._id('war-card');
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
          this._stopWarPlay();
        }
        this._warCardSig = null;
        return;
      }
      const folded = card.classList.contains('is-folded');
      const sig = [this.locale, w.key, idx, folded ? 1 : 0].join('|');
      if (sig === this._warCardSig) {
        const btn = card.querySelector('[data-act="play"]');
        if (btn) {
          btn.textContent = this._warPlayTimer ? '❚❚' : '▶';
          btn.title = this._warPlayTimer ? this._warTxt('pause') : this._warTxt('play');
        }
        return;
      }
      this._warCardSig = sig;

      const prevScroll = card.classList.contains('is-hidden') ? 0 : (card.querySelector('.war-steps') || {}).scrollTop || 0;
      const zh = this.locale !== 'en';
      const spanTxt = `${this.formatYear(w.span[0], true)} — ${this.formatYear(w.span[1], true)}`;
      const sidesHtml = (w.sides || [])
        .map((sd) => `<span class="war-side"><i style="background:${sd.color}"></i>${esc(this._warField(sd, 'name'))}</span>`)
        .join('');
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
      const listHtml = (w.steps || [])
        .map((s, i) => {
          const b0 = (s.battles || [])[0];
          const side = this._warSide(w, b0 ? b0.side : ((s.moves || [])[0] || {}).side);
          return (
            `<div class="war-step${i === idx ? ' is-cur' : ''}" data-act="step" data-idx="${i}">` +
            `<span class="wy" style="color:${side.color}">${this.formatYear(s.y, true)}</span>` +
            `<span class="wt">${esc(this._warStepTitle(w, s))}</span></div>`
          );
        })
        .join('');
      card.innerHTML =
        `<div class="war-head" data-act="fold-toggle">` +
        `<span class="war-title">${esc(this._warField(w, 'title'))}</span>` +
        `<span class="war-years">${spanTxt}</span>` +
        `<button class="war-fold" data-act="fold" aria-expanded="${folded ? 'false' : 'true'}" title="${esc(this._warTxt('fold'))}">▾</button>` +
        `</div>` +
        `<div class="war-body${folded ? ' is-folded' : ''}">` +
        `<div class="war-sides">${sidesHtml}</div>` +
        `<div class="war-narr">${narrHtml}</div>` +
        (idx >= 0 ? this._warForceBarsHtml(w, step) : '') +
        `<div class="war-steps">${listHtml}</div>` +
        `<div class="war-ctrl">` +
        `<button class="war-btn is-ico" data-act="rewind" title="${esc(this._warTxt('rewind'))}">⟲</button>` +
        `<button class="war-btn is-ico" data-act="prev" title="${esc(this._warTxt('prev'))}">◀</button>` +
        `<button class="war-btn is-play" data-act="play" title="${this._warPlayTimer ? esc(this._warTxt('pause')) : esc(this._warTxt('play'))}">${this._warPlayTimer ? '❚❚' : '▶'}</button>` +
        `<button class="war-btn is-ico" data-act="next" title="${esc(this._warTxt('next'))}">▶</button>` +
        `<span class="war-stepcount">${Math.max(0, idx + 1)} / ${w.steps.length}</span>` +
        `<span class="war-ctrl-gap"></span>` +
        `<button class="war-btn is-ico is-speed" data-act="speed" title="${esc(this._warTxt('speed'))}">${this._warPlaySpeed || 1}×</button>` +
        `</div>` +
        `<div class="war-foot">${esc(this._warTxt('foot'))}</div>` +
        `</div>`;
      card.classList.remove('is-hidden');
      if (prevScroll) {
        const listEl = card.querySelector('.war-steps');
        if (listEl) listEl.scrollTop = prevScroll;
      }
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
        prev: zh ? '上一步' : 'Prev',
        next: zh ? '下一步' : 'Next',
        play: zh ? '播放' : 'Play',
        pause: zh ? '❚❚ 暂停' : '❚❚ Pause',
        upcoming: zh ? '大战将启——拖动时间轴或点"播放"逐步推进战局。' : 'The campaign is about to begin — drag the timeline or press Play.',
        fold: zh ? '折叠/展开战报' : 'Fold/unfold the report',
        foot: zh ? '路线与控制区为示意复原 · 兵力附出处（实录 / 号称 / 约数） · ◆ 战役点按得手方着色' : 'Routes & zones are schematic · strengths sourced (recorded / claimed / approx.) · ◆ diamonds colored by the winning side',
        zone: zh ? '当前控制区' : 'Front line',
        jumpHint: zh ? '点击跳到该步' : 'Click to jump to this step',
        speed: zh ? '播放速度' : 'Playback speed',
        rewind: zh ? '回到战役起点，从头完整重放' : 'Back to step zero and replay the whole campaign',
      };
      return dict[key] || key;
    }

    // ---------------- player ----------------

    _stopWarPlay() {
      if (!this._warPlayTimer) return;
      clearInterval(this._warPlayTimer);
      this._warPlayTimer = null;
      const card = this._warCardEl();
      const btn = card && card.querySelector('[data-act="play"]');
      if (btn) {
        btn.textContent = '▶';
        btn.title = this._warTxt('play');
      }
    }

    _warSeekTo(y) {
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

    _gotoWarStep(w, i, opts = {}) {
      if (!w || i < 0 || i >= (w.steps || []).length) return;
      const s = w.steps[i];
      this._warSeekTo(s.y);
      // 播放中只做"保持战场在视野内"的轻量相机；手动跳步才全幅聚焦
      if (!reducedMotion()) this._warFocusStep(w, s, Boolean(opts.gentle));
    }

    _warFocusStep(w, s, gentle = false) {
      const pts = [];
      (s.moves || []).forEach((mv) => this._warPointList(mv).forEach((p) => pts.push(p)));
      (s.battles || []).forEach((b) => b.at && pts.push(b.at));
      if (!pts.length || !this.projector) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach((p) => {
        const [sx, sy] = this.projector.toScreen(p[0], p[1]);
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx > maxX) maxX = sx;
        if (sy > maxY) maxY = sy;
      });
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      if (gentle) {
        // 轻量相机：战场已在视野内则完全不动作，不打断行军绘制动画
        const cam = this._cameraTarget || this.camera;
        const inView =
          cx > cam.x + cam.w * 0.18 &&
          cx < cam.x + cam.w * 0.82 &&
          cy > cam.y + cam.h * 0.2 &&
          cy < cam.y + cam.h * 0.8;
        if (inView) return;
        const w2 = cam.w, h2 = cam.h;
        this._animateCameraTo({
          x: Math.max(-180, Math.min(1000 - w2 + 140, cx - w2 / 2)),
          y: Math.max(-150, Math.min(700 - h2 + 120, cy - h2 / 2)),
          w: w2,
          h: h2,
        });
        return;
      }
      const padX = 110, padY = 90;
      let bw = maxX - minX + padX * 2;
      let bh = maxY - minY + padY * 2;
      bw = Math.max(430, bw);
      bh = Math.max(330, bh);
      // keep aspect consistent with the projector canvas (1000x700)
      if (bw / bh > 1000 / 700) bh = (bw * 700) / 1000;
      else bw = (bh * 1000) / 700;
      this._animateCameraTo({
        x: Math.max(-180, Math.min(1000 - bw + 140, cx - bw / 2)),
        y: Math.max(-150, Math.min(700 - bh + 120, cy - bh / 2)),
        w: bw,
        h: bh,
      });
    }

    _toggleWarPlay() {
      const w = this._activeWar();
      if (!w) return;
      if (this._warPlayTimer) {
        this._stopWarPlay();
        return;
      }
      const speed = this._warPlaySpeed || 1;
      this._warPlayTimer = setInterval(() => {
        const w2 = this._activeWar();
        if (!w2 || w2.key !== w.key || this.playing || this.isScrubbing) {
          this._stopWarPlay();
          return;
        }
        const i = this._warStepIndex(w2) + 1;
        if (i >= w2.steps.length) {
          this._stopWarPlay();
          return;
        }
        this._gotoWarStep(w2, i, { gentle: true });
      }, PLAY_INTERVAL / speed);
      // 已在末步时按播放 → 从头播放（修复 yutu 末步空转）
      let start = this._warStepIndex(w) + 1;
      if (start >= w.steps.length) start = 0;
      this._gotoWarStep(w, start, { gentle: true });
    }

    _cycleWarSpeed() {
      const speeds = [1, 2, 4];
      this._warPlaySpeed = speeds[(speeds.indexOf(this._warPlaySpeed || 1) + 1) % speeds.length];
      // 播放中变速：以新间隔重启定时器，当前位置不变
      if (this._warPlayTimer) {
        clearInterval(this._warPlayTimer);
        this._warPlayTimer = null;
        const w = this._activeWar();
        if (w) this._toggleWarPlay();
      }
      this._warCardSig = null;
      this._renderWarCard(this._activeWar(), this._warStepIndex(this._activeWar() || { steps: [] }));
      return this._warPlaySpeed;
    }

    // ---------------- sync entry ----------------

    _bindWarCardEvents(card) {
      if (!card || card._warBound) return;
      card._warBound = true;
      card.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        const a = act.dataset.act;
        if (a === 'fold' || a === 'fold-toggle') {
          card.classList.toggle('is-folded');
          const w2 = this._activeWar();
          this._renderWarCard(w2, w2 ? this._warStepIndex(w2) : -1);
          return;
        }
        const w = this._activeWar();
        if (!w) return;
        if (a === 'speed') {
          this._cycleWarSpeed();
          return;
        }
        if (a === 'play') {
          // toggle 自管定时器：先 stop 再 toggle 会把"暂停"变成"重启"
          this._toggleWarPlay();
          return;
        }
        if (a === 'rewind') {
          // 回到战役起点并从第一步开始完整重放（含蓝轴登场）
          this._stopWarPlay();
          this._gotoWarStep(w, 0, { gentle: true });
          this._toggleWarPlay();
          return;
        }
        this._stopWarPlay();
        if (a === 'prev' || a === 'next') {
          this._gotoWarStep(w, this._warStepIndex(w) + (a === 'next' ? 1 : -1));
        } else if (a === 'play') {
          this._toggleWarPlay();
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
            const grp = this._warGroup();
            if (grp) grp.classList.toggle('is-hidden', !chk.checked);
            this._warSvgSig = null;
            this._syncWarOverlay();
            this._rescaleSvgTypography();
          });
          this._warChkBound = true;
        }
      }
      // 全局播放/拖轴时打断沙盘播放（战局严格由时间轴驱动）
      if (this._warPlayTimer && (this.playing || (this.isScrubbing && !this._warInternalSeek))) {
        this._stopWarPlay();
      }
      const w = this._activeWar();
      const idx = w ? this._warStepIndex(w) : -1;
      const zi = w ? this._warZoneIndex(w) : -1;
      const grp = this._warGroup();
      if (grp) {
        const chk = this._id('chk-war');
        if (chk && !chk.checked) grp.classList.add('is-hidden');
        else grp.classList.remove('is-hidden');
      }
      this._renderWarSvg(w, idx, zi);
      this._renderWarCard(w, idx);
      this._syncWarBalloon(w, idx);
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
      const battle = w && idx >= 0 ? ((w.steps[idx] || {}).battles || [])[0] : null;
      const milestoneOpen =
        this.milestoneBalloon && !this.milestoneBalloon.classList.contains('is-hidden');
      const usable =
        battle &&
        this._warCurSpot &&
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
        const title = this._warField(battle, 'name') || this._warStepTitle(w, w.steps[idx]);
        const desc = this._warField(battle, 'desc') || '';
        const zh = this.locale !== 'en';
        const forces = this._warStepForces(w, w.steps[idx])
          .map((f) => {
            const sd = this._warSide(w, f.side);
            return `<span class="war-bf-item"><i style="background:${sd.color}"></i>${esc(this._warField(sd, 'name'))} ${esc(this._warFormatN(f.n, f.quality))}</span>`;
          })
          .join('');
        el.innerHTML =
          `<div class="ep-head"><span class="ep-year">${esc(this.formatYear(w.steps[idx].y))} · ${esc(title)}</span></div>` +
          (desc ? `<div class="ep-text">${esc(desc)}</div>` : '') +
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
        sx: this._warCurSpot.x,
        sy: this._warCurSpot.y,
      };
      el.classList.remove('is-hidden', 'is-offscreen');
      this._positionWarBalloon();
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
      let left;
      let top = Math.max(minTop, Math.min(maxTop, py - bH * 0.42));
      let caretDir = 'left';
      if (px + pinGap <= rightLimit) {
        left = px + pinGap;
        caretDir = 'left';
      } else if (px - bW - pinGap >= minLeft) {
        left = px - bW - pinGap;
        caretDir = 'right';
      } else {
        left = Math.max(minLeft, Math.min(rightLimit, px - bW / 2));
        caretDir = py < rect.height / 2 ? 'top' : 'bottom';
      }
      el.style.left = `${left.toFixed(1)}px`;
      el.style.top = `${top.toFixed(1)}px`;
      el.style.setProperty('--caret-y', `${Math.max(14, Math.min(bH - 14, py - top)).toFixed(1)}px`);
      el.dataset.caret = caretDir;
    }

    _onWarLocaleChange() {
      this._warSvgSig = null;
      this._warCardSig = null;
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
      this._stopWarPlay();
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
      if (!this._warInternalSeek && this._warPlayTimer) this._stopWarPlay();
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
        const qy =
          typeof location !== 'undefined'
            ? new URLSearchParams(location.search).get('year')
            : null;
        const frac = qy
          ? qy
              .split(/[,，、;\s]+/)
              .map(Number)
              .find((n) => Number.isFinite(n) && n % 1 !== 0)
          : NaN;
        if (
          Number.isFinite(frac) &&
          this._warData().some((x) => frac >= x.span[0] - 1 && frac <= x.span[1] + TAIL_YEARS)
        ) {
          this._warSeekTo(frac);
        }
      } catch (e) {
        /* non-fatal */
      }
      return r;
    };

    // 战争年份：自动里程碑气泡让位给战争态势浮签（手动点钉不受影响）
    const baseAutoSync = Ctrl.prototype._syncAutoMilestoneBalloon;
    Ctrl.prototype._syncAutoMilestoneBalloon = function (...args) {
      if (this._activeWar && this._activeWar()) {
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
        const w = this._activeWar ? this._activeWar() : null;
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
        this._positionWarBalloon();
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
