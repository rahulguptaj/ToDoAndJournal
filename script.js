/* script.js - stable implementation
   - Edit toggle (Edit -> shows 3 rows: text, times, buttons; Save commits, Cancel reverts)
   - Start/Stop toggles timestamps and label
   - Complete moves a todo to Journal (keeps added/started/stopped and adds completed timestamp)
   - Journal shows dates inline; only in edit mode time inputs appear on second line
   - Categories persistent
   - CSV export (dd-mm-yyyy hh:mm am/pm)
*/

const LS_TODOS = "tt_todos_v1";
const LS_JOURNAL = "tt_journal_v1";
const LS_CATS = "tt_cats_v1";

// load
let todos = JSON.parse(localStorage.getItem(LS_TODOS) || "[]");
let journal = JSON.parse(localStorage.getItem(LS_JOURNAL) || "[]");
let categories = JSON.parse(localStorage.getItem(LS_CATS) || "[]");
if (!Array.isArray(categories) || categories.length === 0) categories = ["General","Work","Personal"];

// editing state (only one edit at a time)
let currentEdit = null; // { type: "todo"|"journal", id, orig }

// helpers
const $ = id => document.getElementById(id);
function saveAll(){ localStorage.setItem(LS_TODOS, JSON.stringify(todos)); localStorage.setItem(LS_JOURNAL, JSON.stringify(journal)); localStorage.setItem(LS_CATS, JSON.stringify(categories)); }
function nowISO(){ return new Date().toISOString(); }

function formatTimeUI(iso){
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatFull(iso){
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  let hrs = d.getHours(), mins = String(d.getMinutes()).padStart(2,"0");
  const ampm = hrs >= 12 ? "pm" : "am";
  hrs = hrs % 12 || 12;
  return `${dd}-${mm}-${yyyy} ${String(hrs).padStart(2,"0")}:${mins} ${ampm}`;
}

// render categories (dropdowns + list)
function renderCategories(){
  const todoCat = $("todoCategory");
  const journalCat = $("journalCategory");
  const catList = $("categoryList");
  if (!todoCat || !journalCat || !catList) return;
  todoCat.innerHTML = ""; journalCat.innerHTML = ""; catList.innerHTML = "";
  categories.forEach((c, idx) => {
    const o1 = document.createElement("option"); o1.value = c; o1.textContent = c; todoCat.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = c; o2.textContent = c; journalCat.appendChild(o2);

    const li = document.createElement("li");
    li.textContent = c;
    const rm = document.createElement("button");
    rm.textContent = "✖"; rm.title = "Delete category";
    rm.onclick = () => {
      if (!confirm(`Delete category "${c}"? Existing items keep their label.`)) return;
      categories.splice(idx,1); saveAll(); renderCategories();
    };
    li.appendChild(rm);
    catList.appendChild(li);
  });
}

// add category
function addCategory(){
  const inp = $("newCategoryInput");
  if (!inp) return alert("Category input not found.");
  const v = inp.value.trim();
  if (!v) return;
  if (!categories.some(x => x.toLowerCase() === v.toLowerCase())) categories.push(v);
  inp.value = "";
  saveAll(); renderCategories();
}

// add todo
function addTodo(){
  const input = $("todoInput");
  const cat = $("todoCategory");
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  const item = { id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), text: txt, category: (cat?.value||"General"), added: nowISO(), started: null, stopped: null, edited: false };
  todos.unshift(item);
  input.value = "";
  saveAll(); renderTodos();
}

// add journal entry
function addJournalEntry(){
  const input = $("journalInput");
  const cat = $("journalCategory");
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  const entry = { id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), text: txt, category: (cat?.value||"General"), added: nowISO(), started: null, stopped: null, completed: null, edited: false };
  journal.unshift(entry);
  input.value = "";
  saveAll(); renderJournal();
}

