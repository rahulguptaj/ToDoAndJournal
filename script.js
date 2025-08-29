// ====================== UTILITIES ======================
function getTimeStamp(label) {
  const now = new Date();
  return `[${label}: ${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}]`;
}

// ====================== TODO ======================
function addTodo() {
  const input = document.getElementById("todoInput");
  const text = input.value.trim();
  if (!text) return;

  const li = document.createElement("li");

  // Editable task text
  const span = document.createElement("span");
  span.textContent = text;
  span.contentEditable = true;
  span.addEventListener("input", saveData);
  li.appendChild(span);

  // Timestamp
  const timeSpan = document.createElement("span");
  timeSpan.textContent = getTimeStamp("Added");
  timeSpan.className = "timestamp";
  li.appendChild(timeSpan);

  // Complete button
  const btn = document.createElement("button");
  btn.textContent = "✔️";
  btn.onclick = function () {
    completeTodo(btn);
  };
  li.appendChild(btn);

  document.getElementById("todoList").appendChild(li);
  input.value = "";
  saveData();
}

function completeTodo(button) {
  const li = button.parentElement;
  const text = li.querySelector("span").textContent;
  const addedTime = li.querySelector(".timestamp").textContent;

  li.remove();

  const completedTime = getTimeStamp("Completed");
  addJournalEntry(`${text}`, `${addedTime} ${completedTime}`, true);

  saveData();
}

// ====================== JOURNAL ======================
function addJournalEntry(text, time, fromTodo = false) {
  const input = document.getElementById("journalInput");
  const entryText = text || input.value.trim();
  if (!entryText) return;

  const li = document.createElement("li");

  // Editable text
  const span = document.createElement("span");
  span.textContent = entryText;
  span.contentEditable = true;
  span.addEventListener("input", saveData);
  li.appendChild(span);

  // Editable timestamp(s)
  const timeSpan = document.createElement("span");
  timeSpan.textContent = time || getTimeStamp("Logged");
  timeSpan.contentEditable = true; // ✅ allow manual edits
  timeSpan.className = "timestamp";
  timeSpan.addEventListener("input", saveData);
  li.appendChild(timeSpan);

  document.getElementById("journalList").appendChild(li);
  input.value = "";
  saveData();
}

// ====================== STORAGE ======================
function saveData() {
  const todos = [];
  document.querySelectorAll("#todoList li").forEach((li) => {
    const text = li.querySelector("span").textContent;
    const time = li.querySelector(".timestamp").textContent;
    todos.push({ text, time });
  });

  const journals = [];
  document.querySelectorAll("#journalList li").forEach((li) => {
    const text = li.querySelector("span").textContent;
    const time = li.querySelector(".timestamp").textContent;
    journals.push({ text, time });
  });

  localStorage.setItem("todoData", JSON.stringify({ todos, journals }));
}

function loadData() {
  const data = JSON.parse(localStorage.getItem("todoData"));
  if (!data) return;

  data.todos.forEach((t) => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = t.text;
    span.contentEditable = true;
    span.addEventListener("input", saveData);
    li.appendChild(span);

    const timeSpan = document.createElement("span");
    timeSpan.textContent = t.time;
    timeSpan.className = "timestamp";
    li.appendChild(timeSpan);

    const btn = document.createElement("button");
    btn.textContent = "✔️";
    btn.onclick = function () {
      completeTodo(btn);
    };
    li.appendChild(btn);

    document.getElementById("todoList").appendChild(li);
  });

  data.journals.forEach((j) => {
    addJournalEntry(j.text, j.time, true);
  });
}

// ====================== EXPORT / RESET ======================
function downloadData() {
  const data = JSON.parse(localStorage.getItem("todoData")) || { todos: [], journals: [] };
  const exportData = {
    date: new Date().toISOString().split("T")[0],
    todos: data.todos,
    journals: data.journals,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `todo-journal-${exportData.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  if (confirm("Are you sure you want to clear all data?")) {
    localStorage.removeItem("todoData");
    document.getElementById("todoList").innerHTML = "";
    document.getElementById("journalList").innerHTML = "";
  }
}

// ====================== EVENT LISTENERS ======================
document.getElementById("todoInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTodo();
});
document.getElementById("journalInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addJournalEntry();
});

window.onload = loadData;
