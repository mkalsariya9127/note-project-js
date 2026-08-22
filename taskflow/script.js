/* ===========================================================
   TaskFlow - Vanilla JavaScript
   Tasks are stored in localStorage so they survive refreshes.
   =========================================================== */

const STORAGE_KEY = "taskflow.tasks";
const THEME_KEY = "taskflow.theme";

// Order used when sorting by priority (high first).
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const CATEGORY_LABELS = {
    personal: "Personal",
    work: "Work",
    study: "Study",
    shopping: "Shopping",
    other: "Other",
};

const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };

// ---------------------------------------------------------
// State
// ---------------------------------------------------------
let tasks = [];
let currentFilter = "all";
let currentSort = "newest";
let searchTerm = "";
let taskIdPendingDelete = null;

// ---------------------------------------------------------
// Element references
// ---------------------------------------------------------
const el = {
    todayDate: document.getElementById("todayDate"),
    statTotal: document.getElementById("statTotal"),
    statCompleted: document.getElementById("statCompleted"),
    statPending: document.getElementById("statPending"),
    statRate: document.getElementById("statRate"),
    progressBar: document.getElementById("progressBar"),
    progressBarWrap: document.getElementById("progressBarWrap"),
    progressText: document.getElementById("progressText"),
    progressPercent: document.getElementById("progressPercent"),
    taskForm: document.getElementById("taskForm"),
    taskTitle: document.getElementById("taskTitle"),
    taskDescription: document.getElementById("taskDescription"),
    taskDueDate: document.getElementById("taskDueDate"),
    taskPriority: document.getElementById("taskPriority"),
    taskCategory: document.getElementById("taskCategory"),
    taskList: document.getElementById("taskList"),
    emptyState: document.getElementById("emptyState"),
    emptyStateBtn: document.getElementById("emptyStateBtn"),
    noResults: document.getElementById("noResults"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    filterButtons: document.querySelectorAll("[data-filter]"),
    navButtons: document.querySelectorAll("[data-nav-filter]"),
    themeToggle: document.getElementById("themeToggle"),
    themeIcon: document.getElementById("themeIcon"),
    themeLabel: document.getElementById("themeLabel"),
    toastContainer: document.getElementById("toastContainer"),
    editForm: document.getElementById("editForm"),
    editTaskId: document.getElementById("editTaskId"),
    editTitle: document.getElementById("editTitle"),
    editDescription: document.getElementById("editDescription"),
    editDueDate: document.getElementById("editDueDate"),
    editPriority: document.getElementById("editPriority"),
    editCategory: document.getElementById("editCategory"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
};

const editModal = new bootstrap.Modal(document.getElementById("editModal"));
const deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

/** Escape user text before inserting it into HTML. */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Today's date as an ISO string (YYYY-MM-DD) in local time. */
function todayISO() {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Format "2026-08-22" into a friendly label such as "22 Aug 2026". */
function formatDate(isoDate) {
    if (!isoDate) return "No due date";
    const [year, month, day] = isoDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return "No due date";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function createId() {
    return `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

// ---------------------------------------------------------
// Storage
// ---------------------------------------------------------
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        showToast("Could not save your tasks.", "danger");
    }
}

function loadTasks() {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        tasks = Array.isArray(stored) ? stored.filter((task) => task && task.title) : [];
    } catch (error) {
        tasks = [];
    }
}

// ---------------------------------------------------------
// Toasts
// ---------------------------------------------------------
function showToast(message, type = "success") {
    const icons = {
        success: "bi-check-circle-fill",
        info: "bi-info-circle-fill",
        danger: "bi-exclamation-circle-fill",
        warning: "bi-exclamation-triangle-fill",
    };

    const toast = document.createElement("div");
    toast.className = `toast tf-toast tf-toast-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
        <div class="toast-body">
            <i class="bi ${icons[type] || icons.success}" aria-hidden="true"></i>
            <span>${escapeHtml(message)}</span>
        </div>`;

    el.toastContainer.appendChild(toast);
    const instance = new bootstrap.Toast(toast, { delay: 2600 });
    instance.show();
    toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

// ---------------------------------------------------------
// Task actions
// ---------------------------------------------------------
function addTask(event) {
    event.preventDefault();

    const title = el.taskTitle.value.trim();
    const dueDate = el.taskDueDate.value;

    // Simple validation: title and due date are required.
    el.taskTitle.classList.toggle("is-invalid", title === "");
    el.taskDueDate.classList.toggle("is-invalid", dueDate === "");
    if (title === "" || dueDate === "") {
        showToast("Please fill in the required fields.", "warning");
        return;
    }

    tasks.push({
        id: createId(),
        title,
        description: el.taskDescription.value.trim(),
        dueDate,
        priority: el.taskPriority.value,
        category: el.taskCategory.value,
        completed: false,
        createdAt: Date.now(),
    });

    saveTasks();
    renderTasks();
    el.taskForm.reset();
    el.taskDueDate.value = todayISO();
    el.taskTitle.focus();
    showToast("Task added successfully!");
}

function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;
    saveTasks();
    renderTasks();

    // Small pop animation on the card that was just completed.
    if (task.completed) {
        const card = el.taskList.querySelector(`[data-id="${task.id}"]`);
        if (card) card.classList.add("just-completed");
    }

    showToast(task.completed ? "Task completed!" : "Task restored!", task.completed ? "success" : "info");
}

function editTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    el.editTaskId.value = task.id;
    el.editTitle.value = task.title;
    el.editDescription.value = task.description || "";
    el.editDueDate.value = task.dueDate || "";
    el.editPriority.value = task.priority;
    el.editCategory.value = task.category;
    el.editTitle.classList.remove("is-invalid");
    el.editDueDate.classList.remove("is-invalid");
    editModal.show();
}

function saveEditedTask(event) {
    event.preventDefault();

    const task = tasks.find((item) => item.id === el.editTaskId.value);
    if (!task) return;

    const title = el.editTitle.value.trim();
    const dueDate = el.editDueDate.value;

    el.editTitle.classList.toggle("is-invalid", title === "");
    el.editDueDate.classList.toggle("is-invalid", dueDate === "");
    if (title === "" || dueDate === "") return;

    task.title = title;
    task.description = el.editDescription.value.trim();
    task.dueDate = dueDate;
    task.priority = el.editPriority.value;
    task.category = el.editCategory.value;

    saveTasks();
    renderTasks();
    editModal.hide();
    showToast("Task updated successfully!");
}

function askDeleteTask(id) {
    taskIdPendingDelete = id;
    deleteModal.show();
}

function deleteTask(id) {
    const card = el.taskList.querySelector(`[data-id="${id}"]`);
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();

    // Let the fade-out animation finish before re-rendering the list.
    if (card) {
        card.classList.add("removing");
        card.addEventListener("animationend", renderTasks, { once: true });
        updateStats();
    } else {
        renderTasks();
    }

    showToast("Task deleted successfully!", "danger");
}

// ---------------------------------------------------------
// Filtering, searching and sorting
// ---------------------------------------------------------
function filterTasks(list) {
    const today = todayISO();
    const term = searchTerm.trim().toLowerCase();

    return list.filter((task) => {
        // Filter buttons / navigation links.
        if (currentFilter === "active" && task.completed) return false;
        if (currentFilter === "completed" && !task.completed) return false;
        if (currentFilter === "high" && task.priority !== "high") return false;
        if (currentFilter === "today" && task.dueDate !== today) return false;

        // Search by title or description.
        if (term !== "") {
            const haystack = `${task.title} ${task.description || ""}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        return true;
    });
}

function sortTasks(list) {
    const sorted = [...list];

    switch (currentSort) {
        case "oldest":
            return sorted.sort((a, b) => a.createdAt - b.createdAt);
        case "priority":
            return sorted.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case "dueDate":
            return sorted.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"));
        case "alphabetical":
            return sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
        case "newest":
        default:
            return sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
}

// ---------------------------------------------------------
// Rendering
// ---------------------------------------------------------
function taskCardHtml(task) {
    const overdue = !task.completed && task.dueDate && task.dueDate < todayISO();

    return `
        <article class="task-card ${task.completed ? "completed" : ""}" data-id="${task.id}" data-priority="${task.priority}">
            <input class="form-check-input task-check" type="checkbox" ${task.completed ? "checked" : ""}
                data-action="toggle" id="check-${task.id}"
                aria-label="Mark &quot;${escapeHtml(task.title)}&quot; as ${task.completed ? "active" : "completed"}">
            <div class="task-body">
                <h3 class="task-title h6">${escapeHtml(task.title)}</h3>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
                <div class="task-meta">
                    <span class="badge badge-soft badge-category">${escapeHtml(CATEGORY_LABELS[task.category] || "Other")}</span>
                    <span class="badge badge-soft badge-${task.priority}">${escapeHtml(PRIORITY_LABELS[task.priority] || "Medium")} priority</span>
                    <span class="badge badge-soft badge-due ${overdue ? "overdue" : ""}">
                        <i class="bi bi-calendar-event me-1" aria-hidden="true"></i>${escapeHtml(formatDate(task.dueDate))}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button type="button" class="btn btn-icon" data-action="edit"
                    aria-label="Edit task ${escapeHtml(task.title)}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
                <button type="button" class="btn btn-icon btn-icon-danger" data-action="delete"
                    aria-label="Delete task ${escapeHtml(task.title)}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
            </div>
        </article>`;
}

function renderTasks() {
    const visible = sortTasks(filterTasks(tasks));

    el.taskList.innerHTML = visible.map(taskCardHtml).join("");

    // Empty state when there are no tasks at all,
    // "No tasks found." when filters/search hide everything.
    const noTasksAtAll = tasks.length === 0;
    el.emptyState.classList.toggle("d-none", !noTasksAtAll);
    el.noResults.classList.toggle("d-none", noTasksAtAll || visible.length > 0);

    updateStats();
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    el.statTotal.textContent = total;
    el.statCompleted.textContent = completed;
    el.statPending.textContent = pending;
    el.statRate.textContent = `${rate}%`;

    el.progressBar.style.width = `${rate}%`;
    el.progressBarWrap.setAttribute("aria-valuenow", String(rate));
    el.progressText.textContent = `${completed} / ${total} tasks completed`;
    el.progressPercent.textContent = `${rate}% complete`;
}

// ---------------------------------------------------------
// Filters & navigation
// ---------------------------------------------------------
function setFilter(filter) {
    currentFilter = filter;

    el.filterButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === filter);
    });

    // Keep the header navigation in sync with the filter buttons.
    el.navButtons.forEach((button) => {
        const isActive = button.dataset.navFilter === filter;
        button.classList.toggle("active", isActive);
        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    renderTasks();
}

// ---------------------------------------------------------
// Theme
// ---------------------------------------------------------
function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-bs-theme", theme);
    el.themeIcon.className = isDark ? "bi bi-sun" : "bi bi-moon-stars";
    el.themeToggle.setAttribute("aria-pressed", String(isDark));
    el.themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    if (el.themeLabel) el.themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-bs-theme");
    applyTheme(current === "dark" ? "light" : "dark");
}

// ---------------------------------------------------------
// Event listeners
// ---------------------------------------------------------
el.taskForm.addEventListener("submit", addTask);
el.editForm.addEventListener("submit", saveEditedTask);

// One delegated listener handles every task card action.
el.taskList.addEventListener("click", (event) => {
    const card = event.target.closest(".task-card");
    if (!card) return;

    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "toggle") toggleTask(card.dataset.id);
    if (action === "edit") editTask(card.dataset.id);
    if (action === "delete") askDeleteTask(card.dataset.id);
});

el.confirmDeleteBtn.addEventListener("click", () => {
    if (taskIdPendingDelete) deleteTask(taskIdPendingDelete);
    taskIdPendingDelete = null;
    deleteModal.hide();
});

el.searchInput.addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderTasks();
});

el.sortSelect.addEventListener("change", (event) => {
    currentSort = event.target.value;
    renderTasks();
});

el.filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
});

el.navButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.navFilter));
});

el.emptyStateBtn.addEventListener("click", () => {
    el.taskTitle.focus();
    el.taskTitle.scrollIntoView({ behavior: "smooth", block: "center" });
});

el.themeToggle.addEventListener("click", toggleTheme);

// Clear validation styling as soon as the user types.
[el.taskTitle, el.taskDueDate, el.editTitle, el.editDueDate].forEach((input) => {
    input.addEventListener("input", () => input.classList.remove("is-invalid"));
});

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
function init() {
    applyTheme(localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");

    el.todayDate.textContent = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    el.taskDueDate.value = todayISO();
    loadTasks();
    renderTasks();
}

init();
