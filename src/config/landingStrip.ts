/**
 * 首页「一行流动图文」的数据（仿 Modrinth 首页的横向滚动展带）。
 *
 * 素材从全站图片里挑：美食实拍（public/images/food-dishes）、景区实拍（scenic-spots）、
 * 各功能区配图（<page>/）。名称与一句话简介沿用各模块的口径——美食用名录里的菜名与风味，
 * 景区与配图用配图索引里的标题与图注——保证同一张图在首页和模块里说法一致。
 *
 * src 为相对 public 的路径，使用时拼 import.meta.env.BASE_URL（同 ImageGallery.vue）。
 * 数组顺序即素材池，首页展示顺序由 ImageMarquee.vue 在每次进入时洗牌，故这里按类目归拢便于维护。
 */
export interface StripItem {
  /** 相对 public 的图片路径 */
  src: string
  /** 名称（菜名 / 景区名 / 风物名） */
  name: string
  /** 一句话简介（风味、看点），一行不折 */
  intro: string
}

export const LANDING_STRIP: StripItem[] = [
  // —— 美食（名录 f001–f036 与配图一一对应）——
  { src: 'images/food-dishes/f017.jpg', name: '潍坊肉火烧', intro: '皮酥馅嫩、葱香扑鼻' },
  { src: 'images/food-dishes/f001.jpg', name: '把子肉', intro: '咸鲜浓香、酱香厚重' },
  { src: 'images/food-dishes/f003.jpg', name: '章丘大葱', intro: '清甜脆嫩、葱白长' },
  { src: 'images/food-dishes/f004.jpg', name: '青岛啤酒', intro: '麦香浓郁、清爽回甘' },
  { src: 'images/food-dishes/f007.jpg', name: '周村烧饼', intro: '酥香薄脆、芝麻香浓' },
  { src: 'images/food-dishes/f009.jpg', name: '淄博烧烤', intro: '炭火焦香、小饼卷食' },
  { src: 'images/food-dishes/f010.jpg', name: '单县羊肉汤', intro: '汤色乳白、鲜而不膻' },
  { src: 'images/food-dishes/f013.jpg', name: '黄河口大闸蟹', intro: '蟹黄饱满、清甜鲜香' },
  { src: 'images/food-dishes/f014.jpg', name: '福山大面', intro: '筋道爽滑、卤汁浓鲜' },
  { src: 'images/food-dishes/f024.jpg', name: '威海鲅鱼水饺', intro: '鲜嫩多汁、鱼香清甜' },
  { src: 'images/food-dishes/f029.jpg', name: '德州扒鸡', intro: '五香脱骨、酥烂咸鲜' },
  { src: 'images/food-dishes/f036.jpg', name: '枣庄辣子鸡', intro: '香辣浓郁、酱香微酸' },
  // —— 景区（s001–s010 配图索引）——
  { src: 'images/scenic-spots/s001.jpg', name: '趵突泉', intro: '泉城济南七十二名泉之首' },
  { src: 'images/scenic-spots/s002.jpg', name: '泰山', intro: '五岳独尊，世界双遗产' },
  { src: 'images/scenic-spots/s003.jpg', name: '曲阜孔庙大成殿', intro: '“三孔”世界文化遗产核心' },
  { src: 'images/scenic-spots/s004.jpg', name: '黄河入海流', intro: '黄河口生态旅游区' },
  { src: 'images/scenic-spots/s005.jpg', name: '超然楼', intro: '大明湖景区夜景地标' },
  { src: 'images/scenic-spots/s006.jpg', name: '千佛山', intro: '兴国禅寺与山景' },
  { src: 'images/scenic-spots/s007.jpg', name: '微山湖荷花湿地', intro: '夏日湖景，南四湖第一大湖' },
  { src: 'images/scenic-spots/s009.jpg', name: '周村大街', intro: '“旱码头”古商城街景' },
  // —— 各功能区配图——
  { src: 'images/home/01.jpg', name: '泰山日出', intro: '山东文旅最具代表性的名片' },
  { src: 'images/home/03.jpg', name: '青岛栈桥', intro: '海滨城市的头号打卡点' },
  { src: 'images/scenic/02.jpg', name: '蓬莱阁', intro: '临海而建，人间仙境' },
  { src: 'images/heritage/02.jpg', name: '龙山黑陶', intro: '“薄如纸、亮如漆”的黑陶' },
]
