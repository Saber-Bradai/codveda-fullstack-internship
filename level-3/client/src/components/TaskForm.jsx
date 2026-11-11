import { useState } from 'react';
import { Button, Field } from './ui';

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function TaskForm({ task, users, canEditAll, canDelete, onSubmit, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    dueDate: toDateInput(task?.dueDate),
    assignee: task?.assignee?._id || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const ro = !canEditAll; // assignee: status only

  async function submit(e) {
    e.preventDefault();
    if (form.title.trim().length < 2) return setErrors({ title: 'Title must be at least 2 characters' });
    setSaving(true);
    setErrors({});
    try {
      await onSubmit(ro ? { status: form.status } : form);
    } catch (err) {
      setErrors(err.details || { _: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {errors._ && <div className="alert error">{errors._}</div>}
      <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} disabled={ro} autoFocus required />
      <Field label="Description" as="textarea" rows={3} value={form.description} onChange={set('description')} disabled={ro} />
      <div className="grid-2">
        <Field label="Status">
          <select value={form.status} onChange={set('status')}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={set('priority')} disabled={ro}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Assignee" error={errors.assignee}>
          <select value={form.assignee} onChange={set('assignee')} disabled={ro}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} disabled={ro} error={errors.dueDate} />
      </div>
      {ro && <p className="muted small">You're the assignee — you can update the status only.</p>}
      <div className="row-between">
        {canDelete ? <Button variant="danger" type="button" onClick={onDelete}>Delete</Button> : <span />}
        <div className="row">
          <Button type="button" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit" loading={saving}>{task ? 'Save' : 'Create task'}</Button>
        </div>
      </div>
    </form>
  );
}