// render Todos
function renderTodos(){
  const list = $("todoList");
  if (!list) return;
  list.innerHTML = "";
  todos.forEach(item => {
    const li = document.createElement("li"); li.className = "item"; li.dataset.id = item.id;
    const isEditing = currentEdit && currentEdit.type === "todo" && currentEdit.id === item.id;
    if (isEditing) li.classList.add("editing");

    // row1: cat + text (static) + textInput (edit)
    const row1 = document.createElement("div"); row1.className = "row1";
    const cat = document.createElement("div"); cat.className = "cat-badge"; cat.textContent = item.category || "General";
    const textStatic = document.createElement("div"); textStatic.className = "textStatic"; textStatic.textContent = item.text;
    const textInput = document.createElement("input"); textInput.className = "textInput"; textInput.type = "text"; textInput.value = item.text;

    row1.appendChild(cat);
    row1.appendChild(textStatic);
    row1.appendChild(textInput);

    // row2: time editors (only visible in edit mode)
    const row2 = document.createElement("div"); row2.className = "row2";
    row2.appendChild(makeTimeEditor(item, "added"));
    row2.appendChild(makeTimeEditor(item, "started"));
    row2.appendChild(makeTimeEditor(item, "stopped"));

    // row3: actions (Start/Stop, Complete, Edit/Save, Cancel(if editing), Delete)
    const row3 = document.createElement("span"); row3.className = "row3";

    const startBtn = document.createElement("button");
    // label logic: if started && !stopped -> Stop, else Start
    if (item.started && !item.stopped) startBtn.textContent = "⏹️ Stop";
    else startBtn.textContent = "▶️ Start";
    startBtn.className = "btn-start";
    startBtn.onclick = () => {
      // toggle start/stop logic
      if (!item.started){ item.started = nowISO(); item.stopped = null; }
      else if (item.started && !item.stopped){ item.stopped = nowISO(); }
      else { item.started = nowISO(); item.stopped = null; }
      saveAll(); renderTodos();
    };

    const completeBtn = document.createElement("button"); completeBtn.className = "btn-complete";
    completeBtn.textContent = "✔️ Complete";
    completeBtn.onclick = () => {
      const entry = { id: item.id, text: item.text, category: item.category, added: item.added, started: item.started || null, stopped: item.stopped || null, completed: nowISO(), edited: false };
      journal.unshift(entry);
      todos = todos.filter(t => t.id !== item.id);
      saveAll(); renderTodos(); renderJournal();
    };

    const editBtn = document.createElement("button");
    editBtn.className = isEditing ? "btn-save" : "btn-edit";
    editBtn.textContent = isEditing ? "💾 Save" : "✏️ Edit";
    editBtn.onclick = () => {
      if (isEditing) saveEditTodo(item.id);
      else startEdit("todo", item.id);
    };

    const cancelBtn = document.createElement("button"); cancelBtn.className = "btn-cancel"; cancelBtn.textContent = "✖ Cancel";
    cancelBtn.onclick = () => { cancelEdit(); };

    const delBtn = document.createElement("button"); delBtn.className = "btn-delete"; delBtn.textContent = "🗑️ Delete";
    delBtn.onclick = () => {
      if (!confirm("Delete task?")) return;
      todos = todos.filter(t => t.id !== item.id);
      saveAll(); renderTodos();
    };

    // when editing, show Save + Cancel + Delete, and disable start/complete to avoid conflicts
    if (isEditing){
      startBtn.disabled = true; completeBtn.disabled = true;
      row3.appendChild(editBtn); row3.appendChild(cancelBtn); row3.appendChild(delBtn);
    } else {
      row3.appendChild(startBtn); row3.appendChild(completeBtn); row3.appendChild(editBtn); row3.appendChild(delBtn);
    }

    // meta static (inline) visible when not editing
    const metaStatic = document.createElement("div"); metaStatic.className = "metaStatic";
    const parts = [`Added: ${formatTimeUI(item.added)}`];
    if (item.started) parts.push(`Started: ${formatTimeUI(item.started)}`);
    if (item.stopped) parts.push(`Stopped: ${formatTimeUI(item.stopped)}`);
    metaStatic.textContent = parts.join("  |  ");

    // assemble
    li.appendChild(row1);
    if (!isEditing) li.appendChild(metaStatic); // show compact meta inline when not editing
    li.appendChild(row2);
    li.appendChild(row3);

    list.appendChild(li);
  });
}

// start editing a todo or journal (only one at a time)
function startEdit(type, id){
  // if another edit in progress, ask to finish
  if (currentEdit) { alert("Finish the current edit first."); return; }
  const collection = (type === "todo") ? todos : journal;
  const item = collection.find(x => x.id === id);
  if (!item) return;
  currentEdit = { type, id, orig: JSON.parse(JSON.stringify(item)) };
  // re-render to show edit inputs
  renderTodos(); renderJournal();
}

