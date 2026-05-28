import { useState } from 'react';
import type { UserRole } from '@/types/review';
import { ROLE_PROFILES } from '@/types/review';

interface CopyReviewEditorProps {
  baseText: string;
  role: UserRole;
  onSave: (newText: string) => void;
  onCancel?: () => void;
}

export function CopyReviewEditor({ baseText, role, onSave, onCancel }: CopyReviewEditorProps) {
  const [draft, setDraft] = useState(baseText);
  const profile = ROLE_PROFILES[role];

  return (
    <div className="detail-card copy-review-editor">
      <h4>文案审阅修改</h4>
      <div className="small" style={{ marginBottom: 10 }}>
        当前身份：<strong>
          {profile.name}（{profile.dept}）
        </strong>
        。保存后将记录相对上一版正文的<strong>增加</strong>与<strong>删除</strong>，并用本角色颜色标记；其他审阅人的修改见上方记录。
      </div>
      <textarea
        className="inline-edit copy-review-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={12}
      />
      <div className="quick-row" style={{ marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={() => onSave(draft)}>
          保存修改
        </button>
        {onCancel && (
          <button type="button" className="btn soft" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </div>
  );
}
