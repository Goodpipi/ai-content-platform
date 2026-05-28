import type { ReviewTask } from '@/types/review';
import { formatSessionTime } from '@/lib/chatSessions';

interface ReviewerHomeProps {
  tasks: ReviewTask[];
  deptLabel: string;
  onOpenTask: (taskId: string) => void;
}

function statusLabel(status: ReviewTask['status']): string {
  switch (status) {
    case 'completed':
      return '已修改';
    case 'in_progress':
      return '修改中';
    default:
      return '待修改';
  }
}

function statusClass(status: ReviewTask['status']): string {
  switch (status) {
    case 'completed':
      return 'badge green';
    case 'in_progress':
      return 'badge warn';
    default:
      return 'badge';
  }
}

const CONTENT_LABELS: Record<ReviewTask['contentType'], string> = {
  copy: '文案',
  visual: '图片',
  video: '视频脚本',
  ppt: 'PPT',
};

export function ReviewerHome({ tasks, deptLabel, onOpenTask }: ReviewerHomeProps) {
  return (
    <div className="reviewer-home">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', color: 'var(--blue)' }}>
          {deptLabel} · 团队修改任务
        </h1>
        <p style={{ fontSize: 17, color: 'var(--muted)', margin: 0 }}>
          内容运营分配的任务如下，点击进入详情完成审阅与修改。
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="detail-card" style={{ textAlign: 'center', padding: 40 }}>
          <h4>暂无待办任务</h4>
          <div className="small">运营提交团队修改后，任务会出现在此列表。</div>
        </div>
      ) : (
        <div className="review-task-list">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="review-task-card content-tile"
              onClick={() => onOpenTask(task.id)}
            >
              <div className="review-task-card-head">
                <strong>{task.title}</strong>
                <span className={statusClass(task.status)}>{statusLabel(task.status)}</span>
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                类型：{CONTENT_LABELS[task.contentType]} · 分配人：{task.assignerName} · 截止：
                {task.deadline.replace('T', ' ')}
              </div>
              <div className="small" style={{ marginTop: 4, color: 'var(--muted)' }}>
                更新于 {formatSessionTime(task.updatedAt)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
