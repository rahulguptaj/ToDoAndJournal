let todos = JSON.parse(localStorage.getItem("todos")) || [];
let journal = JSON.parse(localStorage.getItem("journal")) || [];

function saveData() {
  localStorage.setItem("todos", JSON.stringify(todos));
  localStorage.setItem("journal", JSON.stringify(journal));
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addTodo() {
  const input = document.getElementById("todoInput");
  const text = input.value.trim();
  if (text === "") return;

  const todo = {
    id: Date.now(),
    text,
    added: new Date().toISOString(),
    start: null,
  };

  todos.push(todo);
  input.value = "";
  saveData();
  render();
}

function addJournalEntry() {
  const input = document.getElementById("journalInput");
  const text = input.value.trim();
  if (text === "") return;

  const entry = {
    id: Date.now(),
    text,
    logged: new Date().toISOString(),
    completed: null,
  };

  journal.push(entry);
  input.value = "";
  saveData();
  render();
}

function startTask(id) {
  const task = todos.find(t => t.id === id);
  if (task) {
    task.start = new Date().toISOString();
    saveData();
    render();
  }
}

function completeTask(id) {
  const index = todos.findIndex(t => t.id === id);
  if (index !== -1) {
    const task = todos[index];
    const completedTask = {
      id: task.id,
      text: task.text,
      logged: task.added,
      start: task.start,
      completed: new Date().toISOString(),
    };
    journal.push(completedTask);
    todos.splice(index, 1);
    saveData();
    render();
  }
}

function editItem(id, isTodo, field) {
  const newText = prompt("Edit text:");
  if (newText !== null && newText.trim() !== "") {
    if (isTodo) {
      const task = todos.find(t => t.id === id);
      if (task) task.text = newText.trim();
    } else {
      const entry = journal.find(j => j.id === id);
      if (entry) entry.text = newText.trim();
    }
    saveData();
    render();
  }
}

function editTime(id, field) {
  const newTime = prompt("Enter new time (HH:MM):");
  if (newTime !== null && newTime.trim() !== "") {
    const entry = journal.find(j => j.id === id);
    if (entry) {
      // Replace only the time, keep date as is
      let oldDate = new Date(entry[field]);
      let [h, m] = newTime.split(":");
      oldDate.setHours(h);
      oldDate.setMinutes(m);
      entry[field] = oldDate.toISOString();
    }
    saveData();
    render();
  }
}

function render() {
  const todoList = document.getElementById("todoList");
  const journalList = document.getElementById("journalList");
  todoList.innerHTML = "";
  journalList.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${todo.text} 
      [Added: ${new Date(todo.added).toLocaleString()}] 
      ${todo.start ? `[Started: ${new Date(todo.start).toLocaleString()}]` : ""}
      <button onclick="startTask(${todo.id})">⏳ Start</button>
      <button onclick="completeTask(${todo.id})">✔️ Complete</button>
      <button onclick="editItem(${todo.id}, true)">✏️ Edit</button>
    `;
    if (todo.start) li.style.background = "#fff3cd"; // highlight started tasks
    todoList.appendChild(li);
  });

  journal.forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${entry.text} 
      [Logged: ${entry.logged ? new Date(entry.logged).toLocaleString() : ""}] 
      ${entry.start ? `[Started: ${new Date(entry.start).toLocaleString()}]` : ""} 
      ${entry.completed ? `[Completed: ${new Date(entry.completed).toLocaleString()}]` : ""}
      <button onclick="editItem(${entry.id}, false)">✏️ Edit</button>
      <button onclick="editTime(${entry.id}, 'logged')">⏰ Edit Logged</button>
      ${entry.start ? `<button onclick="editTime(${entry.id}, 'start')">⏰ Edit Start</button>` : ""}
      ${entry.completed ? `<button onclick="editTime(${entry.id}, 'completed')">⏰ Edit Completed</button>` : ""}
    `;
    journalList.appendChild(li);
  });
}

// CSV Export
function downloadData() {
  const rows = [];

  rows.push(["Date", new Date().toLocaleDateString()]);
  rows.push([]);
  rows.push(["To-Dos"]);
  rows.push(["Text", "Added", "Started"]);
  todos.forEach(todo => {
    rows.push([
      `"${todo.text}"`,
      new Date(todo.added).toLocaleString(),
      todo.start ? new Date(todo.start).toLocaleString() : ""
    ]);
  });

  rows.push([]);
  rows.push(["Journal"]);
  rows.push(["Text", "Logged", "Started", "Completed"]);
  journal.forEach(entry => {
    rows.push([
      `"${entry.text}"`,
      entry.logged ? new Date(entry.logged).toLocaleString() : "",
      entry.start ? new Date(entry.start).toLocaleString() : "",
      entry.completed ? new Date(entry.completed).toLocaleString() : ""
    ]);
  });

  let csvContent = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "task_journal.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reset all
function resetData() {
  if (confirm("Are you sure you want to reset all data?")) {
    todos = [];
    journal = [];
    saveData();
    render();
  }
}

document.getElementById("todoInput").addEventListener("keypress", e => {
  if (e.key === "Enter") addTodo();
});
document.getElementById("journalInput").addEventListener("keypress", e => {
  if (e.key === "Enter") addJournalEntry();
});

render();
