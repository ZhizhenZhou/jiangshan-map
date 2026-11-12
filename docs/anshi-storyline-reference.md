# 官方故事线参考：安史之乱始末 —— 功能盘点与移植对照基准

> 本文是「官方 main 里作者手写的唯一故事线」的完整功能盘点，作为后续一切战役故事线移植工作的对照基准。
> 行号基于 `shixu` 分支（= 上游 main cfdb527 + 战争沙盘扩展）。作者源码以 `main` 分支为纯净参照。
> 生成方式：三路代码探索（数据层 / 交互层 / 地图层），关键锚点已逐一对源码核验。

---

## 1. 概览与设计哲学

作者官方做的示例是「安史之乱始末」——全项目唯一一条手写的 `isStory` 大事件线。它由三层拼装、运行时合并：

| 层 | 位置 | 内容 |
|---|---|---|
| Profile 壳 | `js/lore_core.js:936`（`PERSON_PROFILES` 起于 :811） | 元数据：名称、courtesy 副标题、isStory、span、aliases、evCount，**无 stops** |
| 手写正文 | `js/lore_detail.js:1187-1215`（`PERSON_DETAILS` 起于 :1045，:1239-1244 `Object.assign` 合入同名 profile） | 全线史论总述 + 2 阵营 + 10 站 stops |
| 消费端 | `js/atlas_trace.js:415-489`（stops→events 映射；:415 入口判定 `isRelic || isStory`） | 故事卡渲染、导航、URL、相机 |

**设计哲学（本次盘点最重要的结论）**：作者把机制全部做成了通用的 `isStory` 管线。全库**零** `if (key === 'anshi')` 式硬编码——写死的只有两处数据：① 故事线本体（lore_core 壳 + lore_detail 正文）；② `js/app.js:4317-4347` `_findStoryForMilestone` 的「朝代:年份 → story key」徽章映射表（anshi 在 :4344 一行）。

**因此移植任何新战役故事线 = 写数据，不写渲染代码。** 消费端对我们后加的 `warKey` profile 同样一视同仁（见 §6）。

另有一条共用管线的近亲：`yuxi`（玉玺，`lore_core.js:935`，`isRelic:true`），与 isStory 走同一 stops 管线（`atlas_trace.js:415`）。

---

## 2. 数据层清单

### 2.1 Profile 壳（lore_core.js:936）

```json
{"key":"anshi","zh":"安史之乱","en":"An Lushan Rebellion",
 "courtesyZh":"天宝十四载（755）— 广德元年（763） · 唐由盛转衰之枢",
 "courtesyEn":"755–763 CE · The Eight-Year Civil War That Ended High Tang",
 "isStory":true,"dynastyKey":"tang","span":[755,763],
 "aliases":["安史","安史之乱","安史叛军","渔阳鼙鼓","天宝之乱","anshizhiluan","An-Shi Rebellion","An Lushan Rebellion"],
 "evCount":10}
```

- `courtesyZh/En`：卡片副标题与年代区间（渲染 `atlas_trace.js:2260, 2291`）
- `evCount:10` 与 stops 数严格一致（我们的 hydrated 战役也保持 1:1，如官渡 evCount:7 对 7 步）
- 普通人物 profile（如 :867 王安石）字段同壳但无 `isStory`，事件来自 PLACE_LANDMARK_EVENTS 的 persons 匹配；徽章文案因此区分「史事本末/Storyline」vs「人物小传/Biography」（`atlas_trace.js:2261-2271`）

### 2.2 条目级字段（lore_detail.js:1187-1194）

| 字段 | 用途 |
|---|---|
| `tokens: []` | 检索词，故意为空——故事站本身就是时间线，无需再匹配 PLACE_LANDMARK_EVENTS |
| `descZh` / `descEn` | **史论式全线总述**（"成为唐朝由盛转衰的历史分水岭"文体），渲染 `atlas_trace.js:2272-2275` |
| `camps[]{key, zh, en, color, calmColor}` | 阵营：tang「大唐平叛」`#b53826`/静置 `#8c3b2b`；yan「安史叛军」`#2b5b84`/静置 `#3a5a78`。**戏剧化命名 + 主色/静置色双色**。渲染阵营图例 chips（`atlas_trace.js:2279-2293`），color 染色站徽/箭头/prongs/actors（:416-423, 429, 454） |
| `stops[10]` | 十站（见下） |

