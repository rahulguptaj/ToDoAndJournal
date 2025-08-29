let data = { todos: [], journal: [] };

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function saveData() {
  localStorage.setItem("todoJournalData", JSON.stringify(data));
}

function loadData() {
  const saved = localStorage.getItem("todoJournalData");
  if (saved) data = JSON.parse(saved);
  render();
}

function render() {
  renderTodos();
  renderJournal();
}

function renderTodos() {
  const list = document.getElementById("todoList");
  list.innerHTML = "";
  data.todos.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    const span = document.createElement("span");
    span.textContent = t.text;
    span.contentEditable = "true";
    span.onblur = () => {
      data.todos[i].text = span.textContent;
      saveData();
    };

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = `[Added: ${t.added}]`;

    const btn = document.createElement("button");
    btn.textContent = "✔️";
    btn.onclick = () => {
      const completedTime = getTime();
      data.journal.push({
        text: t.text,
        added: t.added,
        completed: completedTime
      });
      data.todos.splice(i, 1);
      saveData();
      render();
    };

    li.appendChild(span);
    li.appendChild(time);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderJournal() {
  const list = document.getElementById("journalList");
  list.innerHTML = "";
  data.journal.forEach((j, i) => {
    const li = document.createElement("li");
    li.className = "journal-item";

    const span = document.createElement("span");
    span.textContent = j.text;
    span.contentEditable = "true";
    span.onblur = () => {
      data.journal[i].text = span.textContent;
      saveData();
    };

    const time = document.createElement("span");
    time.className = "time";
    if (j.completed) {
      time.textContent = `[Added: ${j.added}] [Completed: ${j.completed}]`;
    } else {
      time.textContent = `[Logged: ${j.logged}]`;
    }

    li.appendChild(span);
    li.appendChild(time);
    list.appendChild(li);
  });
}

// Add ToDo
function addTodo() {
  const input = document.getElementById("todoInput");
  const text = input.value.trim();
  if (!text) return;
  data.todos.push({ text, added: getTime() });
  input.value = "";
  saveData();
  render();
}

// Add Journal
function addJournalEntry() {
  const input = document.getElementById("journalInput");
  const text = input.value.trim();
  if (!text) return;
  data.journal.push({ text, logged: getTime() });
  input.value = "";
  saveData();
  render();
}

// Download JSON
function downloadData() {
  const exportData = {
    date: new Date().toLocaleDateString(),
    todos: data.todos,
    journal: data.journal
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todo_journal_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Reset
function resetData() {
  if (confirm("Clear all data?")) {
    data = { todos: [], journal: [] };
    saveData();
    render();
  }
}

// Enter key support
document.getElementById("todoInput").addEventListener("keypress", e => {
  if (e.key === "Enter") addTodo();
});
document.getElementById("journalInput").addEventListener("keypress", e => {
  if (e.key === "Enter") addJournalEntry();
});

loadData();
