const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const REQUEST_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS) || 90_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyApiError(status, bodyText) {
  if (status === 503 || bodyText.includes('service_unavailable') || bodyText.includes('too busy')) {
    return 'DeepSeek 服务当前繁忙，请稍等 1–2 分钟后重试。';
  }
  if (status === 401 || (bodyText.includes('invalid') && bodyText.includes('api'))) {
    return 'DeepSeek API Key 无效，请检查 .env 中的 DEEPSEEK_API_KEY。';
  }
  if (status === 429) {
    return 'DeepSeek 请求过于频繁，请稍后再试。';
  }
  return `DeepSeek API 错误 (${status})：${bodyText.slice(0, 200)}`;
}

async function chatCompletionOnce({ messages, temperature = 0.7, jsonMode = false }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const err = new Error('未配置 DEEPSEEK_API_KEY，请在项目根目录创建 .env 文件');
    err.status = 503;
    throw err;
  }

  const body = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    stream: false,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`DeepSeek 请求超时（${REQUEST_TIMEOUT_MS / 1000} 秒），请稍后重试`);
      err.status = 504;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(friendlyApiError(res.status, text));
    err.status = res.status >= 500 ? 502 : 400;
    err.retryable = res.status === 503 || res.status === 429;
    throw err;
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek 返回内容为空');
  }
  return content;
}

export async function chatCompletion(opts) {
  const maxAttempts = 3;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await chatCompletionOnce(opts);
    } catch (e) {
      lastError = e;
      const busy = String(e.message || '').includes('繁忙') || String(e.message || '').includes('503');
      const retryable = !busy && (e.retryable || e.status === 504);
      if (retryable && attempt < maxAttempts) {
        await sleep(1500 * attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

function stripMarkdownFence(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  return t.trim();
}

/** 尝试闭合被截断的 JSON（常见于超长 PPT 设计响应） */
function repairTruncatedJson(raw) {
  let s = raw.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/,\s*$/g, '');
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') {
      if (stack.length && stack[stack.length - 1] === c) stack.pop();
    }
  }
  while (stack.length) s += stack.pop();
  return s;
}

export function parseJsonSafe(text) {
  const cleaned = stripMarkdownFence(text);
  const attempts = [
    cleaned,
    cleaned.match(/\{[\s\S]*\}/)?.[0],
    cleaned.match(/\{[\s\S]*/)?.[0],
  ].filter(Boolean);

  let lastErr;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      lastErr = e;
      try {
        return JSON.parse(repairTruncatedJson(candidate));
      } catch {
        /* next */
      }
    }
  }

  const err = new Error(
    `AI 返回的内容不是合法 JSON（${lastErr?.message || '解析失败'}）。请重试或稍后再试。`
  );
  err.parseError = true;
  throw err;
}

export function buildMaterialContext(materials = []) {
  if (!materials.length) return '（暂无引用素材，请基于可申达肾脏健康疾病教育场景生成）';
  return materials
    .map((m, i) => `${i + 1}. [${m.cat}] ${m.title} — ${m.meta}`)
    .join('\n');
}