### 2.3 每站必填字段（10/10 站全有）

| 字段 | 说明 | 备注 |
|---|---|---|
| `year` | 整数年 | **官方站没有 `month` 字段**——trace 对缺省月用 `6 + sIdx*0.01` 保持插入顺序（`atlas_trace.js:436`） |
| `subEraZh` / `subEraEn` | 月令文案（"冬十一月" / "Nov 755"） | 每站手写，非计算值 |
| `camp` | 本站阵营 key | 站徽/行颜色来源 |
| `ancientZh` + `modernZh`（+ En） | **古今地名对照，成对手写**（范阳/北京、潼关/陕西渭南潼关） | 全部人工核对，非剥括号 hack |
| `coord` | 站址 [lng,lat] | |
| `titleZh` / `titleEn` | 站标题 | |
| `descZh` / `descEn` | **站级史论文案** | 与地图旁白平行独立编写，**不是**复用沙盘 battle/move 旁白 |
| `quoteZh` / `quoteEn` | **引文，10/10 站无一缺** | 单字符串、出处内嵌：`《资治通鉴》：\"……\"` / `Zizhi Tongjian: '...'`，无独立 source/author 字段。渲染 `.person-ev-quote`（`atlas_trace.js:2424-2425`） |

### 2.4 每站可选字段（按站出现）

| 字段 | 出现站 | 作用 |
|---|---|---|
| `actZh` / `actEn` | 0 / 4 / 7 | **三幕幕首**（一 · 渔阳鼙鼓与两京陆沉 / 二 · 河朔抗节与朔方中兴 / 三 · 两京光复与河朔终局），渲染 `story-act-row`（`atlas_trace.js:2395-2401`） |
| `fromCoord` | 1/2/3/4/5/7/8/9 | 本段行军主弧起点 |
| `fromStopIdx` | 1(0) / 2(1) / 5(3) / 7(5) | 主轴锚定到某前站（跨幕链） |
| `fromLabelZh` / `fromLabelEn` | 4 / 8 / 9 | 出发地文字标签（"平原"、"洛阳（九节度）"），渲染 origin bead+label（`atlas_trace.js:1777-1809, 1839-1846`） |
| `via` | 1 / 5 / 7 / 9 | 途经点数组，弧线造型用 |
| `prongs[]{fromCoord, camp, fromLabelZh, fromLabelEn, via?}` | 2 / 6 / 7 / 8 | **多营支线箭头**（如潼关站"长安·哥舒翰"、邺城站"范阳·史思明"），独立曲线独立营色（`atlas_trace.js:1849-1871`） |
| `campVector` | 8 | 主箭头颜色与站徽阵营解耦（邺城站 tang 主轴） |
| `actors[]{zh, en, key, camp}` | 0-5 / 7 / 8（站 6 睢阳、站 9 缺） | 人物表：卡片头部 chips + **正文人名替换成可点按钮** `story-inline-person`（`atlas_trace.js:2452-2471, 2499-2513`），点击跳人物编年并记录返回点 |

**官方站没有的**：结构化兵力 `{side, n, quality, srcZh, srcEn}`（兵力数字以叙述融进 descZh，如"十五万""六十万"）；`month`；`warStepIdx`/`warKey`（hydrate 专有回链字段）。

### 2.5 十站一览（剪辑结构参考）

755 范阳起兵 → 755 渡河陷洛 → 756 灵宝·潼关 → 756 马嵬 → 756 常山死节 → 756 灵武即位 → 757 睢阳死守 → 757 香积寺·两京光复 → 759 邺城溃·思明复叛 → 763 众叛亲离·乱平。三幕切分：0/4/7。

### 2.6 war_data.js 的 `an-shi` 沙盘数据与 lore 十站的关系

