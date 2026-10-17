/* 美食配图索引：本页 36 条收录美食的实景/同类菜品照片，取自维基共享资源（Wikimedia Commons），
   由脚本按美食名称检索、压成 web 尺寸后放进 public/images/food-dishes/。
   与名录口径一致：能找到对应菜品的直接用，找不到的用同类菜品示意，图注里已注明「示意」。
   credit 是来源与授权，展示时请务必保留（CC BY / BY-SA 系列要求署名）。
   ai 为 AI 配图预留位：一旦补图，展示时必须标注「AI 生成」。 */

export interface FoodDishImage {
  /** 实景/代表图（public 下的绝对路径） */
  real: string
  /** 一句话图注 */
  caption: string
  /** 来源与授权（维基共享资源 · 许可协议 · 作者） */
  credit: string
  /** AI 生成配图，展示时需标注「AI 生成」 */
  ai?: string
}

export const FOOD_DISH_IMAGES: Record<string, FoodDishImage> = {
  // 把子肉 · 济南把子肉和肉丸子.jpg
  f001: {
    real: '/images/food-dishes/f001.jpg',
    caption: '把子肉配肉丸 · 济南名吃，酱香浓厚、肥而不腻',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Suginami',
  },
  // 甜沫 · 甜沫 202509.jpg
  f002: {
    real: '/images/food-dishes/f002.jpg',
    caption: '甜沫 · 济南传统早餐粥，咸香微辣',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Steven Sun',
  },
  // 章丘大葱 · Shandong Zhangqiu scallion solded in Laoling's market.jpg
  f003: {
    real: '/images/food-dishes/f003.jpg',
    caption: '章丘大葱 · 葱白紧实，“葱中之王”',
    credit: '维基共享资源 · CC0 · 摄影/作者：Cartonfox',
  },
  // 青岛啤酒 · Bottle and glas of Chinese Tsingtao beer.jpg
  f004: {
    real: '/images/food-dishes/f004.jpg',
    caption: '青岛啤酒 · 百年品牌，青岛的城市名片',
    credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Derbrauni',
  },
  // 崂山绿茶 · Laoshan green tea.jpg
  f005: {
    real: '/images/food-dishes/f005.jpg',
    caption: '崂山绿茶 · 山海之间孕育的北方名茶',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Difference engine',
  },
  // 流亭猪蹄 · A cold dish of pig's trotter.jpg
  f006: {
    real: '/images/food-dishes/f006.jpg',
    caption: '猪蹄冷盘（示意）· 流亭猪蹄酱卤入味、皮糯肉香',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Pauloleong2002',
  },
  // 周村烧饼 · 周村烧饼 zhoucun shaobing.jpg
  f007: {
    real: '/images/food-dishes/f007.jpg',
    caption: '周村烧饼 · 薄如纸、酥香满口的传统名点',
    credit: '维基共享资源 · CC0 · 摄影/作者：Cartonfox',
  },
  // 博山豆腐箱 · Boshan Tofu Box.jpg
  f008: {
    real: '/images/food-dishes/f008.jpg',
    caption: '博山豆腐箱 · 豆腐挖空填馅，形似箱子',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Zheng Zhou',
  },
  // 淄博烧烤 · Zibo-style barbecue in Qingdao, wrapped in flatbread (20230428172227).jpg
  f009: {
    real: '/images/food-dishes/f009.jpg',
    caption: '小饼卷烤肉 · 淄博烧烤的经典吃法',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
  },
  // 菏泽单县羊肉汤 · Shanxian Mutton Soup and Diaolu Shaobing in Beijing (20230224111607).jpg
  f010: {
    real: '/images/food-dishes/f010.jpg',
    caption: '单县羊肉汤配吊炉烧饼 · 汤色乳白、鲜而不膻',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
  },
  // 曹州牡丹宴 · 牡丹-彤雲 Paeonia suffruticosa 'Red Cloud' -菏澤曹州牡丹園 Heze, China- (12452319433).jpg
  f011: {
    real: '/images/food-dishes/f011.jpg',
    caption: '曹州牡丹园的牡丹 · 菏泽以牡丹入馔成席',
    credit: '维基共享资源 · CC BY-SA 2.0 · 摄影/作者：阿橋 HQ',
  },
  // 东营广饶肴驴肉 · Donkey meat at Daji Jianglürou Huangmian Guan, Dunhuang (20230917192141).jpg
  f012: {
    real: '/images/food-dishes/f012.jpg',
    caption: '驴肉冷盘（示意）· 广饶肴驴肉老汤卤制、香而不柴',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
  },
  // 黄河口大闸蟹 · 阳澄湖大闸蟹 熟 蒸后.jpg
  f013: {
    real: '/images/food-dishes/f013.jpg',
    caption: '清蒸大闸蟹（示意）· 黄河口大闸蟹膏满黄肥',
    credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Walter Grassroot',
  },
  // 福山大面 · Noodle soup in Asia Bowl 2025-07-26.jpg
  f014: {
    real: '/images/food-dishes/f014.jpg',
    caption: '面汤（示意）· 福山大面讲究抻拉细面配鲜卤',
    credit: '维基共享资源 · CC0 · 摄影/作者：Andy Li',
  },
  // 烟台苹果 · 山东烟台富士苹果 2020.jpg
  f015: {
    real: '/images/food-dishes/f015.jpg',
    caption: '烟台富士苹果 · 皮薄汁多、脆甜爽口',
    credit: '维基共享资源 · CC0 · 摄影/作者：Walter Grassroot',
  },
  // 蓬莱小面 · 山东海鲜面.jpg
  f016: {
    real: '/images/food-dishes/f016.jpg',
    caption: '海鲜面（示意）· 蓬莱小面以海鲜打卤见长',
    credit: '维基共享资源 · CC0 · 摄影/作者：Suginami',
  },
  // 潍坊肉火烧 · ロバ肉スープとロバ肉火焼.jpg
  f017: {
    real: '/images/food-dishes/f017.jpg',
    caption: '火烧（示意）· 潍坊肉火烧皮酥馅香，早餐标配',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Suginami',
  },
  // 潍坊朝天锅 · Chao tyen gwo.jpg
  f018: {
    real: '/images/food-dishes/f018.jpg',
    caption: '朝天锅 · 薄饼卷肉、原汤佐食的潍坊名吃',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Rochi',
  },
  // 潍县萝卜 · Brassicales - Green Radish from Tianjin - 1.jpg
  f019: {
    real: '/images/food-dishes/f019.jpg',
    caption: '青萝卜（示意）· 潍县萝卜碧绿多汁，可当水果生吃',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Emőke Dénes',
  },
  // 济宁甏肉干饭 · 山东济南的一份把子肉卷煎米饭.jpg
  f020: {
    real: '/images/food-dishes/f020.jpg',
    caption: '卤肉配米饭（示意）· 济宁甏肉干饭以甏内卤肉浇饭',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Suginami',
  },
  // 曲阜熏豆腐 · 孔府熏豆腐.JPG
  f021: {
    real: '/images/food-dishes/f021.jpg',
    caption: '孔府熏豆腐 · 曲阜传统名吃，熏香浓郁',
    credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Gisling',
  },
  // 泰山豆腐宴 · Eight-Treasure Tofu, a representative dish of Tianjin cuisine.jpg
  f022: {
    real: '/images/food-dishes/f022.jpg',
    caption: '豆腐宴菜品（示意）· 泰山豆腐宴以“泰山三美”入席',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Amazingloong',
  },
  // 泰安煎饼 · Shandong multigrain pancakes.jpg
  f023: {
    real: '/images/food-dishes/f023.jpg',
    caption: '山东杂粮煎饼 · 泰安煎饼薄而筋道',
    credit: '维基共享资源 · CC0 · 摄影/作者：Fumikas Sagisavas',
  },
  // 威海鲅鱼水饺 · 山东鲅鱼饺子.jpg
  f024: {
    real: '/images/food-dishes/f024.jpg',
    caption: '鲅鱼水饺 · 胶东名吃，鱼肉馅鲜嫩多汁',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Suginami',
  },
  // 荣成海带 · 蒲台島漁民晾曬海帶.jpg
  f025: {
    real: '/images/food-dishes/f025.jpg',
    caption: '晾晒海带（示意）· 荣成海带养殖规模居全国前列',
    credit: '维基共享资源 · CC0 · 摄影/作者：方畢可',
  },
  // 日照绿茶 · Tekoe - Green Grey tea - WikiTea.jpg
  f026: {
    real: '/images/food-dishes/f026.jpg',
    caption: '绿茶干茶（示意）· 日照绿茶汤色黄绿、栗香浓郁',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Ash Crow',
  },
  // 临沂糁汤 · 糁汤 sa汤.jpg
  f027: {
    real: '/images/food-dishes/f027.jpg',
    caption: '糁汤 · 临沂传统早餐汤食，香辣暖胃',
    credit: '维基共享资源 · CC0 · 摄影/作者：Suginami',
  },
  // 沂蒙煎饼 · 山东省滕州市摊煎饼.jpg
  f028: {
    real: '/images/food-dishes/f028.jpg',
    caption: '摊煎饼（示意）· 沂蒙煎饼卷大葱与酱为经典吃法',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Air7538',
  },
  // 德州扒鸡 · Dezhou braised chicken (20160511210319).jpg
  f029: {
    real: '/images/food-dishes/f029.jpg',
    caption: '德州扒鸡 · 五香脱骨、肉烂味香',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：N509FZ',
  },
  // 乐陵金丝小枣 · 乐陵干枣.png
  f030: {
    real: '/images/food-dishes/f030.jpg',
    caption: '乐陵干枣（金丝小枣）· 皮薄肉厚、核小味甜',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Suginami',
  },
  // 聊城魏氏熏鸡 · 比较小的山东熏鸡.jpg
  f031: {
    real: '/images/food-dishes/f031.jpg',
    caption: '山东熏鸡（示意）· 聊城魏氏熏鸡老汤熏制、色泽红亮',
    credit: '维基共享资源 · CC0 · 摄影/作者：Suginami',
  },
  // 高唐老豆腐 · Laodoufu 老豆腐 Doufunao 豆腐脑 (Tofu Pudding).jpg
  f032: {
    real: '/images/food-dishes/f032.jpg',
    caption: '老豆腐（示意）· 高唐老豆腐卤香浓、豆腐嫩',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Amazingloong',
  },
  // 滨州锅子饼 · Plate of scallion pancakes.jpg
  f033: {
    real: '/images/food-dishes/f033.jpg',
    caption: '锅饼（示意）· 滨州锅子饼薄饼卷馅、平锅烙制',
    credit: '维基共享资源 · CC BY 2.0 · 摄影/作者：Infrogmation of New Orleans',
  },
  // 阳信鸭梨 · 山东烟台梨.jpg
  f034: {
    real: '/images/food-dishes/f034.jpg',
    caption: '梨（示意，摄于山东）· 阳信鸭梨皮薄核小、脆甜多汁',
    credit: '维基共享资源 · CC BY-SA 3.0 · 摄影/作者：Walter Grassroot',
  },
  // 枣庄石榴 · Pomegranate fruit - whole and piece with arils.jpg
  f035: {
    real: '/images/food-dishes/f035.jpg',
    caption: '石榴（示意）· 枣庄峄城石榴籽粒晶莹',
    credit: '维基共享资源 · CC BY-SA 4.0 · 摄影/作者：Ivar Leidus',
  },
  // 枣庄辣子鸡 · Spicy chicken (La-zi-ji).jpg
  f036: {
    real: '/images/food-dishes/f036.jpg',
    caption: '辣子鸡（示意）· 枣庄辣子鸡配薄皮辣椒爆炒',
    credit: '维基共享资源 · CC0 · 摄影/作者：Fumikas Sagisavas',
  },
}
