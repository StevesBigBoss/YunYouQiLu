/**
 * 各功能区配图（整理自维基共享资源，脚本生成，勿手改）。
 *
 * 图片已下载到 public/images/<page>/，src 为相对 public 的路径，
 * 使用时请拼上 import.meta.env.BASE_URL（见 ImageGallery.vue）。
 * credit 为来源与授权信息，图片查看器里展示，请勿删除。
 */
export interface SiteImage {
  /** 相对 public 的图片路径 */
  src: string
  /** 图片标题 */
  title: string
  /** 一句话说明 */
  caption: string
  /** 来源与授权（维基共享资源 + 许可协议 + 作者） */
  credit: string
}

export const SITE_IMAGES: Record<string, SiteImage[]> = {
  home: [
    {
      src: 'images/home/01.jpg',
      title: '泰山日出',
      caption: '五岳独尊的泰山日出，是山东文旅最具代表性的名片。',
      credit: '维基共享资源 · CC BY-SA 2.5 · 摄影/作者：me (w:User:pfctdayelise)',
    },
    {
      src: 'images/home/02.jpg',
      title: '曲阜孔庙',
      caption: '曲阜孔庙——儒家文化的地标，世界文化遗产“三孔”之一。',
      credit: '维基共享资源 · CC BY 2.0 · 摄影/作者：Kyle Magnuson from Los Angeles, United S',
    },
    {
      src: 'images/home/03.jpg',
      title: '青岛栈桥',
      caption: '青岛栈桥伸入海湾，是海滨城市的头号打卡点。',
      credit: '维基共享资源 · CC BY-SA 2.5 · 摄影/作者：M. Weitzel',
    },
  ],
  scenic: [
    {
      src: 'images/scenic/01.jpg',
      title: '趵突泉',
      caption: '济南趵突泉——七十二名泉之首，“趵突腾空”为泉城胜景。',
      credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：ermell',
    },
    {
      src: 'images/scenic/02.jpg',
      title: '蓬莱阁',
      caption: '蓬莱阁临海而建，自古有“人间仙境”之称。',
      credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Fanghong',
    },
    {
      src: 'images/scenic/03.jpg',
      title: '崂山',
      caption: '海上第一名山崂山，山、海、道观相映成趣。',
      credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Your friend',
    },
  ],
  food: [
    {
      src: 'images/food/01.jpg',
      title: '鲁菜',
      caption: '鲁菜讲究火候与高汤，糖醋鲤鱼、葱烧海参都是其中的招牌。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Zheng Zhou',
    },
    {
      src: 'images/food/02.jpg',
      title: '山东煎饼',
      caption: '山东煎饼薄如纸、色如金，卷上大葱与酱便是经典吃法。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
    },
    {
      src: 'images/food/03.jpg',
      title: '青岛啤酒',
      caption: '青岛啤酒与青岛国际啤酒节，是山东饮食文化的鲜活符号。',
      credit: '维基共享资源 · Public domain · 摄影/作者：Williamborg',
    },
  ],
  heritage: [
    {
      src: 'images/heritage/01.jpg',
      title: '孔庙大成殿',
      caption: '曲阜孔庙大成殿——儒家礼制建筑的巅峰之作。',
      credit: '维基共享资源 · CC BY 2.0 · 摄影/作者：brett Vachon from Montreal, canada',
    },
    {
      src: 'images/heritage/02.jpg',
      title: '龙山黑陶',
      caption: '龙山文化黑陶“薄如纸、亮如漆”，是齐鲁史前文明的实证。',
      credit: '维基共享资源 · CC0 · 摄影/作者：Gary Todd',
    },
    {
      src: 'images/heritage/03.jpg',
      title: '泰山石刻',
      caption: '泰山石刻跨越两千年，是天然的中国书法博物馆。',
      credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Rolf Müller (User:Rolfmueller)',
    },
  ],
  nature: [
    {
      src: 'images/nature/01.jpg',
      title: '黄河三角洲湿地',
      caption: '黄河三角洲新生湿地，是暖温带最完整的河口湿地生态系统。',
      credit: '维基共享资源 · CC BY 3.0 · 摄影/作者：rheins',
    },
    {
      src: 'images/nature/02.jpg',
      title: '丹顶鹤',
      caption: '保护区是丹顶鹤等珍禽的重要迁徙停歇地与越冬地。',
      credit: '维基共享资源 · CC BY-SA 2.5 · 摄影/作者：Photo by and (C)2007 Derek Ramsey (Ram-M',
    },
    {
      src: 'images/nature/03.jpg',
      title: '长岛',
      caption: '长岛（庙岛群岛）海域是斑海豹与候鸟的重要栖息地。',
      credit: '维基共享资源 · Public domain · 摄影/作者：No machine-readable author provided. Lyc',
    },
  ],
  flow: [
    {
      src: 'images/flow/01.jpg',
      title: '济南西站',
      caption: '济南西站是京沪高铁枢纽，也是客流监测的重点场景。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Lwr1016',
    },
    {
      src: 'images/flow/02.jpg',
      title: '青岛站 / 青岛北站',
      caption: '客运枢纽进出站客流与预警，是文旅客流监测的先行指标。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
    },
    {
      src: 'images/flow/03.jpg',
      title: '高铁客流',
      caption: '高铁网络把省内外客流快速送达，客流曲线随车次明显起伏。',
      credit: '维基共享资源 · CC BY 3.0 · 摄影/作者：Gisling',
    },
  ],
  industry: [
    {
      src: 'images/industry/01.jpg',
      title: '青岛城市天际线',
      caption: '滨海城市天际线背后是酒店、会展、演艺等文旅产业集群。',
      credit: '维基共享资源 · CC0 · 摄影/作者：CHO EUNSEONG being_es',
    },
    {
      src: 'images/industry/02.jpg',
      title: '会展中心',
      caption: '会展经济是文旅产业分析里的高价值板块。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：K.Y.K.Z.K.',
    },
    {
      src: 'images/industry/03.jpg',
      title: '济南芙蓉街',
      caption: '特色街区把“吃住行游购娱”串成一条完整的消费链。',
      credit: '维基共享资源 · Public domain · 摄影/作者：Cartonfox',
    },
  ],
  resource: [
    {
      src: 'images/resource/01.jpg',
      title: '游客服务中心',
      caption: '游客中心是文旅资源台账里的基础服务设施。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：坟前的丁香花',
    },
    {
      src: 'images/resource/02.jpg',
      title: '检票闸机',
      caption: '闸机客流数据是景区承载量管理与预约调度的一手来源。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：SCJiang',
    },
    {
      src: 'images/resource/03.jpg',
      title: '导览标识',
      caption: '导览标识与解说系统属于资源管理中的公共服务配套。',
      credit: '维基共享资源 · CC BY 4.0 · 摄影/作者：WPTO',
    },
  ],
  opinion: [
    {
      src: 'images/opinion/01.jpg',
      title: '黄河（山东段）',
      caption: '黄河山东段是生态治理与舆情关注的核心对象。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Lwr1016',
    },
    {
      src: 'images/opinion/02.jpg',
      title: '水环境治理设施',
      caption: '污水处理与水质净化设施，是生态治理舆情的正面叙事素材。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：MNXANL',
    },
    {
      src: 'images/opinion/03.jpg',
      title: '黄河生态廊道',
      caption: '沿黄生态廊道建设是生态治理舆情的正面叙事主线。',
      credit: '维基共享资源 · CC0 · 摄影/作者：Mcx8202229',
    },
  ],
  marketing: [
    {
      src: 'images/marketing/01.jpg',
      title: '青岛国际啤酒节',
      caption: '节事活动是新媒体矩阵集中投放与引流的窗口。',
      credit: '维基共享资源 · CC0 · 摄影/作者：B.wilson',
    },
    {
      src: 'images/marketing/02.jpg',
      title: '直播间 / 短视频创作',
      caption: '直播带货与短视频创作，构成智慧营销的常态化阵地。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Yue gowua YT',
    },
    {
      src: 'images/marketing/03.jpg',
      title: '航拍短视频',
      caption: '航拍与短视频素材是新媒体系列内容的“弹药库”。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：又黑蜗壳',
    },
  ],
  disaster: [
    {
      src: 'images/disaster/01.jpg',
      title: '气象雷达',
      caption: '气象雷达回波是强对流、暴雨预警的第一手观测。',
      credit: '维基共享资源 · CC BY-SA 2.0 · 摄影/作者：VillageHero from Ulm, Germany',
    },
    {
      src: 'images/disaster/02.jpg',
      title: '东平湖蓄滞洪区',
      caption: '东平湖是黄河下游重要的蓄滞洪区，汛期调蓄与堤防安全是防汛监测重点。',
      credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：陈静',
    },
    {
      src: 'images/disaster/03.jpg',
      title: '地震监测',
      caption: '地震网为震情速报与风险评估提供支撑。',
      credit: '维基共享资源 · CC BY-SA 2.0 de · 摄影/作者：Hannes Grobe',
    },
  ],
}