`js/war_data.js:506-665` 存有独立的 an-shi 战术沙盘数据（12 步小数年、结构化兵力、5 个控制区帧），与 lore 十站是**同一战役的两套独立剪辑**：年份口径不同（小数 755.95 vs 整数+月令）、节点增减不同（war 多"叛军入长安/邙山/再收洛阳"，lore 多"常山死节/灵武即位"）、坐标微差。**刻意不接故事卡**：lore_core 的 21 个 warKey profile 无 an-shi，安史保持「官方故事线 + 独立沙盘」双视图；勾选沙盘图层/点编年行走 shell 兜底（`atlas_war.js:1385-1389` `_warHasStory` 判断）。

---

## 3. 交互功能清单（全部通用 isStory 机制）

### 3.1 八个入口

| # | 入口 | 触发 | 实现位置 | 性质 |
|---|---|---|---|---|
| 1 | 里程碑浮签「事」印章 + 「始末 ›」 | 点浮签印章 | 渲染 `app.js:4468-4481`；点击 `:4534-4540` → `openPersonChronicle(key, stopIdx)` | UI 通用；映射表写死（anshi=`'tang:755'`，`app.js:4344`） |
| 2 | 编年行「始末」标签 `ev-story-tag` | 点行内按钮 | 渲染 `app.js:5976-5985`；点击 `:5997-6006`（移动端先收史志 sheet） | 同一映射表 |
| 3 | 搜索 `kind:'story'` | 输入名称/别名/拼音 | 索引 `atlas_search.js:183-198`（keywords 拼「史事 始末 本末 storyline」）；加权 `:1000-1003`；story 命中压制同战役 event 行 `:1187-1207` | 通用 |
| 4 | 搜索点击跳转 | 点 story 结果 | `atlas_search.js:1299-1305` → `openPersonChronicle(profile, -1)`（进总览，不带 stop） | 通用 |
| 5 | URL 深链 `?event=anshi&stop=N` | 直接访问/分享 | 解析 `atlas_api.js:1880-1888`；embed 深链+autoplay `app.js:1804-1816` | 通用 |
| 6 | 战争沙盘层接管 | 小数年份 / war-node 点击 | `atlas_war.js:126-136` `_engageWar`：有 story profile → `openPersonChronicle(war.key, stepIdx)`；`_restoreWarFromQuery :138-168`（:142 让位 event/person/journey 深链） | 通用 warKey 机制；anshi 无 warKey 不经此路 |
| 7 | window API | `ZCodeAtlas.openPerson('anshi')` | `app.js:10529` | 通用 |
| 8 | 政体条目 | 点「大燕（安史之乱）」 | `lore_core.js:1025` + 摘要 `lore_detail.js:999` | 数据级 |

### 3.2 打开流程 `openPersonChronicle`（atlas_trace.js:1011-1168）

profile 精确解析（story 禁止 partial 匹配 `:141`）→ warKey 懒建沙盘 `_ensureWarSandbox`（`app.js:748`，anshi 不触发）→ 三段异步保障（快照 :1036-1045 / lore_detail 懒加载 :1046-1063 / 英文词典 :1064-1081）→ 打开前清扫（停播放/挑战/自定义路线/浮签 :1083-1098）→ 初始 stop：合法 initialIdx 否则 **-1 总览**（:1105-1106）→ URL 同步调度 :1107 → 卡片显示 + 沉浸态（`_syncImmersivePaneState` `app.js:833-849` 自动收侧栏）→ 跳年 + 重画 pins + 渲卡 + **SEO meta 同步**（`_syncDocumentSeoMeta` `app.js:5798-5854`，story 用 `?event=` canonical :5814-5822）→ 相机取景 :1130-1166。

### 3.3 卡片渲染 `_renderPersonChronicleCard`（atlas_trace.js:2136-2555）

