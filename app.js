const SUPABASE_URL = "https://lxadqowrypxijzcojycd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FxuOkvz6k8RHidtEbYJsHQ_QaofQDZ9";
const STORAGE_BUCKET = "memories";
const AUTH_ACCOUNT = "hyh";
const AUTH_HASH = "9a50326120f21735841d567b22e0de6dc6d80d7ca71f8bbffb871cf5d9752945";
const AUTH_STORAGE_KEY = "our-days-authenticated";

const state = {
  startDate: "",
  memories: [],
  wishes: [],
  plans: [],
  places: [],
  draftPhoto: "",
  draftBlob: null,
  placeDraftPhotos: []
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
const wishlistForm = document.querySelector("#wishlistForm");
const wishTitle = document.querySelector("#wishTitle");
const wishNote = document.querySelector("#wishNote");
const wishlist = document.querySelector("#wishlist");
const scheduleForm = document.querySelector("#scheduleForm");
const scheduleTitleInput = document.querySelector("#scheduleTitleInput");
const scheduleDate = document.querySelector("#scheduleDate");
const scheduleNote = document.querySelector("#scheduleNote");
const scheduleList = document.querySelector("#scheduleList");
const placeForm = document.querySelector("#placeForm");
const placeCity = document.querySelector("#placeCity");
const placeDate = document.querySelector("#placeDate");
const placeLat = document.querySelector("#placeLat");
const placeLng = document.querySelector("#placeLng");
const placeNote = document.querySelector("#placeNote");
const placePhotos = document.querySelector("#placePhotos");
const placePhotoPreview = document.querySelector("#placePhotoPreview");
const placesList = document.querySelector("#placesList");

let refreshTimer = null;
let chinaMap = null;
let globalMap = null;
let mapMarkers = [];

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
  initMaps();
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

function setBusy(form, isBusy) {
  form.querySelectorAll("button, input, textarea").forEach((element) => {
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

function renderPreview(container, src, emptyText) {
  container.innerHTML = "";
  if (!src) {
    const empty = document.createElement("span");
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = "Selected preview";
  container.append(image);
}

function renderPlacePreview() {
  placePhotoPreview.innerHTML = "";
  if (state.placeDraftPhotos.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = "No pictures selected";
    placePhotoPreview.append(empty);
    return;
  }

  state.placeDraftPhotos.forEach((photo) => {
    const image = document.createElement("img");
    image.src = photo.preview;
    image.alt = "Selected place photo";
    placePhotoPreview.append(image);
  });
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
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

      const remove = createActionButton("x", "delete-button", () => deleteMemory(memory.id));
      remove.title = "Delete memory";
      remove.setAttribute("aria-label", `Delete ${memory.title}`);

      const text = document.createElement("p");
      text.className = "memory-text";
      text.textContent = memory.text;

      titleRow.append(title, remove);
      body.append(date, titleRow, text);
      card.append(photo, body);
      timeline.append(card);
    });
}

function renderWishlist() {
  wishlist.innerHTML = "";
  state.wishes.forEach((wish) => {
    const item = document.createElement("article");
    item.className = `mini-item${wish.done ? " is-done" : ""}`;

    const header = document.createElement("div");
    header.className = "mini-item-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "mini-item-title";
    title.textContent = wish.title;
    const meta = document.createElement("p");
    meta.className = "mini-meta";
    meta.textContent = wish.done ? "Completed" : "Waiting for us";
    titleWrap.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "mini-actions";
    actions.append(
      createActionButton(wish.done ? "Undo" : "Done", "tiny-button done-button", () => toggleWish(wish.id, !wish.done)),
      createActionButton("x", "tiny-button", () => deleteRow("wishlist", wish.id, loadCloudState))
    );

    const note = document.createElement("p");
    note.className = "mini-note";
    note.textContent = wish.note || "";

    header.append(titleWrap, actions);
    item.append(header);
    if (wish.note) item.append(note);
    wishlist.append(item);
  });
}

function renderSchedule() {
  scheduleList.innerHTML = "";
  state.plans.forEach((plan) => {
    const item = document.createElement("article");
    item.className = "mini-item";

    const header = document.createElement("div");
    header.className = "mini-item-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "mini-item-title";
    title.textContent = plan.title;
    const meta = document.createElement("p");
    meta.className = "mini-meta";
    meta.textContent = formatDate(plan.date);
    titleWrap.append(title, meta);

    const remove = createActionButton("x", "tiny-button", () => deleteRow("year_schedule", plan.id, loadCloudState));
    const note = document.createElement("p");
    note.className = "mini-note";
    note.textContent = plan.note || "";

    header.append(titleWrap, remove);
    item.append(header);
    if (plan.note) item.append(note);
    scheduleList.append(item);
  });
}

function renderPlaces() {
  placesList.innerHTML = "";
  state.places.forEach((place) => {
    const card = document.createElement("article");
    card.className = "place-card";

    const header = document.createElement("div");
    header.className = "place-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "place-title";
    title.textContent = place.city;
    const meta = document.createElement("p");
    meta.className = "place-meta";
    meta.textContent = `${formatDate(place.visitedDate)} · ${Number(place.lat).toFixed(4)}, ${Number(place.lng).toFixed(4)}`;
    titleWrap.append(title, meta);

    const remove = createActionButton("x", "tiny-button", () => deleteRow("places", place.id, loadCloudState));
    header.append(titleWrap, remove);

    const note = document.createElement("p");
    note.className = "place-note";
    note.textContent = place.note || "";

    const gallery = document.createElement("div");
    gallery.className = "place-gallery";
    place.photos.forEach((photo) => {
      const image = document.createElement("img");
      image.src = photo.photoUrl;
      image.alt = `${place.city} memory`;
      gallery.append(image);
    });

    card.append(header);
    if (place.note) card.append(note);
    if (place.photos.length > 0) card.append(gallery);
    placesList.append(card);
  });
}

function resetMemoryForm() {
  memoryForm.reset();
  memoryDate.value = new Date().toISOString().slice(0, 10);
  state.draftPhoto = "";
  state.draftBlob = null;
  renderPreview(photoPreview, "", "No picture selected");
}

function resetPlaceForm() {
  placeForm.reset();
  placeDate.value = new Date().toISOString().slice(0, 10);
  state.placeDraftPhotos = [];
  renderPlacePreview();
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

function mapPlace(row) {
  return {
    id: row.id,
    city: row.city,
    visitedDate: row.visited_date,
    note: row.note,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    photos: (row.place_photos || []).map((photo) => ({
      id: photo.id,
      photoUrl: photo.photo_url,
      takenAt: photo.taken_at
    }))
  };
}

function initMaps() {
  if (!window.L || chinaMap || globalMap) return;

  chinaMap = L.map("chinaMap").setView([35.8617, 104.1954], 4);
  globalMap = L.map("globalMap").setView([20, 0], 2);

  [chinaMap, globalMap].forEach((map) => {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    map.on("click", (event) => {
      placeLat.value = event.latlng.lat.toFixed(6);
      placeLng.value = event.latlng.lng.toFixed(6);
    });
  });

  window.setTimeout(() => {
    chinaMap.invalidateSize();
    globalMap.invalidateSize();
  }, 250);
}

function renderMaps() {
  if (!chinaMap || !globalMap || !window.L) return;

  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = [];

  const icon = L.divIcon({
    className: "",
    html: '<div class="flag-marker"><span>♥</span></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  });

  state.places.forEach((place) => {
    [chinaMap, globalMap].forEach((map) => {
      const marker = L.marker([place.lat, place.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${place.city}</strong><br>${formatDate(place.visitedDate)}`);
      mapMarkers.push(marker);
    });
  });

  chinaMap.invalidateSize();
  globalMap.invalidateSize();
}

async function loadCloudState() {
  if (!supabaseClient) {
    showMessage("Supabase is not connected yet.");
    return;
  }

  const settingsResult = await supabaseClient.from("couple_settings").select("start_date").eq("id", "main").maybeSingle();
  if (!settingsResult.error) {
    state.startDate = settingsResult.data?.start_date || "";
  }

  const memoriesResult = await supabaseClient
    .from("memories")
    .select("*")
    .order("memory_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (!memoriesResult.error) {
    state.memories = (memoriesResult.data || []).map(mapMemory);
  }

  const wishesResult = await supabaseClient.from("wishlist").select("*").order("created_at", { ascending: false });
  if (!wishesResult.error) {
    state.wishes = (wishesResult.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      note: row.note,
      done: row.is_done
    }));
  }

  const plansResult = await supabaseClient.from("year_schedule").select("*").order("plan_date", { ascending: true });
  if (!plansResult.error) {
    state.plans = (plansResult.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      date: row.plan_date,
      note: row.note
    }));
  }

  const placesResult = await supabaseClient.from("places").select("*").order("visited_date", { ascending: false }).order("created_at", { ascending: false });
  const photosResult = await supabaseClient.from("place_photos").select("*").order("created_at", { ascending: true });
  if (!placesResult.error) {
    const photosByPlace = new Map();
    if (!photosResult.error) {
      (photosResult.data || []).forEach((photo) => {
        const list = photosByPlace.get(photo.place_id) || [];
        list.push({
          id: photo.id,
          photoUrl: photo.photo_url,
          takenAt: photo.taken_at
        });
        photosByPlace.set(photo.place_id, list);
      });
    }

    state.places = (placesResult.data || []).map((row) =>
      mapPlace({
        ...row,
        place_photos: photosByPlace.get(row.id) || []
      })
    );
  }

  startDateInput.value = state.startDate;
  updateCounter();
  renderTimeline();
  renderWishlist();
  renderSchedule();
  renderPlaces();
  renderMaps();

  if (wishesResult.error || plansResult.error || placesResult.error || photosResult.error) {
    showMessage("Old memories are loaded. Run the latest supabase-setup.sql once to enable wish list, schedule, and maps.");
  }
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

async function uploadPhoto(blob, folder = "memories") {
  if (!blob) return "";

  const path = `${folder}/${Date.now()}-${createId()}.jpg`;
  const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false
  });

  if (error) {
    throw new Error("Photo upload failed. Check the Supabase storage bucket and policies.");
  }

  return supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function deleteRow(table, id, afterDelete) {
  const { error } = await supabaseClient.from(table).delete().eq("id", id);
  if (error) {
    showMessage("Could not delete this item. Check Supabase policies.");
    return;
  }
  await afterDelete();
}

async function deleteMemory(id) {
  await deleteRow("memories", id, loadCloudState);
}

async function toggleWish(id, isDone) {
  const { error } = await supabaseClient.from("wishlist").update({ is_done: isDone }).eq("id", id);
  if (error) {
    showMessage("Could not update this wish. Check Supabase policies.");
    return;
  }
  await loadCloudState();
}

startDateInput.addEventListener("change", () => {
  saveStartDate(startDateInput.value);
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) {
    state.draftPhoto = "";
    state.draftBlob = null;
    renderPreview(photoPreview, "", "No picture selected");
    return;
  }

  const resized = await resizeImage(file);
  state.draftPhoto = resized.preview;
  state.draftBlob = resized.blob;
  renderPreview(photoPreview, state.draftPhoto, "No picture selected");
});

placePhotos.addEventListener("change", async () => {
  const files = Array.from(placePhotos.files || []).slice(0, 12);
  state.placeDraftPhotos = await Promise.all(files.map(resizeImage));
  renderPlacePreview();
});

memoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = memoryTitle.value.trim();
  const date = memoryDate.value;
  const text = memoryText.value.trim();

  if (!title || !date || !text || !supabaseClient) return;

  setBusy(memoryForm, true);
  try {
    const photoUrl = await uploadPhoto(state.draftBlob);
    const { error } = await supabaseClient.from("memories").insert({
      title,
      memory_date: date,
      body: text,
      photo_url: photoUrl || null
    });

    if (error) throw new Error("Could not save this memory. Check Supabase table policies.");

    resetMemoryForm();
    await loadCloudState();
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(memoryForm, false);
  }
});

wishlistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = wishTitle.value.trim();
  const note = wishNote.value.trim();
  if (!title) return;

  const { error } = await supabaseClient.from("wishlist").insert({ title, note });
  if (error) {
    showMessage("Could not save this wish. Run the latest Supabase setup.");
    return;
  }

  wishlistForm.reset();
  await loadCloudState();
});

scheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = scheduleTitleInput.value.trim();
  const date = scheduleDate.value;
  const note = scheduleNote.value.trim();
  if (!title || !date) return;

  const { error } = await supabaseClient.from("year_schedule").insert({
    title,
    plan_date: date,
    note
  });
  if (error) {
    showMessage("Could not save this plan. Run the latest Supabase setup.");
    return;
  }

  scheduleForm.reset();
  scheduleDate.value = new Date().toISOString().slice(0, 10);
  await loadCloudState();
});

placeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = placeCity.value.trim();
  const visitedDate = placeDate.value;
  const latitude = Number(placeLat.value);
  const longitude = Number(placeLng.value);
  const note = placeNote.value.trim();
  if (!city || !visitedDate || Number.isNaN(latitude) || Number.isNaN(longitude)) return;

  setBusy(placeForm, true);
  try {
    const { data: place, error: placeError } = await supabaseClient
      .from("places")
      .insert({
        city,
        visited_date: visitedDate,
        latitude,
        longitude,
        note
      })
      .select("id")
      .single();

    if (placeError) throw new Error("Could not save this place. Run the latest Supabase setup.");

    const uploadedPhotos = [];
    for (const photo of state.placeDraftPhotos) {
      const photoUrl = await uploadPhoto(photo.blob, "places");
      uploadedPhotos.push({
        place_id: place.id,
        photo_url: photoUrl,
        taken_at: visitedDate
      });
    }

    if (uploadedPhotos.length > 0) {
      const { error: photosError } = await supabaseClient.from("place_photos").insert(uploadedPhotos);
      if (photosError) throw new Error("Place saved, but photo bundle could not be attached.");
    }

    resetPlaceForm();
    await loadCloudState();
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(placeForm, false);
  }
});

clearForm.addEventListener("click", resetMemoryForm);

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
scheduleDate.value = new Date().toISOString().slice(0, 10);
placeDate.value = new Date().toISOString().slice(0, 10);
updateCounter();
renderPreview(photoPreview, "", "No picture selected");
renderPlacePreview();

if (localStorage.getItem(AUTH_STORAGE_KEY) === "true") {
  unlockApp();
} else {
  lockApp();
}
