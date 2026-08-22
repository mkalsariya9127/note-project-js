/* =========================================================
   TaskFlow — vanilla JavaScript
   Tasks are kept in one array and re-rendered whenever
   something changes. Everything is persisted to localStorage.
   ========================================================= */

'use strict';

const STORAGE_KEY = 'taskflow.tasks';
const THEME_KEY = 'taskflow.theme';

// Order used when sorting by priority (high first)
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const LABELS = {
    priority: { low: 'Low', medium: 'Medium', high: 'High' },
    category: {
        personal: 'Personal',
        work: 'Work',
        study: 'Study',
        shopping: 'Shopping',
        other: 'Other'
    }
};

const CATEGORY_ICONS = {
    personal: 'bi-person',
    work: 'bi-briefcase',
    study: 'bi-book',
    shopping: 'bi-cart',
    other: 'bi-tag'
};

/* ---------------- state ---------------- */

let tasks = [];
let activeFilter = 'all';
let activeSort = 'newest';
let searchTerm = '';
let taskIdPendingDelete = null;

/* ---------------- element references ---------------- */

const el = {
    todayDate: document.getElementById('todayDate'),
    statTotal: document.getElementById('statTotal'),
    statCompleted: document.getElementById('statCompleted'),
    statPending: document.getElementById('statPending'),
    statRate: document.getElementById('statRate'),
    taskForm: document.getElementById('taskForm'),
    titleInput: document.getElementById('titleInput'),
    descInput: document.getElementById('descInput'),
    dueInput: document.getElementById('dueInput'),
    priorityInput: document.getElementById('priorityInput'),
    categoryInput: document.getElementById('categoryInput'),
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    noResults: document.getElementById('noResults'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    filterBar: document.getElementById('filterBar'),
    navFilters: document.getElementById('navFilters'),
    sortSelect: document.getElementById('sortSelect'),
    searchInput: document.getElementById('searchInput'),
    themeToggle: document.getElementById('themeToggle'),
    progressBar: document.getElementById('progressBar'),
    progressBarWrap: document.getElementById('progressBarWrap'),
    progressCount: document.getElementById('progressCount'),
    progressPercent: document.getElementById('progressPercent'),
    progressHint: document.getElementById('progressHint'),
    toastStack: document.getElementById('toastStack'),
    editForm: document.getElementById('editForm'),
    editTitle: document.getElementById('editTitle'),
    editDesc: document.getElementById('editDesc'),
    editDue: document.getElementById('editDue'),
    editPriority: document.getElementById('editPriority'),
    editCategory: document.getElementById('editCategory'),
    deleteTaskName: document.getElementById('deleteTaskName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
};

const editModal = new bootstrap.Modal(document.getElementById('editModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
let editingTaskId = null;

/* ---------------- helpers ---------------- */

/** Today's date as an ISO `YYYY-MM-DD` string in the user's local timezone. */
function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Escape user input before injecting it into HTML. */
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Human friendly due date, e.g. "Today", "Tomorrow" or "12 Mar 2026". */
function formatDueDate(iso) {
    if (!iso) return 'No due date';
    const today = todayISO();
    if (iso === today) return 'Today';

    const date = new Date(iso + 'T00:00:00');
    const diffDays = Math.round((date - new Date(today + 'T00:00:00')) / 86400000);
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
    });
}

function isOverdue(task) {
    return !task.completed && !!task.dueDate && task.dueDate < todayISO();
}

/* ---------------- localStorage ---------------- */

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        showToast('Could not save your tasks locally.', 'danger');
    }
}

function loadTasks() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        tasks = Array.isArray(stored) ? stored : [];
    } catch (error) {
        tasks = [];
    }
}

/* ---------------- CRUD ---------------- */

function addTask(data) {
    tasks.push({
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        category: data.category,
        completed: false,
        createdAt: new Date().toISOString()
    });
    saveTasks();
    render();
    showToast('Task added successfully!', 'success');
}

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    editingTaskId = id;
    el.editTitle.value = task.title;
    el.editDesc.value = task.description;
    el.editDue.value = task.dueDate;
    el.editPriority.value = task.priority;
    el.editCategory.value = task.category;
    el.editForm.classList.remove('was-validated');
    editModal.show();
}

function saveEditedTask() {
    const task = tasks.find(item => item.id === editingTaskId);
    if (!task) return;

    task.title = el.editTitle.value.trim();
    task.description = el.editDesc.value.trim();
    task.dueDate = el.editDue.value;
    task.priority = el.editPriority.value;
    task.category = el.editCategory.value;

    saveTasks();
    render();
    editModal.hide();
    showToast('Task updated successfully!', 'success');
}

