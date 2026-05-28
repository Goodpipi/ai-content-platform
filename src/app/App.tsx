import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as api from '@/lib/api';
import type {
  TopicItem,
  CopyItem,
  TeamContentType,
  TeamResult,
  VideoResult,
  VideoRenderVersion,
  PptResult,
  PptOutline,
  PptDesignVersion,
} from '@/types/content';
import {
  buildTeamReviewPayload,
  TEAM_CONTENT_LABELS,
} from '@/app/components/teamReviewUtils';
import { buildVideoPosterDataUrl } from '@/app/components/videoUtils';
import { VisualEditor } from '@/app/components/VisualEditor';
import { parseSvgFromDataUrl } from '@/app/components/svgEditorUtils';
import { PptOutlineEditor } from '@/app/components/PptOutlineEditor';
import { getPptTemplate, pptTemplateIdFromTitle } from '@/app/components/pptTemplates';
import { getImageTemplatesByIds } from '@/app/components/imageTemplates';
import { ImageTemplatePickerModal } from '@/app/components/ImageTemplatePickerModal';
import { MaterialPickerModal, type PickedMaterial } from '@/app/components/MaterialPickerModal';
import {
  normalizeOutline,
  parseAudience,
  parseScenario,
  slideToPreviewUrl,
} from '@/app/components/pptUtils';
import { RoleSwitcher } from '@/app/components/RoleSwitcher';
import { ReviewerHome } from '@/app/components/ReviewerHome';
import { CopyReviewEditor } from '@/app/components/CopyReviewEditor';
import { CopyRevisionDisplay } from '@/app/components/CopyRevisionDisplay';
import { OpsImageReviewPanel } from '@/app/components/OpsImageReviewPanel';
import { alignImageReviewArrays } from '@/lib/imageReviewUtils';
import { parseFigmaCaptureId } from '@/lib/figmaCapture';
import { PptSlidesPanel } from '@/app/components/PptSlidesPanel';
import { ReviewerVisualPanel } from '@/app/components/ReviewerVisualPanel';
import { loadUserRole, saveUserRole, isReviewerRole } from '@/lib/userRole';
import {
  loadReviewTasks,
  upsertReviewTask,
  getReviewTask,
  tasksForRole,
  updateTaskStatus,
  seedReviewTasksIfEmpty,
  reviewerTabsForContentType,
  mergeSessionCopyRevisions,
  sessionCopyRevisionBase,
  propagateCopyRevisionsToSession,
} from '@/lib/reviewTasks';
import { createCopyRevision, downloadDataUrl, latestCopyText } from '@/lib/copyRevisionUtils';
import type { UserRole, ReviewTask } from '@/types/review';
import { ROLE_PROFILES } from '@/types/review';
import type { CopyRevision, ImageReviewStatus } from '@/types/review';
import {
  detectHomeIntent,
  getEntryWelcome,
  getHomeInputGuidance,
  HOME_IMAGE_TEMPLATES,
  HOME_PPT_TEMPLATES,
  isPptEntryIntent,
  shouldPreferVisualFlow,
  type HomeEntryContext,
  type HomeEntryIntent,
} from '@/app/components/homeGuide';
import { ConfirmModal } from '@/app/components/ConfirmModal';
import {
  DEFAULT_SESSION_TITLE,
  DEMO_SESSION_ID,
  deleteSession,
  deriveSessionStatus,
  deriveSessionSubtitle,
  fallbackSessionTitle,
  formatSessionTime,
  getSession,
  loadAllSessions,
  saveSession,
  seedSessionsIfEmpty,
  sessionStatusBadgeClass,
  sessionStatusLabel,
} from '@/lib/chatSessions';
import type {
  ChatMessage as Message,
  ChatSession,
  SessionAppState as AppState,
  TabKey,
} from '@/types/session';

const cats = ['热点洞察', '合规手册', '参考知识', '品牌briefing', '渠道特色'];

const initialLibrary = [
  { id: 1, cat: '热点洞察', title: '小红书肾脏健康热点观察 2026-05', meta: 'CMS洞察 · 热点词/互动趋势', cms: true, def: true },
  { id: 2, cat: '合规手册', title: '公众渠道疾病教育合规手册', meta: 'Word · 全局资料 · 最新版', cms: false, def: true },
  { id: 3, cat: '参考知识', title: '肾脏健康疾病教育参考知识包', meta: 'PDF/Excel · 12条知识点', cms: false, def: true },
  { id: 4, cat: '品牌briefing', title: '可申达 2026 品牌沟通 Briefing', meta: 'PDF · 2.4MB · 本地上传', cms: false, def: true },
  { id: 5, cat: '渠道特色', title: '小红书渠道表达与视觉偏好', meta: '上传资料 · 风格案例 15 个', cms: false, def: true },
  { id: 6, cat: '参考知识', title: '可申达 Approved Claims Library', meta: 'CMS · Approved · 可追溯', cms: true, def: true },
  { id: 7, cat: '渠道特色', title: 'Bayer Blue-Green Visual Kit 2026', meta: 'CMS · Brand Kit · Approved', cms: true, def: true },
  { id: 8, cat: '参考知识', title: '患者教育手册:慢性肾病风险认知', meta: 'CMS · Approved · 2026-04-12', cms: true, def: false },
  { id: 9, cat: '热点洞察', title: '公众平台高互动标题样本', meta: '本地上传 · 20条样本', cms: false, def: false }
];

const tabNames = {
  insight: '话题洞察',
  copy: '文案生成',
  team: '团队修改',
  visual: '图片生成',
  'video-script': '视频脚本',
  'video-render': '视频生成',
  'ppt-outline': 'PPT大纲',
  'ppt-design': 'PPT生成',
  submit: 'Veeva提交',
};

const posterData = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 560'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23eaf7ff'/%3E%3Cstop offset='1' stop-color='%23f4fff0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='560' fill='url(%23g)'/%3E%3Ccircle cx='720' cy='110' r='100' fill='%2369BE28' opacity='.22'/%3E%3Ccircle cx='145' cy='115' r='82' fill='%231d6bff' opacity='.16'/%3E%3Cpath d='M560 360c90-100 190-85 260-28v228H520c-35-68-27-137 40-200z' fill='%2369BE28' opacity='.24'/%3E%3Crect x='54' y='46' width='118' height='42' rx='21' fill='%23103C8F'/%3E%3Ctext x='83' y='73' font-size='24' font-weight='700' fill='white'%3EBayer%3C/text%3E%3Ctext x='70' y='175' font-size='58' font-weight='900' fill='%23103C8F'%3E%E8%82%BE%E8%84%8F%E5%81%A5%E5%BA%B7%3C/text%3E%3Ctext x='70' y='248' font-size='58' font-weight='900' fill='%23103C8F'%3E%E4%B8%8D%E6%AD%A2%E7%9C%8B%E7%97%87%E7%8A%B6%3C/text%3E%3Ctext x='74' y='316' font-size='28' fill='%2340536a'%3E%E4%BA%86%E8%A7%A3%E9%A3%8E%E9%99%A9%E5%9B%A0%E7%B4%A0%EF%BC%8C%E5%87%BA%E7%8E%B0%E7%96%91%E9%97%AE%E6%97%B6%E8%AF%B7%E5%92%A8%E8%AF%A2%E4%B8%93%E4%B8%9A%E5%8C%BB%E7%94%9F%3C/text%3E%3Crect x='70' y='410' width='420' height='64' rx='32' fill='%23fff' stroke='%23cfe0f1'/%3E%3Ctext x='100' y='452' font-size='24' fill='%231d5aa7'%3E%E7%96%BE%E7%97%85%E6%95%99%E8%82%B2%E5%86%85%E5%AE%B9%EF%BD%9C%E4%BB%85%E4%BE%9B%E7%A7%91%E6%99%AE%E5%8F%82%E8%80%83%3C/text%3E%3C/svg%3E";

type Screen = 'home' | 'library' | 'workspace';

type EditorTarget =
  | { kind: 'image'; index: number }
  | { kind: 'ppt-slide'; index: number };