// cancel edit -> revert
function cancelEdit(){
  if (!currentEdit) return;
  const { type, id, orig } = currentEdit;
  if (type === "todo"){
    const idx = todos.findIndex(x => x.id === id);
    if (idx !== -1) todos[idx] = orig;
    else if (orig) todos.unshift(orig); // defensive
  } else {
    const idx = journal.findIndex(x => x.id === id);
    if (idx !== -1) journal[idx] = orig;
    else if (orig) journal.unshift(orig);
  }
  currentEdit = null;
  saveAll(); renderTodos(); renderJournal();
}

// save edit for todo
function saveEditTodo(id){
  if (!currentEdit || currentEdit.type !== "todo" || currentEdit.id !== id) return;
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (!li) return;
  const item = todos.find(t => t.id === id);
  if (!item) return;

  // text
  const txtInp = li.querySelector(".textInput");
  if (txtInp) item.text = txtInp.value.trim();

  // time editors
  const editors = li.querySelectorAll(".time-field");
  const fields = ["added","started","stopped"];
  editors.forEach((ed, idx) => {
    const hh = ed.querySelector(".hh").value;
    const mm = ed.querySelector(".mm").value;
    if (hh !== "" && mm !== ""){
      const base = item[fields[idx]] ? new Date(item[fields[idx]]) : new Date();
      base.setHours(Number(hh), Number(mm), 0, 0);
      item[fields[idx]] = base.toISOString();
    }
  });

  item.edited = true;
  currentEdit = null;
  saveAll(); renderTodos(); renderJournal();
}

// save edit for journal
function saveEditJournal(id){
  if (!currentEdit || currentEdit.type !== "journal" || currentEdit.id !== id) return;
  const li = document.querySelector(`li[data-id="${id}"]`);
  if (!li) return;
  const item = journal.find(j => j.id === id);
  if (!item) return;

  const txtInp = li.querySelector(".textInput");
  if (txtInp) item.text = txtInp.value.trim();

  const editors = li.querySelectorAll(".time-field");
  const fields = ["added","started","stopped","completed"];
  editors.forEach((ed, idx) => {
    const hh = ed.querySelector(".hh").value;
    const mm = ed.querySelector(".mm").value;
    if (hh !== "" && mm !== ""){
      const base = item[fields[idx]] ? new Date(item[fields[idx]]) : new Date();
      base.setHours(Number(hh), Number(mm), 0, 0);
      item[fields[idx]] = base.toISOString();
    }
  });

  item.edited = true;
  currentEdit = null;
  saveAll(); renderJournal(); renderTodos();
}

// render Journal
function renderJournal(){
  const list = $("journalList");
  if (!list) return;
  list.innerHTML = "";
  journal.forEach(item => {
    const li = document.createElement("li"); li.className = "item"; li.dataset.id = item.id;
    const isEditing = currentEdit && currentEdit.type === "journal" && currentEdit.id === item.id;
    if (isEditing) li.classList.add("editing");

    // row1
    const row1 = document.createElement("div"); row1.className = "row1";
    const cat = document.createElement("div"); cat.className = "cat-badge"; cat.textContent = item.category || "General";
    const textStatic = document.createElement("div"); textStatic.className = "textStatic"; textStatic.textContent = item.text;
    const textInput = document.createElement("input"); textInput.className = "textInput"; textInput.type = "text"; textInput.value = item.text;
    row1.appendChild(cat); row1.appendChild(textStatic); row1.appendChild(textInput);

    // row2: time editors (only visible when editing)
    const row2 = document.createElement("div"); row2.className = "row2";
    row2.appendChild(makeTimeEditor(item,"added"));
    row2.appendChild(makeTimeEditor(item,"started"));
    row2.appendChild(makeTimeEditor(item,"stopped"));
    row2.appendChild(makeTimeEditor(item,"completed"));

    // meta static (inline) shown when not editing
    const metaStatic = document.createElement("div"); metaStatic.className = "metaStatic";
    const parts = [`Added: ${formatTimeUI(item.added)}`];
    if (item.started) parts.push(`Started: ${formatTimeUI(item.started)}`);
    if (item.stopped) parts.push(`Stopped: ${formatTimeUI(item.stopped)}`);
    if (item.completed) parts.push(`Completed: ${formatTimeUI(item.completed)}`);
    metaStatic.textContent = parts.join("  |  ");

    // row3: actions
    const row3 = document.createElement("span"); row3.className = "row3";
    const editBtn = document.createElement("button"); editBtn.className = isEditing ? "btn-save" : "btn-edit";
    editBtn.textContent = isEditing ? "💾 Save" : "✏️ Edit";
    editBtn.onclick = () => {
      if (isEditing) saveEditJournal(item.id);
      else startEdit("journal", item.id);
    };
    const delBtn = document.createElement("button"); delBtn.className = "btn-delete"; delBtn.textContent = "🗑️ Delete";
    delBtn.onclick = () => { if (!confirm("Delete journal entry?")) return; journal = journal.filter(j => j.id !== item.id); saveAll(); renderJournal(); };
    row3.appendChild(editBtn); row3.appendChild(delBtn);

    // assemble
    li.appendChild(row1);
    if (!isEditing) li.appendChild(metaStatic);
    li.appendChild(row2);
    li.appendChild(row3);
    list.appendChild(li);
  });
}