function deleteTask(id) {
    const index = tasks.findIndex(item => item.id === id);
    if (index === -1) return;

    const card = el.taskList.querySelector('[data-id="' + id + '"]');
    tasks.splice(index, 1);
    saveTasks();

    // Let the removal animation play before re-rendering the list
    if (card) {
        card.classList.add('removing');
        card.addEventListener('animationend', render, { once: true });
    } else {
        render();
    }
    showToast('Task deleted successfully!', 'danger');
}

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    render();

    const card = el.taskList.querySelector('[data-id="' + id + '"]');
    if (card && task.completed) {
        card.classList.add('just-completed');
        card.addEventListener('animationend', () => card.classList.remove('just-completed'), { once: true });
    }

    showToast(task.completed ? 'Task completed!' : 'Task restored!', task.completed ? 'success' : 'info');
}

/* ---------------- filtering / sorting ---------------- */

function filterTasks(list) {
    const today = todayISO();
    const term = searchTerm.trim().toLowerCase();

    return list.filter(task => {
        // Search matches title or description
        if (term) {
            const haystack = (task.title + ' ' + task.description).toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        switch (activeFilter) {
            case 'active': return !task.completed;
            case 'completed': return task.completed;
            case 'high': return task.priority === 'high';
            case 'today': return task.dueDate === today;
            default: return true;
        }
    });
}

function sortTasks(list) {
    const sorted = [...list];

    switch (activeSort) {
        case 'oldest':
            sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            break;
        case 'priority':
            sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
            break;
        case 'due':
            // Tasks without a due date go last
            sorted.sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
            break;
        case 'alpha':
            sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
            break;
        default: // newest
            sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Completed tasks always sink to the bottom of the list
    return sorted.sort((a, b) => Number(a.completed) - Number(b.completed));
}

/* ---------------- rendering ---------------- */

function taskCardHTML(task) {
    const priority = LABELS.priority[task.priority] || 'Medium';
    const category = LABELS.category[task.category] || 'Other';
    const icon = CATEGORY_ICONS[task.category] || 'bi-tag';
    const overdue = isOverdue(task);

    return (
        '<li class="task-item priority-' + task.priority + (task.completed ? ' completed' : '') + '" data-id="' + task.id + '">' +
        '<input class="form-check-input task-check" type="checkbox" id="check-' + task.id + '"' +
        (task.completed ? ' checked' : '') + ' data-action="toggle"' +
        ' aria-label="Mark &quot;' + escapeHTML(task.title) + '&quot; as ' + (task.completed ? 'not completed' : 'completed') + '">' +
        '<div class="task-body">' +
        '<p class="task-title mb-0"><label for="check-' + task.id + '" class="stretch-label">' + escapeHTML(task.title) + '</label></p>' +
        (task.description ? '<p class="task-desc">' + escapeHTML(task.description) + '</p>' : '') +
        '<div class="task-meta">' +
        '<span class="badge-soft"><i class="bi ' + icon + ' me-1" aria-hidden="true"></i>' + category + '</span>' +
        '<span class="badge-soft badge-priority-' + task.priority + '">' + priority + ' priority</span>' +
        '<span class="task-due' + (overdue ? ' overdue' : '') + '">' +
        '<i class="bi bi-calendar-event" aria-hidden="true"></i>' + escapeHTML(formatDueDate(task.dueDate)) +
        (overdue ? ' · overdue' : '') + '</span>' +
        '</div></div>' +
        '<div class="task-actions">' +
        '<button class="btn-task-action btn-edit" type="button" data-action="edit" aria-label="Edit task: ' + escapeHTML(task.title) + '">' +
        '<i class="bi bi-pencil" aria-hidden="true"></i></button>' +
        '<button class="btn-task-action btn-delete" type="button" data-action="delete" aria-label="Delete task: ' + escapeHTML(task.title) + '">' +
        '<i class="bi bi-trash3" aria-hidden="true"></i></button>' +
        '</div></li>'
    );
}

function renderTasks() {
    const visible = sortTasks(filterTasks(tasks));

    el.taskList.innerHTML = visible.map(taskCardHTML).join('');

    // Three possible states: empty app, no search/filter matches, or a list
    const noTasksAtAll = tasks.length === 0;
    el.emptyState.classList.toggle('d-none', !noTasksAtAll);
    el.noResults.classList.toggle('d-none', noTasksAtAll || visible.length > 0);
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    el.statTotal.textContent = total;
    el.statCompleted.textContent = completed;
    el.statPending.textContent = pending;
    el.statRate.textContent = rate + '%';
}

function updateProgress() {
    // "Today's Progress" counts tasks due today, falling back to all tasks
    const today = todayISO();
    const dueToday = tasks.filter(task => task.dueDate === today);
    const usingToday = dueToday.length > 0;
    const scope = usingToday ? dueToday : tasks;

    const total = scope.length;
    const completed = scope.filter(task => task.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    el.progressCount.textContent = completed + ' / ' + total + ' tasks completed';
    el.progressPercent.textContent = percent + '%';
    el.progressBar.style.width = percent + '%';
    el.progressBarWrap.setAttribute('aria-valuenow', String(percent));

    if (total === 0) {
        el.progressHint.textContent = 'No tasks yet. Add one to start tracking progress.';
    } else if (percent === 100) {
        el.progressHint.textContent = 'Everything done. Great work!';
    } else {
        el.progressHint.textContent = usingToday
            ? 'Keep going — ' + (total - completed) + ' task(s) left for today.'
            : 'Showing all tasks (nothing is due today).';
    }
}

/** Single entry point: re-render the list and every derived number. */
function render() {
    renderTasks();
    updateStats();
    updateProgress();
}

/* ---------------- toasts ---------------- */

function showToast(message, type = 'info') {
    const icons = { success: 'bi-check-circle-fill', danger: 'bi-trash3-fill', info: 'bi-info-circle-fill' };
    const toast = document.createElement('div');
    toast.className = 'tf-toast toast-' + type;
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<i class="bi ' + (icons[type] || icons.info) + '" aria-hidden="true"></i><span>' +
        escapeHTML(message) + '</span>';
    el.toastStack.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 2600);
}

/* ---------------- theme ---------------- */

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    const icon = el.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    el.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));
}

