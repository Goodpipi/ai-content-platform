export type HomeEntryIntent =
  | 'general'
  | 'insight'
  | 'copy'
  | 'visual'
  | 'video'
  | 'ppt'
  | 'visual-template'
  | 'ppt-template';

export interface HomeEntryContext {
  intent: HomeEntryIntent;
  templateTitle?: string;
}

export function isPptEntryIntent(ctx?: HomeEntryContext | null): boolean {
  return ctx?.intent === 'ppt' || ctx?.intent === 'ppt-template';
}

export function isVisualEntryIntent(ctx?: HomeEntryContext | null): boolean {
  return ctx?.intent === 'visual' || ctx?.intent === 'visual-template';
}

/** 从首页图片入口进入时，短句应走配图流程而非 PPT 大纲 */
export function shouldPreferVisualFlow(
  ctx: HomeEntryContext | null | undefined,
  text: string
): boolean {
  if (!isVisualEntryIntent(ctx)) return false;
  if (/ppt|幻灯片|演示文稿|课件/i.test(text)) return false;
  if ((text.includes('话题') && text.includes('洞察')) || /生成文案|视频脚本|生成视频/.test(text)) {
    return false;
  }
  return true;
}

const INTENT_LABELS: Record<Exclude<HomeEntryIntent, 'visual-template' | 'ppt-template'>, string> = {
  general: '内容创作',
  insight: '话题洞察',
  copy: '文案',
  visual: '图片',
  video: '视频脚本',
  ppt: 'PPT',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 根据首页自由输入粗略识别用户意图 */
export function detectHomeIntent(text: string): HomeEntryIntent | 'unknown' {
  const t = text.trim();
  if (!t) return 'general';
  if (/veeva|审批|提交包/i.test(t)) return 'general';
  if (/ppt|幻灯片|演示文稿|课件/i.test(t)) return 'ppt';
  if (/视频|分镜|口播|短视频/i.test(t)) return 'video';
  if (/洞察|热点|话题分析|趋势/i.test(t)) return 'insight';
  if (/文案|撰写|稿子|科普文/i.test(t)) return 'copy';
  if (/图片|配图|海报|封面|视觉|插画/i.test(t)) return 'visual';
  return 'unknown';
}

/** 首页输入进入任务后的引导话术（不直接触发生成） */
export function getHomeInputGuidance(
  userText: string,
  detected: HomeEntryIntent | 'unknown'
): { html: string; chips: string[]; suggestedIntent: HomeEntryIntent } {
  const quoted = escapeHtml(userText.length > 100 ? `${userText.slice(0, 100)}…` : userText);

  if (detected === 'unknown') {
    return {
      suggestedIntent: 'general',
      html: `收到你的想法：「${quoted}」。我还不能完全确定你想做哪类内容，请<strong>再具体说说</strong>（例如渠道、受众、疾病领域、画面风格或使用场景），或直接点下方按钮选择创作类型：`,
      chips: ['生成话题洞察', '生成文案', '生成图片', '生成PPT', '生成视频'],
    };
  }

  const welcome = getEntryWelcome({ intent: detected });
  const label = INTENT_LABELS[detected as keyof typeof INTENT_LABELS] || '内容创作';

  return {
    suggestedIntent: detected,
    html: `你提到：「${quoted}」。看起来你想做<strong>${label}</strong>。${welcome.html}<br><br>请<strong>再补充一些具体细节</strong>后在下方输入框发送，或直接点快捷按钮开始：`,
    chips: welcome.chips,
  };
}

export function getEntryWelcome(ctx: HomeEntryContext): { html: string; chips: string[] } {
  const { intent, templateTitle } = ctx;

  switch (intent) {
    case 'insight':
      return {
        html: '今天想生成<strong>有关什么主题</strong>的洞察报告呢？可以告诉我渠道（如小红书）、受众或疾病领域，我会结合默认素材为你分析。',
        chips: ['小红书肾脏健康热点', '公众疾病教育洞察', '基于默认素材生成话题洞察', '补充热点关键词'],
      };
    case 'copy':
      return {
        html: '今天想创作<strong>哪类文案</strong>？例如小红书科普、患者教育长图或 HCP 沟通稿，也可以直接描述产品与受众。',
        chips: ['小红书科普文案', '患者教育长图文案', 'HCP沟通文案', '基于选中话题生成文案'],
      };
    case 'visual':
      return {
        html: '想生成<strong>什么类型的配图</strong>？请说明主题、受众、渠道（如小红书）和希望的画面风格。',
        chips: ['肾脏健康科普配图', '疾病教育海报', '清爽蓝绿品牌风', '可申达小红书配图'],
      };
    case 'visual-template':
      return {
        html: `您已选择<strong>「${templateTitle || '图片'}」</strong>模板。请问要生成什么样的图片？请补充主题、文案要点或视觉偏好。`,
        chips: ['肾脏健康主题', '加入可申达品牌元素', '公众科普风格', '减少营销感'],
      };
    case 'video':
      return {
        html: '想制作<strong>什么主题的视频脚本</strong>？请说明时长偏好、受众（公众/患者/HCP）和核心信息点。',
        chips: ['30秒科普短视频', '患者教育口播脚本', 'HCP学术短视频', '基于文案生成视频'],
      };
    case 'ppt':
      return {
        html: '想制作<strong>什么场景的 PPT</strong>？请先告诉我目标受众和使用场景，我会先帮你生成可编辑大纲。',
        chips: ['医生-作用机制', '公众-疾病教育', '产品培训课件', '科室会汇报'],
      };
    case 'ppt-template':
      return {
        html: `您已选择<strong>「${templateTitle || 'PPT'}」</strong>模板。请问这份 PPT 的受众是谁、用于什么场景？确认后我会生成大纲供你编辑。`,
        chips: ['医生/HCP', '作用机制', '疾病教育', '产品培训'],
      };
    default:
      return {
        html: '已创建可申达内容任务，并自动带出默认素材。直接说出你的目标，或点下方快捷按钮开始。',
        chips: ['生成话题洞察', '生成文案', '生成图片', '生成PPT', '生成视频'],
      };
  }
}

export const HOME_IMAGE_TEMPLATES = [
  { title: '小红书配图', img: 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=400' },
  { title: '疾病教育海报', img: 'https://images.unsplash.com/photo-1559757175-053139280de2?w=400' },
  { title: '健康科普图文', img: 'https://images.unsplash.com/photo-1559757175-9e351c9a1301?w=400' },
  { title: '医疗场景图', img: '' },
  { title: '药品说明', img: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400' },
  { title: '患者关怀', img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400' },
] as const;

export const HOME_PPT_TEMPLATES = [
  { title: 'HCP沟通方案', img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400' },
  { title: '患者教育PPT', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400' },
  { title: '疾病科普模板', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' },
  { title: '内部培训PPT', img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400' },
] as const;
