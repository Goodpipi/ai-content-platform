/** 大纲页可选的内置 PPT 模板（与首页 PPT 模板名称对应） */
export interface PptBuiltinTemplate {
  id: string;
  name: string;
  description: string;
  styleTag: string;
  /** 服务端 SVG 配色变体索引 */
  variantIndex: number;
  /** 卡片预览渐变 */
  gradient: string;
  accent: string;
}

export const PPT_BUILTIN_TEMPLATES: PptBuiltinTemplate[] = [
  {
    id: 'hcp-comm',
    name: 'HCP沟通方案',
    description: '稳重商务蓝，适合科室会、拜访讲解',
    styleTag: '拜耳蓝 · 专业',
    variantIndex: 0,
    gradient: 'linear-gradient(135deg, #eaf7ff 0%, #d4e8ff 100%)',
    accent: '#103C8F',
  },
  {
    id: 'patient-edu',
    name: '患者教育PPT',
    description: '清新蓝绿，适合患者宣教与家属说明',
    styleTag: '蓝绿 · 亲和',
    variantIndex: 1,
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
    accent: '#2e7d32',
  },
  {
    id: 'disease-science',
    name: '疾病科普模板',
    description: '简约留白，信息层次清晰',
    styleTag: '浅蓝 · 科普',
    variantIndex: 2,
    gradient: 'linear-gradient(135deg, #e3f2fd 0%, #fafafa 100%)',
    accent: '#1565c0',
  },
  {
    id: 'internal-training',
    name: '内部培训PPT',
    description: '结构清晰，适合内训与知识传递',
    styleTag: '深蓝 · 培训',
    variantIndex: 3,
    gradient: 'linear-gradient(135deg, #e8eaf6 0%, #ede7f6 100%)',
    accent: '#4527a0',
  },
];

const TITLE_TO_ID: Record<string, string> = {
  HCP沟通方案: 'hcp-comm',
  患者教育PPT: 'patient-edu',
  疾病科普模板: 'disease-science',
  内部培训PPT: 'internal-training',
};

export function getPptTemplate(id: string | null | undefined): PptBuiltinTemplate | undefined {
  if (!id) return undefined;
  return PPT_BUILTIN_TEMPLATES.find((t) => t.id === id);
}

export function pptTemplateIdFromTitle(title: string): string | null {
  return TITLE_TO_ID[title] ?? null;
}