/* ---------------- filter helpers ---------------- */

/** Keep the header nav and the filter buttons showing the same state. */
function setFilter(filter) {
    activeFilter = filter;

    el.filterBar.querySelectorAll('[data-filter]').forEach(button => {
        button.classList.toggle('active', button.dataset.filter === filter);
    });
    el.navFilters.querySelectorAll('[data-nav-filter]').forEach(button => {
        const navValue = button.dataset.navFilter === 'all' ? 'all' : button.dataset.navFilter;
        button.classList.toggle('active', navValue === filter);
    });

    renderTasks();
}

/* ---------------- events ---------------- */

el.taskForm.addEventListener('submit', event => {
    event.preventDefault();

    const title = el.titleInput.value.trim();
    const dueDate = el.dueInput.value;

    // Simple manual validation so we can show Bootstrap's feedback styles
    el.titleInput.classList.toggle('is-invalid', title === '');
    el.dueInput.classList.toggle('is-invalid', dueDate === '');

    if (title === '' || dueDate === '') {
        (title === '' ? el.titleInput : el.dueInput).focus();
        return;
    }

    addTask({
        title,
        description: el.descInput.value.trim(),
        dueDate,
        priority: el.priorityInput.value,
        category: el.categoryInput.value
    });

    el.taskForm.reset();
    el.dueInput.value = todayISO();
    el.priorityInput.value = 'medium';
    el.categoryInput.value = 'personal';
    el.titleInput.focus();
});

// Clear validation state as the user types
[el.titleInput, el.dueInput].forEach(input => {
    input.addEventListener('input', () => input.classList.remove('is-invalid'));
});

// One delegated listener handles every task card button
el.taskList.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const id = trigger.closest('.task-item').dataset.id;

    if (trigger.dataset.action === 'toggle') toggleTask(id);
    if (trigger.dataset.action === 'edit') editTask(id);
    if (trigger.dataset.action === 'delete') {
        const task = tasks.find(item => item.id === id);
        taskIdPendingDelete = id;
        el.deleteTaskName.textContent = task ? '"' + task.title + '"' : '';
        deleteModal.show();
    }
});

el.confirmDeleteBtn.addEventListener('click', () => {
    deleteModal.hide();
    if (taskIdPendingDelete) deleteTask(taskIdPendingDelete);
    taskIdPendingDelete = null;
});

el.editForm.addEventListener('submit', event => {
    event.preventDefault();

    const titleOk = el.editTitle.value.trim() !== '';
    const dueOk = el.editDue.value !== '';
    el.editTitle.classList.toggle('is-invalid', !titleOk);
    el.editDue.classList.toggle('is-invalid', !dueOk);
    if (!titleOk || !dueOk) return;

    saveEditedTask();
});

el.filterBar.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (button) setFilter(button.dataset.filter);
});

el.navFilters.addEventListener('click', event => {
    const button = event.target.closest('[data-nav-filter]');
    if (button) setFilter(button.dataset.navFilter);
});

el.sortSelect.addEventListener('change', () => {
    activeSort = el.sortSelect.value;
    renderTasks();
});

el.searchInput.addEventListener('input', () => {
    searchTerm = el.searchInput.value;
    renderTasks();
});

el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-bs-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

el.emptyAddBtn.addEventListener('click', () => {
    el.titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.titleInput.focus();
});

/* ---------------- init ---------------- */

function init() {
    initTheme();

    el.todayDate.textContent = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    el.dueInput.value = todayISO();

    loadTasks();
    render();
}

init();
