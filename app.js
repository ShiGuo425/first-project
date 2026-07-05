const STORAGE_KEY = "our-days-memory-journal";

const state = {
  startDate: "",
  memories: [],
  draftPhoto: ""
};

const startDateInput = document.querySelector("#startDate");
const daysTogether = document.querySelector("#daysTogether");
const sinceText = document.querySelector("#sinceText");
const memoryForm = document.querySelector("#memoryForm");
const memoryTitle = document.querySelector("#memoryTitle");
const memoryDate = document.querySelector("#memoryDate");
const memoryText = document.querySelector("#memoryText");
const photoInput = document.querySelector("#photoInput");
const photoPreview = document.querySelector("#photoPreview");
const clearForm = document.querySelector("#clearForm");
const timeline = document.querySelector("#timeline");
const emptyState = document.querySelector("#emptyState");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.startDate = parsed.startDate || "";
    state.memories = Array.isArray(parsed.memories) ? parsed.memories : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      startDate: state.startDate,
      memories: state.memories
    })
  );
}

function dateOnly(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = dateOnly(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function updateCounter() {
  if (!state.startDate) {
    daysTogether.textContent = "0";
    sinceText.textContent = "Choose your first day together.";
    return;
  }

  const firstDay = dateOnly(state.startDate);
  const today = dateOnly(new Date().toISOString().slice(0, 10));
  if (!firstDay || !today) return;

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.max(0, Math.floor((today - firstDay) / msPerDay) + 1);
  daysTogether.textContent = String(diff);
  sinceText.textContent = `Together since ${formatDate(state.startDate)}.`;
}

function renderPreview(src) {
  photoPreview.innerHTML = "";
  if (!src) {
    const empty = document.createElement("span");
    empty.textContent = "No picture selected";
    photoPreview.append(empty);
    return;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = "Selected memory preview";
  photoPreview.append(image);
}

function renderTimeline() {
  timeline.innerHTML = "";
  emptyState.classList.toggle("is-hidden", state.memories.length > 0);

  state.memories
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .forEach((memory) => {
      const card = document.createElement("article");
      card.className = "memory-card";

      const photo = document.createElement("div");
      photo.className = "memory-photo";
      if (memory.photo) {
        const image = document.createElement("img");
        image.src = memory.photo;
        image.alt = memory.title;
        photo.append(image);
      }

      const body = document.createElement("div");
      body.className = "memory-body";

      const date = document.createElement("div");
      date.className = "memory-date";
      date.textContent = formatDate(memory.date);

      const titleRow = document.createElement("div");
      titleRow.className = "memory-title-row";

      const title = document.createElement("h3");
      title.className = "memory-title";
      title.textContent = memory.title;

      const remove = document.createElement("button");
      remove.className = "delete-button";
      remove.type = "button";
      remove.title = "Delete memory";
      remove.setAttribute("aria-label", `Delete ${memory.title}`);
      remove.textContent = "x";
      remove.addEventListener("click", () => deleteMemory(memory.id));

      const text = document.createElement("p");
      text.className = "memory-text";
      text.textContent = memory.text;

      titleRow.append(title, remove);
      body.append(date, titleRow, text);
      card.append(photo, body);
      timeline.append(card);
    });
}

function resetForm() {
  memoryForm.reset();
  memoryDate.value = new Date().toISOString().slice(0, 10);
  state.draftPhoto = "";
  renderPreview("");
}

function deleteMemory(id) {
  state.memories = state.memories.filter((memory) => memory.id !== id);
  saveState();
  renderTimeline();
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image."));
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

startDateInput.addEventListener("change", () => {
  state.startDate = startDateInput.value;
  saveState();
  updateCounter();
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) {
    state.draftPhoto = "";
    renderPreview("");
    return;
  }

  state.draftPhoto = await resizeImage(file);
  renderPreview(state.draftPhoto);
});

memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const memory = {
    id: createId(),
    title: memoryTitle.value.trim(),
    date: memoryDate.value,
    text: memoryText.value.trim(),
    photo: state.draftPhoto,
    createdAt: Date.now()
  };

  if (!memory.title || !memory.date || !memory.text) return;

  state.memories.push(memory);
  saveState();
  renderTimeline();
  resetForm();
});

clearForm.addEventListener("click", resetForm);

loadState();
startDateInput.value = state.startDate;
memoryDate.value = new Date().toISOString().slice(0, 10);
updateCounter();
renderPreview("");
renderTimeline();
