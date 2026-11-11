import { memo } from 'react';
import { Avatar } from './ui';

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

// memo: only re-renders when this task object actually changes (socket updates replace one task at a time)
function TaskCard({ task, canEdit, onOpen, onMove }) {
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  return (
    <article
      className={`task-card prio-${task.priority}`}
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', task._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(task)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
    >
      <div className="task-top">
        <span className={`pill prio ${task.priority}`}>{task.priority}</span>
        {task.dueDate && <span className={`due ${overdue ? 'overdue' : ''}`}>{fmt.format(new Date(task.dueDate))}</span>}
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="muted clamp">{task.description}</p>}
      <div className="task-foot">
        <Avatar user={task.assignee} size={24} />
        {canEdit && (
          <select
            aria-label="Move task"
            value={task.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onMove(task, e.target.value)}
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        )}
      </div>
    </article>
  );
}

export default memo(TaskCard);
