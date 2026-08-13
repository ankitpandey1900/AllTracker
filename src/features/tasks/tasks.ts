/**
* Handles the Task List (Daily Missions).
*
* It deals with adding tasks, moving unfinished ones to the 'Backlog', 
* and cleaning up old history items.
*/

import { appState, subscribeToState } from '@/state/app-state';
import { showToast } from '@/utils/dom.utils';
import { deleteTaskFromStorage, saveTasksToStorage } from '@/services/data-bridge';
import { log } from '@/utils/logger.utils';
import { getLocalIsoDate } from '@/utils/date.utils';
import type { StudyTask } from '@/types/task.types';
import { requireAuth } from '@/services/auth.service';

// --- Starting Up ---

/** Initializes the task feature and performs the backlog/cleanup check */
export function initTasks(): void {
  // Senior Developer Practice: Reactive Subscriptions
  // This ensures the UI is always in sync with the state, regardless of where the change came from.
  subscribeToState((path) => {
    if (path === 'tasks') renderTasks();
  });

  // 🛡️ CLOUD-SAFE CLEANUP: Delayed 5s so cloud sync can pull fresh task data first.
  // Without this delay, cleanup ran on stale local state and then OVERWROTE the cloud vault
  // with fewer tasks — permanently deleting tasks that only existed in the cloud.
  setTimeout(() => cleanupTasks(), 5000);
  renderTasks();
  setupTaskListeners();
}

// --- Showing the Tasks ---