| 功能 | 位置 |
|---|---|
| kicker「点事溯局 · 历史大事件全脉络 / Event Storyline · Multi-Act Chronicle」 | :2190-2203 |
| 标题 + courtesy 年代 span | :2248-2251 |
| 「史事本末/Storyline」徽章 + 全线总述 + **阵营图例 chips**（⚔ 对阵） | :2261-2293 |
| 副行摘要「精选 N 处关键节点 · 历 N 年」 | :2306-2312 |
| 「返回某故事」pill（故事→人物→带回 stop 返回） | :2318-2351 |
| 「全图总览」按钮（→ `selectPersonEvent(-1, true)`） | :2339-2341, :2373-2378 |
| 三幕分隔行 `story-act-row` | :2395-2401 |
| 行：阵营色 `--camp-color` + 序号 `cr-stop-num` + year+subEra | :2403-2405, :2443-2448 |
| 行：古地名 + 版图变化 icon + 「沿革 ›」（跳年+开点地卡+记返回点） | :2413-2422, :2524-2539（点地卡返回 :3750-3781） |
| 行：正文（title+desc 拼接自 stops→events 映射 :419-477） | :469-470 |
| 行：**内嵌人物按钮**（actors 关键词替换，按阵营染色） | :2452-2471, :2499-2513 |
| 行：**兵力条挂点**（仅 warKey profile；anshi 挂点存在但恒空） | :2473-2476 → `_warStoryForcesHtml` `atlas_war.js:1032-1066` |
| 行：引文块 `person-ev-quote` | :2424-2425 |
| 行 hover ↔ 地图 pin 高亮联动 | :2515-2520 ↔ `_setHoveredPersonPin :2124-2134` |
| 行点击选站 | :2521-2523 → `selectPersonEvent(idx, true)` |
| 繁体收尾 `_applyZhHantDom`（OpenCC 字表 + 史名词组，`zh_hant.js:5-78`） | :2554（卡片）、:2166（footer） |

### 3.4 stop 导航全集

| 交互 | 位置 |
|---|---|
| 上一站（总览态 disabled） | 渲染 :2597-2602；点击 :2604-2609 |
| 下一站（**动态预告**「出发/下一站 · 地点 · 年份」，末站变「回到全图总览」→ -1） | 计算 :2563-2596（可导航集 :1397-1408）；点击 :2610-2613 |
| 选站核心（相机/跳年/URL） | `selectPersonEvent` :1219-1280（idx<0 总览分支 :1223-1236） |
| 地图 pin 点击选站（触屏 26px 最近 pin 兜底） | `app.js:10282-10299`；`atlas_trace.js:1599-1629` |
| 键盘：空格=播放/暂停故事自动播；Escape=逐层关浮层（先停播→关 sheet→关卡片）；←/→=全局时间轴（非故事站）；`/`=搜索 | `app.js:9660-9743`（空格 :9731-9739；Escape :9740-9742） |
| 自动播放：总览态先跳第 0 站；间隔 `PERSON_AUTOPLAY_STEP_MS=2600`/倍速；末站自停 | `togglePersonAutoplay` :1198-1217；tick :1186-1196；常量 `app.js:81-82` |
| 倍速 0.5×/1×/2×/4× 循环（重挂 personTimer） | `setPlaySpeed` `app.js:6953-6971`；UI :6937-6951 |
| 播放键状态同步 | `_updateAutoplayUi` `app.js:6979-7001` |
| **全图总览态**：只画全部编号钉（静置色，无弧线=不剧透），footer 变「出发 · 首站」 | `atlas_trace.js:1774-1775` 注释「Overview: render pins only」 |

### 3.5 URL 深链规则

- 参数构造：story → `event=key`；`stop=` 仅当 `activePersonEventIdx >= 0`（**总览态省略 stop**）；`_urlStateParams` `app.js:1589-1615`
- 写入**仅 replaceState**（注释明说不刷 Back 栈 `:1632`），`_writeUrlState :1617-1635`
- 400ms 防抖 `_scheduleUrlSync :1637-1648`（播放/拖动中推迟）；触发点：open :1107、select :1221、close（`_clearActivePerson :60`）
- sync 武装：有深链立即武装，否则首次 pointerdown/keydown/wheel（`_armUrlSync :1652-1664`）
- 启动恢复：`atlas_api.js:1871-1897`（event 分支 :1880-1888）

### 3.6 移动端（断点 ≤900px）

