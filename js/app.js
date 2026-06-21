"use strict";

const data = window.JONI_DATA;
const storage = {
  watched: "joni_watched_lessons",
  xp: "joni_xp",
  user: "joni_user",
  customLessons: "joni_custom_lessons"
};

let lessons = [...data.lessons, ...readJson(storage.customLessons, [])];
let watched = readJson(storage.watched, []);
let currentCategory = "all";
let timerId = null;
let timerSeconds = 25 * 60;
let isDrawing = false;
let lastPoint = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function categoryTitle(id) {
  return data.categories.find((category) => category.id === id)?.title || id;
}

function toast(message) {
  const box = $("#toast");
  box.textContent = message;
  box.hidden = false;
  clearTimeout(box._timer);
  box._timer = setTimeout(() => { box.hidden = true; }, 2400);
}

function renderCategories() {
  $("#categoryGrid").innerHTML = data.categories.map((category) => `
    <button class="category-card" type="button" data-category="${category.id}">
      <img src="${category.image}" alt="${category.title}" loading="lazy">
      <span>${category.title}</span>
      <small>${category.text}</small>
    </button>
  `).join("");
}

function renderFilters() {
  const filters = [{ id: "all", title: "Все" }, ...data.categories];
  $("#filters").innerHTML = filters.map((category) => `
    <button class="filter ${currentCategory === category.id ? "active" : ""}" type="button" data-filter="${category.id}">
      ${category.title}
    </button>
  `).join("");
}

function filteredLessons() {
  const query = $("#lessonSearch").value.trim().toLowerCase();
  return lessons.filter((lesson) => {
    const byCategory = currentCategory === "all" || lesson.category === currentCategory;
    const bySearch = !query || `${lesson.title} ${lesson.level} ${categoryTitle(lesson.category)}`.toLowerCase().includes(query);
    return byCategory && bySearch;
  });
}

