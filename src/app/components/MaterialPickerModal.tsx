import { useEffect, useRef, useState } from 'react';

export interface PickedMaterial {
  title: string;
  meta: string;
  cat: string;
  cms: boolean;
  fileName?: string;
}

interface MaterialPickerModalProps {
  open: boolean;
  defaultCat?: string;
  initialTab?: 'upload' | 'cms';
  categories: string[];
  onClose: () => void;
  onConfirm: (item: PickedMaterial) => void;
}

const MOCK_CMS_POOL = [
  { title: '可申达 Approved Claims Library v2026.04', cat: '参考知识', status: 'Approved' },
  { title: '小红书肾脏健康热点观察 2026-05', cat: '热点洞察', status: 'Approved' },
  { title: '公众渠道疾病教育合规手册', cat: '合规手册', status: 'Approved' },
  { title: 'Bayer Blue-Green Visual Kit 2026', cat: '渠道特色', status: 'Approved' },
  { title: '可申达 2026 品牌沟通 Briefing', cat: '品牌briefing', status: 'Approved' },
  { title: '慢性肾病风险认知患者教育手册', cat: '参考知识', status: 'Approved' },
  { title: '小红书高互动标题样本集', cat: '热点洞察', status: 'Draft' },
  { title: 'HCP 拜访核心信息卡', cat: '参考知识', status: 'Approved' },
];

export function MaterialPickerModal({
  open,
  defaultCat = '参考知识',
  initialTab = 'upload',
  categories,
  onClose,
  onConfirm,
}: MaterialPickerModalProps) {
  const [tab, setTab] = useState<'upload' | 'cms'>(initialTab);
  const [cat, setCat] = useState(defaultCat);
  const [cmsQuery, setCmsQuery] = useState('');
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsResults, setCmsResults] = useState<typeof MOCK_CMS_POOL>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const searchCms = (query = cmsQuery) => {
    setCmsLoading(true);
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      const list = MOCK_CMS_POOL.filter(
        (x) =>
          !q ||
          x.title.toLowerCase().includes(q) ||
          x.cat.toLowerCase().includes(q) ||
          x.status.toLowerCase().includes(q)
      );
      setCmsResults(list.length ? list : MOCK_CMS_POOL.slice(0, 4));
      setCmsLoading(false);
    }, 480);
  };

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setCat(defaultCat);
      if (initialTab === 'cms') searchCms('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open 时同步初始 tab
  }, [open, initialTab, defaultCat]);

  if (!open) return null;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onConfirm({
      title: `${cat}｜${file.name}`,
      meta: `本地上传 · ${(file.size / 1024).toFixed(0)}KB · 已解析`,
      cat,
      cms: false,
      fileName: file.name,
    });
    e.target.value = '';
    onClose();
  };

  const pickCms = (item: (typeof MOCK_CMS_POOL)[0]) => {
    onConfirm({
      title: item.title,
      meta: `CMS · ${item.status} · 已关联到任务`,
      cat: item.cat,
      cms: true,
    });
    onClose();
  };

  return (
    <div
      className="modal-bg show material-picker-bg"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('material-picker-bg')) onClose();
      }}
    >
      <div className="modal material-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h3>添加素材</h3>
        <div className="picker-tabs">
          <button
            type="button"
            className={`picker-tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            本地上传
          </button>
          <button
            type="button"
            className={`picker-tab ${tab === 'cms' ? 'active' : ''}`}
            onClick={() => {
              setTab('cms');
              if (!cmsResults.length) searchCms();
            }}
          >
            搜索 CMS
          </button>
        </div>

        <label className="props-field" style={{ marginTop: 12 }}>
          <span>素材分类</span>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {tab === 'upload' && (
          <div className="picker-upload-zone" onClick={() => fileRef.current?.click()}>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.svg,.txt,.md"
              onChange={onFileChange}
            />
            <strong>点击选择本地文件</strong>
            <div className="small">支持 PDF、Office、图片、文本等</div>
          </div>
        )}

        {tab === 'cms' && (
          <div className="picker-cms">
            <div className="cms-status">
              <span className="dot" />
              CMS 已连接（演示） · Vault: China-Marketing
            </div>
            <div className="filters" style={{ marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="搜索素材名称、标签、审批状态"
                value={cmsQuery}
                onChange={(e) => setCmsQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCms()}
              />
              <button type="button" className="btn primary" onClick={searchCms}>
                搜索
              </button>
            </div>
            {cmsLoading ? (
              <div className="small" style={{ padding: 16, textAlign: 'center' }}>
                正在检索 CMS…
              </div>
            ) : (
              <div className="cms-result-list">
                {(cmsResults.length ? cmsResults : MOCK_CMS_POOL).map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    className="cms-result-row"
                    onClick={() => pickCms(item)}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <div className="small">{item.cat}</div>
                    </div>
                    <span className={`badge ${item.status === 'Approved' ? 'green' : 'warn'}`}>
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="quick-row" style={{ marginTop: 14 }}>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