- 桌面卡片右上 336px（`style.css:1486`）；移动底部 sheet（bottom:6px 高 ≤62%，`:3464-3478`）+ 全屏展开态 `is-sheet-expanded`（`:3474, 3483-3499`，逻辑 `atlas_trace.js:17-33`）
- 与「史志」sheet 互斥：`toggleMobileChronicle` `app.js:7632-7667`（:7645 开史志先关卡片）；沉浸态自动收编年侧栏 `app.js:833-849`
- embed 保持桌面卡片（`style.css:5637`）；分叉开关 `isDesktop = innerWidth>900 || embed`（`atlas_trace.js:1578`）

### 3.7 关闭 `closeGenealogyCard`（atlas_trace.js:78-98）

清 trace + 清 person（含 personTimer 与播放 UI）→ 收 sheet 展开 → is-hidden → 清 lore/has-active-genealogy → 自定义路线复位 → 里程碑浮签重定位 → war 层包装 `atlas_war.js:1959-1977`。URL 清理由 `_clearActivePerson :60` 的 `_scheduleUrlSync` 完成。触发源：header ×（`app.js:9508-9510`）、Escape、移动端互斥、war 接管。

### 3.8 i18n 策略

故事 UI 字符串**不在 `i18n_dict.js`**——全部渲染处 `isEn ? … : …` 内联（kicker/总览/史事本末/出发/沿革/始末等，`atlas_trace.js:2192-2202, 2261-2271, 2306-2316, 2421, 2592-2597`）；dict 只有点地卡共用键（`i18n_dict.js:23-29` 一带，经 `uiStr` `app.js:1103` 消费）。繁体走运行时 DOM 转换（`zh_hant.js` + `_applyZhHantDom` `app.js:1054-`），不走双语数据。

---

## 4. 地图语言清单（官方 journey，`_renderPersonPinsOverlay` atlas_trace.js:1631-2122）

