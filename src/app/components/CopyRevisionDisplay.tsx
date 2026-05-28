import type { CopyRevision } from '@/types/review';
import { AUTHOR_COLORS } from '@/types/review';

interface CopyRevisionDisplayProps {
  baseText: string;
  revisions: CopyRevision[];
}

export function CopyRevisionDisplay({ baseText, revisions }: CopyRevisionDisplayProps) {
  if (!revisions.length) {
    return (
      <div className="detail-card">
        <h4>文案修改记录</h4>
        <div className="small">暂无审阅者提交的逐条修改记录。</div>
      </div>
    );
  }

  return (
    <div className="detail-card copy-revision-panel">
      <h4>文案修改记录（按审阅者）</h4>
      <div className="copy-revision-legend">
        {revisions.map((r) => (
          <span key={r.id} className="copy-revision-legend-item">
            <span
              className="copy-revision-dot"
              style={{ background: AUTHOR_COLORS[r.authorRole].add }}
            />
            {r.authorName}-{r.authorDept}
          </span>
        ))}
      </div>
      {revisions.map((rev) => {
        const colors = AUTHOR_COLORS[rev.authorRole];
        return (
          <div key={rev.id} className="copy-revision-block">
            <div className="small" style={{ marginBottom: 8 }}>
              <strong>
                {rev.authorName}（{rev.authorDept}）
              </strong>
              · {new Date(rev.createdAt).toLocaleString()}
            </div>
            <div className="copy-revision-diff">
              {rev.segments.map((seg, i) => {
                if (seg.kind === 'equal') {
                  return <span key={i}>{seg.text}</span>;
                }
                if (seg.kind === 'add') {
                  return (
                    <span key={i} className="copy-diff-add" style={{ color: colors.add }}>
                      {seg.text}
                    </span>
                  );
                }
                return (
                  <span
                    key={i}
                    className="copy-diff-del"
                    style={{ color: colors.del, textDecoration: 'line-through' }}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="detail-card" style={{ marginTop: 12, background: '#f8fcff' }}>
        <h4>合并后正文</h4>
        <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {revisions[revisions.length - 1].resultText}
        </p>
      </div>
      <details className="small" style={{ marginTop: 8 }}>
        <summary>查看修改前原文</summary>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{baseText}</p>
      </details>
    </div>
  );
}
