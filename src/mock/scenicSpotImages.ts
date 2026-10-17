/* 景区配图索引：本页 10 处重点监测景点的实景照片，取自维基共享资源（Wikimedia Commons），
   由脚本按景点名称检索、压成 web 尺寸后放进 public/images/scenic-spots/。
   credit 是来源与授权，展示时请务必保留（CC BY / BY-SA 系列要求署名）。
   ai 为 AI 配图预留位：一旦补图，展示时必须标注「AI 生成」。 */

export interface ScenicSpotImage {
  /** 实景/代表图（public 下的绝对路径） */
  real: string
  /** 一句话图注 */
  caption: string
  /** 来源与授权（维基共享资源 · 许可协议 · 作者） */
  credit: string
  /** AI 生成配图，展示时需标注「AI 生成」 */
  ai?: string
}

export const SCENIC_SPOT_IMAGES: Record<string, ScenicSpotImage> = {
  // 趵突泉景区 · Jinan Baotu Spring pond-20150519-RM-174132.jpg
  s001: {
    real: '/images/scenic-spots/s001.jpg',
    caption: '趵突泉 · 泉城济南七十二名泉之首',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Ermell',
  },
  // 泰山风景区 · 50549-Mount Tai-Taishan 泰山.jpg
  s002: {
    real: '/images/scenic-spots/s002.jpg',
    caption: '泰山 · 五岳独尊（世界文化与自然双遗产）',
    credit: '维基共享资源 · CC BY 2.0 · 摄影/作者：xiquinhosilva',
  },
  // 曲阜三孔 · 20230612 Dacheng Dian, Qufu Kongmiao.jpg
  s003: {
    real: '/images/scenic-spots/s003.jpg',
    caption: '曲阜孔庙大成殿 · “三孔”世界文化遗产核心',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Yumeto',
  },
  // 黄河口生态旅游区 · 滚滚黄河入海流 - The Yellow River Entering the Sea - 2012.07 - panoramio.jpg
  s004: {
    real: '/images/scenic-spots/s004.jpg',
    caption: '黄河入海流 · 黄河口生态旅游区',
    credit: '维基共享资源 · CC BY 3.0 · 摄影/作者：rheins',
  },
  // 大明湖景区 · Chaoran Tower, Daming Lake, Jinan in October 2019.jpg
  s005: {
    real: '/images/scenic-spots/s005.jpg',
    caption: '超然楼 · 大明湖景区夜景地标',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：HMGiovanniV',
  },
  // 千佛山 · Jinan Thousand Buddha Mountain-20150520-RM-101200.jpg
  s006: {
    real: '/images/scenic-spots/s006.jpg',
    caption: '千佛山 · 兴国禅寺与山景',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Ermell',
  },
  // 微山湖湿地 · 夏日微山湖.jpg
  s007: {
    real: '/images/scenic-spots/s007.jpg',
    caption: '微山湖荷花湿地 · 夏日湖景',
    credit: '维基共享资源 · CC0 · 摄影/作者：Vitsuha',
  },
  // 水泊梁山 · Shuipo Liangshan (2911643946).jpg
  s008: {
    real: '/images/scenic-spots/s008.jpg',
    caption: '水泊梁山 · 梁山山体（水浒故事发生地）',
    credit: '维基共享资源 · CC BY 2.0 · 摄影/作者：kanegen',
  },
  // 周村古商城 · Zhoucun dajie.jpg
  s009: {
    real: '/images/scenic-spots/s009.jpg',
    caption: '周村大街 · 古商城街景',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：留守科学家',
  },
  // 孙子兵法城 · Inscribed bamboo-slips of Art of War.jpg（银雀山汉简，与兵法城同题）
  s010: {
    real: '/images/scenic-spots/s010.jpg',
    caption: '《孙子兵法》竹简（银雀山汉简）· 与兵法城同题',
    credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：AlexHe34',
  },
}