| 元素 | 实现位置 | 说明 |
|---|---|---|
| 编号钉 | :2083-2090（`jn-disc`+`jn-num`） | 当前站脉冲环 `jn-pulse`（:2083-2086）；当前/出发站用 campColor，过站用 **campCalmColor**（:1985-1993） |
| 行军主弧 | `_buildJourneySegmentInfo` :3987 + `_renderCartographicTrajectory` :4045-4133（调用 :1823-1838） | fromCoord+via 造曲线；颜色 `vectorColor\|\|campColor` |
| **轨迹三态线** | :4045-4133 | 五层 path（halo/thread/**upcoming/passed/focus**）+ **段中方向 chevron**（:4066，is-focus/is-muted 档，15-18px 去重） |
| 多营支线 prongs | :1849-1871 | 每支线独立曲线独立营色 + 支线起点**无名 bead + fromLabel 文字** |
| 城市名标签 | :2093-2117 + 重复城市去重 :1892-1923 + 同址聚簇偏移 :1678-1771 | 每站 pin 上方 |
| **总览态** | :1774-1775 | 只渲染全部编号钉（均 passed 静置色），**无弧线**——总览不剧透 |
| hover 高亮 | `_setHoveredPersonPin` :2124-2134 | 与卡片行联动 |
| 相机 | `selectPersonEvent` :1219-1280 → `_framePersonOverview` :1508-1551（对 origin+prongs+当前站 AABB 取景，桌面宽 clamp 340-1060）/ `_flyToPersonEvent` :1553-1597 → `_animateCameraTo`（`app.js:8857`）**650ms** | 纯坐标取景，**不按战区** |
| 地形层 | trace 路径**完全不碰** `#terrain-relief-layer`（仅 CSS 静态 opacity 0.48，`style.css:627-630`） | 淡出逻辑只存在于战争扩展的 shell 会话 |

---

## 5. 双向差距表

### 5.A 官方有 → 我们 21 场统一战役缺

**内容层（纯数据工作，消费端已认识全部字段，补上即生效）：**

| # | 差距 | 现状 |
|---|---|---|
| 1 | **引文 quoteZh/En**（最大内容差距） | hydrate 不产出（`atlas_war.js:232-253`），21 场故事卡全程无引文；消费端 :462-463, :2424 现成支持 |
| 2 | 三幕 actZh/En + 月令 subEraZh/En | 字段位有但除官渡（war_data.js:945-1027 配了全套 story 字段）外全为空串 |
| 3 | 古今地名 modernZh/En 对照 | 同上，目前 hydrated 站恒空；ancientZh 靠剥 battle.placeZh 的"（今…）"括号 hack（:240） |
| 4 | actors 人物表 + 正文内嵌人物按钮 | hydrate 不产出 → 无人物链 |
| 5 | 独立史论文案 | hydrated 站文案直接复用战争 steps 的 battle/move 旁白（:229-230），没有独立史论层 |
| 6 | camps 戏剧化命名/顺序 | hydrate 继承 war.sides（"叛军（安史）"式 vs 官方"大唐平叛"式） |

**体验层（小代码量，改 hydrate/`_activeWarStory`）：**

| # | 差距 | 现状 |
|---|---|---|
| 7 | **总览不剧透** | 战争故事总览直接渲染**最后一幕**全量箭头+菱形（`_activeWarStory` idx=last，`atlas_war.js:279`）——入场即终局态势 |
| 8 | calmColor 静置色 | hydrate 直接 `calmColor=side.color`（:215），无双色 |
| 9 | fromStopIdx / fromLabel 主轴锚定标注 | hydrate 不产出 |

**地图语言层（最重，需先出融合设计）：**

| # | 差距 | 说明 |
|---|---|---|
| 10 | 编号钉+脉冲环 | 战争层菱形无序号、无脉冲 |
| 11 | 全站城市名标签 | 战争层仅当前役名签且仅 war-deep（camera.w<120）显示 |
| 12 | 段中方向 chevron + upcoming/focus 线态 | 战争只在末端放楔形头 |
| 13 | prongs 多营支线+标签 | 水合只取 `moves[0]`（:219）；多 move 可表达多向但故事卡/取景只见主支 |
| 14 | 总览→站点 pin 命中区（`_findNearestPersonPin` :1599-1628） | 战争层靠菱形 DOM 命中 |

相机一项**基本持平**：两边每站都由 main `selectPersonEvent`→`_framePersonOverview`/`_flyToPersonEvent`（650ms）驱动；差异只是安史站带 prongs 使取景框更宽。

### 5.B 我们有 → 官方安史没有（战争扩展新增，非缺失）

兵力四档线宽（200k/50k/10k 阈值，`atlas_war.js:186-188`）；渐进绘制+骑乘楔形头 rAF 几何重建（:554-688, 854-921）；宣纸底衬 casing；战役菱形（得手方着色+档位缩放）可点击跳站+hover 战报（:930-979, 1826-1837）；链式交接去头（:765-783）；**兵力对比条（实录/号称斜纹/约数+史料出处 tooltip）注入故事卡**（:1039-1066 + `atlas_trace.js:2473-2476`）；符号屏幕恒定+菱形 26px 屏距避让（:467-552）；里程碑钉与菱形同事件去重（:1654-1676）；war-deep 深 zoom 降噪；控制区多边形+ghost（仅 shell）；地形贴图深 zoom 淡出（仅 shell）；战区取景飞行 1150ms+对称飞回（仅 shell）。

### 5.C 刻意抑制清单（warKey 故事模式下被关掉的东西）

| # | 被抑制内容 | 位置 | 理由 |
|---|---|---|---|
| 1 | main journey 全套（编号钉/轨迹线/chevron/标签） | `atlas_war.js:1941-1957` 清空 grpJourney 后 return | 刻意整体替换为战争沙盘语言 |
| 2 | 控制区多边形 | :1406-1409（storyWar 强制 zi=-1） | 无文字说明的粗虚线被读成莫名选框（用户实测反馈） |
| 3 | war-card 战报卡 | :1457 | 用 main 故事卡替代 |
| 4 | 态势浮签 war-balloon | :1458 | 同上 |
| 5 | 战区取景飞行 warFly + fly-back | :1451-1455（guard `!activePerson`）、:1918-1924 | 「Person chronicles are separate immersive modes」 |
| 6 | 绘制最小像素门槛 WAR_DRAW_MIN_PX=90 | :870-874（storyMode 置 0） | 故事模式用户点名某站，短箭头也要骑线生长 |
| 7 | 地形贴图深 zoom 淡出 | :1641-1647（story 模式 `_warEngagedWar()` 恒 null） | 按「沙盘接管中」语义设计；副作用是故事模式不淡出 |
| 8 | shell 专用逐步相机 `_warFocusStep` | :1224-1260 | story 模式菱形点击转 `selectPersonEvent`（:1831-1834） |
| 9 | an-shi 不建 warKey story profile | `lore_core.js:937-957` | 官方 lore 故事线独占安史；沙盘走 shell 兜底 |

---

## 6. 移植 checklist：新增一条战役故事线的最小动作

1. **`js/lore_core.js`** 加 profile：`isStory:true` + `warKey` + span（=战争 span）+ evCount（=steps 数）+ aliases（中英拼）+ courtesyZh/En（仿 :937-957 现有 21 条）。
2. **`js/war_data.js`** 对应战役 steps 逐站补 story 字段（仿官渡 :945-1027）：`storyYear`、`subEraZh/En`、`actZh/En`（幕首步）、`storySiteZh/En`、`storyModernZh/En`、`storyCoord`（纯叙事步）。
3. **`js/app.js:4317-4347`** `_findStoryForMilestone` 映射表加一行 `'<dynastyKey>:<year>': { key, stopIdx: -1 }`（suite_war_sandbox 会校验覆盖）。
4. **自动生效**（零代码）：搜索 kind:'story'、`?event=&stop=` 深链、印章/始末标签、卡片渲染、导航/自动播放/倍速/总览、移动 sheet、繁体、SEO、菱形点击跳站、兵力条（warKey 挂点）。
5. 若要补 §5.A 内容层/体验层差距（引文/actors/prongs/calmColor/总览不剧透/独立文案）：**需要扩 hydrate 适配器**（`atlas_war.js:199-262`）或在 war_data steps 增设对应 story 字段口——消费端（atlas_trace.js）无需改动即可渲染这些字段。
6. 数据质量口径（沿官方与 war_data 文件头 :1-12 约定）：quality 三档 recorded/claimed/est、史无明文不设 force、path 为示意复原、battle.side=得手方。

---

## 7. 文件位置速查表

| 功能 | 位置 |
|---|---|
| anshi profile 壳 | `js/lore_core.js:936` |
| anshi 十站正文 | `js/lore_detail.js:1187-1215`（合入机制 :1239-1244） |
| stops→events 映射（含 via/prongs/actors/quote/colors） | `js/atlas_trace.js:415-489` |
| openPersonChronicle | `js/atlas_trace.js:1011-1168` |
| selectPersonEvent / stepPersonEvent / 自动播放 | `js/atlas_trace.js:1219-1280` / :1410-1421 / :1186-1217 |
| 卡片渲染 | `js/atlas_trace.js:2136-2555`（footer :2563-2613） |
| journey 地图渲染 | `js/atlas_trace.js:1631-2122`（轨迹 :4045-4133） |
| 相机取景 | `js/atlas_trace.js:1508-1597` → `js/app.js:8857` `_animateCameraTo` |
| URL 状态 | `js/app.js:1589-1664`（写 :1617-1635）+ 启动恢复 `js/atlas_api.js:1871-1897` |
| 徽章映射 | `js/app.js:4317-4347`（印章渲染 :4468-4481、行标签 :5976-6006） |
| 键盘 | `js/app.js:9660-9743` |
| 移动端分叉 | `js/app.js:7584-7591` + `css/style.css:3353` 起 |
| 搜索索引 | `js/atlas_search.js:183-198, 1000-1003, 1187-1207, 1299-1305` |
| 战争 hydrate 适配器 | `js/atlas_war.js:199-262` |
| 战争故事渲染入口（storyWar 分支） | `js/atlas_war.js:1336-1510`（`_renderWarSvg` :693-998） |
| journey 替换点（monkey patch） | `js/atlas_war.js:1941-1957` |
| 兵力条注入 | `js/atlas_war.js:1032-1066` + `js/atlas_trace.js:2473-2476` |
| an-shi 沙盘数据（不接故事卡） | `js/war_data.js:506-665` |
| 官渡 story 字段参照 | `js/war_data.js:945-1027` |
| 懒加载保障 | `js/app.js:748` `_ensureWarSandbox`、:789 `_ensureLoreDetail` |
