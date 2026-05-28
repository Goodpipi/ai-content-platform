import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import {
  chatCompletion,
  parseJsonSafe,
  buildMaterialContext,
} from './lib/deepseek.js';
import { getMockData } from './mockData.js';
import { enrichPptDesignVersions, flattenOutlinePages } from './lib/pptSlides.js';
import { getPptTemplate } from './lib/pptTemplates.js';
import { getImageTemplate } from './lib/imageTemplates.js';
import {
  SYSTEM_BASE,
  promptInsight,
  promptCopy,
  promptTeam,
  promptVideo,
  promptPpt,
  promptPptOutline,
  promptPptDesigns,
  promptPptDesignsWithTemplate,
  promptPoster,
  promptPosterEdit,
  promptChat,
  promptSessionTitle,
} from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.RENDER === 'true' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

app.use(
  cors(
    isProduction && process.env.CORS_ORIGIN
      ? { origin: process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) }
      : undefined
  )
);
app.use(express.json({ limit: '2mb' }));

const mockOnly = () => process.env.MOCK_AI === '1' || process.env.MOCK_AI === 'true';
const fallbackEnabled = () =>
  process.env.FALLBACK_MOCK !== '0' && process.env.FALLBACK_MOCK !== 'false';

function shouldUseMockFallback(err) {
  if (!fallbackEnabled()) return false;
  const msg = String(err?.message || '');
  return (
    err?.status === 502 ||
    err?.status === 503 ||
    err?.status === 504 ||
    err.parseError === true ||
    msg.includes('繁忙') ||
    msg.includes('超时') ||
    msg.includes('无法连接') ||
    msg.includes('API Key') ||
    msg.includes('JSON') ||
    msg.includes('json')
  );
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    mockOnly: mockOnly(),
    fallbackMock: fallbackEnabled(),
  });
});

async function runAgent(systemExtra, userPrompt, jsonMode = true, mockKind = 'generic') {
  if (mockOnly()) {
    const data = getMockData(mockKind, userPrompt);
    const result = jsonMode && typeof data === 'object' ? data : data;
    return { result, mockUsed: true, mockReason: '演示模式（MOCK_AI=1）' };
  }

  try {
    const content = await chatCompletion({
      messages: [
        { role: 'system', content: `${SYSTEM_BASE}\n${systemExtra}` },
        { role: 'user', content: userPrompt },
      ],
      jsonMode,
    });
    const result = jsonMode ? parseJsonSafe(content) : content;
    return { result, mockUsed: false };
  } catch (e) {
    if (shouldUseMockFallback(e)) {
      console.warn(`[mock fallback] ${mockKind}:`, e.message);
      const data = getMockData(mockKind, userPrompt);
      const result = jsonMode && typeof data === 'object' ? data : data;
      return { result, mockUsed: true, mockReason: e.message };
    }
    throw e;
  }
}

function sendOk(res, data, meta = {}) {
  res.json({ ok: true, data, ...meta });
}

