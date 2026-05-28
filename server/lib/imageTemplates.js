/** 与前端 imageTemplates.ts 保持 id 一致 */
export const IMAGE_BUILTIN_TEMPLATES = [
  {
    id: 'xiaohongshu',
    name: '小红书配图',
    styleHint: '清爽竖版构图，主标题突出，留白适中，少营销感',
    layoutHint: '上标题、中要点、下免责声明条',
  },
  {
    id: 'disease-poster',
    name: '疾病教育海报',
    styleHint: '蓝绿渐变背景，科普图标感，强调疾病教育',
    layoutHint: '大标题+3条要点+底部合规条',
  },
  {
    id: 'health-science',
    name: '健康科普图文',
    styleHint: '亲和浅色系，分块信息，图标点缀',
    layoutHint: '分区卡片式排版',
  },
  {
    id: 'medical-scene',
    name: '医疗场景图',
    styleHint: '偏专业蓝，医疗场景暗示，克制装饰',
    layoutHint: '场景氛围+简短标题+合规说明',
  },
  {
    id: 'drug-info',
    name: '药品说明',
    styleHint: '规整排版，信息条块清晰，偏说明风格',
    layoutHint: '标题+分条说明+醒目免责声明',
  },
  {
    id: 'patient-care',
    name: '患者关怀',
    styleHint: '温暖浅绿蓝，关怀语气，避免冰冷医疗感',
    layoutHint: '柔和背景+关怀文案+就医建议',
  },
];

export function getImageTemplate(id) {
  if (!id) return null;
  return IMAGE_BUILTIN_TEMPLATES.find((t) => t.id === id) || null;
}
