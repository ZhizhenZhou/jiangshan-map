// 战争沙盘数据（西点式）：逐阶段复现经典战役的动态过程。
// 移植自舆图千年（yutu-qiannian）data/wars.js 靖难之役，按本 fork 惯例重构并升级：
//   · 兵力编码：move/battle 可带 force，quality 三档——
//       recorded = 实录/正史明确记载；claimed = 史书"号称"之数（渲染加"号称"注记）；
//       est = 学界通说估计。史无明文者一律不设 force（渲染走默认细线，不编造）。
//   · 多轴（moves 数组）：同一时刻多支行军箭头（钳形合围）。
//   · 战线推移（zones）：控制区多边形，随步骤切换渐隐换帧。
// 通用约定（承 yutu）：
//   step.y 为小数年（月 → 年 + 月/12），供沙盘细粒度推进；时间轴拖动按整数年取整。
//   行军路线（path）为据史载要点连线的【示意复原】，表达攻守大势与行军方向，
//   非实测行军路径；战役点为史载要地今址（点状注记，非几何）；zones 同为示意复原。
//   move.side = 行动方；battle.side = 该役得手/占优一方（图上据此着色读战局）。
window.WAR_DATA = [
  {
    key: 'jingnan',
    titleZh: '靖难之役',
    titleEn: 'Jingnan Campaign',
    span: [1399, 1402],
    descZh: '建文元年（1399）燕王朱棣以"清君侧、靖国难"起兵北平，四年内战贯穿河北、山东、江淮，终以金川门之变夺取帝位。',
    descEn: 'In 1399 Prince of Yan Zhu Di rose at Beiping under the banner "clearing the emperor\'s side"; four years of civil war across Hebei, Shandong and the Huai ended with the Jinchuanmen coup and a new emperor.',
    sides: [
      { key: 'yan', nameZh: '燕军（朱棣）', nameEn: 'Yan army (Zhu Di)', color: '#a63a28' },
      { key: 'chao', nameZh: '朝廷军（南军）', nameEn: 'Court army (Southern)', color: '#3f5e6e' },
    ],
    zones: [
      {
        y: 1399.58, side: 'yan',
        rings: [[[115.85, 39.62], [116.85, 39.55], [117.05, 40.10], [116.62, 40.52], [115.95, 40.42], [115.55, 39.95]]],
        noteZh: '燕军仅据北平孤城', noteEn: 'Yan holds Beiping alone',
      },
      {
        y: 1399.9, side: 'yan',
        rings: [[[115.30, 39.35], [117.55, 39.20], [118.55, 40.10], [119.05, 41.30], [117.70, 41.95], [116.15, 41.30], [115.10, 40.25], [114.90, 39.70]]],
        noteZh: '外围底定，挟大宁之众', noteEn: 'Periphery secured, Daning cavalry seized',
      },
      {
        y: 1400.35, side: 'yan',
        rings: [[[114.70, 38.65], [116.95, 38.45], [117.60, 39.15], [117.50, 40.35], [116.05, 41.05], [114.95, 40.05], [114.45, 39.25]]],
        noteZh: '白沟河后转攻，据河北中部', noteEn: 'After Baigouhe, mid-Hebei falls to Yan',
      },
      {
        y: 1401.4, side: 'yan',
        rings: [[[114.35, 38.40], [116.45, 38.28], [117.70, 38.80], [117.80, 40.20], [116.25, 41.15], [114.65, 41.00], [114.05, 39.50]]],
        noteZh: '尽据滹沱以北，河北州县望风降', noteEn: 'All north of the Hutuo yields to Yan',
      },
      {
        y: 1402.42, side: 'yan',
        rings: [
          [[114.35, 38.40], [116.45, 38.28], [117.70, 38.80], [117.80, 40.20], [116.25, 41.15], [114.65, 41.00], [114.05, 39.50]],
          [[115.55, 35.25], [117.15, 34.30], [118.30, 32.95], [119.45, 32.30], [119.30, 31.90], [118.55, 32.00], [117.90, 33.10], [116.45, 34.55], [115.15, 35.65]],
        ],
        noteZh: '绕山东直趋金陵，淮东走廊洞开', noteEn: 'Bypassing Shandong straight to the capital',
      },
    ],
    steps: [
      {
        y: 1399.58,
        battles: [{ side: 'yan', at: [116.35, 39.90], nameZh: '起兵北平', nameEn: 'Rising at Beiping', placeZh: '今北京', placeEn: 'Beijing',
          forces: [{ side: 'yan', n: 800, quality: 'recorded', srcZh: '《明史·成祖本纪》："以八百人入卫"', srcEn: 'Ming Shi, Annals of Chengzu: "entered the city with 800 guards"' }],
          descZh: '建文元年七月，朱棣诛监视官张昺、谢贵，据北平，以"清君侧"为名号称"奉天靖难"——一场叔侄之争就此成为四年内战。',
          descEn: 'In July 1399 Zhu Di killed the surveillance commissioners, seized Beiping, and proclaimed "Fengtian Jingnan" — uncle against nephew, four years of civil war.' }],
      },
      {
        y: 1399.65,
        moves: [{ side: 'yan', from: [116.35, 39.90], to: [115.55, 40.41],
          path: [[116.35, 39.90], [116.10, 40.15], [115.55, 40.41]],
          titleZh: '扫平北平外围', titleEn: 'Sweeping the approaches',
          descZh: '旬日之间连下通州、蓟州、遵化、密云、居庸关；宋忠自怀来来战，士卒多北平家属，闻亲人倒戈，燕军遂取怀来，后院底定。',
          descEn: 'Within days Tongzhou, Jizhou, Zunhua, Miyun and Juyongguan fell; Song Zhong\'s relief column, staffed by Beiping kin, defected to Yan.' }],
      },
      {
        y: 1399.66,
        moves: [{ side: 'chao', from: [118.8, 32.06], to: [114.57, 38.14],
          path: [[118.8, 32.06], [117.4, 33.9], [116.2, 35.8], [116.07, 37.44], [115.3, 37.9], [114.57, 38.14]],
          titleZh: '耿炳文北伐', titleEn: 'Geng Bingwen marches north',
          force: { n: 130000, quality: 'recorded', srcZh: '《明太宗实录》张保对："先至者十三万"', srcEn: 'Tai-zong Shilu: "130,000 in the vanguard".' },
          descZh: '朝廷以六十五岁的宿将耿炳文佩大将军印，率师自京师沿运河北进，八月抵真定——号称三十万，先至者十三万，分营滹沱河南北。',
          descEn: 'The court sent the 65-year-old veteran Geng Bingwen north along the canal to Zhending — 300,000 claimed, 130,000 in the vanguard, camped on both banks of the Hutuo.' }],
      },
      {
        y: 1399.72,
        moves: [{ side: 'yan', from: [116.35, 39.90], to: [114.57, 38.14],
          path: [[116.35, 39.90], [116.15, 39.05], [115.0, 38.60], [114.57, 38.14]],
          titleZh: '南下破雄县、莫州', titleEn: 'Strike at Xiongxian and Mozhou',
          descZh: '耿炳文大军压境，朱棣抢先出手：中秋之夜破雄县、莫州，沿滹沱河疾进真定。',
          descEn: 'With Geng Bingwen\'s host approaching, Zhu Di struck first: on Mid-Autumn night Xiongxian and Mozhou fell, then a dash down the Hutuo toward Zhending.' }],
      },
      {
        y: 1399.75,
        battles: [{ side: 'yan', at: [114.57, 38.14], nameZh: '真定之战', nameEn: 'Battle of Zhending', placeZh: '今河北正定', placeEn: 'Zhengding, Hebei',
          forces: [
            { side: 'chao', n: 130000, quality: 'recorded', srcZh: '《明太宗实录》张保对："三十万，先至者十三万"', srcEn: 'Tai-zong Shilu (Zhang Bao): "300,000 claimed; 130,000 already up".' },
            { side: 'chao', n: 300000, quality: 'claimed', srcZh: '朝廷号称之数', srcEn: 'The court\'s claimed figure.' },
          ],
          descZh: '耿炳文十三万人分营滹沱河南北；燕军趁其换防之机内外夹击，南军大溃、溺水填壕，耿炳文缩城不出。朝廷遂以李景隆代将——五十万人的赌注来了。',
          descEn: 'Geng Bingwen\'s 130,000 camped on both banks of the Hutuo; Yan exploited a relief rotation, routing the southerners. The court replaced him with Li Jinglong — and a 500,000-man gamble.' }],
      },
      {
        y: 1399.83,
        moves: [{ side: 'yan', from: [114.57, 38.14], to: [118.80, 41.55],
          path: [[114.57, 38.14], [116.35, 39.90], [117.90, 40.70], [118.80, 41.55]],
          titleZh: '出塞袭大宁', titleEn: 'Raid on Daning',
          descZh: '闻李景隆五十万大军北上，朱棣留世子守北平，亲率主力出刘家口袭大宁，挟持宁王，尽收边镇精锐与朵颜三卫骑兵。',
          descEn: 'Hearing of Li Jinglong\'s advance, Zhu Di left his heir at Beiping, raided Daning beyond the wall, and took over the frontier elite and the Duoyan horsemen.' }],
      },
      {
        y: 1399.85,
        moves: [{ side: 'chao', from: [116.07, 37.44], to: [116.35, 39.90],
          path: [[116.07, 37.44], [116.15, 38.45], [116.35, 39.90]],
          titleZh: '李景隆第一次北伐', titleEn: "Li Jinglong's first northern push",
          force: { n: 500000, quality: 'recorded', srcZh: '《明史·李景隆传》："合兵五十万"', srcEn: 'Ming Shi, Li Jinglong bio: "assembled 500,000 men".' },
          descZh: '曹国公李景隆接掌帅印，自德州合兵五十万北上，乘虚直趋北平——五十万人的赌注压向这座孤城。',
          descEn: 'Li Jinglong took over the command and drove 500,000 men from Dezhou straight at the lonely city of Beiping.' }],
      },
      {
        y: 1399.90,
        battles: [{ side: 'chao', at: [116.35, 39.90], nameZh: '李景隆围北平', nameEn: 'Li Jinglong besieges Beiping', placeZh: '今北京', placeEn: 'Beijing',
          forces: [
            { side: 'chao', n: 500000, quality: 'recorded', srcZh: '《明史·李景隆传》："合兵五十万"', srcEn: 'Ming Shi, Li Jinglong bio: "assembled 500,000 men".' },
            { side: 'yan', n: 10000, quality: 'est', srcZh: '北平守军约万（学界通说）', srcEn: 'Beiping garrison ~10,000 (scholarly estimate).' },
          ],
          descZh: '李景隆乘虚围城，瞿能几乎攻破丽正门；世子朱高炽凭城苦守，妇孺负砖运石——北平危在旦夕，这是朝廷离胜利最近的一刻。',
          descEn: 'Li Jinglong stormed the thinly held city; Qu Neng nearly broke Lizheng Gate. Zhu Gaochi held the walls as women hauled bricks — the court came closest to victory here.' }],
      },
      {
        y: 1399.95,
        moves: [{ side: 'yan', from: [118.80, 41.55], to: [116.35, 39.90],
          path: [[118.80, 41.55], [117.50, 40.80], [116.35, 39.90]],
          titleZh: '携三卫铁骑回师', titleEn: 'Return with the Duoyan riders',
          descZh: '朱棣挟大宁之众兼程南返，连夜渡白河，直插围城大军侧后。',
          descEn: 'Force-marching from Daning and crossing the Baihe by night, Zhu Di fell on the besiegers\' flank and rear.' }],
      },
      {
        y: 1400.00,
        moves: [
          { side: 'yan', from: [116.35, 39.90], to: [116.49, 39.94],
            titleZh: '城中出击', titleEn: 'Sortie from the walls',
            descZh: '城内守军开丽正门出击，与回师主力内外夹击。',
            descEn: 'The garrison sortied as the main host returned — hammer and anvil.' },
        ],
        battles: [{ side: 'yan', at: [116.49, 39.94], nameZh: '北平城下大捷（郑村坝）', nameEn: 'Victory at the walls (Zhengcunba)', placeZh: '今北京东坝', placeEn: 'Dongba, Beijing',
          forces: [{ side: 'chao', n: 100000, quality: 'recorded', srcZh: '《明太宗实录》："丧师十余万"', srcEn: 'Tai-zong Shilu: "the host lost over 100,000".' }],
          descZh: '内外夹击，连破李景隆七营；南军十余万人连夜拔营南遁，"委弃粮械山积"。北平之围遂解，攻守之势自此渐移。',
          descEn: 'Seven camps broken in succession; the southerners fled by night, abandoning grain and arms in hills. The siege lifted, and momentum began to turn.' }],
      },
      {
        y: 1400.25,
        moves: [{ side: 'chao', from: [116.07, 37.44], to: [116.15, 39.05],
          titleZh: '李景隆再合大军北上', titleEn: 'Li Jinglong advances again',
          force: { n: 500000, quality: 'recorded', srcZh: '《明史·李景隆传》（一作六十万）', srcEn: 'Ming Shi, Li Jinglong bio (some sources: 600,000).' },
          descZh: '李景隆败而不诛，回德州再合六十万大军，耀武白沟河——朝廷的战争潜力仍占绝对优势。',
          descEn: 'Undeterred by defeat, Li Jinglong massed another vast host at Dezhou and paraded it on the Baigou — the court still held overwhelming numbers.' }],
      },
      {
        y: 1400.30,
        moves: [{ side: 'yan', from: [116.35, 39.90], to: [116.15, 39.05],
          titleZh: '迎战白沟河', titleEn: 'March to the Baigou River',
          force: { n: 100000, quality: 'est', srcZh: '燕军约十万（学界通说）', srcEn: 'Yan army ~100,000 (scholarly estimate).' },
          descZh: '李景隆合兵六十万再至，先锋耀武白沟河；燕军渡河逆击。',
          descEn: 'Li Jinglong returned with another vast host; its vanguard paraded on the Baigou. Yan crossed to meet it.' }],
      },
      {
        y: 1400.33,
        battles: [{ side: 'yan', at: [116.15, 39.05], nameZh: '白沟河之战', nameEn: 'Battle of Baigou River', placeZh: '今河北高碑店白沟河', placeEn: 'Baigou River, Gaobeidian, Hebei',
          forces: [
            { side: 'chao', n: 500000, quality: 'recorded', srcZh: '《明史·李景隆传》（一作六十万）', srcEn: 'Ming Shi, Li Jinglong bio (some sources: 600,000).' },
            { side: 'yan', n: 100000, quality: 'est', srcZh: '燕军约十万（学界通说）', srcEn: 'Yan army ~100,000 (scholarly estimate).' },
          ],
          descZh: '翟能父子直扑燕军帅旗，燕军几不能支；旋东北风大起，朱棣借风纵火反杀，翟能父子皆殁，李景隆溃走德州——"两军死者十余万"。',
          descEn: 'Qu Neng and his sons charged the Yan banner and nearly broke it — until a gale from the northeast let Zhu Di fire the field. The Qus died; Li Jinglong fled to Dezhou. "Over 100,000 lay dead on both sides".' }],
      },
      {
        y: 1400.55,
        moves: [{ side: 'yan', from: [116.15, 39.05], to: [117.02, 36.68],
          path: [[116.15, 39.05], [115.40, 38.30], [116.00, 37.50], [117.02, 36.68]],
          titleZh: '长驱攻济南', titleEn: 'Drive on Jinan',
          force: { n: 100000, quality: 'est', srcZh: '围城燕师十余万（通说）', srcEn: 'Siege force ~100,000 (common account).' },
          descZh: '燕军乘胜南下，一路收降，直抵济南城下——济南一破，燕军便握山东，金陵门户洞开。',
          descEn: 'Riding the victory south through towns that surrendered, Yan reached Jinan — its fall would open the road to the capital.' }],
      },
      {
        y: 1400.75,
        battles: [{ side: 'chao', at: [117.02, 36.68], nameZh: '济南受挫', nameEn: 'Repulse at Jinan', placeZh: '今山东济南', placeEn: 'Jinan, Shandong',
          forces: [{ side: 'yan', n: 100000, quality: 'est', srcZh: '围城燕师十余万（通说）', srcEn: 'Siege force ~100,000 (common account).' }],
          descZh: '围三月不能下。铁铉、盛庸诈降诱朱棣入城，悬太祖画像神牌于城头，翻板几中燕王——"靖难"大义反成燕军枷锁。燕军解围北还，南军首胜，铁铉擢兵部尚书。',
          descEn: 'Three months of siege failed. Tie Xuan and Sheng Yong feigned surrender, hung Hongwu\'s tablets on the walls, and nearly crushed Zhu Di under a dropping gate-trap. Yan lifted the siege; the court had its first great win.' }],
      },
      {
        y: 1400.88,
        moves: [{ side: 'chao', from: [117.02, 36.68], to: [115.99, 36.45],
          titleZh: '盛庸进屯东昌', titleEn: 'Sheng Yong moves to Dongchang',
          descZh: '盛庸、铁铉自济南进屯东昌，背城列阵，以火器、毒弩候燕军——南军第一次主动设场待敌。',
          descEn: 'Sheng Yong and Tie Xuan advanced from Jinan to Dongchang, posting guns and poisoned crossbows with a city at their backs — the court\'s first deliberate set-piece.' }],
      },
      {
        y: 1400.90,
        moves: [{ side: 'yan', from: [116.35, 39.90], to: [115.99, 36.45],
          titleZh: '再出，趋东昌', titleEn: 'Out again, toward Dongchang',
          descZh: '建文二年十月，燕军再度南下，探得东昌空虚，轻兵疾进。',
          descEn: 'In late 1400 Yan marched again, racing light columns toward the weakly held Dongchang.' }],
      },
      {
        y: 1400.95,
        battles: [{ side: 'chao', at: [115.99, 36.45], nameZh: '东昌之败', nameEn: 'Defeat at Dongchang', placeZh: '今山东聊城', placeEn: 'Liaocheng, Shandong',
          forces: [],
          descZh: '盛庸背城列阵，以火器、毒弩尽挫燕军精骑；张玉战死，朱棣仅以身免——起兵以来最大败绩。燕军自此不敢轻敌，朝廷亦未乘胜追击。',
          descEn: 'Sheng Yong\'s fire-arms and poisoned crossbows shattered the Yan horse; Zhang Yu fell and Zhu Di barely escaped — Yan\'s worst reverse. (No reliable strength figures survive for this battle.)' }],
      },
      {
        y: 1401.20,
        moves: [{ side: 'yan', from: [116.35, 39.90], to: [116.10, 37.75],
          titleZh: '复出夹河', titleEn: 'Out to the Jia River',
          descZh: '建文三年二月，燕军三出，与盛庸大军相遇于夹河（武邑境内）。',
          descEn: 'In early 1401 Yan marched a third time and met Sheng Yong\'s host on the Jia River near Wuyi.' }],
      },
      {
        y: 1401.25,
        battles: [{ side: 'yan', at: [116.10, 37.75], nameZh: '夹河之战', nameEn: 'Battle of the Jia River', placeZh: '今河北武邑', placeEn: 'Wuyi, Hebei',
          forces: [],
          descZh: '谭渊战死，燕军阵脚几动；次日再战，又是东北风骤起，燕军乘风大胜——白沟河、夹河，"风助燕，三矣"，将士皆以为天命。',
          descEn: 'Tan Yuan died and Yan\'s line wavered; next day another northeast gale rose and Yan swept the field. Baigouhe, Jiahe — "the wind has sided with Yan thrice".' }],
      },
      {
        y: 1401.30,
        moves: [{ side: 'chao', from: [114.57, 38.14], to: [114.85, 38.03],
          titleZh: '吴杰出真定牵制', titleEn: 'Wu Jie sorties from Zhending',
          descZh: '真定守将吴杰引军出城，欲与盛庸夹河夹击燕军——朝廷的两面钳形，反成了燕军各个击破的靶子。',
          descEn: 'Wu Jie marched out of Zhending to pincer Yan with Sheng Yong — a two-front plan that played into Zhu Di\'s hands.' }],
      },
      {
        y: 1401.33,
        moves: [{ side: 'yan', from: [116.10, 37.75], to: [114.85, 38.03],
          titleZh: '西向真定', titleEn: 'West toward Zhending',
          descZh: '夹河既胜，旋师西向，邀击自真定来牵制的吴杰。',
          descEn: 'Yan wheeled west to intercept Wu Jie\'s restraining column from Zhending.' }],
      },
      {
        y: 1401.36,
        battles: [{ side: 'yan', at: [114.85, 38.03], nameZh: '藁城之战', nameEn: 'Battle of Gaocheng', placeZh: '今河北藁城', placeEn: 'Gaocheng, Hebei',
          forces: [],
          descZh: '又值大风拔木，南军再溃。此后河北州县望风而降，燕军尽据滹沱以北；朝廷诏令方出，败报踵至，"南北互相欺"。',
          descEn: 'Another uprooting gale broke the southerners. Hebei towns surrendered at the news; Yan held everything north of the Hutuo while the court\'s edicts chased defeat reports.' }],
      },
      {
        y: 1402.08,
        moves: [{ side: 'yan', from: [114.85, 38.03], to: [117.19, 34.26],
          path: [[114.85, 38.03], [115.30, 36.55], [116.20, 35.40], [117.19, 34.26]],
          titleZh: '"毋下城邑，直趋金陵"', titleEn: '"Skip the cities — straight to the capital"',
          descZh: '建文三年冬，朝廷议和缓师，朱棣不听。姚广孝定策："毋下城邑，疾趋京师；京师单弱，势必举。"燕军自馆陶渡河，绕过德州、济南坚城，千里直插徐、沛。',
          descEn: 'Peace talks stalled the front that winter, but Yao Guangxiao\'s plan prevailed: bypass the strong cities, strike for the weakly held capital. Yan forded at Guantao and drove a thousand li on Xuzhou and Pei.' }],
      },
      {
        y: 1402.30,
        battles: [{ side: 'yan', at: [117.56, 33.54], nameZh: '灵璧决胜', nameEn: 'Decision at Lingbi', placeZh: '今安徽灵璧', placeEn: 'Lingbi, Anhui',
          forces: [],
          descZh: '燕军截粮设伏，大破何福、平安，南军宿将尽没、六十余将被擒——朝廷再无能战之兵，江淮门户洞开。',
          descEn: 'Ambushing a grain convoy into a trap, Yan crushed He Fu and Ping An and captured sixty-odd generals. The court had no field army left south of the Huai.' }],
      },
      {
        y: 1402.42,
        moves: [{ side: 'yan', from: [117.56, 33.54], to: [119.40, 32.38],
          path: [[117.56, 33.54], [118.54, 32.99], [119.40, 32.38]],
          titleZh: '渡淮、下扬州', titleEn: 'Across the Huai, down to Yangzhou',
          descZh: '克泗州、盱眙，旌旗渡淮；守淮安的梅殷鞭长莫及，燕军别道下扬州，江防水师统帅陈瑄举舟师降——长江天险自开。',
          descEn: 'Sizhou and Xuyi fell and the Yan banners crossed the Huai beyond Mei Yin\'s reach; Yangzhou surrendered and admiral Chen Xuan defected with the river fleet — the Yangtze barrier opened itself.' }],
      },
      {
        y: 1402.50,
        moves: [{ side: 'yan', from: [119.40, 32.38], to: [118.80, 32.06],
          titleZh: '自瓜洲渡江', titleEn: 'Crossing at Guazhou',
          descZh: '六月初三，燕军自瓜洲扬帆渡江，盛庸水军一战而溃；龙潭哨骑报至京师，朝野震恐。',
          descEn: 'On the third of the sixth month Yan sailed across at Guazhou, scattering Sheng Yong\'s flotilla; panic reached the capital by courier that evening.' }],
      },
      {
        y: 1402.55,
        battles: [{ side: 'yan', at: [118.80, 32.06], nameZh: '金川门之变', nameEn: 'The Jinchuanmen coup', placeZh: '今南京（金川门）', placeEn: 'Jinchuan Gate, Nanjing',
          forces: [],
          descZh: '六月十三，李景隆、谷王橞开金川门献城；宫中火起，建文帝不知所终。朱棣入继大统，是为明成祖——四年"靖难"至此终局，帝位自侄手中夺得。',
          descEn: 'On the thirteenth Li Jinglong and Prince Gu opened Jinchuan Gate; fire rose over the palace and the Jianwen emperor vanished. Zhu Di entered as the Yongle emperor — the four-year "Jingnan" was over.' }],
      },
    ],
  },
];
