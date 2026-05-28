/** 与前端 pptTemplates.ts 保持 id / variantIndex 一致 */
export const PPT_BUILTIN_TEMPLATES = [
  { id: 'hcp-comm', name: 'HCP沟通方案', styleTag: '拜耳蓝 · 专业', variantIndex: 0 },
  { id: 'patient-edu', name: '患者教育PPT', styleTag: '蓝绿 · 亲和', variantIndex: 1 },
  { id: 'disease-science', name: '疾病科普模板', styleTag: '浅蓝 · 科普', variantIndex: 2 },
  { id: 'internal-training', name: '内部培训PPT', styleTag: '深蓝 · 培训', variantIndex: 3 },
];

export function getPptTemplate(id) {
  if (!id) return PPT_BUILTIN_TEMPLATES[0];
  return PPT_BUILTIN_TEMPLATES.find((t) => t.id === id) || PPT_BUILTIN_TEMPLATES[0];
}
