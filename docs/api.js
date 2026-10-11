// QuickNotes API client (talks to the JSONPlaceholder practice API)
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE = 100;

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const form = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const listEl = document.getElementById("notes-list");

// ---------- helpers ----------

// Reusable request: calls fetch, checks response.ok, throws on errors.
// Returns { status, data } so callers can show the status code.
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error("Request failed with status " + response.status);
  }
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

function setStatus(message, type) {
  statusEl.textContent = message; // textContent only
  statusEl.className = type || "";
}

// Disable every button while a request runs.
function setBusy(busy) {
  loadBtn.disabled = busy;
  submitBtn.disabled = busy;
  document.querySelectorAll(".delete-btn").forEach((b) => (b.disabled = busy));
}

function showEmptyIfNeeded() {
  if (listEl.children.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No notes to show.";
    listEl.appendChild(li);
  }
}

function clearEmptyMessage() {
  const empty = listEl.querySelector("li.empty");
  if (empty) empty.remove();
}

function renderNote(note, { prepend = false, local = false } = {}) {
  clearEmptyMessage();
  const li = document.createElement("li");
  li.dataset.id = note.id;

  const h = document.createElement("h3");
  h.textContent = note.title; // user text via textContent only
  const p = document.createElement("p");
  p.textContent = note.body || "";

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete-btn";
  del.textContent = "Delete";
  del.addEventListener("click", () => deleteNote(note.id, li, local));

  li.append(h, p, del);
  if (prepend) listEl.prepend(li);
  else listEl.appendChild(li);
}

// ---------- GET ----------
async function loadNotes() {
  setBusy(true);
  setStatus("Loading notes...", "loading");
  try {
    const { data } = await request(API_URL + "?_limit=10");
    listEl.textContent = "";
    if (!data || data.length === 0) {
      showEmptyIfNeeded();
      setStatus("No notes found.", "success");
    } else {
      data.forEach((note) => renderNote(note));
      setStatus("Loaded " + data.length + " notes from the server.", "success");
    }
  } catch (err) {
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
  }
}

// ---------- POST ----------
function validateTitle(title) {
  if (!title) return "Please enter a title.";
  if (title.length > MAX_TITLE) return "Title must be at most " + MAX_TITLE + " characters.";
  return null;
}

async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim(); // optional
  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    return;
  }

  setBusy(true);
  setStatus("Creating note...", "loading");
  try {
    const { status, data } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    // JSONPlaceholder echoes the note back with id 101 but does not store it.
    renderNote({ id: data.id, title, body }, { prepend: true, local: true });
    setStatus("Note created (status " + status + ", id " + data.id + ").", "success");
    form.reset();
  } catch (err) {
    setStatus("Sorry, the note could not be created. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
  }
}

// ---------- DELETE ----------
// JSONPlaceholder never really stores notes we create, so DELETE /posts/101
// would not find them on a real server (and the fake API only pretends to
// succeed). Approach: notes created in this session are "local" and are
// removed from the page only; notes loaded from the server go through a
// real DELETE /posts/{id} request and are removed only if it succeeds.
async function deleteNote(id, li, local) {
  if (local) {
    li.remove();
    showEmptyIfNeeded();
    setStatus("Note removed (it only existed in this page, not on the server).", "success");
    return;
  }

  setBusy(true);
  setStatus("Deleting note...", "loading");
  try {
    const { status } = await request(API_URL + "/" + id, { method: "DELETE" });
    li.remove();
    showEmptyIfNeeded();
    setStatus("Note " + id + " deleted (status " + status + ").", "success");
  } catch (err) {
    setStatus("Sorry, the note could not be deleted. Please try again.", "error");
    console.error(err);
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);
form.addEventListener("submit", createNote);
showEmptyIfNeeded();