function renderLessons() {
  renderFilters();
  const list = filteredLessons();
  $("#lessonsTitle").textContent = currentCategory === "all" ? "Все уроки" : categoryTitle(currentCategory);
  $("#lessonsSubtitle").textContent = `${list.length} уроков найдено`;
  $("#lessonsGrid").innerHTML = list.length ? list.map((lesson) => {
    const done = watched.includes(lesson.id);
    return `
      <article class="lesson-card">
        <button type="button" data-open-lesson="${lesson.id}">
          <img src="${lesson.image}" alt="${lesson.title}" loading="lazy">
          <span class="play-badge">Смотреть</span>
        </button>
        <div>
          <span class="tag">${categoryTitle(lesson.category)}</span>
          <h3>${lesson.title}</h3>
          <p>${lesson.level} · ${lesson.duration} мин.</p>
          <button class="text-button" type="button" data-toggle-watched="${lesson.id}">
            ${done ? "Пройдено" : "Отметить пройденным"}
          </button>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty">По такому запросу уроки не найдены.</p>`;
  updateProgress();
}

function updateProgress() {
  watched = watched.filter((id) => lessons.some((lesson) => lesson.id === id));
  const total = lessons.length;
  const percent = total ? Math.round((watched.length / total) * 100) : 0;
  const xp = Number(localStorage.getItem(storage.xp) || watched.length * 50);
  const levels = [
    [0, "Новичок"],
    [250, "Ученик"],
    [600, "Практик"],
    [1000, "Художник"],
    [1600, "Мастер"]
  ];
  const level = levels.reduce((current, item) => xp >= item[0] ? item : current, levels[0])[1];
  $("#watchedCount").textContent = watched.length;
  $("#totalLessons").textContent = total;
  $("#progressFill").style.width = `${percent}%`;
  $("#heroLessonsCount").textContent = total;
  $("#heroProgressValue").textContent = `${percent}%`;
  $("#xpText").textContent = xp;
  $("#levelText").textContent = level;
  $("#achievements").innerHTML = [
    ["Первый урок", watched.length >= 1],
    ["5 уроков", watched.length >= 5],
    ["10 уроков", watched.length >= 10],
    ["500 XP", xp >= 500]
  ].map(([title, active]) => `<span class="${active ? "active" : ""}">${title}</span>`).join("");
  writeJson(storage.watched, watched);
  renderAdminRows();
}

function toggleWatched(id) {
  const lessonId = Number(id);
  const hasLesson = watched.includes(lessonId);
  watched = hasLesson ? watched.filter((item) => item !== lessonId) : [...watched, lessonId];
  localStorage.setItem(storage.xp, String(Math.max(0, watched.length * 50)));
  renderLessons();
  toast(hasLesson ? "Урок убран из прогресса" : "Урок отмечен как пройденный");
}

function openLesson(id) {
  const lesson = lessons.find((item) => item.id === Number(id));
  if (!lesson) return;
  if (!watched.includes(lesson.id)) {
    watched.push(lesson.id);
    localStorage.setItem(storage.xp, String(watched.length * 50));
  }
  $("#lessonModalBody").innerHTML = `
    <h2 id="modalLessonTitle">${lesson.title}</h2>
    <p class="muted">${categoryTitle(lesson.category)} · ${lesson.level} · ${lesson.duration} мин.</p>
    <div class="video-frame">
      <iframe src="https://rutube.ru/play/embed/${lesson.video}" title="${lesson.title}" allow="clipboard-write; autoplay" allowfullscreen></iframe>
    </div>
  `;
  showModal("#lessonModal");
  renderLessons();
}

function renderArticles() {
  $("#articlesGrid").innerHTML = data.articles.map((article) => `
    <article class="article-card">
      <button type="button" data-article="${article.id}">
        <img src="${article.image}" alt="${article.title}" loading="lazy">
        <span>${article.title}</span>
        <small>${article.intro}</small>
      </button>
    </article>
  `).join("");
}

function openArticle(id) {
  const article = data.articles.find((item) => item.id === id);
  if (!article) return;
  $("#articleModalBody").innerHTML = `
    <h2 id="articleTitle">${article.title}</h2>
    <p class="muted">${article.intro}</p>
    ${article.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
  `;
  showModal("#articleModal");
}

function showModal(selector) {
  $(selector).hidden = false;
  document.body.classList.add("modal-open");
}

function closeModals() {
  $$(".modal").forEach((modal) => { modal.hidden = true; });
  document.body.classList.remove("modal-open");
}

function login() {
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  if (!email || !password) {
    toast("Введите email и пароль");
    return;
  }
  const user = { email, role: email === "admin@drawing.com" && password === "admin123" ? "admin" : "student" };
  writeJson(storage.user, user);
  applyUserState();
  closeModals();
  toast(user.role === "admin" ? "Админ-панель открыта" : "Вы вошли в аккаунт");
}

function register() {
  const email = $("#authEmail").value.trim().toLowerCase();
  if (!email) {
    toast("Введите email");
    return;
  }
  writeJson(storage.user, { email, role: "student" });
  applyUserState();
  closeModals();
  toast("Аккаунт создан локально");
}

function applyUserState() {
  const user = readJson(storage.user, null);
  $("#adminPanel").hidden = user?.role !== "admin";
  const authButton = $("[data-open-auth]");
  authButton.textContent = user ? user.email : "Войти";
}

function renderAdminRows() {
  const body = $("#adminRows");
  if (!body) return;
  body.innerHTML = lessons.map((lesson) => `
    <tr>
      <td>${lesson.id}</td>
      <td>${lesson.title}</td>
      <td>${categoryTitle(lesson.category)}</td>
      <td>${lesson.level}</td>
      <td>${lesson.duration}</td>
      <td><button class="text-button danger" type="button" data-delete="${lesson.id}">Удалить</button></td>
    </tr>
  `).join("");
}

function addLesson(event) {
  event.preventDefault();
  const lesson = {
    id: Math.max(...lessons.map((item) => item.id), 0) + 1,
    title: $("#adminTitle").value.trim(),
    category: $("#adminCategory").value,
    level: $("#adminLevel").value,
    duration: Number($("#adminDuration").value),
    image: data.categories.find((category) => category.id === $("#adminCategory").value)?.image || "assets/images/web/art-supplies.jpg",
    video: "81b45b1123a4889c32facf5e7c28fc83",
    custom: true
  };
  lessons.push(lesson);
  writeJson(storage.customLessons, lessons.filter((item) => item.custom));
  event.target.reset();
  renderLessons();
  toast("Урок добавлен");
}

function deleteLesson(id) {
  const lessonId = Number(id);
  lessons = lessons.filter((lesson) => lesson.id !== lessonId);
  watched = watched.filter((item) => item !== lessonId);
  writeJson(storage.customLessons, lessons.filter((item) => item.custom));
  renderLessons();
  toast("Урок удален");
}

function setupCanvas() {
  const canvas = $("#drawCanvas");
  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0];
    const source = touch || event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function start(event) {
    isDrawing = true;
    lastPoint = point(event);
  }

  function move(event) {
    if (!isDrawing) return;
    event.preventDefault();
    const next = point(event);
    ctx.strokeStyle = $("#brushColor").value;
    ctx.lineWidth = Number($("#brushSize").value);
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPoint = next;
  }

  function stop() {
    isDrawing = false;
    lastPoint = null;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
  canvas.addEventListener("touchstart", start, { passive: true });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", stop);
  $("#clearCanvas").addEventListener("click", () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
}

function updateTimer() {
  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const seconds = String(timerSeconds % 60).padStart(2, "0");
  $("#timerDisplay").textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    timerSeconds = Math.max(0, timerSeconds - 1);
    updateTimer();
    if (timerSeconds === 0) {
      clearInterval(timerId);
      timerId = null;
      toast("Практика завершена");
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerId);
  timerId = null;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 25 * 60;
  updateTimer();
}

function newIdea() {
  const idea = data.ideas[Math.floor(Math.random() * data.ideas.length)];
  $("#ideaText").textContent = idea.text;
  $("#ideaImage").src = idea.image;
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-menu-toggle]")) {
      const isOpen = $(".nav").classList.toggle("open");
      target.setAttribute("aria-expanded", String(isOpen));
    }
    if (target.matches("[data-category]")) {
      currentCategory = target.dataset.category;
      $("#lessons").scrollIntoView({ behavior: "smooth" });
      renderLessons();
    }
    if (target.matches("[data-filter]")) {
      currentCategory = target.dataset.filter;
      renderLessons();
    }
    if (target.matches("[data-open-lesson]")) openLesson(target.dataset.openLesson);
    if (target.matches("[data-toggle-watched]")) toggleWatched(target.dataset.toggleWatched);
    if (target.matches("[data-article]")) openArticle(target.dataset.article);
    if (target.matches("[data-close-modal]")) closeModals();
    if (target.matches("[data-open-auth]")) showModal("#authModal");
    if (target.matches("[data-delete]")) deleteLesson(target.dataset.delete);
  });

  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  });
  $("#lessonSearch").addEventListener("input", renderLessons);
  $("#loginButton").addEventListener("click", login);
  $("#registerButton").addEventListener("click", register);
  $("#lessonForm").addEventListener("submit", addLesson);
  $("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem(storage.user);
    applyUserState();
    toast("Вы вышли из аккаунта");
  });
  $("#exportData").addEventListener("click", async () => {
    const payload = JSON.stringify(lessons, null, 2);
    await navigator.clipboard?.writeText(payload);
    toast("JSON скопирован");
  });
  $("#resetProgress").addEventListener("click", () => {
    watched = [];
    localStorage.setItem(storage.xp, "0");
    renderLessons();
    toast("Прогресс сброшен");
  });
  $("#startTimer").addEventListener("click", startTimer);
  $("#pauseTimer").addEventListener("click", pauseTimer);
  $("#resetTimer").addEventListener("click", resetTimer);
  $("#newIdea").addEventListener("click", newIdea);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModals();
  });
}

function init() {
  renderCategories();
  renderArticles();
  renderLessons();
  setupCanvas();
  updateTimer();
  applyUserState();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
