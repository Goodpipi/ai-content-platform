/** 配图/海报内置模板（与首页图片模板名称对应） */
export interface ImageBuiltinTemplate {
  id: string;
  name: string;
  description: string;
  styleHint: string;
  layoutHint: string;
  previewImg?: string;
  gradient: string;
  accent: string;
}

export const IMAGE_BUILTIN_TEMPLATES: ImageBuiltinTemplate[] = [
  {
    id: 'xiaohongshu',
    name: '小红书配图',
    description: '竖版感、标题醒目，适合社交媒体',
    styleHint: '清爽竖版构图，主标题突出，留白适中，少营销感',
    layoutHint: '上标题、中要点、下免责声明条',
    previewImg: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=400',
    gradient: 'linear-gradient(145deg, #fff5f8 0%, #ffe8f0 100%)',
    accent: '#c2185b',
  },
  {
    id: 'disease-poster',
    name: '疾病教育海报',
    description: '科普向、信息层次清晰',
    styleHint: '蓝绿渐变背景，科普图标感，强调疾病教育',
    layoutHint: '大标题+3条要点+底部合规条',
    previewImg: 'https://images.unsplash.com/photo-1559757175-053139280de2?w=400',
    gradient: 'linear-gradient(145deg, #eaf7ff 0%, #f4fff0 100%)',
    accent: '#103C8F',
  },
  {
    id: 'health-science',
    name: '健康科普图文',
    description: '图文结合，适合长图拆解',
    styleHint: '亲和浅色系，分块信息，图标点缀',
    layoutHint: '分区卡片式排版',
    previewImg: 'https://images.unsplash.com/photo-1559757175-9e351c9a1301?w=400',
    gradient: 'linear-gradient(145deg, #e8f5e9 0%, #f1f8e9 100%)',
    accent: '#2e7d32',
  },
  {
    id: 'medical-scene',
    name: '医疗场景图',
    description: '专业医疗场景氛围',
    styleHint: '偏专业蓝，医疗场景暗示，克制装饰',
    layoutHint: '场景氛围+简短标题+合规说明',
    gradient: 'linear-gradient(145deg, #e3f2fd 0%, #eceff1 100%)',
    accent: '#1565c0',
  },
  {
    id: 'drug-info',
    name: '药品说明',
    description: '说明性版式，信息准确',
    styleHint: '规整排版，信息条块清晰，偏说明风格',
    layoutHint: '标题+分条说明+醒目免责声明',
    previewImg: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400',
    gradient: 'linear-gradient(145deg, #fafafa 0%, #eeeeee 100%)',
    accent: '#455a64',
  },
  {
    id: 'patient-care',
    name: '患者关怀',
    description: '温暖关怀色调',
    styleHint: '温暖浅绿蓝，关怀语气，避免冰冷医疗感',
    layoutHint: '柔和背景+关怀文案+就医建议',
    previewImg: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
    gradient: 'linear-gradient(145deg, #e0f7fa 0%, #f3e5f5 100%)',
    accent: '#00838f',
  },
];

export function getImageTemplatesByIds(ids: string[]): ImageBuiltinTemplate[] {
  return ids
    .map((id) => getImageTemplate(id))
    .filter((t): t is ImageBuiltinTemplate => Boolean(t));
}

const TITLE_TO_ID: Record<string, string> = Object.fromEntries(
  IMAGE_BUILTIN_TEMPLATES.map((t) => [t.name, t.id])
);

export function getImageTemplate(id: string | null | undefined): ImageBuiltinTemplate | undefined {
  if (!id) return undefined;
  return IMAGE_BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function imageTemplateIdFromTitle(title: string): string | null {
  return TITLE_TO_ID[title.trim()] ?? null;
}

export function parseImageTemplateFromText(text: string): string | null {
  const t = text.trim();
  const byTitle = imageTemplateIdFromTitle(t);
  if (byTitle) return byTitle;
  const lower = t.toLowerCase();
  if (lower.includes('小红书')) return 'xiaohongshu';
  if (lower.includes('疾病教育') || lower.includes('海报')) return 'disease-poster';
  if (lower.includes('科普图文') || lower.includes('健康科普')) return 'health-science';
  if (lower.includes('医疗场景')) return 'medical-scene';
  if (lower.includes('药品说明')) return 'drug-info';
  if (lower.includes('患者关怀')) return 'patient-care';
  return null;
}

export const IMAGE_TEMPLATE_CHIP_NAMES = IMAGE_BUILTIN_TEMPLATES.map((t) => t.name);
