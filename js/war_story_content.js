'use strict';
// 战役故事线内容层：引文 / 幕结构 / 人物表。
// 对齐官方「lore_core 壳 + lore_detail 正文」的分层架构：war_data.js 承载
// 战术旁白（地图语言），本文件承载故事卡的史料层，由
// atlas_war.js `_hydrateWarStoryProfiles()` 合并进 story profile。
// 字段语义与官方站一致（见 docs/anshi-storyline-reference.md §2）：
//   steps[N].quoteZh/En —— 原始史料引文（出处内嵌，官方《资治通鉴》同式）
//   steps[N].actZh/En   —— 幕首标题（三幕/四幕结构）
//   steps[N].actors     —— { zh, en, key, camp }；key 必须是 PERSON_PROFILES
//                          已有人物，camp 必须是该战役 war.sides 的 key
// 质量红线：quote 只录有出处的原始史料，无把握的步骤宁缺毋滥——
// 故事卡对空引文自动隐藏。
window.WAR_STORY_CONTENT = {

  guandu: {
    steps: {
      0: {
        quoteZh: '《三国志·袁绍传》：“简精兵十万，骑万匹……使颜良、文丑为将帅，进军黎阳。”',
        quoteEn: "Sanguozhi (Yuan Shao biography): \'He picked out 100,000 picked troops and 10,000 horse, made Yan Liang and Wen Chou his generals, and marched on Liyang.\'",
        actors: [{ zh: '袁绍', en: 'Yuan Shao', key: 'yuanshao', camp: 'yuan' }],
      },
      1: {
        quoteZh: '《三国志·关羽传》：“羽望见良麾盖，策马刺良于万众之中，斩其首还，绍诸将莫能当者。”',
        quoteEn: "Sanguozhi (Guan Yu biography): \'Guan Yu caught sight of Yan Liang\'s banner, spurred in and stabbed him down amid ten thousand men, and carried his head back — none of Yuan\'s generals could stand against him.\'",
        actors: [{ zh: '关羽', en: 'Guan Yu', key: 'guanyu', camp: 'cao' }, { zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }],
      },
      2: {
        quoteZh: '《三国志·武帝纪》：“时骑不满六百，遂纵兵击，大破之，斩丑。”',
        quoteEn: "Sanguozhi (Wudi chronicle): \'Our horsemen were not yet six hundred, but we loosed them upon the foe, broke him utterly, and beheaded Wen Chou.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }],
      },
      3: {
        quoteZh: '《三国志·荀彧传》：“公以十分居一之众，画地而守之，扼其喉而不得进，已半年矣。”',
        quoteEn: "Sanguozhi (Xun Yu biography): \'With one man in ten you hold your ground and grip his throat so he cannot advance — half a year already.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }, { zh: '袁绍', en: 'Yuan Shao', key: 'yuanshao', camp: 'yuan' }],
      },
      4: {
        quoteZh: '《三国志·武帝纪》：“公乃留曹洪守，自将步骑五千人，皆用袁军旗帜，衔枚缚马口，夜从间道出，人抱束薪。”',
        quoteEn: "Sanguozhi (Wudi chronicle): \'Cao Hong held the lines; Cao Cao himself led 5,000 foot and horse under Yuan banners, gag-pieces in mouths, horses muzzled, out by night paths, each man carrying faggots.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }],
      },
      5: {
        quoteZh: '《三国志·袁绍传》：“绍众大溃，绍与谭单骑渡河。”',
        quoteEn: "Sanguozhi (Yuan Shao biography): \'Yuan\'s host broke in rout; Shao and his son Tan crossed the Yellow River with single horsemen each.\'",
        actors: [{ zh: '袁绍', en: 'Yuan Shao', key: 'yuanshao', camp: 'yuan' }],
      },
      6: {
        quoteZh: '《三国志·袁绍传》：“绍自军破后，发病欧血，死。”',
        quoteEn: "Sanguozhi (Yuan Shao biography): \'After the ruin of his army, Yuan Shao vomited blood and died.\'",
        actors: [{ zh: '袁绍', en: 'Yuan Shao', key: 'yuanshao', camp: 'yuan' }],
      },
    },
  },

  changping: {
    steps: {
      0: { actZh: '一 · 上党易手', actEn: 'Act I · Shangdong Changes Hands' },
      3: {
        actZh: '二 · 反间换将', actEn: 'Act II · Slander and Substitution',
        quoteZh: '《史记·白起王翦列传》：“秦之所恶，独畏马服君之子赵括为将耳，廉颇易与，且降矣。”',
        quoteEn: "Shiji (Bai Qi and Wang Jian): \'What Qin fears is only that Zhao Kuo, son of Lord Mafu, be made general; Lian Po is easy to deal with and will soon surrender.\'",
      },
      6: {
        quoteZh: '《史记·白起王翦列传》：“秦王闻赵食道绝，自之河内，赐民爵各一级，发年十五以上悉诣长平，遮绝赵救及粮食。”',
        quoteEn: "Shiji (Bai Qi and Wang Jian): \'Hearing the Zhao grain-road cut, the King of Qin went himself to Henei, raised every man\'s rank one grade, and sent all aged fifteen and up to Changping to seal off relief and food.\'",
      },
      7: {
        quoteZh: '《史记·白起王翦列传》：“至九月，赵卒不得食四十六日，皆内阴相杀食。”',
        quoteEn: "Shiji (Bai Qi and Wang Jian): \'By the ninth month the Zhao soldiers had gone forty-six days without food and were secretly killing and eating one another.\'",
      },
      8: {
        actZh: '三 · 四十万人的结局', actEn: 'Act III · The Fate of Four Hundred Thousand',
        quoteZh: '《史记·白起王翦列传》：“赵括出锐卒自搏战，秦军射杀赵括。”',
        quoteEn: "Shiji (Bai Qi and Wang Jian): \'Zhao Kuo led out his picked men and fought hand to hand; the Qin arrows killed him.\'",
      },
      9: {
        quoteZh: '《史记·白起王翦列传》：“乃挟诈而尽阬杀之，遗其小者二百四十人归赵。前后斩首虏四十五万人。”',
        quoteEn: "Shiji (Bai Qi and Wang Jian): \'By deceit he buried them all alive, letting only 240 of the youngest return to Zhao. The slain and captured of the whole campaign numbered 450,000.\'",
        actors: [{ zh: '白起', en: 'Bai Qi', key: 'baiqi', camp: 'qin' }],
      },
    },
  },

  chibi: {
    steps: {
      0: {
        actZh: '一 · 荆州崩局', actEn: 'Act I · Jingzhou Collapses',
        quoteZh: '《三国志·武帝纪》：“秋七月，公南征刘表。八月，表卒，其子琮代，屯襄阳。”',
        quoteEn: "Sanguozhi (Wudi chronicle): \'In autumn, the seventh month, Cao Cao marched south on Liu Biao. In the eighth month Biao died; his son Cong succeeded, camped at Xiangyang.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }],
      },
      1: {
        quoteZh: '《三国志·先主传》：“曹公……释辎重，轻军到襄阳……一日一夜行三百余里，及于当阳之长坂。”',
        quoteEn: "Sanguozhi (Xianzhu biography): \'Cao Cao dropped his baggage and pressed light troops to Xiangyang... covering 300 li in a day and night, he caught Liu Bei at Changban in Dangyang.\'",
        actors: [{ zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'sunliu' }, { zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }],
      },
      2: {
        actZh: '二 · 柴桑定盟', actEn: 'Act II · The Alliance at Chaisang',
        quoteZh: '《三国志·诸葛亮传》：“曹操之众，远来疲弊……且北方之人，不习水战。”',
        quoteEn: "Sanguozhi (Zhuge Liang biography): \'Cao Cao\'s host is exhausted from its long march... and the men of the north are not used to fighting on water.\'",
        actors: [{ zh: '诸葛亮', en: 'Zhuge Liang', key: 'zhugeliang', camp: 'sunliu' }, { zh: '孙权', en: 'Sun Quan', key: 'sunquan', camp: 'sunliu' }],
      },
      3: {
        quoteZh: '《三国志·周瑜传》：“瑜请得精兵三万人，进住夏口，保为将军破之。”',
        quoteEn: "Sanguozhi (Zhou Yu biography): \'Give me 30,000 picked men and I will take up position at Xiakou and break them for you, my lord.\'",
        actors: [{ zh: '周瑜', en: 'Zhou Yu', key: 'zhouyu', camp: 'sunliu' }, { zh: '孙权', en: 'Sun Quan', key: 'sunquan', camp: 'sunliu' }],
      },
      5: {
        quoteZh: '《三国志·周瑜传》：“时曹公军众已有疾病，初一交战，公军败退，引次江北。”',
        quoteEn: "Sanguozhi (Zhou Yu biography): \'Sickness had already spread through Cao Cao\'s army; in the first clash his men fell back and camped north of the river.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }, { zh: '周瑜', en: 'Zhou Yu', key: 'zhouyu', camp: 'sunliu' }],
      },
      6: {
        actZh: '三 · 火烧乌林', actEn: 'Act III · The Fires of Wulin',
        quoteZh: '《三国志·周瑜传》：“盖放诸船，同时发火。时风盛猛，悉延烧岸上营落。”',
        quoteEn: "Sanguozhi (Zhou Yu biography): \'Huang Gai loosed the boats and set the fires all at once; the wind blew fierce and every camp ashore caught.\'",
        actors: [{ zh: '周瑜', en: 'Zhou Yu', key: 'zhouyu', camp: 'sunliu' }],
      },
      7: {
        quoteZh: '《三国志·周瑜传》：“顷之，烟炎张天，人马烧溺死者甚众，军遂败退，还保南郡。”',
        quoteEn: "Sanguozhi (Zhou Yu biography): \'Soon smoke and flame filled the sky; men and horses burned or drowned in thousands, and the army fell back to hold Nanjun.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }, { zh: '周瑜', en: 'Zhou Yu', key: 'zhouyu', camp: 'sunliu' }],
      },
      8: {
        quoteZh: '《江表传》：“赤壁之役，值有疾病，孤烧船自退，横使周瑜虚获此名。”',
        quoteEn: "Jiangbiao zhuan (Cao Cao\'s letter to Sun Quan): \'At Chibi plague was among us; I burned my own boats and drew off — and let Zhou Yu steal an empty name.\'",
        actors: [{ zh: '曹操', en: 'Cao Cao', key: 'caocao', camp: 'cao' }, { zh: '周瑜', en: 'Zhou Yu', key: 'zhouyu', camp: 'sunliu' }],
      },
    },
  },

  jiawu: {
    steps: {
      0: { actZh: '一 · 丰岛启衅', actEn: 'Act I · The Pungdo Spark' },
      2: {
        actZh: '二 · 平壤与黄海', actEn: 'Act II · Pyongyang and the Yellow Sea',
        quoteZh: '光绪《宣战诏书》：“著李鸿章严饬派出各军，迅速进剿，厚集雄师，陆续进发。”',
        quoteEn: "Guangxu\'s declaration of war: \'Let Li Hongzhang sternly order the armies already dispatched to strike swiftly, massing mighty hosts and pressing forward.\'",
        actors: [{ zh: '李鸿章', en: 'Li Hongzhang', key: 'lihongzhang', camp: 'qing' }],
      },
      4: {
        quoteZh: '光绪帝挽邓世昌联：“此日漫挥天下泪，有公足壮海军威。”',
        quoteEn: "Guangxu\'s elegiac couplet for Deng Shichang: \'This day the whole realm shed tears; your valor gave the navy its soul.\'",
      },
      7: {
        actZh: '三 · 威海覆没', actEn: 'Act III · The Fall of Weihaiwei',
        quoteZh: '《清史稿·丁汝昌传》：“汝昌不降，仰药死。”',
        quoteEn: "Qingshi gao (Ding Ruchang biography): \'Ruchang refused to surrender and took poison.\'",
      },
      8: {
        quoteZh: '《马关条约》：“中国认明朝鲜国确为完全无缺之独立自主。”',
        quoteEn: "Treaty of Shimonoseki: \'China recognizes definitively the full and complete independence and autonomy of Korea.\'",
        actors: [{ zh: '李鸿章', en: 'Li Hongzhang', key: 'lihongzhang', camp: 'qing' }],
      },
    },
  },

  gaixia: {
    steps: {
      0: {
        actZh: '一 · 五路会垓', actEn: 'Act I · Five Armies at Gaixia',
        quoteZh: '《史记·高祖本纪》：“五年，高祖与诸侯兵共击楚军，与项羽决胜垓下。”',
        quoteEn: "Shiji (Gaozu chronicle): \'In the fifth year, Gaozu with the armies of the feudal lords struck the Chu host together with Xiang Yu — the decision at Gaixia.\'",
        actors: [{ zh: '刘邦', en: 'Liu Bang', key: 'liubang', camp: 'han' }, { zh: '韩信', en: 'Han Xin', key: 'hanxin', camp: 'han' }, { zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'xiang' }],
      },
      2: {
        actZh: '二 · 四面楚歌', actEn: 'Act II · Songs of Chu on Four Sides',
        quoteZh: "《史记·项羽本纪》：“夜闻汉军四面皆楚歌，项王乃大惊曰：'汉皆已得楚乎？是何楚人之多也！'”",
        quoteEn: "Shiji (Xiang Yu chronicle): \'In the night the Han camps on every side sang Chu songs. The King of Xiang was startled: \'Has Han taken all of Chu? Why are there so many men of Chu about him!\'\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'xiang' }],
      },
      3: {
        quoteZh: '《史记·项羽本纪》：“麾下壮士骑从者八百余人，直夜溃围南出，驰走。”',
        quoteEn: "Shiji (Xiang Yu chronicle): \'Some eight hundred stalwart riders followed him; straight through the night he broke the ring and galloped south.\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'xiang' }],
      },
      4: {
        actZh: '三 · 乌江', actEn: 'Act III · The Wu River',
        quoteZh: "《史记·项羽本纪》：“项王笑曰：'天之亡我，我何渡为！'……乃自刎而死。”",
        quoteEn: "Shiji (Xiang Yu chronicle): \'The King of Xiang laughed: \'Heaven destroys me — why should I cross?\' ... Then he cut his own throat.\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'xiang' }, { zh: '刘邦', en: 'Liu Bang', key: 'liubang', camp: 'han' }],
      },
    },
  },

  mobei: {
    steps: {
      0: { actZh: '一 · 出定襄', actEn: 'Act I · Out of Dingxiang' },
      1: {
        quoteZh: '《史记·卫将军骠骑列传》：“单于自度战不能与汉兵，遂独身与壮骑数百溃汉围西北遁走。”',
        quoteEn: "Shiji (Wei Qing and Huo Qubing): \'The Chanyu, judging he could not match the Han host, broke the encirclement with a few hundred picked riders and fled northwest, alone.\'",
        actors: [{ zh: '卫青', en: 'Wei Qing', key: 'weiqing', camp: 'han' }],
      },
      3: {
        actZh: '二 · 封狼居胥', actEn: 'Act II · The Altar at Langjuxu',
        quoteZh: '《史记·卫将军骠骑列传》：“封狼居胥山，禅于姑衍，登临翰海。”',
        quoteEn: "Shiji (Wei Qing and Huo Qubing): \'He offered the sacrifice at Mount Langjuxu, performed the feng at Guyan, and reached the Hanhai.\'",
        actors: [{ zh: '霍去病', en: 'Huo Qubing', key: 'huoqubing', camp: 'han' }],
      },
    },
  },

  feishui: {
    steps: {
      0: {
        actZh: '一 · 投鞭断流', actEn: 'Act I · Whips Across the Stream',
        quoteZh: '《晋书·苻坚载记》：“以吾之众旅，投鞭于江，足断其流。”',
        quoteEn: "Jinshu (Fu Jian annals): \'With a host like mine, throw each man\'s whip into the river and it will dam the current.\'",
        actors: [{ zh: '苻坚', en: 'Fu Jian', key: 'fujian', camp: 'qianqin' }],
      },
      3: {
        actZh: '二 · 八公山下', actEn: 'Act II · Grass and Trees on Bagong Mountain',
        quoteZh: '《晋书·苻坚载记》：“坚与苻融登城而望王师，见部阵齐整，将士精锐，又北望八公山上草木皆类人形。”',
        quoteEn: "Jinshu (Fu Jian annals): \'Fu Jian and Fu Rong climbed the wall to view the Jin host — ranks orderly, soldiers keen; and looking north, every tree and blade of grass on Bagong Mountain seemed a man.\'",
        actors: [{ zh: '苻坚', en: 'Fu Jian', key: 'fujian', camp: 'qianqin' }],
      },
      4: {
        quoteZh: '《资治通鉴》：“若移陈小却，使晋兵得渡，以决胜负。”',
        quoteEn: "Zizhi Tongjian: \'Withdraw your lines a little and let the Jin troops cross the water, so the issue may be decided in open battle.\'",
        actors: [{ zh: '谢玄', en: 'Xie Xuan', key: 'xiexuan', camp: 'jin' }, { zh: '苻坚', en: 'Fu Jian', key: 'fujian', camp: 'qianqin' }],
      },
      5: {
        actZh: '三 · 风声鹤唳', actEn: 'Act III · Wind, Cranes and Cries',
        quoteZh: '《晋书·谢玄传》：“余众弃甲宵遁，闻风声鹤唳，皆以为王师已至。”',
        quoteEn: "Jinshu (Xie Xuan biography): \'The rest cast off their armor and fled by night; at the wind\'s whistle and the cranes\' cries they thought the royal host was upon them.\'",
        actors: [{ zh: '苻坚', en: 'Fu Jian', key: 'fujian', camp: 'qianqin' }],
      },
      6: {
        quoteZh: '《晋书·谢安传》：“围棋赌墅……既罢，还内，过户限，不觉屐齿之折。”',
        quoteEn: "Jinshu (Xie An biography): \'He played the game of go for a villa as the report came... then, going in, crossed his doorstep without noticing he had snapped a clog tooth.\'",
        actors: [{ zh: '谢安', en: 'Xie An', key: 'xiean', camp: 'jin' }],
      },
    },
  },

  'sui-chen': {
    steps: {
      0: { actZh: '一 · 八道并举', actEn: 'Act I · Eight Routes Down the Yangtze' },
      2: {
        quoteZh: '《隋书·贺若弼传》：“请缘江防人每交代之际，必集历阳，大列旗帜，营幕被野。陈人以为大军至，悉发国中士马……后以为常，不复设备。”',
        quoteEn: "Suishu (He Ruobi biography): \'Whenever the river garrisons rotated, He massed banners and tents across the fields at Liyang. Chen mustered the whole realm\'s troops — then learned it was a mere rotation. Soon it grew routine and they kept no watch.\'",
      },
      3: { actZh: '二 · 京口与朱雀', actEn: 'Act II · Jingkou and the Vermilion Bird Gate' },
      5: {
        actZh: '三 · 井中之君', actEn: 'Act III · The Emperor in the Well',
        quoteZh: '《南史·陈本纪》：“后主窘迫，与张贵妃、孔贵嫔同投于井。”',
        quoteEn: "Nanshi (Chen annals): \'Hard pressed, the Last Ruler threw himself into a dry well together with Consort Zhang and Consort Kong.\'",
      },
    },
  },

  jingkang: {
    steps: {
      0: { actZh: '一 · 两路南侵', actEn: 'Act I · Two Routes South' },
      1: {
        quoteZh: '《宋史·李纲传》：“祖宗疆土，当以死守，不可以尺寸与人。”',
        quoteEn: "Songshi (Li Gang biography): \'Land held by our ancestors must be defended to the death — not a span of it given away.\'",
      },
      3: { actZh: '二 · 汴京陷落', actEn: 'Act II · The Fall of Bianjing' },
      5: {
        actZh: '三 · 北迁之耻', actEn: 'Act III · The Captivity',
        quoteZh: '岳飞《满江红》：“靖康耻，犹未雪；臣子恨，何时灭。”',
        quoteEn: "Yue Fei, \'The River All Red\': \'The shame of Jingkang not yet avenged — when will the grief of your servants die?\'",
      },
    },
  },

  yancheng: {
    steps: {
      0: { actZh: '一 · 兀术南扑', actEn: 'Act I · Wuzhu Strikes' },
      1: {
        quoteZh: '《宋史·岳飞传》：“飞戒步卒以麻扎刀入阵，勿仰视，第斫马足。”',
        quoteEn: "Songshi (Yue Fei biography): \'Fei drilled his footmen to enter the ranks with hooked knives — look not up, but hack at the horses\' legs.\'",
        actors: [{ zh: '岳飞', en: 'Yue Fei', key: 'yuefei', camp: 'song' }],
      },
      3: {
        actZh: '二 · 直捣黄龙', actEn: 'Act II · To the Yellow Dragon',
        quoteZh: "《宋史·岳飞传》：“飞大喜，语其下曰：'直抵黄龙府，与诸君痛饮尔！'”",
        quoteEn: "Songshi (Yue Fei biography): \'Fei exulted and told his men: \'Straight to Huanglong Prefecture — and we drink deep together!\'\'",
        actors: [{ zh: '岳飞', en: 'Yue Fei', key: 'yuefei', camp: 'song' }],
      },
      4: {
        actZh: '三 · 十二金牌', actEn: 'Act III · Twelve Gold Tablets',
        quoteZh: "《宋史·岳飞传》：“一日奉十二金字牌，飞愤惋泣下，东向再拜曰：'十年之功，废于一旦。'”",
        quoteEn: "Songshi (Yue Fei biography): \'In one day twelve gold tablets came. Fei wept in grief, bowed twice to the east and said: \'Ten years\' work — undone in a morning.\'\'",
        actors: [{ zh: '岳飞', en: 'Yue Fei', key: 'yuefei', camp: 'song' }],
      },
      5: {
        quoteZh: '《宋史·岳飞传》：“民遮道恸哭……从而南者如市。”',
        quoteEn: "Songshi (Yue Fei biography): \'The people barred the roads and wailed... and those who followed him south were as many as a market.\'",
        actors: [{ zh: '岳飞', en: 'Yue Fei', key: 'yuefei', camp: 'song' }],
      },
    },
  },

  saerhu: {
    steps: {
      0: {
        actZh: '一 · 四路齐出', actEn: 'Act I · Four Routes Out',
        quoteZh: '《清太祖实录》：“凭尔几路来，我只一路去。”',
        quoteEn: "Veritable Records of the Qing Taizu: \'Come by however many routes you please — I will go by one alone.\'",
        actors: [{ zh: '努尔哈赤', en: 'Nurhaci', key: 'nurhaci', camp: 'houjin' }],
      },
      1: { actZh: '二 · 各个击破', actEn: 'Act II · Defeat in Detail' },
    },
  },

  sanfan: {
    steps: {
      0: {
        actZh: '一 · 三藩并举', actEn: 'Act I · The Three Feudatories Rise',
        quoteZh: '《清史稿·吴三桂传》：“撤亦反，不撤亦反。”',
        quoteEn: "Qingshi gao (Wu Sangui biography): \'To be stripped of the fief is to rebel; not to be stripped is to rebel all the same.\'",
      },
      3: { actZh: '二 · 相持之变', actEn: 'Act II · The Tide Turns' },
      4: {
        quoteZh: '《清史稿·吴三桂传》：“三桂僭即皇帝位于衡州，改元昭武。”',
        quoteEn: "Qingshi gao (Wu Sangui biography): \'Sangui usurped the imperial title at Hengzhou, taking the era name Zhaowu.\'",
      },
      5: { actZh: '三 · 大周之终', actEn: 'Act III · The End of the Zhou' },
      6: {
        quoteZh: '《清史稿·吴三桂传》：“世璠自经，其党以尸降。”',
        quoteEn: "Qingshi gao (Wu Sangui biography): \'Wu Shifan hanged himself, and his followers surrendered with his body.\'",
      },
    },
  },

  yapian: {
    steps: {
      0: {
        actZh: '一 · 珠江启衅', actEn: 'Act I · War at the Pearl River',
        quoteZh: '林则徐《谕各国商人呈缴烟土稿》：“若鸦片一日未绝，本大臣一日不回，誓与此事相始终，断无中止之理。”',
        quoteEn: "Lin Zexu\'s proclamation to the foreign merchants: \'If opium is not eradicated for a single day, this commissioner will not withdraw for a single day; I shall see this matter through to the end.\'",
        actors: [{ zh: '林则徐', en: 'Lin Zexu', key: 'linzexu', camp: 'qing' }],
      },
      3: {
        actZh: '二 · 虎门与沿海', actEn: 'Act II · Humen and the Coast',
        quoteZh: '《清史稿·关天培传》：“天培身被数十创，死之。”',
        quoteEn: "Qingshi gao (Guan Tianpei biography): \'Tianpei took dozens of wounds and died at his post.\'",
      },
      5: {
        actZh: '三 · 吴淞与长江', actEn: 'Act III · Wusong and the Yangtze',
        quoteZh: '《清史稿·陈化成传》：“化成中炮，殁于阵。”',
        quoteEn: "Qingshi gao (Chen Huacheng biography): \'Huacheng was struck by a cannonball and fell in battle.\'",
      },
    },
  },

  yiling: {
    steps: {
      0: {
        actZh: '一 · 倾国东出', actEn: 'Act I · The Kingdom Marches East',
        quoteZh: '《云别传》：“国贼是曹操，非孙权也。”',
        quoteEn: "Yun biezhuan (Zhao Yun\'s separate chronicle): \'The traitor of the realm is Cao Cao, not Sun Quan.\'",
        actors: [{ zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'shu' }, { zh: '诸葛亮', en: 'Zhuge Liang', key: 'zhugeliang', camp: 'shu' }],
      },
      1: {
        actZh: '二 · 夷陵相持', actEn: 'Act II · The Stand at Yiling',
        quoteZh: '《三国志·陆逊传》：“备是猾虏，更尝事多，其军始集，思虑精专，未可干也。”',
        quoteEn: "Sanguozhi (Lu Xun biography): \'Liu Bei is a crafty foe and has seen much war; his host is fresh-mustered and its mind single — we cannot strike yet.\'",
        actors: [{ zh: '陆逊', en: 'Lu Xun', key: 'luxun', camp: 'wu' }, { zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'shu' }],
      },
      2: {
        actZh: '三 · 火烧连营', actEn: 'Act III · The Burning Camps',
        quoteZh: '《三国志·陆逊传》：“乃敕各持一把茅，以火攻拔之。一尔势成，通率诸军同时俱攻。”',
        quoteEn: "Sanguozhi (Lu Xun biography): \'He ordered every man to take a bundle of thatch and storm the camps with fire; once the blaze took hold, the whole army charged as one.\'",
        actors: [{ zh: '陆逊', en: 'Lu Xun', key: 'luxun', camp: 'wu' }, { zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'shu' }],
      },
      3: {
        quoteZh: '《三国志·陆逊传》：“其舟船器械，水步军资，一时略尽，尸骸漂流，塞江而下。”',
        quoteEn: "Sanguozhi (Lu Xun biography): \'Boats and arms, supplies afoot and afloat, were swept away in an hour; corpses choked the river and drifted down it.\'",
        actors: [{ zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'shu' }, { zh: '陆逊', en: 'Lu Xun', key: 'luxun', camp: 'wu' }],
      },
      4: {
        quoteZh: '《三国志·诸葛亮传》：“若嗣子可辅，辅之；如其不才，君可自取。”',
        quoteEn: "Sanguozhi (Zhuge Liang biography): \'If my heir can be helped, help him; if he is not worthy, take the realm yourself.\'",
        actors: [{ zh: '刘备', en: 'Liu Bei', key: 'liubei', camp: 'shu' }, { zh: '诸葛亮', en: 'Zhuge Liang', key: 'zhugeliang', camp: 'shu' }],
      },
    },
  },

  julu: {
    steps: {
      0: { actZh: '一 · 危局', actEn: 'Act I · The Strangled North' },
      1: {
        actZh: '二 · 破釜沉舟', actEn: 'Act II · Breaking the Cauldrons',
        quoteZh: '《史记·项羽本纪》：“皆沉船，破釜甑，烧庐舍，持三日粮，以示士卒必死，无一还心。”',
        quoteEn: "Shiji (Xiang Yu chronicle): \'They sank the boats, smashed the cauldrons, burned the huts, and carried three days\' rations — to show the soldiers there was death only, no thought of return.\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'chu' }],
      },
      2: {
        quoteZh: '《史记·项羽本纪》：“楚战士无不一以当十，楚兵呼声动天，诸侯军无不人人惴恐。”',
        quoteEn: "Shiji (Xiang Yu chronicle): \'Every Chu soldier fought as ten; their war-cry shook the sky, and every lord\'s army watching from the ramparts trembled.\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'chu' }],
      },
      3: {
        actZh: '三 · 诸侯膝行', actEn: 'Act III · The Generals Crawl',
        quoteZh: '《史记·项羽本纪》：“项羽召见诸侯将，入辕门，无不膝行而前，莫敢仰视。”',
        quoteEn: "Shiji (Xiang Yu chronicle): \'Xiang Yu summoned the lords\' generals; entering the palisade gate, every one of them advanced on his knees, none daring to look up.\'",
        actors: [{ zh: '项羽', en: 'Xiang Yu', key: 'xiangyu', camp: 'chu' }],
      },
    },
  },

  kunyang: {
    steps: {
      0: {
        actZh: '一 · 四十二万围城', actEn: 'Act I · 420,000 at the Walls',
        quoteZh: '《后汉书·光武帝纪》：“驱诸猛兽虎豹犀象之属，以助威武。”',
        quoteEn: "Hou Hanshu (Guangwu chronicle): \'They drove before the host tigers, leopards, rhinoceroses and elephants, to give the army its terror.\'",
        actors: [{ zh: '王莽', en: 'Wang Mang', key: 'wangmang', camp: 'xin' }],
      },
      1: {
        quoteZh: '《后汉书·光武帝纪》：“光武乃与敢死者十三骑，出城南门，于外收兵。”',
        quoteEn: "Hou Hanshu (Guangwu chronicle): \'Guang Wu slipped out the south gate with thirteen death-defiers and raised troops beyond.\'",
        actors: [{ zh: '刘秀', en: 'Liu Xiu', key: 'liuxiu', camp: 'han' }],
      },
      4: {
        actZh: '二 · 冲其中坚', actEn: 'Act II · Strike the Center',
        quoteZh: '《后汉书·光武帝纪》：“光武乃与敢死者三千人，从城西水上冲其中坚。……城中亦鼓噪而出，中外合势，震呼动天地，莽兵大溃。”',
        quoteEn: "Hou Hanshu (Guangwu chronicle): \'Guang Wu led three thousand death-defiers from the west water and struck the very center... the city sallied with clamor; the forces joined within and without, the roar shook heaven and earth, and the Xin host broke.\'",
        actors: [{ zh: '刘秀', en: 'Liu Xiu', key: 'liuxiu', camp: 'han' }, { zh: '王莽', en: 'Wang Mang', key: 'wangmang', camp: 'xin' }],
      },
    },
  },

  mengsong: {
    steps: {
      0: { actZh: '一 · 三道伐宋', actEn: 'Act I · Three Routes Against Song' },
      3: {
        quoteZh: '《元史·宪宗纪》：“帝崩于钓鱼山。”',
        quoteEn: "Yuanshi (Möngke annals): \'The Khan died at Diaoyu Mountain.\'",
      },
      7: {
        actZh: '二 · 襄阳之围', actEn: 'Act II · The Siege of Xiangyang',
        quoteZh: '《元史·刘整传》：“攻宋之策，当先事于襄阳。”',
        quoteEn: "Yuanshi (Liu Zheng biography): \'Against Song, the first matter of the plan is Xiangyang.\'",
        actors: [{ zh: '忽必烈', en: 'Kublai Khan', key: 'kublaikhan', camp: 'meng' }],
      },
      9: { actZh: '三 · 樊破襄降', actEn: 'Act III · Fancheng Falls, Xiangyang Yields' },
    },
  },

  yashan: {
    steps: {
      0: { actZh: '一 · 崖山结寨', actEn: 'Act I · The Stockade at Yashan' },
      2: {
        actZh: '二 · 蹈海', actEn: 'Act II · Into the Sea',
        quoteZh: '《宋史·陆秀夫传》：“国事至此，陛下当为国死。德祐皇帝辱已甚，陛下不可再辱。”',
        quoteEn: "Songshi (Lu Xiufu biography): \'The realm has come to this: Your Majesty must die for it. Dezong\'s emperor was humiliated past bearing — Your Majesty must not be humbled twice.\'",
      },
    },
  },

  'tumu-beijing': {
    steps: {
      0: { actZh: '一 · 土木之变', actEn: 'Act I · The Tumu Crisis' },
      1: {
        quoteZh: '《明史·英宗前纪》：“师溃于土木，帝北狩。”',
        quoteEn: "Mingshi (Yingzong annals): \'The army broke at Tumu; the Emperor was carried north.\'",
      },
      2: {
        actZh: '二 · 北京保卫战', actEn: 'Act II · The Defense of Beijing',
        quoteZh: '《明史·于谦传》：“言南迁者，可斩也。京师天下根本，一动则大事去矣，独不见宋南渡事乎！”',
        quoteEn: "Mingshi (Yu Qian biography): \'Whoever speaks of moving south, cut him down. The capital is the root of the realm — shake it and all is lost. Have you forgotten the Song crossing south?\'",
        actors: [{ zh: '于谦', en: 'Yu Qian', key: 'yuqian', camp: 'ming' }],
      },
      3: {
        quoteZh: '《明史·于谦传》：“分遣诸将，列阵九门之外。”',
        quoteEn: "Mingshi (Yu Qian biography): \'He sent the generals out and set the army in line before all nine gates.\'",
        actors: [{ zh: '于谦', en: 'Yu Qian', key: 'yuqian', camp: 'ming' }],
      },
      4: { actZh: '三 · 英宗南还', actEn: 'Act III · The Emperor Returns' },
    },
  },

  taiping: {
    steps: {
      0: {
        actZh: '一 · 从金田到天京', actEn: 'Act I · From Jintian to Tianjing',
        quoteZh: '洪秀全《吟剑诗》：“手持三尺定山河，四海为家共饮和。”',
        quoteEn: "Hong Xiuquan, \'Sword Song\': \'This three-foot blade shall settle the rivers and mountains; the four seas one household, drinking peace together.\'",
        actors: [{ zh: '洪秀全', en: 'Hong Xiuquan', key: 'hongxiuquan', camp: 'taiping' }],
      },
      3: {
        actZh: '二 · 天京事变', actEn: 'Act II · The Tianjing Purge',
        quoteZh: '《金陵省难纪略》：“东王逼天王亲至东王府，封东王为万岁。”',
        quoteEn: "Jinling shengnan jilüe: \'The Eastern King pressed the Heavenly King to come to his palace in person and name him Ten Thousand Years.\'",
      },
      5: {
        actZh: '三 · 天京之陷', actEn: 'Act III · The Fall of Tianjing',
        quoteZh: "《李秀成自述》：“天王云：'朕之天兵多过于水，何惧曾妖者乎！'”",
        quoteEn: "Li Xiucheng\'s confession: \'The Heavenly King said: \'My heavenly soldiers outnumber the waters — why fear the Zeng demon?\'\'",
        actors: [{ zh: '洪秀全', en: 'Hong Xiuquan', key: 'hongxiuquan', camp: 'taiping' }, { zh: '曾国藩', en: 'Zeng Guofan', key: 'zengguofan', camp: 'qing' }],
      },
    },
  },

  jingnan: {
    steps: {
      0: {
        actZh: '一 · 起兵靖难', actEn: 'Act I · The Rise at Beiping',
        quoteZh: "《明史·成祖本纪》：“以诛齐泰、黄子澄为名，号曰'奉天靖难'。”",
        quoteEn: "Mingshi (Chengzu annals): \'Under the pretext of punishing Qi Tai and Huang Zicheng, he raised the banner of \'Pacifying by Heaven\'s Mandate.\'\'",
        actors: [{ zh: '朱棣', en: 'Zhu Di', key: 'zhudi', camp: 'yan' }],
      },
      6: { actZh: '二 · 四十万人的围城', actEn: 'Act II · The Siege of Four Hundred Thousand' },
      13: { actZh: '三 · 济南与东昌', actEn: 'Act III · Jinan and Dongchang' },
      14: {
        quoteZh: '《明史·铁铉传》：“铉书高皇帝神牌悬城上，燕师不敢击。”',
        quoteEn: "Mingshi (Tie Xuan biography): \'Xuan hung tablets bearing the Hongwu Emperor\'s spirit-name upon the walls, and the Yan host dared not fire.\'",
      },
      23: {
        actZh: '四 · 毋下城邑，直趋金陵', actEn: 'Act IV · Straight to the Southern Capital',
        quoteZh: '《明史·姚广孝传》：“毋下城邑，疾趋京师。京师单弱，势必举。”',
        quoteEn: "Mingshi (Yao Guangxiao biography): \'Do not reduce the cities — race for the capital. The capital is thin and weak; take it and all will fall.\'",
        actors: [{ zh: '朱棣', en: 'Zhu Di', key: 'zhudi', camp: 'yan' }],
      },
      27: {
        quoteZh: '《明史·成祖本纪》：“李景隆、谷王橞开金川门纳燕军。”',
        quoteEn: "Mingshi (Chengzu annals): \'Li Jinglong and Prince Gu opened the Jinchuan Gate and let the Yan army in.\'",
        actors: [{ zh: '朱棣', en: 'Zhu Di', key: 'zhudi', camp: 'yan' }],
      },
    },
  },

};
