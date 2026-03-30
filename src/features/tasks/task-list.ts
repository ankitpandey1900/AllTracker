/**
 * Mission Control (Tasks) Feature
 *
 * Handles date-wise study tasks with an automatic 24-hour backlog system.
 */

import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { saveTasksToStorage } from '@/services/data-bridge';
import type { StudyTask } from '@/types/task.types';

// ─── Initialization ──────────────────────────────────────────

/** Initializes the task feature and performs the backlog/cleanup check */
export function initTasks(): void {
  cleanupTasks();
  renderTasks();
  setupTaskListeners();
}

// ─── Rendering ───────────────────────────────────────────────

export function renderTasks(): void {
  const today = new Date().toISOString().split('T')[0];
  
  const todayList = document.getElementById('todayTasksList');
  const backlogList = document.getElementById('backlogTasksList');
  const historyList = document.getElementById('completedTasksList');
  const backlogBadge = document.getElementById('backlogCount');

  if (!todayList || !backlogList || !historyList) return;

  const tasks = appState.tasks;

  // Partition tasks
  const todayMissions = tasks.filter(t => !t.completed && t.date === today);
  const backlogTasks = tasks.filter(t => !t.completed && t.date < today);
  const historyTasks = tasks.filter(t => t.completed).sort((a, b) => b.createdAt - a.createdAt);

  // Update Badge
  if (backlogBadge) {
    backlogBadge.textContent = `${backlogTasks.length} Backlog`;
    backlogBadge.className = backlogTasks.length > 0 ? 'badge-backlog active' : 'badge-backlog';
  }

  // Render Lists
  todayList.innerHTML = renderTaskList(todayMissions);
  backlogList.innerHTML = renderTaskList(backlogTasks);
  historyList.innerHTML = renderTaskList(historyTasks.slice(0, 20)); // Limit history to last 20 items

  // Attach dynamic listeners
  document.querySelectorAll('.task-item [data-id]').forEach(el => {
    el.addEventListener('click', handleTaskAction);
  });
}

function renderTaskList(tasks: StudyTask[]): string {
  if (tasks.length === 0) return '<div class="empty-list">No tasks here.</div>';

  return tasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
      <div class="task-check" data-id="${task.id}" data-action="toggle">
        <div class="check-box ${task.completed ? 'checked' : ''}"></div>
      </div>
      <div class="task-label">${task.text}</div>
      <button class="btn-task-delete" data-id="${task.id}" data-action="delete" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  `).join('');
}

// ─── Actions ─────────────────────────────────────────────────

function setupTaskListeners(): void {
  const addBtn = document.getElementById('addTaskBtn');
  const input = document.getElementById('newTaskInput') as HTMLInputElement;

  if (addBtn && input) {
    const handleAdd = () => {
      const text = input.value.trim();
      if (!text) return;
      addTask(text);
      input.value = '';
    };

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });
  }
}

function handleTaskAction(e: Event): void {
  const target = e.currentTarget as HTMLElement;
  const action = target.getAttribute('data-action');
  const id = parseInt(target.getAttribute('data-id') || '0');

  if (action === 'toggle') toggleTask(id);
  if (action === 'delete') deleteTask(id);
}

export function addTask(text: string): void {
  const newTask: StudyTask = {
    id: Date.now(),
    text,
    completed: false,
    date: new Date().toISOString().split('T')[0],
    createdAt: Date.now()
  };

  appState.tasks.push(newTask);
  saveTasks();
  renderTasks();
  showToast('Mission Accepted!', 'success');
}

export function toggleTask(id: number): void {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : undefined;
  
  saveTasks();
  renderTasks();
  
  if (task.completed) {
    showToast('Objective Secured!', 'success');
  }
}

/** Automatically deletes tasks that have been in history (completed) for more than 3 days */
function cleanupTasks(): void {
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const originalCount = appState.tasks.length;
  appState.tasks = appState.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return true;
    return (now - t.completedAt) < threeDaysInMs;
  });

  if (appState.tasks.length < originalCount) {
    saveTasks();
    console.log(`Cleaned up ${originalCount - appState.tasks.length} old history tasks.`);
  }
}

export function deleteTask(id: number): void {
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  showToast('Task Removed.');
}

function saveTasks(): void {
  saveTasksToStorage(appState.tasks);
}