// helper: create a time editor span for a field (used in edit mode)
function makeTimeEditor(item, field){
  const wrap = document.createElement("span"); wrap.className = "time-field";
  const label = document.createElement("span"); label.textContent = field.charAt(0).toUpperCase() + field.slice(1);
  const hh = document.createElement("input"); hh.type = "number"; hh.min = 0; hh.max = 23; hh.className = "hh";
  const mm = document.createElement("input"); mm.type = "number"; mm.min = 0; mm.max = 59; mm.className = "mm";

  // set values if present
  if (item[field]){
    const d = new Date(item[field]);
    hh.value = String(d.getHours()).padStart(2,"0");
    mm.value = String(d.getMinutes()).padStart(2,"0");
  } else { hh.value = ""; mm.value = ""; }

  // clamp to 2 digits and range
  function clamp(e){
    e.target.value = e.target.value.replace(/[^\d]/g,"").slice(0,2);
    if (e.target.classList.contains("hh") && e.target.value !== "" && Number(e.target.value) > 23) e.target.value = "23";
    if (e.target.classList.contains("mm") && e.target.value !== "" && Number(e.target.value) > 59) e.target.value = "59";
  }
  hh.addEventListener("input", clamp); mm.addEventListener("input", clamp);

  wrap.appendChild(label); wrap.appendChild(hh); wrap.appendChild(document.createTextNode(":")); wrap.appendChild(mm);
  return wrap;
}

// CSV export (dd-mm-yyyy hh:mm am/pm)
function downloadCSV(){
  const rows = [["Type","Category","Text","Added","Started","Stopped","Completed"]];
  todos.forEach(t => rows.push(["ToDo", t.category||"", t.text||"", formatFull(t.added), formatFull(t.started), formatFull(t.stopped), ""]));
  journal.forEach(j => rows.push(["Journal", j.category||"", j.text||"", formatFull(j.added), formatFull(j.started), formatFull(j.stopped), formatFull(j.completed)]));
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `tasks_journal_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// resets
function resetTodos(){ if (!confirm("Clear all ToDos?")) return; todos = []; saveAll(); renderTodos(); }
function resetJournal(){ if (!confirm("Clear all Journal entries?")) return; journal = []; saveAll(); renderJournal(); }

// wiring & init
document.addEventListener("DOMContentLoaded", () => {
  // render initial UI
  renderCategories(); renderTodos(); renderJournal();

  // buttons
  $("addTodoBtn").addEventListener("click", addTodo);
  $("addJournalBtn").addEventListener("click", addJournalEntry);
  $("addCategoryBtn").addEventListener("click", addCategory);
  $("downloadCsvBtn").addEventListener("click", downloadCSV);
  $("resetTodosBtn").addEventListener("click", resetTodos);
  $("resetJournalBtn").addEventListener("click", resetJournal);

  // Enter behavior
  $("todoInput").addEventListener("keydown", e => { if (e.key === "Enter") addTodo(); });
  $("journalInput").addEventListener("keydown", e => { if (e.key === "Enter") addJournalEntry(); });
  $("newCategoryInput").addEventListener("keydown", e => { if (e.key === "Enter") addCategory(); });

  // expose a few functions to console/onclick compatibility if needed
  window.startEdit = startEdit;
  window.saveEditTodo = saveEditTodo;
  window.saveEditJournal = saveEditJournal;
  window.cancelEdit = cancelEdit;
});