export function renderTasks(): void {
  const today = getLocalIsoDate();

  const todayList = document.getElementById('todayTasksList');
  const backlogList = document.getElementById('backlogTasksList');
  const weeklyList = document.getElementById('weeklyTasksList');
  const historyList = document.getElementById('completedTasksList');
  const backlogBadge = document.getElementById('backlogCount');

  if (!todayList || !backlogList || !historyList) return;

  const tasks = appState.tasks;

  // Separate tasks by type
  const dailyTasks = tasks.filter(t => t.type !== 'weekly');
  const weeklyTasks = tasks.filter(t => t.type === 'weekly');

  // Daily processing
  let backlogDaily = dailyTasks.filter(t => !t.completed && t.date < today);
  const historyDaily = dailyTasks.filter(t => t.completed).sort((a, b) => b.createdAt - a.createdAt);

  const todayCompleted = historyDaily.filter(t => t.date === today);
  const todayIncomplete = dailyTasks.filter(t => !t.completed && t.date === today);
  const totalTodayTasks = todayIncomplete.length + todayCompleted.length;

  let todayMissions = [...todayIncomplete];
  const futureDaily = dailyTasks.filter(t => !t.completed && t.date > today);

  if (todayMissions.length === 0 && futureDaily.length > 0) {
    todayMissions = [futureDaily[0]];
  }

  // Weekly processing
  let incompleteWeekly = weeklyTasks.filter(t => !t.completed);
  const historyWeekly = weeklyTasks.filter(t => t.completed).sort((a, b) => b.createdAt - a.createdAt);

  // Sorting
  const prioritySort = (a: StudyTask, b: StudyTask) => {
    const ap = a.priority ?? 1;
    const bp = b.priority ?? 1;
    if (bp !== ap) return bp - ap;
    return a.createdAt - b.createdAt;
  };

  todayMissions.sort(prioritySort);
  backlogDaily.sort(prioritySort);
  incompleteWeekly.sort(prioritySort);

  // Clearance calculation
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
    backlogBadge.textContent = `${backlogDaily.length} Backlog`;
    backlogBadge.className = backlogDaily.length > 0 ? 'badge-backlog active' : 'badge-backlog';
  }

  // Render Lists
  todayList.innerHTML = renderTaskList(todayMissions);
  backlogList.innerHTML = renderTaskList(backlogDaily);
  if (weeklyList) {
    weeklyList.innerHTML = renderTaskList(incompleteWeekly);
  }

  // Combine all history for history tab, or just keep it all together
  const allHistory = [...historyDaily, ...historyWeekly].sort((a, b) => b.createdAt - a.createdAt);
  historyList.innerHTML = renderTaskList(allHistory.slice(0, 20));

  // Attach dynamic listeners
  document.querySelectorAll('.mc-task-item [data-id]').forEach(el => {
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
    const priorityClass = task.priority === 3 ? 'high-pri' : (task.priority === 2 ? 'med-pri' : 'low-pri');

    return `
      <div class="mc-task-item ${task.completed ? 'completed' : ''} ${priorityClass}" data-task-id="${task.id}">
        <div class="mc-task-check" data-id="${task.id}" data-action="toggle">
          <div class="mc-check-ring ${task.completed ? 'checked' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <div class="mc-task-content">
          <div class="mc-task-label">${task.text}</div>
        </div>
        <div class="mc-task-meta">
          <span class="mc-task-priority-badge">${task.priority === 3 ? 'HIGH' : (task.priority === 2 ? 'MED' : 'LOW')}</span>
          <span class="mc-task-date">${new Date(task.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="mc-task-actions" style="display: flex; gap: 4px;">
          <button class="mc-task-edit" data-id="${task.id}" data-action="edit" title="Edit Mission">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="mc-task-delete" data-id="${task.id}" data-action="delete" title="Delete Mission">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- Handling Clicks and Inputs ---

function setupTaskListeners(): void {
  const addBtn = document.getElementById('addTaskBtn');
  const input = document.getElementById('newTaskInput') as HTMLInputElement;
  const selector = document.getElementById('taskPrioritySelector');
  const buttons = selector?.querySelectorAll('.priority-toggle');
  const typeButtons = document.querySelectorAll('.task-type-toggle .type-btn');

  let activePriority: 1 | 2 | 3 = 2; // Default to Med
  let activeType: 'daily' | 'weekly' = 'daily';

  if (typeButtons.length > 0) {
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeType = btn.getAttribute('data-type') as 'daily' | 'weekly';
        input.placeholder = activeType === 'daily' ? 'Initiate new objective...' : 'Initiate high-level weekly goal...';
      });
    });
  }

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
    const handleAdd = requireAuth(() => {
      const text = input.value.trim();
      if (!text) return;
      addTask(text, activePriority, activeType);
      input.value = '';
    });

    addBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });
  }
}

function handleTaskAction(e: Event): void {
  const target = e.currentTarget as HTMLElement;
  const action = target.getAttribute('data-action');
  const id = target.getAttribute('data-id') || '';

  if (action === 'toggle') toggleTask(id);
  if (action === 'edit') editTask(id);
  if (action === 'delete') deleteTask(id);
}

export function addTask(text: string, priority: 1 | 2 | 3 = 2, type: 'daily' | 'weekly' = 'daily'): void {
  const newTask: StudyTask = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    date: getLocalIsoDate(),
    createdAt: Date.now(),
    priority,
    type
  };

  appState.tasks = [...appState.tasks, newTask];

  saveTasks();
  showToast('Mission Accepted!', 'success');
}

export function editTask(id: string): void {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const newText = window.prompt("Edit Mission:", task.text);
  if (newText !== null && newText.trim() !== '') {
    appState.tasks = appState.tasks.map(t =>
      t.id === id ? { ...t, text: newText.trim() } : t
    );
    saveTasks();
  }
}

export function toggleTask(id: string): void {
  // Immutable update pattern to trigger Proxy
  appState.tasks = appState.tasks.map(t => {
    if (t.id === id) {
      const completed = !t.completed;
      return {
        ...t,
        completed,
        completedAt: completed ? Date.now() : undefined
      };
    }
    return t;
  });

  saveTasks();

  const found = appState.tasks.find(t => t.id === id);
  if (found?.completed) {
    showToast('Objective Secured!', 'success');
  }
}

/**
 * Tasks are user records, not disposable cache entries. Keep them until the
 * user explicitly deletes them; the UI already separates active work from
 * completed history.
 */
function cleanupTasks(): void {
  log.info('Task cleanup skipped: tasks are retained until explicitly deleted.');
}

export function deleteTask(id: string): void {
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  void deleteTaskFromStorage(id);
  showToast('Task Removed.');
}

function saveTasks(): void {
  saveTasksToStorage(appState.tasks);
}