const emptyWorkspaceState = (): AppState => ({
  tabs: [],
  active: null,
  insight: false,
  copy: false,
  team: false,
  visual: false,
  videoScript: false,
  videoRender: false,
  pptOutline: false,
  pptDesign: false,
  submit: false,
});

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [activeCat, setActiveCat] = useState(cats[0]);
  const [onlyDefault, setOnlyDefault] = useState(false);
  const [library, setLibrary] = useState(initialLibrary);
  const [libSearch, setLibSearch] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('DeepSeek-V3.1');
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [insightSummary, setInsightSummary] = useState('');
  const [copies, setCopies] = useState<CopyItem[]>([]);
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [videoVersions, setVideoVersions] = useState<VideoRenderVersion[]>([]);
  const [selectedVideoVersionId, setSelectedVideoVersionId] = useState<string | null>(null);
  const [pptResult, setPptResult] = useState<PptResult | null>(null);
  const [pptOutline, setPptOutline] = useState<PptOutline | null>(null);
  const [pptVersions, setPptVersions] = useState<PptDesignVersion[]>([]);
  const [selectedPptVersionId, setSelectedPptVersionId] = useState<string | null>(null);
  const [selectedPptTemplateId, setSelectedPptTemplateId] = useState<string | null>(null);
  const [pptWizard, setPptWizard] = useState<{
    active: boolean;
    step: 'audience' | 'scenario' | null;
    audience: string;
    scenario: string;
    pendingNote: string;
  } | null>(null);
  const [visualWizard, setVisualWizard] = useState<{
    active: boolean;
    step: 'ask';
    pendingNote: string;
    templateHint: string;
  } | null>(null);
  const [imageTemplateModal, setImageTemplateModal] = useState<{
    pendingNote: string;
    templateHint: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const [state, setState] = useState<AppState>(emptyWorkspaceState());
  const [guides, setGuides] = useState<string[]>(['基于默认素材生成话题洞察:']);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [toastText, setToastText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(() => loadUserRole());
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>(() => loadReviewTasks());
  const [activeReviewTaskId, setActiveReviewTaskId] = useState<string | null>(null);
  const [copyRevisions, setCopyRevisions] = useState<CopyRevision[]>([]);
  const [copyRevisionBase, setCopyRevisionBase] = useState('');
  const [teamAssigneeRoles, setTeamAssigneeRoles] = useState<('medical' | 'marketing')[]>([]);
  const [editorSrc, setEditorSrc] = useState('');
  const [editorSvg, setEditorSvg] = useState<string | undefined>();
  const [modalContent, setModalContent] = useState({ title: '', body: '' });
  const [showModal, setShowModal] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [imageReviewOrigins, setImageReviewOrigins] = useState<string[]>([]);
  const [imageReviewStatuses, setImageReviewStatuses] = useState<ImageReviewStatus[]>([]);
  const [selectedImages, setSelectedImages] = useState<boolean[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<boolean[]>([true, true, false, false]);
  const [selectedCopies, setSelectedCopies] = useState<boolean[]>([true, false, false]);
  const [editingCopy, setEditingCopy] = useState('');
  const [showCopyEditModal, setShowCopyEditModal] = useState(false);
  const [teamModificationInProgress, setTeamModificationInProgress] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamReviewTarget, setTeamReviewTarget] = useState<TeamContentType | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [deadline, setDeadline] = useState('');
  const [taskTitle, setTaskTitle] = useState(DEFAULT_SESSION_TITLE);
  const [titleLocked, setTitleLocked] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const isHydratingRef = useRef(false);
  const autoTitleSessionRef = useRef<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCat, setPickerCat] = useState(cats[0]);
  const [pickerTarget, setPickerTarget] = useState<'workspace' | 'chat'>('workspace');
  const [pickerTab, setPickerTab] = useState<'upload' | 'cms'>('upload');
  const [entryContext, setEntryContext] = useState<HomeEntryContext | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const pptWizardRef = useRef(pptWizard);
  const visualWizardRef = useRef(visualWizard);
  stateRef.current = state;
  pptWizardRef.current = pptWizard;
  visualWizardRef.current = visualWizard;

  const buildWorkspaceSnapshot = useCallback(
    () => ({
      state,
      topics,
      copies,
      teamResult,
      videoResult,
      videoVersions,
      selectedVideoVersionId,
      pptResult,
      pptOutline,
      pptVersions,
      selectedPptVersionId,
      selectedPptTemplateId,
      generatedImages,
      imageReviewOrigins,
      imageReviewStatuses,
      selectedImages,
      insightSummary,
      selectedTopics,
      selectedCopies,
      copyRevisions,
      copyRevisionBase,
      entryContext,
      pptWizard,
      visualWizard,
    }),
    [
      state,
      topics,
      copies,
      teamResult,
      videoResult,
      videoVersions,
      selectedVideoVersionId,
      pptResult,
      pptOutline,
      pptVersions,
      selectedPptVersionId,
      selectedPptTemplateId,
      generatedImages,
      imageReviewOrigins,
      imageReviewStatuses,
      selectedImages,
      insightSummary,
      selectedTopics,
      selectedCopies,
      copyRevisions,
      copyRevisionBase,
      entryContext,
      pptWizard,
      visualWizard,
    ]
  );

  const refreshSessionList = useCallback(() => {
    setSessions(loadAllSessions());
  }, []);

  const persistCurrentSession = useCallback(() => {
    if (!currentSessionId || isHydratingRef.current) return;
    const existing = getSession(currentSessionId);
    const session: ChatSession = {
      id: currentSessionId,
      title: taskTitle,
      titleLocked,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      messages,
      workspace: buildWorkspaceSnapshot(),
    };
    saveSession(session);
    refreshSessionList();
  }, [
    currentSessionId,
    taskTitle,
    titleLocked,
    messages,
    buildWorkspaceSnapshot,
    refreshSessionList,
  ]);

  const loadSessionIntoApp = useCallback((session: ChatSession) => {
    isHydratingRef.current = true;
    setCurrentSessionId(session.id);
    setTaskTitle(session.title);
    const locked =
      session.titleLocked ||
      session.title.trim() !== DEFAULT_SESSION_TITLE;
    setTitleLocked(locked);
    autoTitleSessionRef.current = locked ? session.id : null;
    setMessages(session.messages);
    const w = session.workspace;
    const legacy = w.state as AppState & { video?: boolean };
    const normalizedTabs = (legacy.tabs || []).map((t) =>
      (t as string) === 'video' ? 'video-script' : t
    ) as TabKey[];
    const normalizedState: AppState = {
      ...legacy,
      tabs: normalizedTabs,
      videoScript: legacy.videoScript ?? Boolean(legacy.video),
      videoRender: legacy.videoRender ?? false,
      active:
        legacy.active === ('video' as TabKey) ? 'video-script' : legacy.active,
    };
    setState(normalizedState);
    setTopics(w.topics);
    setCopies(w.copies);
    setTeamResult(w.teamResult);
    setVideoResult(w.videoResult);
    setVideoVersions(w.videoVersions || []);
    setSelectedVideoVersionId(w.selectedVideoVersionId ?? null);
    setPptResult(w.pptResult);
    setPptOutline(w.pptOutline);
    setPptVersions(w.pptVersions);
    setSelectedPptVersionId(w.selectedPptVersionId);
    setSelectedPptTemplateId(w.selectedPptTemplateId ?? null);
    setGeneratedImages(w.generatedImages);
    const imgCount = w.generatedImages?.length ?? 0;
    const { origins: loadedOrigins, statuses: loadedStatuses } = alignImageReviewArrays(
      w.generatedImages ?? [],
      w.imageReviewOrigins ?? [],
      w.imageReviewStatuses ?? []
    );
    setImageReviewOrigins(loadedOrigins);
    setImageReviewStatuses(loadedStatuses);
    setSelectedImages(
      w.selectedImages?.length === imgCount
        ? w.selectedImages
        : imgCount > 0
          ? w.generatedImages.map((_, i) => i === 0)
          : []
    );
    setInsightSummary(w.insightSummary);
    setSelectedTopics(w.selectedTopics);
    setSelectedCopies(w.selectedCopies);
    let revisions = w.copyRevisions || [];
    let revisionBase = w.copyRevisionBase || '';
    const sessionMerged = mergeSessionCopyRevisions(session.id);
    if (sessionMerged.length) {
      revisions = sessionMerged;
      revisionBase = sessionCopyRevisionBase(session.id) || revisionBase;
    }
    setCopyRevisions(revisions);
    setCopyRevisionBase(revisionBase);
    setEntryContext(w.entryContext);
    setPptWizard(w.pptWizard);
    setVisualWizard(w.visualWizard ?? null);
    setAttachments([]);
    setInputValue('');
    setSelectedPrompt('');
    requestAnimationFrame(() => {
      isHydratingRef.current = false;
    });
  }, []);

  const getActiveCopyBody = useCallback(() => {
    if (teamResult?.after) return teamResult.after;
    const idx = selectedCopies.findIndex(Boolean);
    const copy = copies[idx >= 0 ? idx : 0];
    return copy?.body || '';
  }, [teamResult, selectedCopies, copies]);

  const buildTeamPayload = useCallback(
    (type: TeamContentType) =>
      buildTeamReviewPayload(type, {
        copies,
        selectedCopies,
        getCopyBody: getActiveCopyBody,
        generatedImages,
        selectedImages,
        videoResult,
        pptOutline,
        pptResult,
      }),
    [
      copies,
      selectedCopies,
      getActiveCopyBody,
      generatedImages,
      selectedImages,
      videoResult,
      pptOutline,
      pptResult,
    ]
  );

  const resolveTeamReviewType = (text: string, activeTab: TabKey | null): TeamContentType => {
    if (text.includes('图片') || text.includes('配图') || text.includes('海报')) return 'visual';
    if (text.includes('视频')) return 'video';
    if (text.includes('PPT') || text.includes('ppt')) return 'ppt';
    if (activeTab === 'visual') return 'visual';
    if (activeTab === 'video-script' || activeTab === 'video-render') return 'video';
    if (activeTab === 'ppt-outline' || activeTab === 'ppt-design') return 'ppt';
    return 'copy';
  };

  const openTeamReview = useCallback(
    (type: TeamContentType) => {
      if (type === 'visual' && generatedImages.length > 0 && !selectedImages.some(Boolean)) {
        toast('请至少勾选一张图片后再提交团队修改');
        return;
      }
      const payload = buildTeamPayload(type);
      if (!payload) {
        if (type === 'visual' && generatedImages.length > 0) {
          toast('请至少勾选一张图片后再提交团队修改');
        } else {
          toast(`请先生成${TEAM_CONTENT_LABELS[type]}后再提交团队修改`);
        }
        return;
      }
      setTeamReviewTarget(type);
      setTeamAssigneeRoles([]);
      setShowTeamModal(true);
    },
    [buildTeamPayload, generatedImages, selectedImages]
  );

  const toggleTeamAssigneeRole = (role: 'medical' | 'marketing') => {
    setTeamAssigneeRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const setAllTeamAssigneeRoles = (checked: boolean) => {
    setTeamAssigneeRoles(checked ? ['medical', 'marketing'] : []);
  };

  const buildContentBrief = useCallback(
    (userNote = '') => {
      const copy = getActiveCopyBody();
      if (copy.trim().length > 20) {
        return { brief: userNote ? `${copy}\n\n补充要求：${userNote}` : copy, sufficient: true };
      }
      const topicStr = topics
        .filter((_, i) => selectedTopics[i] !== false)
        .map((t) => t.title)
        .filter(Boolean)
        .join('；');
      if (topicStr) {
        const brief = `主题方向：${topicStr}${userNote ? `\n要求：${userNote}` : ''}`;
        return { brief, sufficient: true };
      }
      const recentUser = messages
        .filter((m) => m.role === 'user')
        .slice(-4)
        .map((m) => m.html.replace(/<[^>]+>/g, ''))
        .join('\n');
      const mats = library
        .filter((m) => m.def)
        .map((m) => `[${m.cat}] ${m.title}`)
        .join('\n');
      const brief = [userNote, recentUser, mats ? `默认素材：\n${mats}` : '']
        .filter(Boolean)
        .join('\n\n');
      const sufficient = brief.trim().length >= 24;
      return {
        brief: sufficient ? brief : brief || '可申达｜肾脏健康疾病教育｜小红书公众渠道',
        sufficient: sufficient || brief.trim().length >= 12,
      };
    },
    [getActiveCopyBody, topics, selectedTopics, messages, library]
  );

  const guideForMoreInfo = (taskLabel: string) => {
    addMsg(
      'ai',
      `好的，我可以帮你${taskLabel}。为更贴合品牌与合规要求，请补充：<br>· 目标受众（公众 / 患者 / HCP）<br>· 发布渠道与用途<br>· 希望强调的核心信息或参考风格<br><br>也可以先上传素材，或直接描述你的需求。`,
      'DeepSeek-V3.1',
      ['生成话题洞察', '生成文案', '生成图片', '生成PPT', '生成视频']
    );
  };

  const dispatchUserIntent = (text: string, skipUserMsg = false) => {
    const lower = text.toLowerCase();
    if ((text.includes('话题') || lower.includes('topic')) && text.includes('洞察')) {
      runInsight(text, { skipUserMsg });
    } else if (text.includes('文案') || lower.includes('copy')) {
      runCopy(text, { skipUserMsg });
    } else if (text.includes('团队') && text.includes('修改')) {
      if (text.includes('整合') || text.includes('反馈')) {
        runTeam({ skipUserMsg, feedback: text });
      } else {
        openTeamReview(resolveTeamReviewType(text, stateRef.current.active));
      }
    } else if (
      text.includes('图片') ||
      text.includes('配图') ||
      text.includes('海报') ||
      lower.includes('image') ||
      lower.includes('visual')
    ) {
      startVisualFlow(text, { skipUserMsg });
    } else if (text.includes('视频') || lower.includes('video')) {
      runVideo(text, { skipUserMsg });
    } else if (text.includes('PPT') || text.includes('ppt')) {
      startPptFlow(text, { skipUserMsg });
    } else if (text.includes('Veeva') || text.includes('veeva') || text.includes('审批') || text.includes('提交')) {
      runSubmit({ skipUserMsg });
    } else {
      void runWithAi('正在思考', async () => {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.html.replace(/<[^>]+>/g, ''),
        }));
        const { reply } = await api.chat(library, history, text);
        addMsg('ai', reply.replace(/\n/g, '<br>'), 'DeepSeek-V3.1', nextPrompts());
      });
    }
  };

  useEffect(() => {
    api.checkHealth().then((h) => setApiReady(h.deepseekConfigured)).catch(() => setApiReady(false));
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const toast = (text: string) => {
    setToastText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  const openSession = useCallback(
    (id: string) => {
      const session = getSession(id);
      if (!session) {
        toast('会话不存在或已被删除');
        refreshSessionList();
        return;
      }
      setCurrentScreen('workspace');
      loadSessionIntoApp(session);
    },
    [loadSessionIntoApp, refreshSessionList]
  );

  const handleDeleteSession = () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    deleteSession(id);
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setCurrentScreen('home');
    }
    refreshSessionList();
    setDeleteConfirm(null);
    toast('对话已删除');
  };

  const commitTitleEdit = () => {
    setIsEditingTitle(false);
    setTitleLocked(true);
    if (currentSessionId) autoTitleSessionRef.current = currentSessionId;
    const trimmed = taskTitle.trim() || DEFAULT_SESSION_TITLE;
    setTaskTitle(trimmed.startsWith('可申达') ? trimmed : `可申达｜${trimmed}`);
  };

  const applyAutoSessionTitle = (title: string, sessionId: string) => {
    if (autoTitleSessionRef.current === sessionId) return;
    setTaskTitle(title);
    setTitleLocked(true);
    autoTitleSessionRef.current = sessionId;
  };

  useEffect(() => {
    seedReviewTasksIfEmpty();
    setReviewTasks(loadReviewTasks());
    setSessions(seedSessionsIfEmpty());
  }, []);

  const refreshReviewTasks = useCallback(() => {
    setReviewTasks(loadReviewTasks());
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    saveUserRole(role);
    setActiveReviewTaskId(null);
    if (role === 'ops') {
      setCurrentScreen('home');
    }
  };

  useEffect(() => {
    persistCurrentSession();
  }, [persistCurrentSession]);

  useEffect(() => {
    if (!currentSessionId || titleLocked || isHydratingRef.current) return;
    if (autoTitleSessionRef.current === currentSessionId) return;
    const hasUser = messages.some((m) => m.role === 'user');
    const ready = hasUser && (messages.length >= 2 || state.tabs.length > 0);
    if (!ready) return;

    const sessionId = currentSessionId;
    const timer = setTimeout(() => {
      void (async () => {
        if (autoTitleSessionRef.current === sessionId) return;
        try {
          const payload = messages.slice(-12).map((m) => ({
            role: m.role,
            content: m.html.replace(/<[^>]+>/g, ''),
          }));
          const { title } = await api.generateSessionTitle(payload);
          if (title && currentSessionId === sessionId) {
            applyAutoSessionTitle(title, sessionId);
          }
        } catch {
          if (currentSessionId === sessionId && autoTitleSessionRef.current !== sessionId) {
            applyAutoSessionTitle(fallbackSessionTitle(messages), sessionId);
          }
        }
      })();
    }, 2200);

    return () => clearTimeout(timer);
    // 仅在新对话首次满足条件时命名一次；后续 messages 变化不再触发
    // eslint-disable-next-line react-hooks/exhaustive-deps -- titleLocked / ref 负责阻断重复命名
  }, [messages.length, state.tabs.length, currentSessionId, titleLocked]);

  const toggleDefault = (id: number) => {
    setLibrary(prev => prev.map(item =>
      item.id === id ? { ...item, def: !item.def } : item
    ));
    const item = library.find(x => x.id === id);
    if (item) {
      toast(item.def ? '已取消默认素材' : '已设为默认素材');
    }
  };

  const simulateUpload = () => {
    setLibrary(prev => [{
      id: Date.now(),
      cat: activeCat,
      title: activeCat + '｜新上传资料.pdf',
      meta: '本地上传 · 刚刚 · 已解析',
      cms: false,
      def: false
    }, ...prev]);
    toast('素材已上传到 ' + activeCat);
  };

  const simulateCmsSearch = () => {
    setLibrary(prev => [{
      id: Date.now(),
      cat: activeCat,
      title: 'CMS搜索结果｜' + activeCat + '相关已审批素材',
      meta: 'CMS · Approved · 刚刚加入候选',
      cms: true,
      def: false
    }, ...prev]);
    toast('已从 CMS 加入候选素材');
  };

  const startFromHome = (ctx: HomeEntryContext, prompt = '') => {
    setCurrentScreen('workspace');
    const trimmed = prompt.trim();
    reset('', ctx, trimmed ? { homeDraft: trimmed } : undefined);
  };

  const newTask = (prompt = '') => startFromHome({ intent: 'general' }, prompt);

  const openExistingTask = (sessionId = DEMO_SESSION_ID) => {
    openSession(sessionId);
  };

  const getComposerPlaceholder = () => {
    const ctx = entryContext;
    if (!ctx) return '直接说你想做什么：生成图片、PPT、视频、文案或话题洞察…';
    switch (ctx.intent) {
      case 'insight':
        return '描述你想洞察的主题，如渠道、疾病领域、受众…';
      case 'copy':
        return '描述文案类型、受众与核心信息…';
      case 'visual':
      case 'visual-template':
        return '描述要生成的图片主题、风格与用途…';
      case 'video':
        return '描述视频主题、受众与时长偏好…';
      case 'ppt':
      case 'ppt-template':
        return '描述 PPT 受众、场景与核心内容…';
      default:
        return '直接说你想做什么…';
    }
  };

  const reset = (
    initialPrompt = '',
    entry?: HomeEntryContext,
    opts?: { homeDraft?: string }
  ) => {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setCurrentSessionId(sessionId);
    setTitleLocked(false);
    setTaskTitle(DEFAULT_SESSION_TITLE);
    autoTitleSessionRef.current = null;
    setMessages([]);
    setState(emptyWorkspaceState());
    setGuides([]);
    setAttachments([]);
    setSelectedPrompt('');
    setInputValue(opts?.homeDraft ?? initialPrompt);
    setGeneratedImages([]);
    setImageReviewOrigins([]);
    setImageReviewStatuses([]);
    setSelectedImages([]);
    setTopics([]);
    setCopies([]);
    setTeamResult(null);
    setVideoResult(null);
    setVideoVersions([]);
    setSelectedVideoVersionId(null);
    setPptResult(null);
    setPptOutline(null);
    setPptVersions([]);
    setSelectedPptVersionId(null);
    setSelectedPptTemplateId(
      entry?.intent === 'ppt-template' && entry.templateTitle
        ? pptTemplateIdFromTitle(entry.templateTitle)
        : null
    );
    setPptWizard(null);
    setVisualWizard(null);
    setInsightSummary('');
    setSelectedTopics([]);
    setSelectedCopies([]);
    setCopyRevisions([]);
    setCopyRevisionBase('');
    setActiveReviewTaskId(null);

    const apiHint =
      apiReady === false
        ? '<br><span style="color:#b72c3e">⚠ 未检测到 DeepSeek API Key，请在项目根目录配置 .env 后重启服务。</span>'
        : '';

    if (opts?.homeDraft) {
      const detected = detectHomeIntent(opts.homeDraft);
      const guidance = getHomeInputGuidance(opts.homeDraft, detected);
      const suggestedIntent = guidance.suggestedIntent as HomeEntryIntent;
      const ctx: HomeEntryContext = {
        intent: suggestedIntent,
        templateTitle: entry?.templateTitle,
      };
      setEntryContext(ctx);
      addMsg('user', opts.homeDraft, selectedModel);
      addMsg('ai', `${guidance.html}${apiHint}`, 'DeepSeek-V3.1', guidance.chips);
    } else {
      const ctx = entry || { intent: 'general' as const };
      setEntryContext(ctx);
      const welcome = getEntryWelcome(ctx);
      addMsg('ai', `${welcome.html}${apiHint}`, 'DeepSeek-V3.1', welcome.chips);
    }

  };

  const addMsg = (role: 'user' | 'ai', html: string, model = '用户', quick: string[] = []) => {
    setMessages(prev => [...prev, { role, html, model, quick }]);
  };

  const send = () => {
    const text = inputValue.trim();
    if (!text) return;
    addMsg('user', text, selectedModel);
    setInputValue('');
    setSelectedPrompt('');
    if (visualWizard?.active && handleVisualWizardReply(text)) return;
    if (pptWizard?.active && handlePptWizardReply(text, inputValue.trim())) return;
    if (shouldPreferVisualFlow(entryContext, text)) {
      const templateHint =
        entryContext?.intent === 'visual-template' ? entryContext.templateTitle : undefined;
      startVisualFlow(text, { skipUserMsg: true, templateHint });
      return;
    }
    dispatchUserIntent(text, true);
  };

  const clearLoadingMessages = () => {
    setMessages((prev) => prev.filter((m) => !m.loading));
  };

  const showLoading = (title: string) => {
    setMessages((prev) => [
      ...prev.filter((m) => !m.loading),
      {
        role: 'ai',
        html: `<div class="agent-card"><strong>${title}</strong><div class="progress"><div class="bar" style="width:78%"></div></div><div class="small">正在调用 DeepSeek，请稍候…</div></div>`,
        model: 'DeepSeek Agent',
        loading: true,
      },
    ]);
  };

  const notifyMockIfNeeded = (meta?: { mockUsed?: boolean }) => {
    if (meta?.mockUsed) {
      toast('DeepSeek 暂不可用，已使用演示数据（可继续体验流程）');
    }
  };

  const runWithAi = async (title: string, fn: () => Promise<void>) => {
    if (isGenerating) {
      toast('请等待当前 AI 生成完成');
      return;
    }
    setIsGenerating(true);
    showLoading(title);
    try {
      await fn();
      clearLoadingMessages();
    } catch (e) {
      clearLoadingMessages();
      const msg = e instanceof Error ? e.message : '生成失败';
      addMsg('ai', `<span style="color:#b72c3e">生成失败：${msg}</span>`, 'DeepSeek-V3.1', ['重试']);
      toast(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const runInsight = (userNote = '', opts?: { skipUserMsg?: boolean }) => {
    if (!opts?.skipUserMsg) addMsg('user', userNote || '生成话题洞察', selectedModel);
    void runWithAi('正在生成话题洞察', async () => {
      const result = await api.generateInsight(library, userNote);
      notifyMockIfNeeded(result);
      setTopics(result.topics);
      setInsightSummary(result.summary || '');
      setSelectedTopics(result.topics.map((_, i) => i < 2));
      setState((prev) => ({ ...prev, insight: true }));
      addTab('insight');
      addMsg(
        'ai',
        `已生成 ${result.topics.length} 个候选话题。${result.summary || ''} 右侧可查看详情并勾选后继续生成文案。`,
        'DeepSeek-V3.1｜话题洞察',
        ['生成文案', '补充小红书热点洞察']
      );
    });
  };

  const runCopy = (userNote = '', opts?: { skipUserMsg?: boolean }) => {
    if (!opts?.skipUserMsg) addMsg('user', userNote || '生成文案', selectedModel);
    const selected = topics.filter((_, i) => selectedTopics[i]);
    const topicInput =
      selected.length > 0
        ? selected
        : topics.length > 0
          ? topics
          : [{ title: userNote || '基于素材与对话内容', reason: '', source: '用户描述' }];
    void runWithAi('正在生成文案', async () => {
      const result = await api.generateCopy(library, topicInput, userNote);
      notifyMockIfNeeded(result);
      setCopies(result.copies);
      setSelectedCopies(result.copies.map((_, i) => i === 0));
      setState((prev) => ({ ...prev, copy: true }));
      addTab('copy');
      addMsg(
        'ai',
        `已生成 ${result.copies.length} 版文案，已自动应用公众渠道合规策略。右侧可编辑文案，或继续生成图片、视频、PPT。`,
        'DeepSeek-V3.1｜文案生成',
        ['进入团队修改', '生成图片', '生成视频', '生成PPT']
      );
    });
  };

  const runTeam = (opts?: {
    skipUserMsg?: boolean;
    contentType?: TeamContentType;
    feedback?: string;
  }) => {
    const type = opts?.contentType || teamReviewTarget || 'copy';
    const payload = buildTeamPayload(type);
    if (!payload) {
      toast(`请先生成${TEAM_CONTENT_LABELS[type]}后再提交团队修改`);
      return;
    }
    if (!opts?.skipUserMsg) {
      addMsg('user', `提交${TEAM_CONTENT_LABELS[type]}团队修改`, selectedModel);
    }
    setTeamModificationInProgress(true);
    void runWithAi(`正在整合${TEAM_CONTENT_LABELS[type]}团队修改`, async () => {
      try {
        const result = await api.generateTeam(payload.body, {
          feedback: opts?.feedback,
          contentType: type,
          contentTitle: payload.title,
        });
        notifyMockIfNeeded(result);
        const normalized: TeamResult = {
          contentType: result.contentType || type,
          contentTitle: result.contentTitle || payload.title,
          before: result.before,
          after: result.after,
          changes: result.changes || [],
          summary: result.summary,
        };
        setTeamResult(normalized);
        setState((prev) => ({ ...prev, team: true, active: 'team' }));
        addTab('team');
        addMsg(
          'ai',
          `已整合「${normalized.contentTitle}」团队反馈：${normalized.summary}。右侧可查看修改前后差异。`,
          'DeepSeek-V3.1｜团队修改',
          ['生成图片', '生成PPT', '生成视频', '提交当前版本到Veeva Vault']
        );
      } finally {
        setTeamModificationInProgress(false);
      }
    });
  };

  const executeVisualGeneration = (userNote: string, templateIds: string[]) => {
    setVisualWizard(null);
    setImageTemplateModal(null);
    const { brief } = buildContentBrief(userNote);
    const templates = getImageTemplatesByIds(templateIds);

    const genLabel =
      templates.length > 1
        ? `正在按 ${templates.length} 个模板生成配图`
        : templates.length === 1
          ? `正在按「${templates[0].name}」模板生成配图`
          : '正在生成图片方案';

    void runWithAi(genLabel, async () => {
      const images: string[] = [];
      const titles: string[] = [];

      if (templates.length === 0) {
        const result = await api.generatePoster(brief, userNote, null);
        notifyMockIfNeeded(result);
        images.push(result.dataUrl);
        titles.push(result.title);
      } else {
        for (const tpl of templates) {
          const result = await api.generatePoster(
            brief,
            `${userNote}\n【模板】${tpl.name}：${tpl.styleHint}`,
            tpl.id
          );
          notifyMockIfNeeded(result);
          images.push(result.dataUrl);
          titles.push(`${tpl.name}：${result.title}`);
        }
      }

      setGeneratedImages(images.length ? images : [posterData]);
      setImageReviewOrigins([]);
      setImageReviewStatuses([]);
      setSelectedImages(images.map((_, i) => i === 0));
      setState((prev) => ({ ...prev, visual: true, active: 'visual' }));
      addTab('visual');

      const summary =
        templates.length > 1
          ? `已按 ${templates.length} 个模板生成 ${images.length} 张配图（${templates.map((t) => t.name).join('、')}）。请在右侧查看。`
          : templates.length === 1
            ? `已按「${templates[0].name}」模板生成配图「${titles[0]}」。请在右侧查看，可勾选后提交团队修改。`
            : `已生成 AI 海报「${titles[0]}」。右侧可勾选图片提交团队修改，或继续生成视频、PPT。`;

      addMsg('ai', summary, 'DeepSeek-V3.1｜图片生成', [
        '进入团队修改',
        '生成视频',
        '生成PPT',
        '提交当前版本到Veeva Vault',
      ]);
    });
  };

  const openImageTemplatePicker = (pendingNote: string, templateHint = '') => {
    setVisualWizard(null);
    setImageTemplateModal({ pendingNote, templateHint });
    addMsg(
      'ai',
      '请在弹窗中浏览模板缩略图，可<strong>多选</strong>模板；右侧可查看版式与风格详情。',
      'DeepSeek-V3.1'
    );
  };

  const isVisualTemplateYes = (text: string) =>
    /^(是|要|需要|好|可以|选用|选择模板|是[，,])/.test(text.trim()) ||
    text.includes('选择模板') ||
    text.includes('选用模板') ||
    (text.includes('是') && text.includes('模板'));

  const isVisualTemplateNo = (text: string) =>
    /^(否|不|不要|不需要|不用|直接)/.test(text.trim()) ||
    text.includes('直接生成') ||
    text.includes('不用模板') ||
    text.includes('否，');

  const handleVisualWizardReply = (text: string): boolean => {
    if (!visualWizard?.active) return false;
    const wizard = visualWizard;

    if (wizard.step === 'ask') {
      if (isVisualTemplateYes(text)) {
        openImageTemplatePicker(wizard.pendingNote, wizard.templateHint);
        return true;
      }
      if (isVisualTemplateNo(text)) {
        executeVisualGeneration(wizard.pendingNote, []);
        return true;
      }
      addMsg(
        'ai',
        '请先选择是否使用内置模板：<strong>是，选择模板</strong> 或 <strong>否，直接生成</strong>。',
        'DeepSeek-V3.1',
        ['是，选择模板', '否，直接生成']
      );
      return true;
    }

    return true;
  };

  const startVisualFlow = (
    userNote = '',
    opts?: { skipUserMsg?: boolean; templateHint?: string }
  ) => {
    if (!opts?.skipUserMsg) addMsg('user', userNote || '生成图片', selectedModel);

    if (visualWizardRef.current?.active) {
      handleVisualWizardReply(userNote);
      return;
    }

    const { sufficient } = buildContentBrief(userNote);
    if (!sufficient) {
      guideForMoreInfo('生成配图/海报');
      return;
    }

    const hint =
      opts?.templateHint ||
      (entryContext?.intent === 'visual-template' && entryContext.templateTitle
        ? entryContext.templateTitle
        : '');

    setVisualWizard({
      active: true,
      step: 'ask',
      pendingNote: userNote,
      templateHint: hint,
    });

    const hintLine = hint
      ? `<br>（您已关注「<strong>${hint}</strong>」，选「是」后可在弹窗中优先勾选该模板。）`
      : '';

    addMsg(
      'ai',
      `准备生成配图。是否选用<strong>内置配图模板</strong>？选「是」将打开模板库（支持多选）；选「否」将按当前描述直接生成。${hintLine}`,
      'DeepSeek-V3.1',
      ['是，选择模板', '否，直接生成']
    );
  };

  const runVideo = (userNote = '', opts?: { skipUserMsg?: boolean }) => {
    if (!opts?.skipUserMsg) addMsg('user', userNote || '生成视频', selectedModel);
    const { brief, sufficient } = buildContentBrief(userNote);
    if (!sufficient) {
      guideForMoreInfo('生成视频脚本');
      return;
    }
    void runWithAi('正在生成视频脚本', async () => {
      const result = await api.generateVideo(brief, userNote);
      notifyMockIfNeeded(result);
      setVideoResult(result);
      setVideoVersions([]);
      setSelectedVideoVersionId(null);
      setState((prev) => ({ ...prev, videoScript: true, active: 'video-script' }));
      addTab('video-script');
      addMsg(
        'ai',
        `已生成短视频脚本「${result.title}」，共 ${result.segments.length} 个分镜。请在右侧「视频脚本」中确认后点击「生成视频」。`,
        'DeepSeek-V3.1｜视频脚本',
        ['生成视频', '生成图片', '生成PPT']
      );
    });
  };

  const enrichVideoVersions = (versions: VideoRenderVersion[], scriptTitle: string) =>
    versions.map((v) => ({
      ...v,
      posterDataUrl: v.posterDataUrl || buildVideoPosterDataUrl(scriptTitle, v.styleTag),
    }));

  const confirmVideoRender = () => {
    if (!videoResult) {
      toast('请先生成视频脚本');
      return;
    }
    void runWithAi('正在合成视频', async () => {
      const res = await api.generateVideoRender(videoResult);
      notifyMockIfNeeded(res);
      const versions = enrichVideoVersions(res.versions || [], videoResult.title);
      setVideoVersions(versions);
      const first = versions[0];
      if (first) setSelectedVideoVersionId(first.id);
      setState((prev) => ({ ...prev, videoRender: true, active: 'video-render' }));
      addTab('video-render');
      addMsg(
        'ai',
        `已根据脚本生成 ${versions.length} 套视频方案（演示占位成片）。请在右侧「视频生成」中预览并提交 Veeva 审批。`,
        'DeepSeek-V3.1｜视频合成',
        ['查看脚本', '提交当前版本到Veeva Vault']
      );
    });
  };

  const selectVideoVersion = (version: VideoRenderVersion) => {
    setSelectedVideoVersionId(version.id);
    toast(`已选用「${version.name}」`);
  };

  const finishPptWizardAndGenerate = (
    wizard: NonNullable<typeof pptWizard>,
    scenario: string
  ) => {
    const audience = wizard.audience;
    if (!audience) {
      toast('请先确认目标受众');
      return;
    }
    const finalScenario = scenario || wizard.scenario || '疾病教育';
    setPptWizard(null);
    void generatePptOutlineAndOpen(wizard.pendingNote, audience, finalScenario);
  };

  const handlePptWizardReply = (text: string, extraAudienceHint = ''): boolean => {
    if (!pptWizard?.active) return false;

    const combined = [text, extraAudienceHint].filter(Boolean).join(' ').trim();
    const step = pptWizard.step || 'audience';

    if (step === 'audience') {
      if (combined.includes('生成大纲')) {
        toast('请先确认目标受众，再选择使用场景');
        return true;
      }
      const audience =
        parseAudience(text) ||
        parseAudience(combined) ||
        (!parseScenario(text) && text.trim().length > 0 && text.trim().length <= 24
          ? text.trim().slice(0, 20)
          : '');
      if (!audience) {
        addMsg(
          'ai',
          '请说明目标受众，例如医生/HCP、公众或患者。',
          'DeepSeek-V3.1',
          ['医生/HCP', '公众', '患者']
        );
        return true;
      }
      const scenarioHint = pptWizard.scenario || parseScenario(text) || '';
      setPptWizard({
        ...pptWizard,
        audience,
        scenario: scenarioHint,
        step: 'scenario',
      });
      addMsg(
        'ai',
        `好的，目标受众是 <strong>${audience}</strong>。请问这份 PPT 的 <strong>使用场景</strong> 是什么？例如：作用机制、产品培训、疾病教育、科室会等。`,
        'DeepSeek-V3.1',
        ['作用机制', '疾病教育', '产品培训', '科室会']
      );
      return true;
    }

    if (step === 'scenario') {
      const scenario =
        parseScenario(text) ||
        parseScenario(combined) ||
        (text.trim().length >= 2 && !parseAudience(text) ? text.trim().slice(0, 40) : '') ||
        pptWizard.scenario ||
        '';
      if (!scenario) {
        addMsg(
          'ai',
          '请选择或输入使用场景，例如作用机制、疾病教育、产品培训等。',
          'DeepSeek-V3.1',
          ['作用机制', '疾病教育', '产品培训', '科室会']
        );
        return true;
      }
      finishPptWizardAndGenerate(pptWizard, scenario);
      return true;
    }

    return true;
  };

  const generatePptOutlineAndOpen = async (
    userNote: string,
    audience: string,
    scenario: string
  ) => {
    const { brief } = buildContentBrief(userNote);
    void runWithAi('正在智能生成 PPT 大纲', async () => {
      const raw = await api.generatePptOutline({
        materials: library,
        brief,
        audience,
        scenario,
        userNote,
      });
      notifyMockIfNeeded(raw);
      const outline = normalizeOutline(raw, audience, scenario);
      setPptOutline(outline);
      setState((prev) => ({ ...prev, pptOutline: true, active: 'ppt-outline' }));
      addTab('ppt-outline');
      addMsg(
        'ai',
        `已为「${outline.title}」生成大纲，共 ${outline.chapters.length} 章。请在右侧「PPT大纲」中编辑大纲；可选模板（不选则生成 3 套方案），确认后点击生成。`,
        'DeepSeek-V3.1｜PPT 大纲',
        ['查看大纲']
      );
    });
  };

  const startPptFlow = (userNote = '', opts?: { skipUserMsg?: boolean }) => {
    if (!opts?.skipUserMsg) addMsg('user', userNote || '生成PPT', selectedModel);

    if (pptWizardRef.current?.active) {
      handlePptWizardReply(userNote, '');
      return;
    }

    const audience = parseAudience(userNote);
    const scenario = parseScenario(userNote);

    if (audience && scenario) {
      void generatePptOutlineAndOpen(userNote, audience, scenario);
      return;
    }

    const scenarioHint = scenario || '';

    if (audience && !scenario) {
      setPptWizard({
        active: true,
        step: 'scenario',
        audience,
        scenario: '',
        pendingNote: userNote,
      });
      addMsg(
        'ai',
        `好的，目标受众是 <strong>${audience}</strong>。请问这份 PPT 的 <strong>使用场景</strong> 是什么？例如：作用机制、产品培训、疾病教育、科室会等。`,
        'DeepSeek-V3.1',
        ['作用机制', '疾病教育', '产品培训', '科室会']
      );
      return;
    }

    setPptWizard({
      active: true,
      step: 'audience',
      audience: '',
      scenario: scenarioHint,
      pendingNote: userNote,
    });

    if (scenarioHint && !audience) {
      addMsg(
        'ai',
        `好的，我先记下场景参考「<strong>${scenarioHint}</strong>」。<br>第一步：请确认这份 PPT 的 <strong>目标受众</strong> 是谁？`,
        'DeepSeek-V3.1',
        ['医生/HCP', '公众', '患者']
      );
      return;
    }

    addMsg(
      'ai',
      '好的，我来帮你准备 PPT。<br>第一步：请先确认 <strong>目标受众</strong> 是谁？',
      'DeepSeek-V3.1',
      ['医生/HCP', '公众', '患者']
    );
  };

  const regeneratePptOutline = () => {
    if (!pptOutline) return;
    void generatePptOutlineAndOpen(
      pptWizard?.pendingNote || '',
      pptOutline.audience,
      pptOutline.scenario
    );
  };

  const outlineFromCopy = () => {
    const copy = getActiveCopyBody();
    if (!copy) {
      toast('暂无文案，请先生成文案或在对话中描述需求');
      return;
    }
    const audience = pptOutline?.audience || '公众';
    const scenario = pptOutline?.scenario || '疾病教育';
    void runWithAi('正在根据文案生成大纲', async () => {
      const raw = await api.generatePptOutline({
        materials: library,
        brief: copy,
        audience,
        scenario,
        userNote: '根据已有文案结构化为PPT大纲',
      });
      notifyMockIfNeeded(raw);
      const outline = normalizeOutline(raw, audience, scenario);
      setPptOutline(outline);
      setState((prev) => ({ ...prev, pptOutline: true, active: 'ppt-outline' }));
      addTab('ppt-outline');
      toast('已根据文案更新大纲');
    });
  };

  const confirmPptDesigns = (mode?: 'template' | 'no-template') => {
    if (!pptOutline) return;
    const effectiveMode =
      mode ?? (getPptTemplate(selectedPptTemplateId) ? 'template' : 'no-template');
    if (effectiveMode === 'template' && !getPptTemplate(selectedPptTemplateId)) {
      toast('请先在「PPT大纲」中选择一套内置模板');
      setState((prev) => ({ ...prev, active: 'ppt-outline' }));
      return;
    }
    if (effectiveMode === 'no-template') {
      setSelectedPptTemplateId(null);
    }
    const tpl =
      effectiveMode === 'template' ? getPptTemplate(selectedPptTemplateId) : null;
    const loadingLabel = tpl
      ? `正在按「${tpl.name}」模板生成 PPT`
      : '正在生成 3 套 PPT 设计方案';
    void runWithAi(loadingLabel, async () => {
      const designs = await api.generatePptDesigns(
        pptOutline,
        pptOutline.audience,
        pptOutline.scenario,
        tpl?.id ?? null
      );
      notifyMockIfNeeded(designs);
      const { versions } = designs;
      setPptVersions(versions);
      const first = versions[0];
      if (first) {
        setSelectedPptVersionId(first.id);
        setPptResult({ title: pptOutline.title, slides: first.slides });
      }
      setState((prev) => ({ ...prev, pptDesign: true, active: 'ppt-design' }));
      addTab('ppt-design');
      if (tpl) {
        addMsg(
          'ai',
          `已按「${tpl.name}」模板生成 PPT，共 ${first?.slides?.length ?? 0} 页。请在右侧「PPT生成」中预览与编辑。`,
          'DeepSeek-V3.1｜PPT 设计',
          ['查看大纲', '提交当前版本到Veeva Vault']
        );
      } else {
        const names = versions.map((v) => v.name).join('、');
        addMsg(
          'ai',
          `已生成 3 套 PPT 设计方案${names ? `（${names}）` : ''}，每套 ${first?.slides?.length ?? 0} 页。请在右侧「PPT生成」中切换对比并选用一套。`,
          'DeepSeek-V3.1｜PPT 设计',
          ['查看大纲', '提交当前版本到Veeva Vault']
        );
      }
    });
  };

  const selectPptVersion = (version: PptDesignVersion) => {
    setSelectedPptVersionId(version.id);
    setPptResult({ title: pptOutline?.title, slides: version.slides });
    toast(`已选用「${version.name}」`);
  };

  const runSubmit = (opts?: { skipUserMsg?: boolean }) => {
    if (!opts?.skipUserMsg) addMsg('user', '提交Veeva Vault审批', selectedModel);
    const selectedVideo = videoVersions.find((v) => v.id === selectedVideoVersionId);
    const parts = ['内容文件', '素材引用', '合规记录', '团队修改记录'];
    if (selectedVideo) parts.push(`视频「${selectedVideo.name}」`);
    setState((prev) => ({ ...prev, submit: true, active: 'submit' }));
    addTab('submit');
    addMsg(
      'ai',
      `已整理 Veeva Vault 提交包：${parts.join('、')}。（演示模式：实际提交需对接 Veeva API）`,
      'DeepSeek-V3.1',
      ['下载审计报告', '保存回CMS']
    );
  };

  const fillQuick = (text: string) => {
    if (isGenerating) {
      toast('请等待当前 AI 生成完成');
      return;
    }
    addMsg('user', text, selectedModel);

    const activeTab = stateRef.current.active;
    const wizard = pptWizardRef.current;
    const visualWiz = visualWizardRef.current;

    if (visualWiz?.active) {
      handleVisualWizardReply(text);
      return;
    }

    if (text.includes('查看大纲')) {
      setState((prev) => ({ ...prev, active: 'ppt-outline' }));
      return;
    }
    if (text.includes('查看脚本') && videoResult) {
      setState((prev) => ({ ...prev, active: 'video-script' }));
      return;
    }
    if (text.includes('生成设计')) {
      confirmPptDesigns();
      return;
    }
    if (text.includes('从文案生成大纲')) {
      outlineFromCopy();
      return;
    }
    if (wizard?.active) {
      handlePptWizardReply(text, inputValue.trim());
      return;
    }
    if (text.includes('生成大纲')) {
      if (stateRef.current.active === 'ppt-outline' || pptOutline) {
        setState((prev) => ({ ...prev, active: 'ppt-outline' }));
        return;
      }
    }
    if (shouldPreferVisualFlow(entryContext, text)) {
      const templateHint =
        entryContext?.intent === 'visual-template' ? entryContext.templateTitle : undefined;
      startVisualFlow(text, { skipUserMsg: true, templateHint });
      return;
    }
    const inPptEntry = isPptEntryIntent(entryContext);
    const parsedAud = parseAudience(text);
    const parsedScen = parseScenario(text);
    if (
      inPptEntry &&
      (parsedAud || parsedScen) &&
      text.trim().length <= 24 &&
      !text.includes('生成文案')
    ) {
      startPptFlow(text, { skipUserMsg: true });
      return;
    }
    if (text.includes('编辑器') || text === '打开视觉编辑器') {
      const idx = selectedImages.findIndex(Boolean);
      const pick = idx >= 0 ? idx : 0;
      openImageEditor(generatedImages[pick] || posterData, pick);
      return;
    }
    if (text.includes('生成视频脚本') || (text.includes('视频脚本') && text.includes('生成'))) {
      runVideo(text, { skipUserMsg: true });
      return;
    }
    if (text === '生成视频' || (text.includes('生成视频') && !text.includes('脚本'))) {
      confirmVideoRender();
      return;
    }
    if (
      text.includes('Veeva') ||
      text.includes('veeva') ||
      text.includes('提交当前') ||
      (text.includes('提交') && text.includes('审批'))
    ) {
      runSubmit({ skipUserMsg: true });
      return;
    }
    if (text.includes('话题') && text.includes('洞察')) {
      runInsight(text, { skipUserMsg: true });
      return;
    }
    if (text.includes('文案') && (text.includes('生成') || text.includes('批量'))) {
      runCopy(text, { skipUserMsg: true });
      return;
    }
    if (text.includes('生成文案')) {
      runCopy(text, { skipUserMsg: true });
      return;
    }
    if (
      (text.includes('图片') || text.includes('配图') || text.includes('海报')) &&
      !text.includes('团队修改邀请')
    ) {
      const templateHint =
        entryContext?.intent === 'visual-template' && entryContext.templateTitle
          ? entryContext.templateTitle
          : undefined;
      startVisualFlow(text, { skipUserMsg: true, templateHint });
      return;
    }
    if (text.includes('PPT') || text.includes('ppt')) {
      startPptFlow(text, { skipUserMsg: true });
      return;
    }
    if (text.includes('视频')) {
      runVideo(text, { skipUserMsg: true });
      return;
    }
    if (text.includes('团队') && text.includes('修改')) {
      if (text.includes('整合') || text.includes('反馈')) {
        runTeam({ skipUserMsg: true, feedback: text });
      } else {
        openTeamReview(resolveTeamReviewType(text, activeTab));
      }
      return;
    }
    dispatchUserIntent(text, true);
  };

  const nextPrompts = (): string[] => {
    const base = ['生成图片', '生成PPT', '生成视频', '生成话题洞察', '生成文案'];
    if (state.visual && generatedImages.length) {
      return ['进入团队修改', '提交当前版本到Veeva Vault', ...base.slice(0, 3)];
    }
    if (state.copy || state.insight) {
      return ['生成图片', '生成PPT', '生成视频', '提交当前版本到Veeva Vault'];
    }
    return base;
  };

  const addTab = (key: TabKey) => {
    setState(prev => {
      if (!prev.tabs.includes(key)) {
        return { ...prev, tabs: [...prev.tabs, key], active: key };
      }
      return { ...prev, active: key };
    });
  };

  const openDetail = (title: string, body: string) => {
    setModalContent({ title, body });
    setShowModal(true);
  };

  const openVisualEditor = (src: string, target: EditorTarget, initialSvg?: string) => {
    let svg = initialSvg?.trim() || undefined;
    if (!svg && src.startsWith('data:image/svg+xml')) {
      svg = parseSvgFromDataUrl(src);
    }
    setEditorTarget(target);
    setEditorSrc(src);
    setEditorSvg(svg);
    setDrawerOpen(true);
    setShowModal(false);
  };

  const openImageEditor = (src: string, index: number) => {
    openVisualEditor(src, { kind: 'image', index });
  };

  const openPptSlideEditor = (index: number) => {
    if (!pptResult?.slides[index]) return;
    const slide = pptResult.slides[index];
    openVisualEditor(slideToPreviewUrl(slide), { kind: 'ppt-slide', index }, slide.svg);
  };

  const touchActiveReviewTask = () => {
    if (!activeReviewTaskId) return;
    const task = getReviewTask(activeReviewTaskId);
    if (task && task.status !== 'completed') {
      upsertReviewTask({ ...task, status: 'in_progress' });
      refreshReviewTasks();
    }
  };

  const acceptImageReview = (index: number) => {
    setImageReviewStatuses((statuses) => {
      const { statuses: aligned } = alignImageReviewArrays(
        generatedImages,
        imageReviewOrigins,
        statuses
      );
      const next = [...aligned];
      next[index] = 'accepted';
      return next;
    });
    setImageReviewOrigins((origins) => {
      const { origins: aligned } = alignImageReviewArrays(
        generatedImages,
        origins,
        imageReviewStatuses
      );
      const next = [...aligned];
      next[index] = generatedImages[index];
      return next;
    });
    toast(`已采纳配图 ${index + 1} 的修改`);
  };

  const rejectImageReview = (index: number) => {
    const { origins } = alignImageReviewArrays(
      generatedImages,
      imageReviewOrigins,
      imageReviewStatuses
    );
    const original = origins[index];
    if (original) {
      setGeneratedImages((prev) => prev.map((img, i) => (i === index ? original : img)));
    }
    setImageReviewStatuses((statuses) => {
      const { statuses: aligned } = alignImageReviewArrays(
        generatedImages,
        imageReviewOrigins,
        statuses
      );
      const next = [...aligned];
      next[index] = 'rejected';
      return next;
    });
    toast(`配图 ${index + 1} 已恢复为原图`);
  };

  const acceptAllImageReviews = () => {
    const { origins, statuses } = alignImageReviewArrays(
      generatedImages,
      imageReviewOrigins,
      imageReviewStatuses
    );
    setImageReviewStatuses(statuses.map((s) => (s === 'pending' ? 'accepted' : s)));
    setImageReviewOrigins(
      generatedImages.map((img, i) => (statuses[i] === 'pending' ? img : origins[i]))
    );
    toast('已采纳全部待审配图修改');
  };

  const rejectAllImageReviews = () => {
    const { origins, statuses } = alignImageReviewArrays(
      generatedImages,
      imageReviewOrigins,
      imageReviewStatuses
    );
    setGeneratedImages((prev) =>
      prev.map((img, i) => (statuses[i] === 'pending' ? origins[i] ?? img : img))
    );
    setImageReviewStatuses((statuses) =>
      statuses.map((s) => (s === 'pending' ? 'rejected' : s))
    );
    toast('已全部恢复为原图');
  };

  const handleEditorUpdate = (dataUrl: string, svg?: string) => {
    if (editorTarget?.kind === 'image') {
      const index = editorTarget.index;
      setGeneratedImages((prev) => {
        const oldUrl = prev[index];
        if (isReviewerRole(userRole) && oldUrl && oldUrl !== dataUrl) {
          setImageReviewOrigins((origins) => {
            const { origins: aligned } = alignImageReviewArrays(prev, origins, []);
            const next = [...aligned];
            if (!origins[index] || origins.length !== prev.length) {
              next[index] = oldUrl;
            }
            return next;
          });
          setImageReviewStatuses((statuses) => {
            const { statuses: aligned } = alignImageReviewArrays(prev, [], statuses);
            const next = [...aligned];
            next[index] = 'pending';
            return next;
          });
        }
        return prev.map((img, i) => (i === index ? dataUrl : img));
      });
      touchActiveReviewTask();
      toast(
        activeReviewTaskId && isReviewerRole(userRole)
          ? '配图已保存，待内容运营采纳或恢复原图'
          : '图片已更新'
      );
    } else if (editorTarget?.kind === 'ppt-slide' && pptResult) {
      const idx = editorTarget.index;
      const slides = pptResult.slides.map((s, i) =>
        i === idx ? { ...s, svg: svg || s.svg } : s
      );
      setPptResult({ ...pptResult, slides });
      if (selectedPptVersionId) {
        setPptVersions((prev) =>
          prev.map((v) =>
            v.id === selectedPptVersionId ? { ...v, slides } : v
          )
        );
      }
      touchActiveReviewTask();
      toast(
        activeReviewTaskId && isReviewerRole(userRole)
          ? `第 ${slides[idx]?.page ?? idx + 1} 页已保存`
          : `第 ${slides[idx]?.page ?? idx + 1} 页已更新`
      );
    }
    setEditorSrc(dataUrl);
    if (svg) setEditorSvg(svg);
  };

  const handleEditorExport = () => {
    if (!editorSrc) return;
    const name =
      editorTarget?.kind === 'ppt-slide'
        ? `PPT-第${(editorTarget.index ?? 0) + 1}页.png`
        : '配图编辑.png';
    downloadDataUrl(editorSrc, name);
    toast('已导出 PNG');
  };

  const openReviewTask = (taskId: string) => {
    const task = getReviewTask(taskId);
    if (!task) {
      toast('任务不存在');
      return;
    }
    updateTaskStatus(taskId, 'in_progress');
    refreshReviewTasks();
    setActiveReviewTaskId(taskId);
    openSession(task.sessionId);
    setCurrentScreen('workspace');
    const session = getSession(task.sessionId);
    const tabs = reviewerTabsForContentType(task.contentType, session?.workspace);
    setState((prev) => ({
      ...prev,
      active: tabs[0],
      tabs,
    }));
    const revisionBase =
      sessionCopyRevisionBase(task.sessionId) ||
      task.copyRevisionBase ||
      task.baseCopyText ||
      '';
    const mergedRevisions = mergeSessionCopyRevisions(task.sessionId);
    if (revisionBase) setCopyRevisionBase(revisionBase);
    setCopyRevisions(
      mergedRevisions.length ? mergedRevisions : task.copyRevisions ?? []
    );
  };

  const applyFigmaCapture = useCallback(
    (preset: string) => {
      seedReviewTasksIfEmpty();
      seedSessionsIfEmpty();
      refreshReviewTasks();
      setSessions(loadAllSessions());
      isHydratingRef.current = true;

      const demoCopy =
        '肾脏健康常常被忽略。了解相关风险因素，出现疑问时请咨询专业医生。';
      const demoCopyEdited =
        '肾脏健康需要长期关注。了解相关风险因素，出现疑问时请咨询专业医生。';
      const sampleImages = [posterData, posterData];

      const loadDemo = () => {
        const session = getSession(DEMO_SESSION_ID);
        if (session) loadSessionIntoApp(session);
        setCurrentScreen('workspace');
        return session;
      };

      switch (preset) {
        case 'home-ops':
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          setCurrentScreen('home');
          break;
        case 'home-reviewer':
          saveUserRole('medical');
          setUserRole('medical');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          setCurrentScreen('home');
          break;
        case 'library':
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          setCurrentScreen('library');
          break;
        case 'workspace-copy': {
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          const hcp = getSession('sess_demo_hcp');
          if (hcp) loadSessionIntoApp(hcp);
          setCurrentScreen('workspace');
          setState((prev) => ({
            ...prev,
            tabs: ['copy'],
            active: 'copy',
            copy: true,
            visual: false,
            team: false,
          }));
          break;
        }
        case 'workspace-visual': {
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          loadDemo();
          setGeneratedImages(sampleImages);
          setImageReviewOrigins([...sampleImages]);
          setImageReviewStatuses(['pending', null]);
          setSelectedImages([true, false]);
          setState((prev) => ({
            ...prev,
            tabs: ['visual'],
            active: 'visual',
            visual: true,
            copy: false,
            team: false,
          }));
          break;
        }
        case 'workspace-team': {
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          setDrawerOpen(false);
          loadDemo();
          setState((prev) => ({
            ...prev,
            tabs: ['team'],
            active: 'team',
            team: true,
          }));
          break;
        }
        case 'reviewer-copy': {
          saveUserRole('medical');
          setUserRole('medical');
          setDrawerOpen(false);
          loadDemo();
          setCopies([
            {
              title: '小红书疾病教育',
              body: demoCopyEdited,
              compliance: '已标注合规提示',
            },
          ]);
          setCopyRevisionBase(demoCopy);
          setCopyRevisions([
            createCopyRevision(demoCopy, demoCopyEdited, 'medical'),
          ]);
          setActiveReviewTaskId('rt_demo_medical');
          setState((prev) => ({
            ...prev,
            tabs: ['copy'],
            active: 'copy',
            copy: true,
          }));
          break;
        }
        case 'reviewer-visual': {
          saveUserRole('medical');
          setUserRole('medical');
          setDrawerOpen(false);
          loadDemo();
          setGeneratedImages(sampleImages);
          setSelectedImages([true, true]);
          setActiveReviewTaskId('rt_demo_visual');
          setState((prev) => ({
            ...prev,
            tabs: ['visual'],
            active: 'visual',
            visual: true,
          }));
          break;
        }
        case 'visual-editor': {
          saveUserRole('ops');
          setUserRole('ops');
          setActiveReviewTaskId(null);
          loadDemo();
          setGeneratedImages(sampleImages);
          setState((prev) => ({
            ...prev,
            tabs: ['visual'],
            active: 'visual',
            visual: true,
          }));
          setEditorTarget({ kind: 'image', index: 0 });
          setEditorSrc(sampleImages[0]);
          setDrawerOpen(true);
          break;
        }
        default:
          break;
      }

      requestAnimationFrame(() => {
        isHydratingRef.current = false;
      });
    },
    [loadSessionIntoApp]
  );

  useEffect(() => {
    const captureId = parseFigmaCaptureId();
    if (!captureId) return;
    document.body.setAttribute('data-figma-capture', captureId);
    applyFigmaCapture(captureId);
  }, [applyFigmaCapture]);

  const syncReviewTaskArtifacts = (
    revisions: CopyRevision[],
    revisionBase: string,
    status?: ReviewTask['status']
  ) => {
    if (!activeReviewTaskId) return;
    const task = getReviewTask(activeReviewTaskId);
    if (!task) return;
    if (task.contentType === 'copy') {
      propagateCopyRevisionsToSession(task.sessionId, revisions, revisionBase, {
        activeTaskId: activeReviewTaskId,
        statusForActive: status,
      });
    } else {
      upsertReviewTask({
        ...task,
        status: status ?? task.status,
        copyRevisions: revisions,
        copyRevisionBase: revisionBase,
        baseCopyText: task.baseCopyText || revisionBase,
      });
    }
    refreshReviewTasks();
  };

  const completeReviewTask = () => {
    if (!activeReviewTaskId) return;
    const task = getReviewTask(activeReviewTaskId);
    if (task) {
      const revisionBase =
        copyRevisionBase || task.copyRevisionBase || task.baseCopyText || '';
      if (task.contentType === 'copy') {
        propagateCopyRevisionsToSession(task.sessionId, copyRevisions, revisionBase, {
          activeTaskId: activeReviewTaskId,
          statusForActive: 'completed',
        });
      } else {
        upsertReviewTask({
          ...task,
          status: 'completed',
          copyRevisions,
          copyRevisionBase: revisionBase,
        });
      }
    } else {
      updateTaskStatus(activeReviewTaskId, 'completed');
    }
    refreshReviewTasks();
    toast('已标记为修改完成');
    setActiveReviewTaskId(null);
    if (isReviewerRole(userRole)) {
      setCurrentScreen('home');
    }
  };

  const saveCopyReview = (newText: string) => {
    const base = copyRevisionBase || getActiveCopyBody() || copies[0]?.body || '';
    const revisionBase = copyRevisionBase || base;
    if (!copyRevisionBase) setCopyRevisionBase(revisionBase);
    const prevText =
      copyRevisions.length > 0
        ? copyRevisions[copyRevisions.length - 1].resultText
        : revisionBase;
    const revision = createCopyRevision(prevText, newText, userRole);
    const next = [...copyRevisions, revision];
    setCopyRevisions(next);
    if (copies.length) {
      const updated = [...copies];
      updated[0] = { ...updated[0], body: newText };
      setCopies(updated);
    } else if (teamResult?.contentType === 'copy') {
      setTeamResult({ ...teamResult, after: newText });
    }
    syncReviewTaskArtifacts(next, revisionBase, 'in_progress');
    toast('文案修改已保存，运营端可查看增删记录');
  };

  const savePptOutlineReview = () => {
    if (!pptOutline) {
      toast('暂无 PPT 大纲可保存');
      return;
    }
    touchActiveReviewTask();
    persistCurrentSession();
    toast('PPT 大纲修改已保存，内容运营可在「PPT大纲」中查看');
  };

  const handleEditorGenerate = async (params: {
    editPrompt: string;
    maskBounds: { x: number; y: number; w: number; h: number } | null;
    svg?: string;
    layers: import('@/app/components/VisualEditor').DragLayer[];
  }) => {
    const result = await api.generatePosterEdit({
      svg: params.svg,
      editPrompt: params.editPrompt,
      maskBounds: params.maskBounds,
      layers: params.layers,
      copyBody: getActiveCopyBody(),
    });
    return { dataUrl: result.dataUrl, svg: result.svg, title: result.title };
  };

  const openMaterialPicker = (
    target: 'workspace' | 'chat',
    cat = '参考知识',
    tab: 'upload' | 'cms' = 'upload'
  ) => {
    setPickerTarget(target);
    setPickerCat(cat);
    setPickerTab(tab);
    setPickerOpen(true);
  };

  const handleMaterialPicked = (item: PickedMaterial) => {
    setLibrary((prev) => [
      {
        id: Date.now(),
        cat: item.cat,
        title: item.title,
        meta: item.meta,
        cms: item.cms,
        def: pickerTarget === 'workspace',
      },
      ...prev,
    ]);
    const pill = `${item.cms ? 'CMS' : '附件'}:${item.fileName || item.title} ×`;
    setAttachments((prev) => [...prev.filter((p) => !p.endsWith('×')), pill]);
    toast(pickerTarget === 'chat' ? '附件已加入本次对话' : `已添加素材到「${item.cat}」`);
    if (pickerTarget === 'chat') {
      addMsg(
        'ai',
        `已添加素材「${item.title}」。你可以继续说明创作目标，例如生成图片、文案或 PPT。`,
        'DeepSeek-V3.1',
        nextPrompts()
      );
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredLibrary = library
    .filter(x => x.cat === activeCat)
    .filter(x => !libSearch || x.title.toLowerCase().includes(libSearch.toLowerCase()) || x.meta.toLowerCase().includes(libSearch.toLowerCase()))
    .filter(x => !onlyDefault || x.def);

  const defaultCount = library.filter(x => x.def).length;
  const activeReviewTask = activeReviewTaskId ? getReviewTask(activeReviewTaskId) : undefined;
  const reviewFocusMode = Boolean(activeReviewTaskId && isReviewerRole(userRole));
  const reviewerAllowedTabs =
    reviewFocusMode && activeReviewTask
      ? reviewerTabsForContentType(activeReviewTask.contentType, {
          pptOutline,
          pptVersions,
          pptResult,
          videoVersions,
        })
      : null;

  return (
    <>
      <header className="top">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setCurrentScreen('home')}>
          <div className="logo"></div>
          <div>
            <h1>可申达 AI 内容工作台</h1>
            <p>Bayer AI Content Studio · Powered by DeepSeek</p>
          </div>
        </div>
        <div className="actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <RoleSwitcher role={userRole} onChange={handleRoleChange} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>当前品牌:</span>
              <select className="select" style={{ minWidth: '150px' }}>
                <option>可申达</option>
                <option>拜新同</option>
                <option>拜唐苹</option>
                <option>优迈</option>
                <option>爱格希</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Home Screen */}
      <section className={`screen home-screen ${currentScreen === 'home' ? 'active' : ''}`}>
        <div className="page home-page">
          <div className="home-inner">
          {/* Header with Library Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ flex: 1 }}></div>
            <button className="btn soft" onClick={() => setCurrentScreen('library')}>
              素材库
            </button>
          </div>

          {isReviewerRole(userRole) ? (
            <ReviewerHome
              tasks={tasksForRole(userRole)}
              deptLabel={ROLE_PROFILES[userRole].dept}
              onOpenTask={openReviewTask}
            />
          ) : (
            <>
          {/* Hero Section */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '900', margin: '0 0 16px', color: 'var(--blue)' }}>
              今天你有什么灵感？
            </h1>
            <p style={{ fontSize: '18px', color: 'var(--muted)', margin: 0 }}>
              输入灵感进入任务后，我会先帮你理清方向；也可直接点下方按钮开始创作。
            </p>
          </div>

          {/* Main Input Area */}
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <button className="icon-btn" title="添加附件" onClick={() => openMaterialPicker('chat')} style={{ marginTop: '8px' }}>＋</button>
              <div style={{ flex: 1 }}>
                <div className="compose-line" style={{ border: '2px solid #d7e4f0' }}>
                  <textarea
                    placeholder="输入你的创作需求..."
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputValue.trim()) {
                          newTask(inputValue.trim());
                        }
                      }
                    }}
                    style={{ minHeight: '60px' }}
                  />
                  <button className="btn primary" onClick={() => {
                    if (inputValue.trim()) {
                      newTask(inputValue.trim());
                    }
                  }}>开始创作</button>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="home-quick-actions">
              <button type="button" className="btn soft" onClick={() => startFromHome({ intent: 'insight' })}>📊 洞察报告</button>
              <button type="button" className="btn soft" onClick={() => startFromHome({ intent: 'copy' })}>✍️ 文案</button>
              <button type="button" className="btn soft" onClick={() => startFromHome({ intent: 'visual' })}>🖼️ 图片</button>
              <button type="button" className="btn soft" onClick={() => startFromHome({ intent: 'video' })}>🎬 视频</button>
              <button type="button" className="btn soft" onClick={() => startFromHome({ intent: 'ppt' })}>📑 PPT</button>
            </div>
          </div>

          <div className="home-section">
            <h3 className="home-section-title">图片模板</h3>
            <div className="template-grid template-grid-6">
              {HOME_IMAGE_TEMPLATES.map((template) => (
                <div
                  key={template.title}
                  className="card content-tile template-card"
                  onClick={() =>
                    startFromHome({ intent: 'visual-template', templateTitle: template.title })
                  }
                >
                  <img
                    src={template.img || posterData}
                    alt={template.title}
                    className="template-card-img"
                  />
                  <div className="template-card-label">{template.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-section">
            <h3 className="home-section-title">PPT模板</h3>
            <div className="template-grid template-grid-4">
              {HOME_PPT_TEMPLATES.map((template) => (
                <div
                  key={template.title}
                  className="card content-tile template-card"
                  onClick={() =>
                    startFromHome({ intent: 'ppt-template', templateTitle: template.title })
                  }
                >
                  <img src={template.img} alt={template.title} className="template-card-img" />
                  <div className="template-card-label">{template.title}</div>
                </div>
              ))}
            </div>
          </div>
            </>
          )}

          {!isReviewerRole(userRole) && (
          <div className="panel">
            <div className="panel-head">
              <h3 className="panel-title">历史对话</h3>
              <div className="filters">
                <input
                  className="input"
                  placeholder="搜索对话标题或内容"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="task-list">
              {sessions
                .filter((s) => {
                  const q = sessionSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    s.title.toLowerCase().includes(q) ||
                    deriveSessionSubtitle(s).toLowerCase().includes(q)
                  );
                })
                .map((s) => {
                  const status = deriveSessionStatus(s);
                  return (
                    <div key={s.id} className="task-row" onClick={() => openSession(s.id)}>
                      <div className="task-row-main">
                        <strong>{s.title}</strong>
                        <div className="muted">{deriveSessionSubtitle(s)}</div>
                      </div>
                      <div>
                        <span className={sessionStatusBadgeClass(status)}>
                          {sessionStatusLabel(status)}
                        </span>
                      </div>
                      <div className="muted">{formatSessionTime(s.updatedAt)}</div>
                      <button
                        type="button"
                        className="task-row-delete"
                        title="删除对话"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ id: s.id, title: s.title });
                        }}
                      >
                        删除
                      </button>
                    </div>
                  );
                })}
              {sessions.length === 0 && (
                <div className="small" style={{ padding: '16px', textAlign: 'center' }}>
                  暂无历史对话，在上方输入灵感开始第一次创作吧。
                </div>
              )}
            </div>
          </div>
          )}
          </div>
        </div>
      </section>

      {/* Library Screen */}
      <section className={`screen ${currentScreen === 'library' ? 'active' : ''}`}>
        <div className="page library-page">
          <div className="lib-layout">
            <aside className="side card">
              <div className="block">
                <h3 className="section-title">素材库</h3>
                <p className="small">
                  上传资料、搜索 CMS，或将素材设为默认。默认素材会在新建任务时自动带入。
                </p>
                <div className="lib-side-stat">
                  <span className="lib-side-stat-num">{defaultCount}</span>
                  <span className="small">项默认素材已配置</span>
                </div>
              </div>
              <div className="block lib-side-actions">
                <button
                  type="button"
                  className="btn primary"
                  style={{ width: '100%' }}
                  onClick={() => openMaterialPicker('workspace', activeCat)}
                >
                  上传素材
                </button>
                <button
                  type="button"
                  className="btn soft"
                  style={{ width: '100%', marginTop: 10 }}
                  onClick={() => openMaterialPicker('workspace', activeCat, 'cms')}
                >
                  搜索 CMS 素材
                </button>
              </div>
              <div className="block lib-default-block">
                <h3 className="section-title">默认素材</h3>
                <div className="lib-default-scroll">
                  {cats.map((c) => {
                    const items = library.filter((x) => x.cat === c && x.def);
                    return (
                      <div key={c} className="default-group">
                        <h4>
                          {c} <span className="badge">{items.length}</span>
                        </h4>
                        {items.length > 0 ? (
                          items.map((i) => (
                            <div
                              key={i.id}
                              className="default-item"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setActiveCat(c);
                                setOnlyDefault(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setActiveCat(c);
                                  setOnlyDefault(false);
                                }
                              }}
                            >
                              {i.title}
                            </div>
                          ))
                        ) : (
                          <div className="default-item muted">暂无默认素材</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            <main className="main card">
              <div className="panel-head lib-panel-head">
                <h3 className="panel-title">素材管理 · {activeCat}</h3>
                <div className="filters">
                  <input
                    className="input lib-search"
                    placeholder="搜索素材名称、标签、来源"
                    value={libSearch}
                    onChange={(e) => setLibSearch(e.target.value)}
                  />
                  <button type="button" className="btn soft" onClick={() => setOnlyDefault(!onlyDefault)}>
                    {onlyDefault ? '显示全部分类素材' : '只看默认素材'}
                  </button>
                </div>
              </div>

              <div className="cat-tabs">
                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`cat-tab ${c === activeCat ? 'active' : ''}`}
                    onClick={() => setActiveCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="mat-list">
                {filteredLibrary.length > 0 ? (
                  filteredLibrary.map((x) => (
                    <div key={x.id} className="mat-card">
                      <button
                        type="button"
                        className={`default-star ${x.def ? 'on' : ''}`}
                        onClick={() => toggleDefault(x.id)}
                      >
                        {x.def ? '★ 默认' : '☆ 候选'}
                      </button>
                      <h4>{x.title}</h4>
                      <div className="small mat-card-meta-line">{x.meta}</div>
                      <div className="mat-meta">
                        <span className="badge">{x.cat}</span>
                        <span className={`badge ${x.cms ? 'green' : ''}`}>{x.cms ? 'CMS' : '上传'}</span>
                        {x.def && <span className="badge warn">新任务自动带出</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mat-list-empty">
                    <div className="small">该分类暂无素材，可上传或从 CMS 搜索加入。</div>
                    <div className="quick-row" style={{ marginTop: 14, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => openMaterialPicker('workspace', activeCat)}
                      >
                        上传素材
                      </button>
                      <button
                        type="button"
                        className="btn soft"
                        onClick={() => openMaterialPicker('workspace', activeCat, 'cms')}
                      >
                        搜索 CMS
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Workspace Screen */}
      <section className={`screen ${currentScreen === 'workspace' ? 'active' : ''}`}>
        <div className={`workspace ${reviewFocusMode ? 'reviewer-focus' : ''}`}>
          {!reviewFocusMode && (
          <aside className="wpanel context">
            <div style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
              <h3 className="section-title" style={{ margin: 0 }}>引用素材</h3>
            </div>
            <div className="context-scroll">
              {cats.map(c => {
                const arr = library.filter(x => x.cat === c && x.def);
                return (
                  <div key={c} className="material-group">
                    <div className="group-head">
                      <strong>{c}</strong>
                      <button type="button" className="add-small" onClick={() => openMaterialPicker('workspace', c)}>添加</button>
                    </div>
                    {arr.length > 0 ? arr.map(x => (
                      <div key={x.id} className="source">
                        <div className="src-icon">{x.cms ? 'C' : 'F'}</div>
                        <div>
                          <strong>{x.title}</strong>
                          <div className="small">{x.meta}</div>
                        </div>
                      </div>
                    )) : <div className="source"><div className="small">暂无默认素材</div></div>}
                  </div>
                );
              })}

            </div>
          </aside>
          )}

          {!reviewFocusMode ? (
          <main className="wpanel chat">
            <div className="chat-head">
              <div className="chat-title">
                {isEditingTitle ? (
                  <input
                    type="text"
                    className="input"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    onBlur={commitTitleEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitTitleEdit();
                      }
                      if (e.key === 'Escape') {
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    style={{ fontSize: '16px', fontWeight: '700', padding: '4px 8px' }}
                  />
                ) : (
                  <h3 onClick={() => setIsEditingTitle(true)} style={{ cursor: 'pointer' }}>
                    {taskTitle}
                  </h3>
                )}
                <div className="small">点击标题可手动修改；AI 仅在首次对话后自动命名一次</div>
              </div>
            </div>

            {activeReviewTaskId && activeReviewTask && (
                <div className="review-task-banner">
                  <div>
                    <strong>团队修改任务</strong>
                    <div className="small">
                      {activeReviewTask.title} · 截止 {activeReviewTask.deadline.replace('T', ' ')} · 分配人 {activeReviewTask.assignerName}
                    </div>
                  </div>
                  <div className="quick-row">
                    <button
                      type="button"
                      className="btn soft"
                      onClick={() => {
                        setActiveReviewTaskId(null);
                        setCurrentScreen('home');
                      }}
                    >
                      返回任务列表
                    </button>
                  </div>
                </div>
            )}

            <div className="chat-feed" ref={feedRef}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`msg ${msg.role}`}>
                  <div className="avatar">{msg.role === 'user' ? '我' : 'AI'}</div>
                  <div className="bubble">
                    {msg.role === 'ai' && msg.model ? (
                      <div className="model-note">{msg.model}</div>
                    ) : null}
                    <div dangerouslySetInnerHTML={{ __html: msg.html }} />
                    {msg.quick && msg.quick.length > 0 && (
                      <div className="chips">
                        {msg.quick.map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            className="chip"
                            onClick={() => fillQuick(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="composer">
              {attachments.length > 0 && (
                <div className="attach-row">
                  {attachments.map((pill, i) => (
                    <span
                      key={`${pill}-${i}`}
                      className={`attach-pill ${pill.endsWith('×') ? 'removable' : ''}`}
                      onClick={() => pill.endsWith('×') && removeAttachment(i)}
                      title={pill.endsWith('×') ? '点击移除' : undefined}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
              {selectedPrompt && (
                <div className="attach-row">
                  <span className="prompt-token">{selectedPrompt}</span>
                </div>
              )}

              <div className="compose-line">
                <button className="icon-btn" title="上传本地文件或搜索 CMS" onClick={() => openMaterialPicker('chat')}>＋</button>
                <select
                  className="model-select"
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  <option>DeepSeek-V3.1</option>
                  <option>DeepSeek-Chat</option>
                </select>
                <textarea
                  placeholder={getComposerPlaceholder()}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button className="btn primary" onClick={send}>发送</button>
              </div>
            </div>
          </main>
          ) : (
          <main className="wpanel reviewer-task-main">
            {activeReviewTask && (
              <>
                <div className="review-task-banner reviewer-task-banner-main">
                  <div>
                    <strong>{activeReviewTask.title}</strong>
                    <div className="small">
                      {ROLE_PROFILES[userRole].dept}审阅 · 截止 {activeReviewTask.deadline.replace('T', ' ')} · 分配人 {activeReviewTask.assignerName}
                    </div>
                    <div className="small" style={{ marginTop: 6 }}>
                      {activeReviewTask.contentType === 'ppt'
                        ? '请在「PPT大纲」中修改章节与页面要点并保存；无需生成 PPT 成品。'
                        : '请仅修改右侧已生成的内容；保存后运营可在任务中查看修改详情。'}
                    </div>
                  </div>
                  <div className="quick-row">
                    <button type="button" className="btn primary" onClick={completeReviewTask}>
                      标记修改完成
                    </button>
                    <button
                      type="button"
                      className="btn soft"
                      onClick={() => {
                        setActiveReviewTaskId(null);
                        setCurrentScreen('home');
                      }}
                    >
                      返回任务列表
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
          )}

          <WorkspaceRightPanel
            state={state}
            setState={setState}
            openDetail={openDetail}
            fillQuick={fillQuick}
            toast={toast}
            setDrawerOpen={setDrawerOpen}
            generatedImages={generatedImages}
            imageReviewOrigins={imageReviewOrigins}
            imageReviewStatuses={imageReviewStatuses}
            onAcceptImageReview={acceptImageReview}
            onRejectImageReview={rejectImageReview}
            onAcceptAllImageReviews={acceptAllImageReviews}
            onRejectAllImageReviews={rejectAllImageReviews}
            topics={topics}
            copies={copies}
            teamResult={teamResult}
            videoResult={videoResult}
            pptResult={pptResult}
            pptOutline={pptOutline}
            pptVersions={pptVersions}
            selectedPptVersionId={selectedPptVersionId}
            selectedPptTemplateId={selectedPptTemplateId}
            onSelectPptTemplate={setSelectedPptTemplateId}
            onPptOutlineChange={setPptOutline}
            onConfirmPptDesigns={confirmPptDesigns}
            onRegeneratePptOutline={regeneratePptOutline}
            isGenerating={isGenerating}
            onSelectPptVersion={selectPptVersion}
            onStartPptFlow={() => startPptFlow()}
            insightSummary={insightSummary}
            selectedTopics={selectedTopics}
            setSelectedTopics={setSelectedTopics}
            selectedCopies={selectedCopies}
            setSelectedCopies={setSelectedCopies}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            setEditingCopy={setEditingCopy}
            setShowCopyEditModal={setShowCopyEditModal}
            teamModificationInProgress={teamModificationInProgress}
            runCopy={runCopy}
            runInsight={runInsight}
            onOpenImageEditor={openImageEditor}
            onOpenTeamReview={openTeamReview}
            videoVersions={videoVersions}
            selectedVideoVersionId={selectedVideoVersionId}
            onConfirmVideoRender={confirmVideoRender}
            onSelectVideoVersion={selectVideoVersion}
            userRole={userRole}
            reviewerMode={reviewFocusMode}
            reviewContentType={activeReviewTask?.contentType}
            reviewerAllowedTabs={reviewerAllowedTabs}
            posterPlaceholder={posterData}
            onSavePptOutlineReview={savePptOutlineReview}
            copyRevisions={copyRevisions}
            copyRevisionBase={copyRevisionBase}
            onSaveCopyReview={saveCopyReview}
            onOpenPptSlideEditor={openPptSlideEditor}
          />
        </div>
      </section>

      {/* Visual Editor Drawer — portal 避免审阅模式下被 .screen overflow 裁切 */}
      {createPortal(
        <div
          className={`drawer ${drawerOpen && editorSrc ? 'open' : ''} ${
            reviewFocusMode ? 'reviewer-editor-drawer' : ''
          }`}
        >
          {drawerOpen && editorSrc && (
            <>
              <div className="drawer-editor-toolbar">
                <button type="button" className="btn soft" onClick={handleEditorExport}>
                  导出 PNG
                </button>
                <button type="button" className="btn" onClick={() => setDrawerOpen(false)}>
                  关闭
                </button>
              </div>
              <VisualEditor
                imageSrc={editorSrc}
                initialSvg={editorSvg}
                onClose={() => setDrawerOpen(false)}
                onUpdate={handleEditorUpdate}
                onGenerate={async (params) => {
                  setIsGenerating(true);
                  try {
                    return await handleEditorGenerate(params);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                isGenerating={isGenerating}
              />
            </>
          )}
        </div>,
        document.body
      )}

      <MaterialPickerModal
        open={pickerOpen}
        defaultCat={pickerCat}
        initialTab={pickerTab}
        categories={cats}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleMaterialPicked}
      />

      {/* Modal */}
      <div className={`modal-bg ${showModal ? 'show' : ''}`} onClick={e => {
        if ((e.target as HTMLElement).className.includes('modal-bg')) {
          setShowModal(false);
        }
      }}>
        <div className="modal">
          <h3>{modalContent.title}</h3>
          <div className="small" style={{ fontSize: '13px', lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: modalContent.body }} />
          <div className="quick-row">
            <button className="btn primary" onClick={() => setShowModal(false)}>关闭</button>
          </div>
        </div>
      </div>

      {/* Copy Edit Modal */}
      <div className={`modal-bg ${showCopyEditModal ? 'show' : ''}`} onClick={e => {
        if ((e.target as HTMLElement).className.includes('modal-bg')) {
          setShowCopyEditModal(false);
        }
      }}>
        <div className="modal">
          <h3>编辑文案</h3>
          <textarea
            className="inline-edit"
            value={editingCopy}
            onChange={e => setEditingCopy(e.target.value)}
            style={{ width: '100%', minHeight: '200px' }}
          />
          <div className="quick-row">
            <button className="btn primary" onClick={() => {
              const idx = selectedCopies.findIndex(Boolean);
              const i = idx >= 0 ? idx : 0;
              setCopies((prev) =>
                prev.map((c, j) => (j === i ? { ...c, body: editingCopy } : c))
              );
              toast('文案修改已保存');
              setShowCopyEditModal(false);
            }}>保存修改</button>
            <button className="btn" onClick={() => setShowCopyEditModal(false)}>取消</button>
          </div>
        </div>
      </div>

      <ImageTemplatePickerModal
        open={Boolean(imageTemplateModal)}
        preferredTitle={imageTemplateModal?.templateHint}
        onClose={() => setImageTemplateModal(null)}
        onSkip={() => {
          if (!imageTemplateModal) return;
          executeVisualGeneration(imageTemplateModal.pendingNote, []);
        }}
        onConfirm={(templateIds) => {
          if (!imageTemplateModal) return;
          executeVisualGeneration(imageTemplateModal.pendingNote, templateIds);
        }}
      />

      {/* Team Modification Modal */}
      <div className={`modal-bg ${showTeamModal ? 'show' : ''}`} onClick={e => {
        if ((e.target as HTMLElement).className.includes('modal-bg')) {
          setShowTeamModal(false);
          setTeamAssigneeRoles([]);
        }
      }}>
        <div className="modal">
          <h3>提交团队修改</h3>
          {teamReviewTarget && (
            <div className="detail-card team-review-target-card">
              <h4>本次提交内容</h4>
              <div className="small">
                类型：<strong>{TEAM_CONTENT_LABELS[teamReviewTarget]}</strong>
                {buildTeamPayload(teamReviewTarget)?.title
                  ? ` · ${buildTeamPayload(teamReviewTarget)?.title}`
                  : ''}
              </div>
            </div>
          )}
          <div className="detail-card">
            <h4>分配给（可多选）</h4>
            <div className="small" style={{ marginBottom: 10 }}>
              可同时选择医学部与市场部，将分别为每位审阅人创建修改任务。
            </div>
            <label className="option team-assignee-option">
              <input
                type="checkbox"
                checked={
                  teamAssigneeRoles.includes('medical') &&
                  teamAssigneeRoles.includes('marketing')
                }
                onChange={(e) => setAllTeamAssigneeRoles(e.target.checked)}
              />
              <div>
                <strong>全选</strong>
              </div>
            </label>
            {(['medical', 'marketing'] as const).map((role) => {
              const profile = ROLE_PROFILES[role];
              return (
                <label key={role} className="option team-assignee-option">
                  <input
                    type="checkbox"
                    checked={teamAssigneeRoles.includes(role)}
                    onChange={() => toggleTeamAssigneeRole(role)}
                  />
                  <div>
                    <strong>
                      {profile.name}（{profile.dept}）
                    </strong>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="detail-card">
            <h4>修改截止时间</h4>
            <input
              type="datetime-local"
              className="input"
              style={{ width: '100%', marginTop: '8px' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <div className="quick-row">
            <button
              className="btn primary"
              onClick={() => {
                if (teamAssigneeRoles.length === 0 || !deadline) {
                  toast('请至少选择一位审阅人并设置截止时间');
                  return;
                }
                if (!currentSessionId) {
                  toast('请先保存当前任务');
                  return;
                }
                const target = teamReviewTarget || 'copy';
                const label = TEAM_CONTENT_LABELS[target];
                const baseCopy = target === 'copy' ? getActiveCopyBody() || '' : '';
                if (baseCopy) setCopyRevisionBase(baseCopy);
                if (target === 'visual' && generatedImages.length > 0) {
                  setImageReviewOrigins([...generatedImages]);
                  setImageReviewStatuses(generatedImages.map(() => null));
                }

                const assigneeLabels: string[] = [];
                teamAssigneeRoles.forEach((role, index) => {
                  const assignee = ROLE_PROFILES[role];
                  const task: ReviewTask = {
                    id: `rt_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
                    sessionId: currentSessionId,
                    title: taskTitle,
                    contentType: target,
                    assigneeRole: role,
                    assigneeName: assignee.name,
                    assignerName: ROLE_PROFILES.ops.name,
                    deadline,
                    status: 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    baseCopyText: baseCopy || undefined,
                    copyRevisionBase: baseCopy || undefined,
                  };
                  upsertReviewTask(task);
                  assigneeLabels.push(`${assignee.name}（${assignee.dept}）`);
                });
                refreshReviewTasks();
                const namesText = assigneeLabels.join('、');
                setShowTeamModal(false);
                setTeamAssigneeRoles([]);
                toast(`已向 ${namesText} 分配${label}修改任务`);
                addMsg(
                  'user',
                  `向 ${namesText} 分配${label}团队修改任务（截止 ${deadline}）`,
                  selectedModel
                );
                addMsg(
                  'ai',
                  `已为 ${assigneeLabels.length} 位审阅人创建团队修改任务，他们将在各自首页任务列表中查看并修改。完成后你可在「团队修改」或「文案生成」标签查看修改详情。`,
                  'DeepSeek-V3.1'
                );
              }}
            >
              发送邀请
            </button>
            <button
              className="btn"
              onClick={() => {
                setShowTeamModal(false);
                setTeamAssigneeRoles([]);
              }}
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        title="删除对话"
        message={
          deleteConfirm
            ? `确定删除「${deleteConfirm.title}」？删除后无法恢复。`
            : ''
        }
        confirmLabel="删除"
        danger
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>{toastText}</div>
    </>
  );
}

function WorkspaceRightPanel({
  state,
  setState,
  openDetail,
  fillQuick,
  toast,
  setDrawerOpen,
  generatedImages,
  imageReviewOrigins,
  imageReviewStatuses,
  onAcceptImageReview,
  onRejectImageReview,
  onAcceptAllImageReviews,
  onRejectAllImageReviews,
  topics,
  copies,
  teamResult,
  videoResult,
  pptResult,
  pptOutline,
  pptVersions,
  selectedPptVersionId,
  selectedPptTemplateId,
  onSelectPptTemplate,
  onPptOutlineChange,
  onConfirmPptDesigns,
  onRegeneratePptOutline,
  isGenerating,
  onSelectPptVersion,
  onStartPptFlow,
  insightSummary,
  selectedTopics,
  setSelectedTopics,
  selectedCopies,
  setSelectedCopies,
  selectedImages,
  setSelectedImages,
  setEditingCopy,
  setShowCopyEditModal,
  teamModificationInProgress,
  onOpenTeamReview,
  videoVersions,
  selectedVideoVersionId,
  onConfirmVideoRender,
  onSelectVideoVersion,
  runCopy,
  runInsight,
  onOpenImageEditor,
  userRole,
  reviewerMode,
  reviewContentType,
  reviewerAllowedTabs,
  posterPlaceholder,
  onSavePptOutlineReview,
  copyRevisions,
  copyRevisionBase,
  onSaveCopyReview,
  onOpenPptSlideEditor,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  openDetail: (title: string, body: string) => void;
  fillQuick: (text: string) => void;
  toast: (text: string) => void;
  setDrawerOpen: (open: boolean) => void;
  generatedImages: string[];
  imageReviewOrigins: string[];
  imageReviewStatuses: ImageReviewStatus[];
  onAcceptImageReview: (index: number) => void;
  onRejectImageReview: (index: number) => void;
  onAcceptAllImageReviews: () => void;
  onRejectAllImageReviews: () => void;
  topics: TopicItem[];
  copies: CopyItem[];
  teamResult: TeamResult | null;
  videoResult: VideoResult | null;
  pptResult: PptResult | null;
  pptOutline: PptOutline | null;
  pptVersions: PptDesignVersion[];
  selectedPptVersionId: string | null;
  selectedPptTemplateId: string | null;
  onSelectPptTemplate: (id: string | null) => void;
  onPptOutlineChange: (outline: PptOutline) => void;
  onConfirmPptDesigns: (mode?: 'template' | 'no-template') => void;
  onRegeneratePptOutline: () => void;
  isGenerating: boolean;
  onSelectPptVersion: (v: PptDesignVersion) => void;
  onStartPptFlow: () => void;
  insightSummary: string;
  selectedTopics: boolean[];
  setSelectedTopics: React.Dispatch<React.SetStateAction<boolean[]>>;
  selectedCopies: boolean[];
  setSelectedCopies: React.Dispatch<React.SetStateAction<boolean[]>>;
  selectedImages: boolean[];
  setSelectedImages: React.Dispatch<React.SetStateAction<boolean[]>>;
  setEditingCopy: React.Dispatch<React.SetStateAction<string>>;
  setShowCopyEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  teamModificationInProgress: boolean;
  onOpenTeamReview: (type: TeamContentType) => void;
  videoVersions: VideoRenderVersion[];
  selectedVideoVersionId: string | null;
  onConfirmVideoRender: () => void;
  onSelectVideoVersion: (v: VideoRenderVersion) => void;
  runCopy: (note?: string) => void;
  runInsight: (note?: string) => void;
  onOpenImageEditor: (src: string, index: number) => void;
  userRole: UserRole;
  reviewerMode: boolean;
  reviewContentType?: TeamContentType;
  reviewerAllowedTabs: TabKey[] | null;
  posterPlaceholder: string;
  onSavePptOutlineReview: () => void;
  copyRevisions: CopyRevision[];
  copyRevisionBase: string;
  onSaveCopyReview: (text: string) => void;
  onOpenPptSlideEditor: (index: number) => void;
}) {
  const visibleTabs =
    reviewerMode && reviewerAllowedTabs?.length
      ? state.tabs.filter((t) => reviewerAllowedTabs.includes(t))
      : state.tabs;

  const teamReviewButton = (contentType: TeamContentType) => (
    reviewerMode ? null : (
    <div className="team-review-strip">
      <button
        type="button"
        className={`btn ${teamModificationInProgress ? '' : 'warn'}`}
        disabled={teamModificationInProgress}
        style={{
          width: '100%',
          opacity: teamModificationInProgress ? 0.6 : 1,
          cursor: teamModificationInProgress ? 'not-allowed' : 'pointer',
        }}
        onClick={() => !teamModificationInProgress && onOpenTeamReview(contentType)}
      >
        {teamModificationInProgress ? '团队修改中...' : '提交团队修改'}
      </button>
    </div>
    )
  );

  const renderDetail = () => {
    const k = state.active;
    if (!k) {
      if (reviewerMode) {
        return (
          <div className="detail-card">
            <h4>暂无待审内容</h4>
            <div className="small">运营尚未在本任务中生成可审阅的成品，请联系内容运营同学。</div>
          </div>
        );
      }
      return (
        <div className="detail-card">
          <h4>等待生成产物</h4>
          <div className="small">当你在对话中生成话题洞察、文案、图片、视频、PPT或提交包后，这里会自动新增详情标签。</div>
        </div>
      );
    }

    if (reviewerMode && reviewerAllowedTabs?.length && !reviewerAllowedTabs.includes(k)) {
      return (
        <div className="detail-card">
          <h4>审阅内容加载中</h4>
          <div className="small">正在切换到对应产物视图…</div>
        </div>
      );
    }

    const veevaSubmitBtn = (quickText = '提交当前选中内容到Veeva Vault审批:') =>
      reviewerMode ? null : (
        <button
          type="button"
          className="btn green"
          style={{ width: '100%', marginTop: 8 }}
          onClick={() => fillQuick(quickText)}
        >
          提交 Veeva Vault 审批
        </button>
      );

    const teamAndVeevaActions = (contentType: TeamContentType, veevaQuick?: string) => (
      <>
        {teamReviewButton(contentType)}
        {veevaSubmitBtn(veevaQuick)}
      </>
    );

    switch (k) {
      case 'insight':
        if (!topics.length) {
          return (
            <div className="detail-card">
              <h4>话题洞察</h4>
              <div className="small">在对话中点击「基于素材生成话题洞察」，AI 将在此展示结果。</div>
              <button className="btn primary" style={{ marginTop: 12 }} onClick={() => runInsight()}>
                生成话题洞察
              </button>
            </div>
          );
        }
        return (
          <>
            <div className="detail-card">
              <h4>话题洞察详情</h4>
              <div className="small">{insightSummary || '基于默认素材与 DeepSeek 生成。点击话题查看详情，勾选后继续生成文案。'}</div>
            </div>
            <label className="option" style={{ marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={selectedTopics.length > 0 && selectedTopics.every((x) => x)}
                onChange={(e) => setSelectedTopics(topics.map(() => e.target.checked))}
              />
              <div><strong>全选</strong></div>
            </label>
            {topics.map((t, i) => (
              <label
                key={i}
                className="option content-tile"
                onClick={() =>
                  openDetail(
                    t.title,
                    `来源：${t.source}<br>推荐理由：${t.reason}`
                  )
                }
              >
                <input
                  type="checkbox"
                  onClick={(e) => e.stopPropagation()}
                  checked={selectedTopics[i] ?? false}
                  onChange={(e) => {
                    const newSelected = [...selectedTopics];
                    newSelected[i] = e.target.checked;
                    setSelectedTopics(newSelected);
                  }}
                />
                <div>
                  <strong>{t.title}</strong>
                  <div className="small">{t.reason}</div>
                </div>
              </label>
            ))}
            <div className="quick-row">
              <button className="btn primary" onClick={() => runCopy()}>
                基于选中话题生成文案
              </button>
              <button className="btn" onClick={() => runInsight('补充更多小红书话题')}>
                扩展话题
              </button>
            </div>
          </>
        );

      case 'copy':
        if (!copies.length && !reviewerMode) {
          return (
            <div className="detail-card">
              <h4>文案生成</h4>
              <div className="small">请先生成话题洞察，再基于此生成文案。</div>
              <button className="btn primary" style={{ marginTop: 12 }} onClick={() => runCopy()}>
                生成文案
              </button>
            </div>
          );
        }
        if (reviewerMode) {
          const revisionBase =
            copyRevisionBase ||
            copies[0]?.body ||
            teamResult?.after ||
            teamResult?.before ||
            '';
          if (!revisionBase.trim()) {
            return (
              <div className="detail-card">
                <h4>文案审阅</h4>
                <div className="small">当前任务中还没有可编辑的文案正文，请联系内容运营。</div>
              </div>
            );
          }
          const editText = latestCopyText(revisionBase, copyRevisions);
          return (
            <>
              {copyRevisions.length > 0 && (
                <div className="detail-card" style={{ background: '#f0f7ff', borderColor: '#c5daf5' }}>
                  <h4 style={{ marginTop: 0 }}>团队审阅修改（含其他审阅人）</h4>
                  <div className="small">
                    医学部与市场部的修改均会同步显示；下方编辑器已载入最新合并正文，保存后将追加你的修改记录。
                  </div>
                </div>
              )}
              {copyRevisions.length > 0 && (
                <CopyRevisionDisplay baseText={revisionBase} revisions={copyRevisions} />
              )}
              <CopyReviewEditor
                key={
                  copyRevisions.length
                    ? copyRevisions[copyRevisions.length - 1].id
                    : 'copy-base'
                }
                baseText={editText}
                role={userRole}
                onSave={onSaveCopyReview}
              />
            </>
          );
        }
        return (
          <>
            <div className="detail-card">
              <h4>文案生成详情</h4>
              <div className="small">已生成 {copies.length} 版文案（DeepSeek）。点击编辑或勾选进入团队修改。</div>
            </div>
            {copyRevisions.length > 0 && (
              <div className="detail-card" style={{ background: '#f0f7ff', borderColor: '#c5daf5' }}>
                <h4 style={{ marginTop: 0 }}>团队审阅修改</h4>
                <div className="small">
                  医学部 / 市场部已保存修改，下方为按角色着色的增删记录。
                </div>
              </div>
            )}
            {copyRevisions.length > 0 && (
              <CopyRevisionDisplay
                baseText={copyRevisionBase || copies[0]?.body || ''}
                revisions={copyRevisions}
              />
            )}
            <label className="option" style={{ marginBottom: '10px' }}>
              <input
                type="checkbox"
                checked={selectedCopies.length > 0 && selectedCopies.every((x) => x)}
                onChange={(e) => setSelectedCopies(copies.map(() => e.target.checked))}
              />
              <div><strong>全选</strong></div>
            </label>
            {copies.map((c, i) => (
              <label
                key={i}
                className="option content-tile"
                onClick={() => {
                  setEditingCopy(c.body);
                  setShowCopyEditModal(true);
                }}
              >
                <input
                  type="checkbox"
                  onClick={(e) => e.stopPropagation()}
                  checked={selectedCopies[i] ?? false}
                  onChange={(e) => {
                    const newSelected = [...selectedCopies];
                    newSelected[i] = e.target.checked;
                    setSelectedCopies(newSelected);
                  }}
                />
                <div>
                  <strong>{c.title}</strong>
                  <div className="small">{c.compliance}</div>
                </div>
              </label>
            ))}
            <div className="quick-row" style={{ marginTop: '10px' }}>
              <button className="btn soft" onClick={() => fillQuick('生成图片')}>生成图片</button>
              <button className="btn soft" onClick={() => fillQuick('生成视频')}>生成视频</button>
              <button className="btn soft" onClick={() => fillQuick('生成PPT')}>生成PPT</button>
            </div>
            {teamAndVeevaActions('copy')}
          </>
        );

      case 'team':
        if (!teamResult) {
          return (
            <div className="detail-card">
              <h4>团队修改</h4>
              <div className="small">在对话中提交团队修改邀请，或点击「进入团队修改」由 AI 整合反馈。</div>
            </div>
          );
        }
        return (
          <>
            <div className="detail-card">
              <h4>团队修改详情</h4>
              <div className="small">
                内容类型：<strong>{TEAM_CONTENT_LABELS[teamResult.contentType || 'copy']}</strong>
                {teamResult.contentTitle ? ` · ${teamResult.contentTitle}` : ''}
              </div>
              <div className="small" style={{ marginTop: 6 }}>{teamResult.summary}</div>
            </div>
            {copyRevisions.length > 0 && (
              <CopyRevisionDisplay
                baseText={copyRevisionBase || teamResult.before}
                revisions={copyRevisions}
              />
            )}
            <div
              className="copy-preview content-tile"
              onClick={() => openDetail('修改前', teamResult.before.replace(/\n/g, '<br>'))}
            >
              <strong>修改前</strong>
              <p>{teamResult.before}</p>
            </div>
            <div
              className="copy-preview content-tile"
              onClick={() =>
                openDetail(
                  '修改后',
                  `${teamResult.after.replace(/\n/g, '<br>')}<br><br>变更：${teamResult.changes?.join('；') || ''}`
                )
              }
            >
              <strong>修改后</strong>
              <p>{teamResult.after.slice(0, 120)}…</p>
              {(teamResult.changes || []).map((ch, i) => (
                <span key={i} className="badge green">
                  {ch}
                </span>
              ))}
            </div>
            <div className="quick-row">
              <button className="btn soft" onClick={() => fillQuick('生成图片')}>生成图片</button>
              <button className="btn soft" onClick={() => fillQuick('生成视频')}>生成视频</button>
              <button className="btn soft" onClick={() => fillQuick('生成PPT')}>生成PPT</button>
            </div>
            {veevaSubmitBtn()}
          </>
        );

      case 'visual': {
        const hasGenerated = generatedImages.length > 0;
        if (reviewerMode) {
          return (
            <ReviewerVisualPanel
              images={generatedImages}
              placeholderDataUrl={posterPlaceholder}
              onEditImage={onOpenImageEditor}
            />
          );
        }
        const displayImages = hasGenerated ? generatedImages : [posterData];
        const { origins: alignedOrigins, statuses: alignedStatuses } = alignImageReviewArrays(
          generatedImages,
          imageReviewOrigins,
          imageReviewStatuses
        );
        const selection = hasGenerated
          ? selectedImages.length === generatedImages.length
            ? selectedImages
            : generatedImages.map((_, i) => i === 0)
          : [];
        return (
          <>
            <div className="detail-card">
              <h4>图片生成详情</h4>
              <div className="small">
                {hasGenerated
                  ? `已生成 ${generatedImages.length} 张图片。勾选后提交团队修改；点击图片可进入编辑。`
                  : '尚未生成配图，以下为示意预览。请先在对话中生成图片。'}
              </div>
            </div>
            {hasGenerated && (
              <OpsImageReviewPanel
                images={generatedImages}
                origins={alignedOrigins}
                statuses={alignedStatuses}
                onAccept={onAcceptImageReview}
                onReject={onRejectImageReview}
                onAcceptAll={onAcceptAllImageReviews}
                onRejectAll={onRejectAllImageReviews}
              />
            )}
            {hasGenerated && (
              <label className="option" style={{ marginBottom: '10px' }}>
                <input
                  type="checkbox"
                  checked={selection.length > 0 && selection.every((x) => x)}
                  onChange={(e) => setSelectedImages(generatedImages.map(() => e.target.checked))}
                />
                <div><strong>全选</strong></div>
              </label>
            )}
            {displayImages.map((img, idx) => (
              <label
                key={idx}
                className="option generated-img-option"
                style={{ marginBottom: '10px' }}
              >
                {hasGenerated && (
                  <input
                    type="checkbox"
                    checked={selection[idx] ?? false}
                    onChange={(e) => {
                      const next = [...selection];
                      next[idx] = e.target.checked;
                      setSelectedImages(next);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div
                  className="generated-img-wrap content-tile"
                  onClick={() => onOpenImageEditor(img, idx)}
                >
                  {hasGenerated && alignedStatuses[idx] === 'pending' && (
                    <span className="img-review-badge">待采纳</span>
                  )}
                  {hasGenerated && alignedStatuses[idx] === 'rejected' && (
                    <span className="img-review-badge rejected">已恢复原图</span>
                  )}
                  <img className="generated-img" src={img} alt={`生成的图片 ${idx + 1}`} />
                  <span className="img-edit-hint">点击进入图片编辑</span>
                  {hasGenerated && alignedStatuses[idx] === 'pending' && (
                    <div
                      className="img-review-inline-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => onAcceptImageReview(idx)}
                      >
                        采纳
                      </button>
                      <button
                        type="button"
                        className="btn soft"
                        onClick={() => onRejectImageReview(idx)}
                      >
                        恢复原图
                      </button>
                    </div>
                  )}
                </div>
              </label>
            ))}
            {hasGenerated && (
              <>
                <div className="visual-action-strip">
                  <button
                    type="button"
                    className="btn"
                    style={{ width: '100%' }}
                    onClick={() => fillQuick('请重新生成一版更清爽、更少营销感的图片:')}
                  >
                    重新生成
                  </button>
                </div>
                {teamAndVeevaActions('visual', '提交当前图片和文案到Veeva Vault审批:')}
              </>
            )}
          </>
        );
      }

      case 'video-script':
        if (reviewerMode) {
          if (!videoResult) {
            return (
              <div className="detail-card">
                <h4>视频审阅</h4>
                <div className="small">当前任务中还没有视频脚本或成片，请联系内容运营。</div>
              </div>
            );
          }
        }
        if (!videoResult) {
          return (
            <div className="detail-card">
              <h4>视频脚本</h4>
              <div className="small">在对话中请求「生成视频脚本」后，分镜将显示在此。</div>
              <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={() => fillQuick('生成视频脚本')}>
                生成视频脚本
              </button>
            </div>
          );
        }
        if (reviewerMode) {
          return (
            <>
              <div className="detail-card detail-card-ppt-outline">
                <h4>{videoResult.title}</h4>
                <div className="small">{videoResult.coverSuggestion}</div>
              </div>
              <div className="detail-card">
                <h4>分镜列表（{videoResult.segments.length} 镜）</h4>
                <ol>
                  {videoResult.segments.map((s, i) => (
                    <li key={i}>
                      <strong>{s.time}</strong> {s.scene}
                      <div className="small">{s.narration}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          );
        }
        return (
          <>
            <div className="detail-card detail-card-ppt-outline">
              <h4>{videoResult.title}</h4>
              <div className="small">{videoResult.coverSuggestion}</div>
            </div>
            <div
              className="detail-card content-tile"
              onClick={() =>
                openDetail(
                  videoResult.title,
                  videoResult.segments
                    .map(
                      (s) =>
                        `<strong>${s.time}</strong> ${s.scene}<br>旁白：${s.narration}${s.compliance ? `<br>合规：${s.compliance}` : ''}`
                    )
                    .join('<br><br>')
                )
              }
            >
              <h4>分镜列表（{videoResult.segments.length} 镜）</h4>
              <ol>
                {videoResult.segments.map((s, i) => (
                  <li key={i}>
                    <strong>{s.time}</strong> {s.scene}
                    <div className="small">{s.narration}</div>
                  </li>
                ))}
              </ol>
            </div>
            <button type="button" className="btn primary" style={{ width: '100%' }} onClick={onConfirmVideoRender}>
              ✓ 生成视频
            </button>
            {teamAndVeevaActions('video')}
          </>
        );

      case 'video-render':
        if (reviewerMode && !videoVersions.length && videoResult) {
          return (
            <>
              <div className="detail-card detail-card-ppt-outline">
                <h4>{videoResult.title}</h4>
                <div className="small">脚本已生成，成片尚未合成。</div>
              </div>
              <div className="detail-card">
                <h4>分镜列表</h4>
                <ol>
                  {videoResult.segments.map((s, i) => (
                    <li key={i}>
                      <strong>{s.time}</strong> {s.scene}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          );
        }
        if (!videoVersions.length) {
          return (
            <div className="detail-card">
              <h4>视频生成</h4>
              <div className="small">请先在「视频脚本」中确认分镜并点击「生成视频」。</div>
              <button
                type="button"
                className="btn soft"
                style={{ marginTop: 12 }}
                onClick={() => setState((prev) => ({ ...prev, active: 'video-script' }))}
              >
                前往视频脚本
              </button>
            </div>
          );
        }
        if (reviewerMode) {
          const selectedVideo = videoVersions.find((v) => v.id === selectedVideoVersionId) || videoVersions[0];
          return (
            <>
              <div className="detail-card detail-card-ppt-design">
                <h4>视频预览</h4>
                <div className="small">{selectedVideo.name}</div>
              </div>
              <div className="video-preview-wrap">
                <video
                  className="video-preview-player"
                  src={selectedVideo.videoUrl}
                  poster={selectedVideo.posterDataUrl}
                  controls
                  preload="metadata"
                />
              </div>
            </>
          );
        }
        return (
          <>
            <div className="detail-card detail-card-ppt-design">
              <h4>视频预览</h4>
              <div className="small">共 {videoVersions.length} 套方案，演示占位成片</div>
            </div>
            <div className="video-version-grid">
              {videoVersions.map((v) => (
                <div
                  key={v.id}
                  className={`video-version-card ${selectedVideoVersionId === v.id ? 'selected' : ''}`}
                  onClick={() => onSelectVideoVersion(v)}
                >
                  <div className="video-preview-wrap">
                    <video
                      className="video-preview-player"
                      src={v.videoUrl}
                      poster={v.posterDataUrl}
                      controls
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="video-version-meta">
                    <strong>{v.name}</strong>
                    <div className="small">
                      {v.styleTag} · {v.duration}
                      {v.isDemo ? ' · 演示' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn soft"
              onClick={() => setState((prev) => ({ ...prev, active: 'video-script' }))}
            >
              返回编辑脚本
            </button>
            <button type="button" className="btn soft" onClick={onConfirmVideoRender}>
              重新生成视频
            </button>
            {teamAndVeevaActions('video', '提交当前版本到Veeva Vault审批')}
          </>
        );

      case 'ppt-outline':
        if (!pptOutline) {
          return (
            <div className="detail-card">
              <h4>PPT 大纲</h4>
              <div className="small">
                {reviewerMode
                  ? '当前任务中还没有 PPT 大纲，请联系内容运营。'
                  : '在对话中说「生成 PPT」，确认受众与场景后将在此编辑大纲。'}
              </div>
              {!reviewerMode && (
                <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={onStartPptFlow}>
                  开始生成 PPT
                </button>
              )}
            </div>
          );
        }
        return (
          <>
            <PptOutlineEditor
              variant="inline"
              outline={pptOutline}
              onChange={onPptOutlineChange}
              onGenerateDesigns={onConfirmPptDesigns}
              onRegenerateOutline={onRegeneratePptOutline}
              selectedTemplateId={selectedPptTemplateId}
              onSelectTemplate={onSelectPptTemplate}
              isGenerating={isGenerating}
              reviewerMode={reviewerMode}
              onSaveOutlineReview={onSavePptOutlineReview}
            />
            {!reviewerMode && teamAndVeevaActions('ppt')}
          </>
        );

      case 'ppt-design': {
        if (reviewerMode) {
          return (
            <div className="detail-card">
              <h4>PPT 大纲审阅</h4>
              <div className="small">请切换到「PPT大纲」标签编辑结构；生成 PPT 成品由内容运营负责。</div>
              <button
                type="button"
                className="btn soft"
                style={{ marginTop: 12 }}
                onClick={() => setState((prev) => ({ ...prev, active: 'ppt-outline' }))}
              >
                前往 PPT 大纲
              </button>
            </div>
          );
        }
        if (!pptVersions.length) {
          return (
            <div className="detail-card">
              <h4>PPT 生成</h4>
              <div className="small">
                请先在「PPT大纲」中确认大纲并点击「生成 3 套 PPT」或「按模板生成 PPT」。
              </div>
              <button
                type="button"
                className="btn soft"
                style={{ marginTop: 12 }}
                onClick={() => setState((prev) => ({ ...prev, active: 'ppt-outline' }))}
              >
                前往 PPT 大纲
              </button>
            </div>
          );
        }
        const singleVersion = pptVersions.length <= 1;
        const activeVersion =
          pptVersions.find((v) => v.id === selectedPptVersionId) || pptVersions[0];
        return (
          <>
            {singleVersion ? (
              <div className="detail-card detail-card-ppt-design">
                <h4>{activeVersion?.name || 'PPT 成品'}</h4>
                <div className="small">
                  {activeVersion?.styleTag || '拜耳蓝绿'}
                  {activeVersion?.description ? ` · ${activeVersion.description}` : ''}
                </div>
              </div>
            ) : (
              <div className="detail-card detail-card-ppt-design">
                <h4>选择 PPT 设计方案</h4>
                <div className="small">共 {pptVersions.length} 套拜耳蓝绿风格方案</div>
                <div className="ppt-version-grid">
                  {pptVersions.map((v) => (
                    <div
                      key={v.id}
                      className={`ppt-version-card ${selectedPptVersionId === v.id ? 'selected' : ''}`}
                      onClick={() => onSelectPptVersion(v)}
                    >
                      {v.coverDataUrl ? (
                        <img src={v.coverDataUrl} alt={v.name} />
                      ) : (
                        <div className="ppt-version-placeholder" />
                      )}
                      <div className="ppt-version-meta">
                        <strong>{v.name}</strong>
                        <div className="small">{v.styleTag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pptResult && (
              <PptSlidesPanel
                slides={pptResult.slides}
                title={pptResult.title || pptOutline?.title}
                onEditSlide={onOpenPptSlideEditor}
              />
            )}
            <button
              type="button"
              className="btn soft"
              onClick={() => setState((prev) => ({ ...prev, active: 'ppt-outline' }))}
            >
              返回编辑大纲
            </button>
            {!singleVersion && (
              <button type="button" className="btn soft" onClick={() => fillQuick('生成设计')}>
                重新生成设计
              </button>
            )}
            {teamAndVeevaActions('ppt')}
          </>
        );
      }

      case 'submit': {
        const selectedVideo = videoVersions.find((v) => v.id === selectedVideoVersionId);
        return (
          <>
            <div className="detail-card">
              <h4>Veeva Vault 提交包</h4>
              <div className="small">系统已整理当前内容、引用素材、合规记录与团队修改记录。</div>
              {selectedVideo && (
                <div className="mat-meta" style={{ marginTop: 10 }}>
                  <span className="badge green">视频已纳入</span>
                  <span className="badge">{selectedVideo.name}</span>
                </div>
              )}
            </div>
            <div className="detail-card">
              <h4>Metadata</h4>
              <div className="small">
                品牌:可申达<br />
                渠道:小红书<br />
                受众:公众<br />
                用途:疾病教育<br />
                状态:Pending MLR Review
              </div>
              <div className="mat-meta">
                <span className="badge green">References included</span>
                <span className="badge green">Audit trail ready</span>
                <span className="badge warn">VV-2026-05821</span>
              </div>
            </div>
            <button className="btn green" onClick={() => toast('已提交至 Veeva Vault')}>确认提交</button>{' '}
            <button className="btn" onClick={() => toast('审计报告已生成')}>下载审计报告</button>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <aside className="wpanel right">
      <div className="right-head">
        <div className="tabs">
          {visibleTabs.length > 0 ? visibleTabs.map((k) => (
              <button
                key={k}
                type="button"
                className={`tab ${state.active === k ? 'active' : ''}`}
                onClick={() => setState((prev) => ({ ...prev, active: k }))}
              >
                {tabNames[k]}
              </button>
            )) : (
            <span className="small" style={{ padding: '12px' }}>
              产物会在这里形成详情标签
            </span>
          )}
        </div>
      </div>
      <div className="detail">
        {renderDetail()}
      </div>
    </aside>
  );
}
