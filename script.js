/* ======== STATE & STORAGE ======== */
const STORAGE_KEY = "todoJournalData_v2";

let state = {
  todos: [],    // [{ id, text, addedTime, startTime|null }]
  journals: []  // completed tasks: { id, text, addedTime, startTime, completedTime }
                // manual logs:     { id, text, loggedTime }
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch { /* keep defaults */ }
  }
}

/* ======== UTILITIES ======== */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

function isoNow() {
  return new Date().toISOString();
}

function formatHM(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setTimeFromHM(existingISO, hm) {
  // Accepts "HH:MM" 24h, returns a new ISO using existing date
  const m = /^\s*([01]?\d|2[0-3]):([0-5]\d)\s*$/.exec(hm || "");
  if (!m) return null;
  const [ , hh, mm ] = m;
  const base = existingISO ? new Date(existingISO) : new Date();
  base.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  return base.toISOString();
}

/* ======== RENDERERS ======== */
function render() {
  renderTodos();
  renderJournals();
}

function renderTodos() {
  const list = document.getElementById("todoList");
  list.innerHTML = "";

  state.todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = "todo";
    if (todo.startTime) li.classList.add("in-progress");

    // text (editable)
    const textSpan = document.createElement("span");
    textSpan.textContent = todo.text;
    textSpan.contentEditable = "true";
    textSpan.addEventListener("blur", () => {
      todo.text = textSpan.textContent.trim();
      saveState();
    });
    li.appendChild(textSpan);

    // timestamps (view only in ToDo)
    const timeBox = document.createElement("span");
    timeBox.className = "timestamp";
    timeBox.textContent = `[Added: ${formatHM(todo.addedTime)}]` +
                          (todo.startTime ? ` [Started: ${formatHM(todo.startTime)}]` : "");
    li.appendChild(timeBox);

    // actions
    const actions = document.createElement("div");
    actions.className = "actions";

    const startBtn = document.createElement("button");
    startBtn.textContent = "▶️";
    startBtn.title = "Start";
    startBtn.disabled = !!todo.startTime;
    startBtn.addEventListener("click", () => {
      if (!todo.startTime) {
        todo.startTime = isoNow();
        saveState();
        render(); // refresh UI to show started
      }
    });

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "✔️";
    completeBtn.title = "Complete";
    completeBtn.addEventListener("click", () => {
      // move only this task to journal with completedTime
      const idx = state.todos.findIndex(t => t.id === todo.id);
      if (idx !== -1) {
        const entry = {
          id: uid(),
          text: state.todos[idx].text,
          addedTime: state.todos[idx].addedTime,
          startTime: state.todos[idx].startTime || null,
          completedTime: isoNow()
        };
        state.journals.push(entry);
        state.todos.splice(idx, 1);
        saveState();
        render();
      }
    });

    actions.appendChild(startBtn);
    actions.appendChild(completeBtn);
    li.appendChild(actions);

    list.appendChild(li);
  });
}

function renderJournals() {
  const list = document.getElementById("journalList");
  list.innerHTML = "";

  state.journals.forEach(entry => {
    const li = document.createElement("li");
    li.className = "journal-item";

    // text (editable)
    const textSpan = document.createElement("span");
    textSpan.textContent = entry.text;
    textSpan.contentEditable = "true";
    textSpan.addEventListener("blur", () => {
      entry.text = textSpan.textContent.trim();
      saveState();
    });
    li.appendChild(textSpan);

    // timestamps (editable HM in journal)
    const tsWrap = document.createElement("span");
    tsWrap.className = "timestamp";

    if ("loggedTime" in entry) {
      tsWrap.appendChild(makeEditableChip("Logged", entry.loggedTime, newHM => {
        const newISO = setTimeFromHM(entry.loggedTime, newHM);
        if (newISO) { entry.loggedTime = newISO; saveState(); renderJournals(); }
      }));
    } else {
      tsWrap.appendChild(makeEditableChip("Added", entry.addedTime, newHM => {
        const newISO = setTimeFromHM(entry.addedTime, newHM);
        if (newISO) { entry.addedTime = newISO; saveState(); renderJournals(); }
      }));
      if (entry.startTime) {
        tsWrap.appendChild(document.createTextNode(" "));
        tsWrap.appendChild(makeEditableChip("Started", entry.startTime, newHM => {
          const newISO = setTimeFromHM(entry.startTime, newHM);
          if (newISO) { entry.startTime = newISO; saveState(); renderJournals(); }
        }));
      }
      tsWrap.appendChild(document.createTextNode(" "));
      tsWrap.appendChild(makeEditableChip("Completed", entry.completedTime, newHM => {
        const newISO = setTimeFromHM(entry.completedTime, newHM);
        if (newISO) { entry.completedTime = newISO; saveState(); renderJournals(); }
      }));
    }

    li.appendChild(tsWrap);
    list.appendChild(li);
  });
}

// builds: [Label: HH:MM] where HH:MM is editable
function makeEditableChip(label, iso, onSaveHM) {
  const wrap = document.createElement("span");
  wrap.className = "timechip";
  const open = document.createTextNode(`[${label}: `);
  const hm = document.createElement("span");
  hm.className = "hm";
  hm.textContent = formatHM(iso);
  hm.contentEditable = "true";
  hm.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      hm.blur();
    }
  });
  hm.addEventListener("blur", () => {
    const ok = onSaveHM(hm.textContent.trim());
    // re-render handled in caller
  });
  const close = document.createTextNode("]");

  wrap.appendChild(open);
  wrap.appendChild(hm);
  wrap.appendChild(close);
  return wrap;
}

/* ======== ACTIONS (wired to your HTML) ======== */
function addTodo() {
  const input = document.getElementById("todoInput");
  const text = input.value.trim();
  if (!text) return;

  state.todos.push({
    id: uid(),
    text,
    addedTime: isoNow(),
    startTime: null
  });
  input.value = "";
  saveState();
  render();
}

function addJournalEntry() {
  const input = document.getElementById("journalInput");
  const text = input.value.trim();
  if (!text) return;

  state.journals.push({
    id: uid(),
    text,
    loggedTime: isoNow()
  });
  input.value = "";
  saveState();
  renderJournals();
}

function downloadData() {
  const exportData = {
    exportedAt: new Date().toISOString(),
    todos: state.todos,        // ISO datetimes inside
    journals: state.journals   // ISO datetimes inside
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todo-journal-${exportData.exportedAt.slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (!confirm("Are you sure you want to clear all data?")) return;
  state = { todos: [], journals: [] };
  saveState();
  render();
}

/* ======== INIT & KEY HANDLERS ======== */
function init() {
  loadState();
  render();

  // Enter key to add
  const todoInput = document.getElementById("todoInput");
  const journalInput = document.getElementById("journalInput");
  if (todoInput) {
    todoInput.addEventListener("keypress", e => {
      if (e.key === "Enter") addTodo();
    });
  }
  if (journalInput) {
    journalInput.addEventListener("keypress", e => {
      if (e.key === "Enter") addJournalEntry();
    });
  }
}

window.addEventListener("DOMContentLoaded", init);
