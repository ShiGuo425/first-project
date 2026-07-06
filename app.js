const SUPABASE_URL = "https://lxadqowrypxijzcojycd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FxuOkvz6k8RHidtEbYJsHQ_QaofQDZ9";
const STORAGE_BUCKET = "memories";
const AUTH_ACCOUNT = "hyh";
const AUTH_HASH = "9a50326120f21735841d567b22e0de6dc6d80d7ca71f8bbffb871cf5d9752945";
const AUTH_STORAGE_KEY = "our-days-authenticated";

const state = {
  startDate: "",
  memories: [],
  draftPhoto: "",
  draftBlob: null
};

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

const loginForm = document.querySelector("#loginForm");
const accountInput = document.querySelector("#accountInput");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");
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
let refreshTimer = null;

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashCredentials(account, password) {
  const encoder = new TextEncoder();
  const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(`${account}:${password}`));
  return bytesToHex(digest);
}

function unlockApp() {
  localStorage.setItem(AUTH_STORAGE_KEY, "true");
  document.body.classList.remove("is-locked");
  loginError.textContent = "";
  loadCloudState();
  if (!refreshTimer) {
    refreshTimer = window.setInterval(loadCloudState, 30000);
  }
}

function lockApp() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  document.body.classList.add("is-locked");
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
  passwordInput.value = "";
  accountInput.focus();
}

function setBusy(isBusy) {
  memoryForm.querySelectorAll("button, input, textarea").forEach((element) => {
    element.disabled = isBusy;
  });
}

function showMessage(message) {
  emptyState.classList.remove("is-hidden");
  emptyState.querySelector("p").textContent = message;
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

  if (state.memories.length === 0) {
    emptyState.querySelector("p").textContent = "Your saved pictures and notes will appear here.";
  }

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
  state.draftBlob = null;
  renderPreview("");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.84);
  });
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load image."));
      image.onload = async () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve({
          preview: canvas.toDataURL("image/jpeg", 0.84),
          blob: await canvasToBlob(canvas)
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function mapMemory(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.memory_date,
    text: row.body,
    photo: row.photo_url,
    createdAt: Date.parse(row.created_at || "") || 0
  };
}

async function loadCloudState() {
  if (!supabaseClient) {
    showMessage("Supabase is not connected yet.");
    return;
  }

  const { data: settings, error: settingsError } = await supabaseClient
    .from("couple_settings")
    .select("start_date")
    .eq("id", "main")
    .maybeSingle();

  if (settingsError) {
    showMessage("Run supabase-setup.sql in Supabase first, then refresh this page.");
    return;
  }

  const { data: memories, error: memoriesError } = await supabaseClient
    .from("memories")
    .select("*")
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (memoriesError) {
    showMessage("Could not load memories from Supabase. Check the table policies.");
    return;
  }

  state.startDate = settings?.start_date || "";
  state.memories = (memories || []).map(mapMemory);
  startDateInput.value = state.startDate;
  updateCounter();
  renderTimeline();
}

async function saveStartDate(value) {
  state.startDate = value;
  updateCounter();

  const { error } = await supabaseClient.from("couple_settings").upsert({
    id: "main",
    start_date: value || null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    showMessage("Could not save the first day. Check Supabase policies.");
  }
}

async function uploadPhoto(blob) {
  if (!blob) return "";

  const path = `${Date.now()}-${createId()}.jpg`;
  const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false
  });

  if (error) {
    throw new Error("Photo upload failed. Check the Supabase storage bucket and policies.");
  }

  return supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function deleteMemory(id) {
  const { error } = await supabaseClient.from("memories").delete().eq("id", id);
  if (error) {
    showMessage("Could not delete this memory. Check Supabase policies.");
    return;
  }

  state.memories = state.memories.filter((memory) => memory.id !== id);
  renderTimeline();
}

startDateInput.addEventListener("change", () => {
  saveStartDate(startDateInput.value);
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) {
    state.draftPhoto = "";
    state.draftBlob = null;
    renderPreview("");
    return;
  }

  const resized = await resizeImage(file);
  state.draftPhoto = resized.preview;
  state.draftBlob = resized.blob;
  renderPreview(state.draftPhoto);
});

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = memoryTitle.value.trim();
  const date = memoryDate.value;
  const text = memoryText.value.trim();

  if (!title || !date || !text || !supabaseClient) return;

  setBusy(true);
  try {
    const photoUrl = await uploadPhoto(state.draftBlob);
    const { error } = await supabaseClient.from("memories").insert({
      title,
      memory_date: date,
      body: text,
      photo_url: photoUrl || null
    });

    if (error) {
      throw new Error("Could not save this memory. Check Supabase table policies.");
    }

    resetForm();
    await loadCloudState();
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(false);
  }
});

clearForm.addEventListener("click", resetForm);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = accountInput.value.trim();
  const password = passwordInput.value;
  const hash = await hashCredentials(account, password);

  if (account === AUTH_ACCOUNT && hash === AUTH_HASH) {
    unlockApp();
    return;
  }

  loginError.textContent = "Wrong account number or password.";
  passwordInput.value = "";
  passwordInput.focus();
});

logoutButton.addEventListener("click", lockApp);

memoryDate.value = new Date().toISOString().slice(0, 10);
updateCounter();
renderPreview("");
if (localStorage.getItem(AUTH_STORAGE_KEY) === "true") {
  unlockApp();
} else {
  lockApp();
}