app.post('/api/generate/insight', async (req, res) => {
  try {
    const { materials = [], userNote = '' } = req.body;
    const ctx = buildMaterialContext(materials);
    const { result: data, mockUsed, mockReason } = await runAgent('', promptInsight(ctx, userNote), true, 'insight');
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/copy', async (req, res) => {
  try {
    const { materials = [], topics = [], userNote = '' } = req.body;
    const ctx = buildMaterialContext(materials);
    const { result: data, mockUsed, mockReason } = await runAgent('', promptCopy(ctx, topics, userNote), true, 'copy');
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/team', async (req, res) => {
  try {
    const { copyBody = '', feedback = '', contentType = 'copy', contentTitle = '' } = req.body;
    const { result: data, mockUsed, mockReason } = await runAgent(
      '',
      promptTeam(contentType, copyBody, contentTitle, feedback),
      true,
      'team'
    );
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/video', async (req, res) => {
  try {
    const { copyBody = '', userNote = '' } = req.body;
    const { result: data, mockUsed, mockReason } = await runAgent('', promptVideo(copyBody, userNote), true, 'video');
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/video-render', async (req, res) => {
  try {
    const { script = {} } = req.body;
    const title = script.title || '可申达科普短视频';
    const data = getMockData('video-render', title);
    sendOk(res, data, {
      mockUsed: true,
      mockReason: '演示模式：根据脚本生成占位成片，正式环境需对接视频合成服务',
    });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/ppt', async (req, res) => {
  try {
    const { copyBody = '', audience = '公众', userNote = '' } = req.body;
    const { result: data, mockUsed, mockReason } = await runAgent('', promptPpt(copyBody, audience, userNote), true, 'ppt');
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/ppt-outline', async (req, res) => {
  try {
    const { materials = [], brief = '', audience = '公众', scenario = '', userNote = '' } = req.body;
    const ctx = buildMaterialContext(materials);
    const { result: data, mockUsed, mockReason } = await runAgent(
      '',
      promptPptOutline(ctx, brief, audience, scenario, userNote),
      true,
      'ppt-outline'
    );
    sendOk(res, data, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/ppt-designs', async (req, res) => {
  try {
    const { outline, audience = '公众', scenario = '', templateId = null } = req.body;
    const pageCount = flattenOutlinePages(outline).length;
    const outlineJson = JSON.stringify(outline, null, 2);
    const tpl = templateId ? getPptTemplate(templateId) : null;
    const prompt = tpl
      ? promptPptDesignsWithTemplate(
          outlineJson,
          audience,
          scenario,
          pageCount,
          tpl.name,
          tpl.styleTag
        )
      : promptPptDesigns(outlineJson, audience, scenario, pageCount);
    const { result: data, mockUsed, mockReason } = await runAgent(
      '',
      prompt,
      true,
      tpl ? 'ppt-designs-template' : 'ppt-designs'
    );
    const enriched = enrichPptDesignVersions(data, outline, {
      templateId: tpl?.id,
      singleVersion: Boolean(tpl),
    });
    const versions = enriched.versions.map((v) => {
      const coverSvg = v.slides?.[0]?.svg || '';
      return {
        ...v,
        coverDataUrl: coverSvg
          ? `data:image/svg+xml,${encodeURIComponent(coverSvg)}`
          : undefined,
      };
    });
    sendOk(res, { versions }, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/poster', async (req, res) => {
  try {
    const { copyBody = '', userNote = '', templateId = null } = req.body;
    const tpl = templateId ? getImageTemplate(templateId) : null;
    const { result: data, mockUsed, mockReason } = await runAgent(
      '',
      promptPoster(copyBody, userNote, tpl),
      true,
      tpl ? 'poster-template' : 'poster'
    );
    const svg = data.svg || '';
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    sendOk(res, { ...data, dataUrl }, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/poster-edit', async (req, res) => {
  try {
    const { svg = '', editPrompt = '', maskBounds = null, layers = [], copyBody = '' } = req.body;
    let baseSvg = svg;
    if (!baseSvg && copyBody) {
      const { result: created } = await runAgent('', promptPoster(copyBody, editPrompt), true, 'poster');
      baseSvg = created.svg || '';
    }
    const { result: data, mockUsed, mockReason } = await runAgent(
      '',
      promptPosterEdit(baseSvg, editPrompt, maskBounds, layers),
      true,
      'poster-edit'
    );
    const outSvg = data.svg || baseSvg;
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(outSvg)}`;
    sendOk(res, { ...data, dataUrl, svg: outSvg }, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/generate/session-title', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    const snippet = messages
      .slice(-12)
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${String(m.content || '').slice(0, 200)}`)
      .join('\n');
    const { result: raw, mockUsed, mockReason } = await runAgent(
      '你是会话命名助手，为医药内容工作台生成简洁中文标题。',
      promptSessionTitle(snippet || '（暂无对话）'),
      false,
      'session-title'
    );
    let title = String(raw || '')
      .trim()
      .replace(/^["'「『]|["'」』]$/g, '')
      .replace(/[。.!！]+$/g, '');
    if (title.length > 24) title = title.slice(0, 24);
    if (!title) title = '新内容任务';
    if (!title.startsWith('可申达')) title = `可申达｜${title}`;
    sendOk(res, { title }, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { materials = [], history = [], message = '' } = req.body;
    const ctx = buildMaterialContext(materials);
    const { result: text, mockUsed, mockReason } = await runAgent(
      '你是对话助手，帮助用户推进内容创作流程。',
      promptChat(ctx, history, message),
      false,
      'chat'
    );
    sendOk(res, { reply: text }, { mockUsed, mockReason });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
});

if (isProduction) {
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `[production] Missing ${indexHtml}. Run "npm run build" before starting the server.`
    );
    process.exit(1);
  }
  app.use(express.static(distDir, { index: 'index.html', maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const mode = isProduction ? 'production (web + API)' : 'development API only';
  console.log(`AI Content Platform [${mode}] → http://0.0.0.0:${PORT}`);
  console.log(`DeepSeek configured: ${Boolean(process.env.DEEPSEEK_API_KEY)}`);
  if (isProduction) {
    console.log(`Static UI from: ${distDir}`);
  }
});
