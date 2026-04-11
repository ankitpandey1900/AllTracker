/**
 * Handles the Task List (Daily Missions).
 *
 * It deals with adding tasks, moving unfinished ones to the 'Backlog', 
 * and cleaning up old history items.
 */

import { appState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { saveTasksToStorage } from '@/services/data-bridge';
import type { StudyTask } from '@/types/task.types';

// --- Starting Up ---

/** Initializes the task feature and performs the backlog/cleanup check */
export function initTasks(): void {
  cleanupTasks();
  renderTasks();
  setupTaskListeners();
}

// --- Showing the Tasks ---

export function renderTasks(): void {
  const today = new Date().toISOString().split('T')[0];
  
  const todayList = document.getElementById('todayTasksList');
  const backlogList = document.getElementById('backlogTasksList');
  const historyList = document.getElementById('completedTasksList');
  const backlogBadge = document.getElementById('backlogCount');

  if (!todayList || !backlogList || !historyList) return;

  const tasks = appState.tasks;

  // Partition tasks
  let todayMissions = tasks.filter(t => !t.completed && t.date === today);
  let backlogTasks = tasks.filter(t => !t.completed && t.date < today);
  const historyTasks = tasks.filter(t => t.completed).sort((a, b) => b.createdAt - a.createdAt);

  // Sort by Priority: High (3) -> Med (2) -> Low (1)
  const prioritySort = (a: StudyTask, b: StudyTask) => {
    const ap = a.priority ?? 1;
    const bp = b.priority ?? 1;
    if (bp !== ap) return bp - ap;
    return a.createdAt - b.createdAt;
  };

  todayMissions.sort(prioritySort);
  backlogTasks.sort(prioritySort);

  // Update the 'Clearance' progress bar at the top
  const todayCompleted = historyTasks.filter(t => t.date === today);
  const totalTodayTasks = todayMissions.length + todayCompleted.length;
  const clearancePercent = totalTodayTasks > 0 ? Math.round((todayCompleted.length / totalTodayTasks) * 100) : 0;
  
  const clearanceText = document.getElementById('clearanceText');
  const clearanceFill = document.getElementById('clearanceFill');
  
  if (clearanceText && clearanceFill) {
    clearanceText.textContent = `${clearancePercent}%`;
    clearanceFill.style.width = `${clearancePercent}%`;
    
    if (clearancePercent === 100 && totalTodayTasks > 0) {
      clearanceFill.classList.add('cleared');
      clearanceText.classList.add('cleared');
    } else {
      clearanceFill.classList.remove('cleared');
      clearanceText.classList.remove('cleared');
    }
  }

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
  if (tasks.length === 0) {
    return `
      <div class="empty-state-modern">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        <div class="empty-state-title">No Missions Found</div>
        <div class="empty-state-text">Your terminal is clear. Add a new objective above to begin.</div>
      </div>
    `;
  }

  return tasks.map(task => {
    const priorityClass = task.priority === 3 ? 'priority-high' : (task.priority === 2 ? 'priority-med' : 'priority-low');
    const priorityLabel = task.priority === 3 ? 'High' : (task.priority === 2 ? 'Med' : 'Low');

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-check" data-id="${task.id}" data-action="toggle">
          <div class="check-box ${task.completed ? 'checked' : ''}"></div>
        </div>
        <div class="task-label-group">
          <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
          <div class="task-label">${task.text}</div>
        </div>
        <button class="btn-task-delete" data-id="${task.id}" data-action="delete" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
  }).join('');
}

// --- Handling Clicks and Inputs ---

function setupTaskListeners(): void {
  const addBtn = document.getElementById('addTaskBtn');
  const input = document.getElementById('newTaskInput') as HTMLInputElement;
  const selector = document.getElementById('taskPrioritySelector');
  const buttons = selector?.querySelectorAll('.priority-btn');

  let activePriority: 1 | 2 | 3 = 2; // Default to Med

  if (buttons) {
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePriority = parseInt(btn.getAttribute('data-priority') || '2') as 1 | 2 | 3;
      });
    });
  }

  if (addBtn && input) {
    const handleAdd = () => {
      const text = input.value.trim();
      if (!text) return;
      addTask(text, activePriority);
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

export function addTask(text: string, priority: 1 | 2 | 3 = 2): void {
  const newTask: StudyTask = {
    id: Date.now(),
    text,
    completed: false,
    date: new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
    priority
  };

  appState.tasks.push(newTask);
  saveTasks();
  renderTasks();
  showToast('Mission Accepted!', 'success');
}

export function toggleTask(id: number): void {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // ⚡ OPTIMISTIC UI: Toggle instantly
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : undefined;
  renderTasks();

  saveTasks();
  
  if (task.completed) {
    showToast('Objective Secured!', 'success');
  }
}

/** Automatically deletes tasks that have been in history for more than 3 days */
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
