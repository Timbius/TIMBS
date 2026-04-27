const API_URL = "http://localhost:5000/api";

const state = {
  auth: {
    token: localStorage.getItem("token") || "",
    user: (() => {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    })(),
  },
  modal: {
    open: false,
    mode: "login",
    bookingContext: null,
  },
  catalog: {
    items: [],
    page: 1,
    limit: 6,
    total: 0,
    filters: {
      search: "",
      category: "",
      sort: "newest",
      minPrice: "",
      maxPrice: "",
    },
  },
  favorites: new Set(),
  cache: {
    services: new Map(),
    barbers: new Map(),
  },
};

const getApp = () => document.getElementById("app");
const getNav = () => document.getElementById("nav");
const isAuth = () => Boolean(state.auth.token);
const isAdmin = () => Boolean(state.auth.user && state.auth.user.role === "admin");
const getPath = () => {
  const p = window.location.pathname.replace(/\/+$/, "");
  return p || "/";
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (v) => `${new Intl.NumberFormat("be-BY").format(Number(v) || 0)} BYN`;

const setSession = (data) => {
  state.auth.token = data.token;
  state.auth.user = data.user;
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
};

const clearSession = () => {
  state.auth.token = "";
  state.auth.user = null;
  state.favorites = new Set();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const setMessage = (el, type, text) => {
  el.className = `msg ${type}`;
  el.textContent = text;
};

const toUrl = (href) => {
  const p = href.replace(/\/+$/, "") || "/";
  if (window.location.pathname !== p) {
    history.pushState({}, "", p);
  }
  renderRoute();
};

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (isAuth()) headers.Authorization = `Bearer ${state.auth.token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data && data.message) ||
      (data && data.errors && data.errors[0] && data.errors[0].msg) ||
      "Не удалось выполнить запрос";
    throw new Error(message);
  }

  return data;
}

function renderLoading(text = "Загрузка...") {
  return `<div class="loading"><div class="spinner"></div><span>${esc(text)}</span></div>`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function ensureModalRoot() {
  let root = document.getElementById("modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
  }
  return root;
}

function openAuthModal(mode = "login", bookingContext = null) {
  state.modal.open = true;
  state.modal.mode = mode;
  state.modal.bookingContext = bookingContext;
  renderAuthModal();
}

function closeAuthModal() {
  state.modal.open = false;
  state.modal.bookingContext = null;
  renderAuthModal();
}

function switchAuthMode(mode) {
  state.modal.mode = mode;
  renderAuthModal();
}

async function hydrateAuthUser() {
  if (!isAuth()) return;
  try {
    const me = await api("/auth/me");
    state.auth.user = me;
    localStorage.setItem("user", JSON.stringify(me));
    const favoriteIds = await api("/favorites/my/ids");
    state.favorites = new Set(favoriteIds);
  } catch {
    clearSession();
  }
}

async function toggleFavorite(serviceId) {
  if (!isAuth()) {
    openAuthModal("login", "избранное");
    return;
  }
  const res = await api(`/favorites/services/${serviceId}/toggle`, { method: "POST" });
  if (res.favorited) state.favorites.add(Number(serviceId));
  else state.favorites.delete(Number(serviceId));
}

function updateNav() {
  const nav = getNav();
  const active = getPath();

  const publicLinks = `
    <a href="/catalog" data-link class="nav-link ${active.startsWith("/catalog") ? "active" : ""}">Каталог</a>
    <a href="/barbers" data-link class="nav-link ${active.startsWith("/barbers") ? "active" : ""}">Мастера</a>
  `;

  if (!isAuth()) {
    nav.innerHTML = `
      ${publicLinks}
      <button type="button" class="btn-link primary nav-main" id="openLoginNav">Вход</button>
    `;
    document.getElementById("openLoginNav").addEventListener("click", () => openAuthModal("login"));
    return;
  }

  nav.innerHTML = `
    ${publicLinks}
    <a href="/records" data-link class="nav-link ${active.startsWith("/records") ? "active" : ""}">Записи</a>
    <a href="/profile" data-link class="btn-link primary nav-main">${esc(state.auth.user?.name || "Профиль")}</a>
    ${isAdmin() ? `<a href="/admin" data-link class="nav-link ${active.startsWith("/admin") ? "active" : ""}">Админ</a>` : ""}
    <button type="button" class="btn-link ghost" id="logoutNav">Выйти</button>
  `;

  document.getElementById("logoutNav").addEventListener("click", () => {
    clearSession();
    updateNav();
    toUrl("/");
  });
}

function afterAuthSuccess() {
  const pending = state.modal.bookingContext;
  closeAuthModal();
  updateNav();
  if (pending) alert(`Сценарий "${pending}" теперь доступен.`);
  renderRoute();
}

function renderAuthModal() {
  const root = ensureModalRoot();
  if (!state.modal.open) {
    root.innerHTML = "";
    return;
  }

  const isLogin = state.modal.mode === "login";
  const title = isLogin ? "Вход" : "Регистрация";

  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}" onclick="event.stopPropagation()">
        <button class="modal-close" type="button" data-close-modal aria-label="Закрыть">×</button>
        <div class="modal-head">
          <span class="eyebrow">Barber Factory</span>
          <h2>${title}</h2>
          <p class="sub">${isLogin ? "Введите почту и пароль." : "Создайте аккаунт для онлайн-записи."}</p>
        </div>

        <form class="form" id="authModalForm">
          ${
            isLogin
              ? ""
              : `
            <div class="form-group">
              <label for="modalName">Имя</label>
              <input id="modalName" class="field" type="text" minlength="2" required />
            </div>`
          }
          <div class="form-group">
            <label for="modalEmail">Email</label>
            <input id="modalEmail" class="field" type="email" required />
          </div>
          <div class="form-group">
            <label for="modalPassword">Пароль</label>
            <div style="display:flex; gap:8px; align-items:center;">
              <input id="modalPassword" class="field" type="password" minlength="6" required />
              <button
                type="button"
                class="btn-link ghost"
                data-toggle-password="modalPassword"
                aria-label="Показать пароль"
                title="Показать пароль"
                style="min-height:44px; min-width:44px; padding:0 10px;"
              >рџ‘Ѓ</button>
            </div>
          </div>
          ${
            isLogin
              ? ""
              : `
            <div class="form-group">
              <label for="modalPasswordConfirm">Повторите пароль</label>
              <div style="display:flex; gap:8px; align-items:center;">
                <input id="modalPasswordConfirm" class="field" type="password" minlength="6" required />
                <button
                  type="button"
                  class="btn-link ghost"
                  data-toggle-password="modalPasswordConfirm"
                  aria-label="Показать пароль"
                  title="Показать пароль"
                  style="min-height:44px; min-width:44px; padding:0 10px;"
                >рџ‘Ѓ</button>
              </div>
            </div>`
          }
          <button class="btn primary" type="submit">${isLogin ? "Войти" : "Зарегистрироваться"}</button>
          <div id="authModalMessage" aria-live="polite"></div>
        </form>

        <p class="auth-switch">
          ${
            isLogin
              ? `Нет аккаунта? <button type="button" class="text-btn" data-switch-auth="register">Зарегистрироваться</button>`
              : `Уже есть аккаунт? <button type="button" class="text-btn" data-switch-auth="login">Войти</button>`
          }
        </p>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", closeAuthModal));
  root.querySelectorAll("[data-switch-auth]").forEach((el) =>
    el.addEventListener("click", () => switchAuthMode(el.dataset.switchAuth))
  );
  root.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
      button.setAttribute("title", show ? "Скрыть пароль" : "Показать пароль");
    });
  });

  document.getElementById("authModalForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const out = document.getElementById("authModalMessage");
    try {
      const email = document.getElementById("modalEmail").value.trim();
      const password = document.getElementById("modalPassword").value;
      const name = isLogin ? null : document.getElementById("modalName").value.trim();

      if (!email.includes("@")) {
        setMessage(out, "error", "Проверьте email");
        return;
      }
      if (password.length < 6) {
        setMessage(out, "error", "Минимум 6 символов в пароле");
        return;
      }
      if (!/\p{L}/u.test(password)) {
        setMessage(out, "error", "Пароль должен содержать хотя бы одну букву");
        return;
      }
      if (!isLogin) {
        const confirm = document.getElementById("modalPasswordConfirm").value;
        if (confirm !== password) {
          setMessage(out, "error", "Пароли не совпадают");
          return;
        }
      }

      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email, password }
        : { name, email, password, passwordConfirm: document.getElementById("modalPasswordConfirm").value };
      const data = await api(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setSession(data);
      await hydrateAuthUser();
      setMessage(out, "success", isLogin ? "Вход выполнен" : "Регистрация выполнена");
      setTimeout(afterAuthSuccess, 300);
    } catch (error) {
      setMessage(out, "error", error.message);
    }
  });
}

function favoriteButton(item) {
  const isFav = state.favorites.has(Number(item.id));
  return `<button class="btn-link ghost fav-btn" type="button" data-fav-id="${item.id}">${isFav ? "★ В избранном" : "☆ В избранное"}</button>`;
}

function serviceCard(item, admin = false) {
  const imagePart = item.imageUrl
    ? `<div class="service-image" style="background-image:url('${esc(item.imageUrl)}')"></div>`
    : `<div class="service-image service-image-empty">Нет фото</div>`;

  return `
    <article class="service-card reveal">
      ${imagePart}
      <div class="meta">
        <span class="pill">${esc(item.category || "Услуга")}</span>
        ${item.isPopular ? `<span class="pill">Популярно</span>` : ""}
      </div>
      <h3>${esc(item.title)}</h3>
      <p class="sub">${esc(item.description || "Профессиональный уход и аккуратный результат.")}</p>
      <div class="price">${money(item.price)}</div>
      <div class="service-actions">
        <button class="btn primary" type="button" data-enroll-id="${item.id}" data-enroll-title="${esc(item.title)}">Записаться</button>
        <a href="/catalog/${item.id}" class="btn-link secondary" data-link>Подробнее</a>
        ${favoriteButton(item)}
        ${admin ? `<button class="btn danger" type="button" data-delete-id="${item.id}">Удалить</button>` : ""}
      </div>
    </article>
  `;
}

function barberCard(item) {
  return `
    <article class="service-card reveal">
      <div class="meta">
        <span class="pill">${esc(item.specialty || "Мастер")}</span>
        <span class="pill">Рейтинг ${Number(item.rating || 0).toFixed(1)}</span>
      </div>
      <h3>${esc(item.name)}</h3>
      <p class="sub">${esc(item.bio || "Опытный мастер Barber Factory")}</p>
      <div class="price">Стаж: ${Number(item.experienceYears || 0)} лет</div>
      <div class="service-actions">
        <a href="/barbers/${item.id}" class="btn-link secondary" data-link>Профиль мастера</a>
      </div>
    </article>
  `;
}

function barberShowcaseCard(item) {
  return `
    <article class="barber-showcase reveal">
      <div class="barber-showcase-inner">
        <div class="barber-avatar-ring">
          ${
            item.imageUrl
              ? `<img class="barber-avatar-img" src="${esc(item.imageUrl)}" alt="${esc(item.name)}" />`
              : `<div class="barber-avatar-placeholder">${esc((item.name || "M").slice(0, 1).toUpperCase())}</div>`
          }
        </div>
        <h3 class="barber-showcase-name">${esc(item.name)}</h3>
        <a href="/barbers/${item.id}" data-link class="btn-link secondary">Профиль мастера</a>
      </div>
    </article>
  `;
}

function bindEnrollButtons() {
  document.querySelectorAll("[data-enroll-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!isAuth()) {
        openAuthModal("login", button.dataset.enrollTitle || "услугу");
        return;
      }
      toUrl("/records");
    });
  });
}

function bindFavoriteButtons() {
  document.querySelectorAll("[data-fav-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await toggleFavorite(button.dataset.favId);
        renderRoute();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function renderHome() {
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем главную...");

  try {
    const [popularRes, barbersRes] = await Promise.allSettled([api("/services/popular"), api("/barbers?top=true")]);
    const popularServices = popularRes.status === "fulfilled" ? popularRes.value : [];
    const topBarbers = barbersRes.status === "fulfilled" ? barbersRes.value : [];

    app.innerHTML = `
      <section class="hero-main">
        <div class="hero-center">
          <h1 class="brand-title-xl">BARBER FACTORY</h1>
          <p class="hero-slogan">Стиль, который говорит за вас</p>
          <p class="hero-description">Премиальный барбершоп с удобной онлайн-записью и личным кабинетом.</p>
          <button class="btn primary hero-cta" type="button" id="heroEnrollBtn">Записаться</button>
        </div>
      </section>

      <section class="home-preview">
        <div class="section-head">
          <div>
            <span class="eyebrow">Популярные услуги</span>
            <h2>Выберите формат ухода</h2>
          </div>
          <a href="/catalog" data-link class="btn-link secondary">Открыть каталог</a>
        </div>
        <div class="services">${popularServices.length ? popularServices.map((item) => serviceCard(item)).join("") : `<div class="empty"><h3>Услуги временно недоступны</h3></div>`}</div>
      </section>

      <section class="home-preview">
        <div class="section-head">
          <div>
            <span class="eyebrow">Топ мастера</span>
            <h2>Команда Barber Factory</h2>
          </div>
          <a href="/barbers" data-link class="btn-link secondary">Все мастера</a>
        </div>
        <div class="services">${topBarbers.length ? topBarbers.map((item) => barberCard(item)).join("") : `<div class="empty"><h3>Список мастеров временно недоступен</h3></div>`}</div>
      </section>
    `;

    document.getElementById("heroEnrollBtn").addEventListener("click", () => {
      if (!isAuth()) {
        openAuthModal("login", "онлайн-запись");
        return;
      }
      toUrl("/records");
    });

    bindEnrollButtons();
    bindFavoriteButtons();
  } catch (error) {
    app.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

function catalogQueryString() {
  const params = new URLSearchParams();
  const f = state.catalog.filters;
  if (f.search) params.set("search", f.search);
  if (f.category) params.set("category", f.category);
  if (f.sort) params.set("sort", f.sort);
  if (f.minPrice) params.set("minPrice", f.minPrice);
  if (f.maxPrice) params.set("maxPrice", f.maxPrice);
  params.set("page", String(state.catalog.page));
  params.set("limit", String(state.catalog.limit));
  return params.toString();
}

function uniqueCategories(items) {
  return [...new Set(items.map((item) => item.category).filter(Boolean))].sort();
}

function renderBarberOptions(barbers, selectedIds = []) {
  const selected = new Set((selectedIds || []).map((id) => Number(id)));
  return barbers
    .map(
      (b) => `
      <label class="pill" style="display:flex; gap:8px; align-items:center;">
        <input type="checkbox" data-barber-link value="${b.id}" ${selected.has(Number(b.id)) ? "checked" : ""} />
        ${esc(b.name)} (${esc(b.specialty || "Мастер")})
      </label>
    `
    )
    .join("");
}

async function loadCatalog({ reset = false } = {}) {
  if (reset) {
    state.catalog.page = 1;
    state.catalog.items = [];
  }

  const data = await api(`/services?${catalogQueryString()}`);
  state.catalog.total = data.total || 0;
  if (reset) state.catalog.items = data.items || [];
  else state.catalog.items = [...state.catalog.items, ...(data.items || [])];
  (data.items || []).forEach((item) => state.cache.services.set(String(item.id), item));
  return data;
}

async function renderCatalog() {
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем каталог...");

  try {
    await loadCatalog({ reset: true });

    const categoryOptions = uniqueCategories(state.catalog.items)
      .map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`)
      .join("");

    app.innerHTML = `
      <section class="catalog-topbar reveal">
        <h1 class="catalog-logo">BARBER FACTORY</h1>
        <p class="sub catalog-sub">Каталог услуг</p>

        <form id="catalogFilterForm" class="toolbar catalog-toolbar catalog-grid-5">
          <input class="field" id="searchInput" type="search" placeholder="Поиск услуги" value="${esc(state.catalog.filters.search)}" />
          <select class="select" id="categorySelect">
            <option value="">Все категории</option>
            ${categoryOptions}
          </select>
          <input class="field" id="minPriceInput" type="number" min="0" placeholder="Цена от" value="${esc(state.catalog.filters.minPrice)}" />
          <input class="field" id="maxPriceInput" type="number" min="0" placeholder="Цена до" value="${esc(state.catalog.filters.maxPrice)}" />
          <select class="select" id="sortSelect">
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="title_asc">По названию А-Я</option>
          </select>
          <button class="btn secondary" type="submit">Найти</button>
        </form>

        <div class="summary catalog-summary">
          <span id="catalogSummary">Найдено услуг: ${state.catalog.items.length} из ${state.catalog.total}</span>
          <div class="catalog-summary-actions">
            ${isAdmin() ? `<a href="/admin" data-link class="btn-link secondary">Панель администратора</a>` : ""}
            ${isAuth() ? `<a href="/records" data-link class="btn-link secondary">Мои записи</a>` : ""}
          </div>
        </div>
      </section>

      <section class="catalog-list-wrap">
        <div id="servicesList" class="services services-vertical">${state.catalog.items.map((item) => serviceCard(item, isAdmin())).join("")}</div>
        <div class="btn-row center-row">
          <button class="btn secondary" id="loadMoreBtn" ${state.catalog.items.length >= state.catalog.total ? "disabled" : ""}>Загрузить еще</button>
        </div>
      </section>
    `;

    document.getElementById("categorySelect").value = state.catalog.filters.category;
    document.getElementById("sortSelect").value = state.catalog.filters.sort;

    document.getElementById("catalogFilterForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      state.catalog.filters.search = document.getElementById("searchInput").value.trim();
      state.catalog.filters.category = document.getElementById("categorySelect").value;
      state.catalog.filters.sort = document.getElementById("sortSelect").value;
      state.catalog.filters.minPrice = document.getElementById("minPriceInput").value;
      state.catalog.filters.maxPrice = document.getElementById("maxPriceInput").value;
      await renderCatalog();
    });

    document.getElementById("loadMoreBtn").addEventListener("click", async () => {
      try {
        state.catalog.page += 1;
        const next = await loadCatalog({ reset: false });
        document.getElementById("servicesList").innerHTML = state.catalog.items
          .map((item) => serviceCard(item, isAdmin()))
          .join("");
        document.getElementById("catalogSummary").textContent = `Найдено услуг: ${state.catalog.items.length} из ${state.catalog.total}`;
        const btn = document.getElementById("loadMoreBtn");
        if (state.catalog.items.length >= state.catalog.total || !next.items.length) btn.disabled = true;
        bindEnrollButtons();
        bindFavoriteButtons();
        bindDeleteButtons();
      } catch (error) {
        alert(error.message);
      }
    });

    bindEnrollButtons();
    bindFavoriteButtons();
    bindDeleteButtons();
  } catch (error) {
    app.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

function bindDeleteButtons() {
  if (!isAdmin()) return;

  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await api(`/services/${button.dataset.deleteId}`, { method: "DELETE" });
        await renderCatalog();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function renderService(id) {
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем услугу...");
  try {
    const item = await api(`/services/${id}`);
    const imageBlock = item.imageUrl
      ? `<img class="service-detail-image" src="${esc(item.imageUrl)}" alt="${esc(item.title)}" />`
      : `<div class="service-detail-image service-detail-image-empty">${esc((item.title || "У").slice(0, 1).toUpperCase())}</div>`;

    app.innerHTML = `
      <section class="detail-wrap card panel reveal service-detail-card">
        <a href="/catalog" data-link class="back">← Назад в каталог</a>
        ${imageBlock}
        <span class="eyebrow">${esc(item.category || "Услуга")}</span>
        <h1>${esc(item.title)}</h1>
        <p class="sub service-detail-description">${esc(item.description || "Описание услуги пока не заполнено.")}</p>
        <div class="service-detail-stats">
          <span class="pill">Цена: ${money(item.price)}</span>
          <span class="pill">Длительность: ${Number(item.durationMin || 60)} минут</span>
        </div>
        <div class="btn-row">
          <button class="btn primary" type="button" data-enroll-id="${item.id}" data-enroll-title="${esc(item.title)}">Записаться</button>
          ${favoriteButton(item)}
        </div>
      </section>

      <section class="home-preview">
        <div class="section-head"><div><span class="eyebrow">Рекомендуемые мастера</span><h2>Кто выполняет услугу</h2></div></div>
        <div class="services">${(item.barbers || []).length ? item.barbers.map((b) => barberCard(b)).join("") : `<div class="empty"><h3>Пока нет привязанных мастеров</h3></div>`}</div>
      </section>
    `;
    bindEnrollButtons();
    bindFavoriteButtons();
  } catch {
    renderNotFound("Не удалось найти услугу.");
  }
}

async function renderBarbers() {
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем мастеров...");
  const params = new URLSearchParams(window.location.search);
  const search = params.get("q") || "";

  try {
    const barbers = await api(`/barbers?search=${encodeURIComponent(search)}&sort=rating_desc`);
    app.innerHTML = `
      <section class="catalog-topbar reveal">
        <h1 class="catalog-logo">Наши мастера</h1>
        <form id="barbersSearchForm" class="toolbar catalog-toolbar">
          <input class="field" id="barbersSearchInput" type="search" placeholder="Поиск по имени или специализации" value="${esc(search)}" />
          <button class="btn secondary" type="submit">Найти</button>
        </form>
      </section>
      <section class="catalog-list-wrap">
        <div class="barbers-grid">${barbers.length ? barbers.map((b) => barberShowcaseCard(b)).join("") : `<div class="empty"><h3>Мастера не найдены</h3></div>`}</div>
      </section>
    `;    document.getElementById("barbersSearchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = document.getElementById("barbersSearchInput").value.trim();
      history.replaceState({}, "", q ? `/barbers?q=${encodeURIComponent(q)}` : "/barbers");
      renderBarbers();
    });
  } catch (error) {
    app.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

async function renderBarberDetail(id) {
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем профиль мастера...");
  try {
    const [barber, services, reviews] = await Promise.all([
      api(`/barbers/${id}`),
      api(`/barbers/${id}/services`),
      api(`/barbers/${id}/reviews`),
    ]);

    const imageBlock = barber.imageUrl
      ? `<img class="barber-detail-image" src="${esc(barber.imageUrl)}" alt="${esc(barber.name)}" />`
      : `<div class="barber-detail-image barber-detail-image-empty">${esc((barber.name || "M").slice(0, 1).toUpperCase())}</div>`;

    app.innerHTML = `
      <section class="detail-wrap card panel reveal barber-detail-card">
        <a href="/barbers" data-link class="back">< Назад к мастерам</a>
        ${imageBlock}
        <span class="eyebrow">${esc(barber.specialty || "Мастер")}</span>
        <h1>${esc(barber.name)}</h1>
        <p class="sub barber-detail-bio">${esc(barber.bio || "Профессиональный мастер Barber Factory.")}</p>
        <div class="barber-detail-stats">
          <span class="pill">Рейтинг: ${Number(barber.rating || 0).toFixed(1)}</span>
          <span class="pill">Стаж: ${Number(barber.experienceYears || 0)} лет</span>
        </div>
      </section>

      <section class="home-preview">
        <div class="section-head"><h2>Услуги мастера</h2></div>
        <div class="services">${services.length ? services.map((s) => serviceCard(s)).join("") : `<div class="empty"><h3>Услуги не назначены</h3></div>`}</div>
      </section>

      <section class="home-preview">
        <div class="section-head"><h2>Отзывы клиентов</h2></div>
        <div class="services services-vertical">${reviews.length ? reviews.map((r) => `<article class="service-card"><h3>${esc(r.authorName)} · ${r.rating === null || r.rating === undefined ? "без оценки" : Number(r.rating).toFixed(1)}</h3><p class="sub">${esc(r.text || "Без текста")}</p></article>`).join("") : `<div class="empty"><h3>Пока нет отзывов</h3></div>`}</div>
      </section>
    `;

    bindEnrollButtons();
    bindFavoriteButtons();
  } catch {
    renderNotFound("Мастер не найден");
  }
}

async function renderSearchPage() {
  const app = getApp();
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("q") || "").trim();

  app.innerHTML = `
    <section class="catalog-topbar reveal">
      <h1 class="catalog-logo">Поиск</h1>
      <form id="globalSearchForm" class="toolbar catalog-toolbar">
        <input class="field" id="globalSearchInput" type="search" placeholder="Введите минимум 2 символа" value="${esc(q)}" />
        <button class="btn secondary" type="submit">Найти</button>
      </form>
      <div id="searchResults">${q.length >= 2 ? renderLoading("Ищем...") : `<div class="empty"><h3>Введите запрос</h3></div>`}</div>
    </section>
  `;

  document.getElementById("globalSearchForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = document.getElementById("globalSearchInput").value.trim();
    history.replaceState({}, "", value ? `/search?q=${encodeURIComponent(value)}` : "/search");
    await renderSearchPage();
  });

  if (q.length < 2) return;

  try {
    const result = await api(`/search?q=${encodeURIComponent(q)}`);
    document.getElementById("searchResults").innerHTML = `
      <section class="home-preview">
        <div class="section-head"><h2>Услуги (${result.services.length})</h2></div>
        <div class="services">${result.services.length ? result.services.map((s) => serviceCard(s)).join("") : `<div class="empty"><h3>Ничего не найдено</h3></div>`}</div>
      </section>
      <section class="home-preview">
        <div class="section-head"><h2>Мастера (${result.barbers.length})</h2></div>
        <div class="services">${result.barbers.length ? result.barbers.map((b) => barberCard(b)).join("") : `<div class="empty"><h3>Ничего не найдено</h3></div>`}</div>
      </section>
    `;
    bindEnrollButtons();
    bindFavoriteButtons();
  } catch (error) {
    document.getElementById("searchResults").innerHTML = `<div class="empty"><h3>Ошибка поиска</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

async function renderProfile() {
  if (!isAuth()) {
    toUrl("/auth/login");
    return;
  }
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем профиль...");

  try {
    const [me, myRecords, myFavorites, myReviews] = await Promise.all([
      api("/users/me"),
      api("/records/my"),
      api("/favorites/my"),
      api("/reviews/my")
    ]);

    app.innerHTML = `
      <section class="profile-wrap card panel reveal">
        <span class="eyebrow">Профиль</span>
        <h1>Личный кабинет</h1>
        <p class="sub">Управление вашими данными и активностью.</p>
        <div class="profile-avatar-wrap">
          <img class="profile-avatar" id="profileAvatarPreview" src="${esc(
            me.avatarUrl || "https://placehold.co/160x160?text=Avatar"
          )}" alt="Аватар пользователя" />
        </div>
        <form class="form" id="profileForm">
          <div class="toolbar catalog-toolbar">
            <input class="field" id="profileName" type="text" minlength="2" required value="${esc(me.name)}" />
            <input class="field" id="profileEmail" type="email" required value="${esc(me.email)}" />
            <button class="btn primary" type="submit">Сохранить профиль</button>
          </div>
          <div class="form-group">
            <label for="profileAvatarFile">Фото профиля (JPG/PNG, до 2MB)</label>
            <input class="field" id="profileAvatarFile" type="file" accept="image/png,image/jpeg,image/webp" />
          </div>
          <div id="profileMessage" aria-live="polite"></div>
        </form>
        <div class="summary"><span>Роль: ${esc(me.role)}</span><a href="/records" data-link class="btn-link secondary">Перейти к записям</a></div>
      </section>

      <details class="home-preview" open>
        <summary class="section-head"><h2>Избранные услуги (${myFavorites.length})</h2></summary>
        <div class="services">${myFavorites.length ? myFavorites.map((item) => serviceCard(item)).join("") : `<div class="empty"><h3>Избранного пока нет</h3></div>`}</div>
      </details>

      <details class="home-preview">
        <summary class="section-head"><h2>Последние записи (${myRecords.length})</h2></summary>
        <div class="services services-vertical">${myRecords.length ? myRecords.slice(0, 5).map((r) => `<article class="service-card"><h3>${esc(r.serviceTitle)} · ${esc(r.barberName)}</h3><p class="sub">${new Date(r.appointmentAt).toLocaleString("ru-RU")} · Статус: ${esc(r.status)}</p></article>`).join("") : `<div class="empty"><h3>Записей пока нет</h3></div>`}</div>
      </details>

      <details class="home-preview">
        <summary class="section-head"><h2>Мои отзывы (${myReviews.length})</h2></summary>
        <div class="services services-vertical" id="profileReviewsList">
          ${
            myReviews.length
              ? myReviews
                  .map(
                    (rv) => `<article class="service-card">
                      <h3>${esc(rv.barberName || "Мастер")} · ${esc(rv.serviceTitle || "Услуга")}</h3>
                      <p class="sub">Оценка: ${rv.rating ?? "—"} · ${new Date(rv.createdAt).toLocaleString("ru-RU")}</p>
                      <p class="sub">${esc(rv.text || "Без текста")}</p>
                      <form class="form" data-edit-review="${rv.id}">
                        <div class="toolbar catalog-toolbar catalog-grid-4">
                          <input class="field" type="number" min="1" max="5" step="1" placeholder="Оценка 1..5 (необязательно)" data-review-rating value="${rv.rating ?? ""}" />
                          <input class="field" type="text" placeholder="Текст отзыва (необязательно)" data-review-text value="${esc(rv.text || "")}" />
                          <button class="btn secondary" type="submit">Сохранить</button>
                          <button class="btn danger" type="button" data-delete-review="${rv.id}">Удалить</button>
                        </div>
                        <div data-review-edit-message="${rv.id}" aria-live="polite"></div>
                      </form>
                    </article>`
                  )
                  .join("")
              : `<div class="empty"><h3>Вы еще не оставляли отзывов</h3></div>`
          }
        </div>
      </details>
    `;

    document.getElementById("profileForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const out = document.getElementById("profileMessage");
      const name = document.getElementById("profileName").value.trim();
      const email = document.getElementById("profileEmail").value.trim();
      const avatarInput = document.getElementById("profileAvatarFile");

      if (name.length < 2) {
        setMessage(out, "error", "Имя слишком короткое");
        return;
      }
      if (!email.includes("@")) {
        setMessage(out, "error", "Некорректный email");
        return;
      }

      try {
        let avatarUrl = me.avatarUrl || null;
        const file = avatarInput.files && avatarInput.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            setMessage(out, "error", "Файл слишком большой. Максимум 2MB");
            return;
          }
          avatarUrl = await fileToDataUrl(file);
        }

        const user = await api("/users/me", {
          method: "PUT",
          body: JSON.stringify({ name, email, avatarUrl }),
        });
        state.auth.user = user;
        localStorage.setItem("user", JSON.stringify(user));
        updateNav();
        document.getElementById("profileAvatarPreview").src =
          user.avatarUrl || "https://placehold.co/160x160?text=Avatar";
        setMessage(out, "success", "Профиль обновлен");
      } catch (error) {
        setMessage(out, "error", error.message);
      }
    });

    document.querySelectorAll("[data-edit-review]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = form.dataset.editReview;
        const ratingInput = form.querySelector("[data-review-rating]");
        const textInput = form.querySelector("[data-review-text]");
        const out = form.querySelector(`[data-review-edit-message="${id}"]`);

        const ratingRaw = ratingInput.value.trim();
        const rating = ratingRaw === "" ? null : Number(ratingRaw);
        const text = textInput.value;

        if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
          setMessage(out, "error", "Оценка должна быть от 1 до 5");
          return;
        }

        try {
          await api(`/reviews/${id}`, {
            method: "PUT",
            body: JSON.stringify({ rating, text })
          });
          setMessage(out, "success", "Отзыв обновлен");
          setTimeout(renderProfile, 250);
        } catch (error) {
          setMessage(out, "error", error.message);
        }
      });
    });

    document.querySelectorAll("[data-delete-review]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/reviews/${btn.dataset.deleteReview}`, { method: "DELETE" });
          await renderProfile();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    bindEnrollButtons();
    bindFavoriteButtons();
  } catch (error) {
    clearSession();
    updateNav();
    app.innerHTML = `<div class="empty"><h3>Сессия истекла</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

function toDatetimeLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

async function renderRecords() {
  if (!isAuth()) {
    toUrl("/auth/login");
    return;
  }
  const app = getApp();
  app.innerHTML = renderLoading("Загружаем раздел записей...");

  try {
    const [servicesPage, barbers, myRecords] = await Promise.all([
      api("/services?page=1&limit=100&sort=title_asc"),
      api("/barbers?sort=rating_desc"),
      api("/records/my"),
    ]);
    const services = servicesPage.items || [];

    app.innerHTML = `
      <section class="profile-wrap card panel reveal">
        <span class="eyebrow">Онлайн-запись</span>
        <h1>Создать запись</h1>
        <form class="form" id="recordForm">
          <div class="toolbar catalog-toolbar catalog-grid-4">
            <select class="select" id="recordService" required>
              <option value="">Выберите услугу</option>
              ${services.map((s) => `<option value="${s.id}">${esc(s.title)} · ${money(s.price)}</option>`).join("")}
            </select>
            <select class="select" id="recordBarber" required>
              <option value="">Выберите мастера</option>
              ${barbers.map((b) => `<option value="${b.id}">${esc(b.name)} (${esc(b.specialty || "мастер")})</option>`).join("")}
            </select>
            <input class="field" id="recordDateTime" type="datetime-local" required min="${toDatetimeLocal(Date.now() + 30 * 60 * 1000)}" />
            <button class="btn primary" type="submit">Подтвердить</button>
          </div>
          <div class="form-group">
            <label for="recordComment">Комментарий</label>
            <textarea class="area" id="recordComment" placeholder="Пожелания к записи"></textarea>
          </div>
          <div id="recordMessage" aria-live="polite"></div>
          <div id="recordSchedule" class="schedule-list"></div>
        </form>
      </section>

      <section class="home-preview">
        <div class="section-head"><h2>Мои записи (${myRecords.length})</h2></div>
        <div class="services services-vertical">
          ${
            myRecords.length
              ? myRecords
                  .map(
                    (r) => `<article class="service-card">
                      <h3>${esc(r.serviceTitle)} · ${esc(r.barberName)}</h3>
                      <p class="sub">${new Date(r.appointmentAt).toLocaleString("ru-RU")} · Статус: ${esc(r.status)}</p>
                      ${
                        r.status === "active"
                          ? `<div class="btn-row">
                               <button class="btn secondary" type="button" data-complete-record="${r.id}">Посетил</button>
                               <button class="btn danger" type="button" data-cancel-record="${r.id}">Отменить</button>
                             </div>`
                          : ""
                      }
                      ${
                        r.status === "completed" && !r.reviewId
                          ? `<form class="form review-form" data-review-form="${r.id}">
                                <div class="toolbar catalog-toolbar catalog-grid-4">
                                  <label class="form-group">
                                    <span>Оценка (необязательно)</span>
                                    <select class="select" data-review-rating="${r.id}">
                                      <option value="">Без оценки</option>
                                      <option value="5">5</option>
                                      <option value="4">4</option>
                                      <option value="3">3</option>
                                      <option value="2">2</option>
                                      <option value="1">1</option>
                                    </select>
                                  </label>
                                  <input class="field" data-review-text="${r.id}" type="text" placeholder="Текст отзыва (необязательно)" />
                                  <button class="btn primary" type="submit">Оставить отзыв</button>
                                </div>
                                <div data-review-message="${r.id}" aria-live="polite"></div>
                              </form>`
                          : ""
                      }
                      ${r.reviewId ? `<p class="sub">Спасибо, отзыв уже оставлен.</p>` : ""}
                    </article>`
                  )
                  .join("")
              : `<div class="empty"><h3>Записей пока нет</h3></div>`
          }
        </div>
      </section>
    `;

    const refreshSchedule = async () => {
      const barberId = document.getElementById("recordBarber").value;
      const dateTime = document.getElementById("recordDateTime").value;
      const out = document.getElementById("recordSchedule");
      if (!barberId || !dateTime) {
        out.innerHTML = "";
        return;
      }
      const date = dateTime.slice(0, 10);
      try {
        const schedule = await api(`/records/schedule?barber=${barberId}&date=${date}`);
        out.innerHTML = `<p class="sub">Занятые слоты: ${schedule.length ? schedule.map((s) => new Date(s.appointmentAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })).join(", ") : "нет"}</p>`;
      } catch {
        out.innerHTML = `<p class="sub">Не удалось загрузить занятые слоты</p>`;
      }
    };

    document.getElementById("recordBarber").addEventListener("change", refreshSchedule);
    document.getElementById("recordDateTime").addEventListener("change", refreshSchedule);

    document.getElementById("recordForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const out = document.getElementById("recordMessage");
      const serviceId = Number(document.getElementById("recordService").value);
      const barberId = Number(document.getElementById("recordBarber").value);
      const appointmentAt = document.getElementById("recordDateTime").value;
      const comment = document.getElementById("recordComment").value.trim();

      if (!serviceId || !barberId) {
        setMessage(out, "error", "Выберите услугу и мастера");
        return;
      }
      if (!appointmentAt || Number(new Date(appointmentAt)) <= Date.now()) {
        setMessage(out, "error", "Выберите будущую дату и время");
        return;
      }

      try {
        await api("/records", { method: "POST", body: JSON.stringify({ serviceId, barberId, appointmentAt, comment }) });
        setMessage(out, "success", "Запись успешно создана");
        setTimeout(renderRecords, 300);
      } catch (error) {
        setMessage(out, "error", error.message);
      }
    });

    document.querySelectorAll("[data-cancel-record]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/records/${btn.dataset.cancelRecord}`, { method: "DELETE" });
          await renderRecords();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-complete-record]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api(`/records/${btn.dataset.completeRecord}/complete`, { method: "PATCH" });
          await renderRecords();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-review-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const recordId = form.dataset.reviewForm;
        const ratingRaw = document.querySelector(`[data-review-rating="${recordId}"]`).value;
        const rating = ratingRaw === "" ? null : Number(ratingRaw);
        const textInput = document.querySelector(`[data-review-text="${recordId}"]`);
        const text = textInput.value;
        const out = document.querySelector(`[data-review-message="${recordId}"]`);

        if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
          setMessage(out, "error", "Оценка должна быть от 1 до 5");
          return;
        }

        try {
          await api("/reviews", {
            method: "POST",
            body: JSON.stringify({ recordId: Number(recordId), rating, text })
          });
          setMessage(out, "success", "Спасибо за отзыв");
          setTimeout(renderRecords, 300);
        } catch (error) {
          setMessage(out, "error", error.message);
        }
      });
    });
  } catch (error) {
    app.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

async function renderAdmin() {
  if (!isAuth()) {
    toUrl("/auth/login");
    return;
  }
  if (!isAdmin()) {
    renderForbidden();
    return;
  }

  const app = getApp();
  app.innerHTML = renderLoading("Загружаем админ-панель...");
  try {
    const [users, records, barbers, servicesPage] = await Promise.all([
      api("/users"),
      api("/records"),
      api("/barbers?sort=newest"),
      api("/services?page=1&limit=100&sort=title_asc"),
    ]);
    const services = servicesPage.items || [];
    const serviceBarberMap = {};
    await Promise.all(
      services.map(async (s) => {
        try {
          const detail = await api(`/services/${s.id}`);
          serviceBarberMap[s.id] = (detail.barbers || []).map((b) => Number(b.id));
        } catch {
          serviceBarberMap[s.id] = [];
        }
      })
    );

    const renderServiceBrief = (s) => `
      <article class="service-card">
        <h3>${esc(s.title)} · ${money(s.price)}</h3>
        <p class="sub">${esc(s.category || "Без категории")} · ${Number(s.durationMin || 60)} мин</p>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-open-edit-service="${s.id}">Редактировать</button>
          <button class="btn danger" type="button" data-delete-service="${s.id}">Удалить</button>
        </div>
      </article>
    `;

    const renderBarberBrief = (b) => `
      <article class="service-card">
        <h3>${esc(b.name)}</h3>
        <p class="sub">${esc(b.specialty || "Без специализации")} · стаж ${Number(b.experienceYears || 0)} лет</p>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-open-edit-barber="${b.id}">Редактировать</button>
          <button class="btn danger" type="button" data-delete-barber="${b.id}">Удалить</button>
        </div>
      </article>
    `;

    const renderRecordBrief = (r) => `
      <article class="service-card">
        <h3>Запись #${r.id} · ${esc(r.serviceTitle)} · ${esc(r.barberName)}</h3>
        <p class="sub">${esc(r.userName)} (${esc(r.userEmail)}) · ${esc(r.status)} · ${new Date(r.appointmentAt).toLocaleString("ru-RU")}</p>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-open-edit-record="${r.id}">Редактировать</button>
          <button class="btn danger" type="button" data-delete-record="${r.id}">Удалить</button>
        </div>
      </article>
    `;

    app.innerHTML = `
      <section class="profile-wrap card panel reveal">
        <span class="eyebrow">Админ</span>
        <h1>Панель управления</h1>
        <div class="btn-row">
          <button class="btn primary" type="button" id="openCreateBarberModal">Добавить мастера</button>
          <button class="btn primary" type="button" id="openCreateServiceModal">Добавить услугу</button>
        </div>
      </section>

      <details class="home-preview" open>
        <summary class="section-head"><h2>Пользователи (${users.length})</h2></summary>
        <div class="services services-vertical">${users.map((u) => `<article class="service-card"><h3>${esc(u.name)}</h3><p class="sub">${esc(u.email)} · ${esc(u.role)}</p>${u.id !== state.auth.user.id ? `<div class="btn-row"><button class="btn danger" type="button" data-delete-user="${u.id}">Удалить пользователя</button></div>` : ""}</article>`).join("")}</div>
      </details>

      <details class="home-preview" open>
        <summary class="section-head"><h2>Записи (${records.length})</h2></summary>
        <div class="services services-vertical">${records.map((r) => renderRecordBrief(r)).join("")}</div>
      </details>

      <details class="home-preview" open>
        <summary class="section-head"><h2>Услуги (${services.length})</h2></summary>
        <div class="services services-vertical">${services.map((s) => renderServiceBrief(s)).join("")}</div>
      </details>

      <details class="home-preview" open>
        <summary class="section-head"><h2>Мастера (${barbers.length})</h2></summary>
        <div class="services services-vertical">${barbers.map((b) => renderBarberBrief(b)).join("")}</div>
      </details>
      <div id="adminModalHost"></div>
    `;

    const modalHost = document.getElementById("adminModalHost");
    const closeModal = () => {
      modalHost.innerHTML = "";
    };
    const openModal = ({ title, body, onSubmit, submitText = "Сохранить" }) => {
      modalHost.innerHTML = `
        <div class="modal-backdrop" data-close-admin-modal>
          <div class="modal-card" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
            <button class="modal-close" type="button" data-close-admin-modal aria-label="Закрыть">×</button>
            <div class="modal-head"><h2>${esc(title)}</h2></div>
            <form id="adminModalForm" class="form">
              ${body}
              <div class="btn-row">
                <button class="btn primary" type="submit">${esc(submitText)}</button>
              </div>
              <div id="adminModalMessage" aria-live="polite"></div>
            </form>
          </div>
        </div>
      `;
      modalHost.querySelectorAll("[data-close-admin-modal]").forEach((el) => el.addEventListener("click", closeModal));
      document.getElementById("adminModalForm").addEventListener("submit", onSubmit);
    };

    document.getElementById("openCreateBarberModal").addEventListener("click", () => {
      openModal({
        title: "Добавить мастера",
        body: `
          <div class="toolbar catalog-toolbar catalog-grid-4">
            <input class="field" id="modalBarberName" type="text" placeholder="Имя мастера" required />
            <input class="field" id="modalBarberSpecialty" type="text" placeholder="Полная специализация" />
            <input class="field" id="modalBarberExperience" type="number" min="0" placeholder="Стаж (лет)" />
            <input class="field" id="modalBarberImageUrl" type="url" placeholder="Ссылка на фото" />
            <input class="field" id="modalBarberImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
            <textarea class="area" id="modalBarberBio" placeholder="Описание мастера"></textarea>
          </div>
        `,
        onSubmit: async (event) => {
          event.preventDefault();
          const out = document.getElementById("adminModalMessage");
          const name = document.getElementById("modalBarberName").value.trim();
          const specialty = document.getElementById("modalBarberSpecialty").value.trim();
          const experienceYears = Number(document.getElementById("modalBarberExperience").value || 0);
          const imageUrl = document.getElementById("modalBarberImageUrl").value.trim();
          const imageFile = document.getElementById("modalBarberImageFile").files?.[0] || null;
          const bio = document.getElementById("modalBarberBio").value.trim();
          if (name.length < 2) return setMessage(out, "error", "Имя слишком короткое");
          try {
            let payloadImage = imageUrl || null;
            if (imageFile) {
              if (imageFile.size > 2 * 1024 * 1024) return setMessage(out, "error", "Фото слишком большое (2MB)");
              payloadImage = await fileToDataUrl(imageFile);
            }
            await api("/barbers", {
              method: "POST",
              body: JSON.stringify({ name, specialty: specialty || null, experienceYears, imageUrl: payloadImage, bio: bio || null })
            });
            setMessage(out, "success", "Мастер добавлен");
            setTimeout(renderAdmin, 250);
          } catch (error) {
            setMessage(out, "error", error.message);
          }
        },
        submitText: "Добавить"
      });
    });

    document.getElementById("openCreateServiceModal").addEventListener("click", () => {
      openModal({
        title: "Добавить услугу",
        body: `
          <div class="toolbar catalog-toolbar catalog-grid-4">
            <input class="field" id="modalServiceTitle" type="text" placeholder="Название услуги" required />
            <input class="field" id="modalServicePrice" type="number" min="1" step="0.01" placeholder="Цена BYN" required />
            <input class="field" id="modalServiceCategory" type="text" placeholder="Категория" />
            <input class="field" id="modalServiceDuration" type="number" min="10" step="5" placeholder="Длительность (мин)" />
            <input class="field" id="modalServiceImageUrl" type="url" placeholder="Ссылка на фото" />
            <input class="field" id="modalServiceImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
            <textarea class="area" id="modalServiceDescription" placeholder="Описание услуги"></textarea>
            <div class="form-group">
              <label>Рекомендованные мастера</label>
              <div id="modalCreateServiceBarbers">${renderBarberOptions(barbers)}</div>
            </div>
          </div>
        `,
        onSubmit: async (event) => {
          event.preventDefault();
          const out = document.getElementById("adminModalMessage");
          const title = document.getElementById("modalServiceTitle").value.trim();
          const price = Number(document.getElementById("modalServicePrice").value);
          const category = document.getElementById("modalServiceCategory").value.trim();
          const durationMin = Number(document.getElementById("modalServiceDuration").value || 60);
          const imageUrl = document.getElementById("modalServiceImageUrl").value.trim();
          const imageFile = document.getElementById("modalServiceImageFile").files?.[0] || null;
          const description = document.getElementById("modalServiceDescription").value.trim();
          const barberIds = Array.from(document.querySelectorAll("#modalCreateServiceBarbers [data-barber-link]:checked")).map((el) => Number(el.value));
          if (title.length < 2 || !Number.isFinite(price) || price <= 0) return setMessage(out, "error", "Проверьте название и цену");
          try {
            let payloadImage = imageUrl || null;
            if (imageFile) {
              if (imageFile.size > 2 * 1024 * 1024) return setMessage(out, "error", "Фото слишком большое (2MB)");
              payloadImage = await fileToDataUrl(imageFile);
            }
            await api("/services", {
              method: "POST",
              body: JSON.stringify({
                title,
                price,
                category: category || null,
                durationMin,
                imageUrl: payloadImage,
                description: description || null,
                isPopular: false,
                barberIds
              })
            });
            setMessage(out, "success", "Услуга добавлена");
            setTimeout(renderAdmin, 250);
          } catch (error) {
            setMessage(out, "error", error.message);
          }
        },
        submitText: "Добавить"
      });
    });

    document.querySelectorAll("[data-delete-barber]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить мастера?")) return;
        try {
          await api(`/barbers/${btn.dataset.deleteBarber}`, { method: "DELETE" });
          await renderAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-delete-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить пользователя и все связанные данные?")) return;
        try {
          await api(`/users/${btn.dataset.deleteUser}`, { method: "DELETE" });
          await renderAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-open-edit-record]").forEach((button) => {
      button.addEventListener("click", () => {
        const record = records.find((r) => Number(r.id) === Number(button.dataset.openEditRecord));
        if (!record) return;
        openModal({
          title: `Редактировать запись #${record.id}`,
          body: `
            <div class="toolbar catalog-toolbar catalog-grid-4">
              <select class="select" id="modalRecordUser">${users.map((u) => `<option value="${u.id}" ${Number(u.id) === Number(record.userId) ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select>
              <select class="select" id="modalRecordBarber">${barbers.map((b) => `<option value="${b.id}" ${Number(b.id) === Number(record.barberId) ? "selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
              <select class="select" id="modalRecordService">${services.map((s) => `<option value="${s.id}" ${Number(s.id) === Number(record.serviceId) ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>
              <input class="field" id="modalRecordTime" type="datetime-local" value="${toDatetimeLocal(record.appointmentAt)}" />
              <select class="select" id="modalRecordStatus">${["active", "completed", "cancelled"].map((st) => `<option value="${st}" ${st === record.status ? "selected" : ""}>${st}</option>`).join("")}</select>
            </div>
          `,
          onSubmit: async (event) => {
            event.preventDefault();
            const out = document.getElementById("adminModalMessage");
            try {
              await api(`/records/${record.id}`, {
                method: "PUT",
                body: JSON.stringify({
                  userId: Number(document.getElementById("modalRecordUser").value),
                  barberId: Number(document.getElementById("modalRecordBarber").value),
                  serviceId: Number(document.getElementById("modalRecordService").value),
                  appointmentAt: document.getElementById("modalRecordTime").value,
                  status: document.getElementById("modalRecordStatus").value,
                  comment: null
                })
              });
              setMessage(out, "success", "Запись обновлена");
              setTimeout(renderAdmin, 250);
            } catch (error) {
              setMessage(out, "error", error.message);
            }
          },
          submitText: "Сохранить"
        });
      });
    });

    document.querySelectorAll("[data-delete-record]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить запись?")) return;
        try {
          await api(`/records/${btn.dataset.deleteRecord}/admin`, { method: "DELETE" });
          await renderAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });

    document.querySelectorAll("[data-open-edit-barber]").forEach((button) => {
      button.addEventListener("click", () => {
        const barber = barbers.find((b) => Number(b.id) === Number(button.dataset.openEditBarber));
        if (!barber) return;
        openModal({
          title: `Редактировать мастера: ${barber.name}`,
          body: `
            <div class="toolbar catalog-toolbar catalog-grid-4">
              <input class="field" id="modalEditBarberName" type="text" value="${esc(barber.name)}" required />
              <input class="field" id="modalEditBarberSpecialty" type="text" value="${esc(barber.specialty || "")}" />
              <input class="field" id="modalEditBarberExperience" type="number" min="0" value="${Number(barber.experienceYears || 0)}" />
              <input class="field" id="modalEditBarberImageUrl" type="url" value="${esc(barber.imageUrl || "")}" placeholder="Ссылка на фото" />
              <input class="field" id="modalEditBarberImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
              <textarea class="area" id="modalEditBarberBio">${esc(barber.bio || "")}</textarea>
            </div>
          `,
          onSubmit: async (event) => {
            event.preventDefault();
            const out = document.getElementById("adminModalMessage");
            const imageFile = document.getElementById("modalEditBarberImageFile").files?.[0] || null;
            let payloadImage = document.getElementById("modalEditBarberImageUrl").value.trim() || null;
            if (imageFile) {
              if (imageFile.size > 2 * 1024 * 1024) return setMessage(out, "error", "Фото слишком большое (2MB)");
              payloadImage = await fileToDataUrl(imageFile);
            }
            const payload = {
              name: document.getElementById("modalEditBarberName").value.trim(),
              specialty: document.getElementById("modalEditBarberSpecialty").value.trim() || null,
              experienceYears: Number(document.getElementById("modalEditBarberExperience").value || 0),
              imageUrl: payloadImage,
              bio: document.getElementById("modalEditBarberBio").value.trim() || null
            };
            if (payload.name.length < 2) return setMessage(out, "error", "Имя слишком короткое");
            try {
              await api(`/barbers/${barber.id}`, { method: "PUT", body: JSON.stringify(payload) });
              setMessage(out, "success", "Мастер обновлен");
              setTimeout(renderAdmin, 250);
            } catch (error) {
              setMessage(out, "error", error.message);
            }
          }
        });
      });
    });

    document.querySelectorAll("[data-open-edit-service]").forEach((button) => {
      button.addEventListener("click", () => {
        const service = services.find((s) => Number(s.id) === Number(button.dataset.openEditService));
        if (!service) return;
        openModal({
          title: `Редактировать услугу: ${service.title}`,
          body: `
            <div class="toolbar catalog-toolbar catalog-grid-4">
              <input class="field" id="modalEditServiceTitle" type="text" value="${esc(service.title)}" required />
              <input class="field" id="modalEditServicePrice" type="number" min="1" step="0.01" value="${Number(service.price)}" required />
              <input class="field" id="modalEditServiceCategory" type="text" value="${esc(service.category || "")}" />
              <input class="field" id="modalEditServiceDuration" type="number" min="10" step="5" value="${Number(service.durationMin || 60)}" />
              <input class="field" id="modalEditServiceImageUrl" type="url" value="${esc(service.imageUrl || "")}" />
              <input class="field" id="modalEditServiceImageFile" type="file" accept="image/png,image/jpeg,image/webp" />
              <textarea class="area" id="modalEditServiceDescription">${esc(service.description || "")}</textarea>
              <div class="form-group">
                <label>Рекомендованные мастера</label>
                <div id="modalEditServiceBarbers">${renderBarberOptions(barbers, serviceBarberMap[service.id] || [])}</div>
              </div>
            </div>
          `,
          onSubmit: async (event) => {
            event.preventDefault();
            const out = document.getElementById("adminModalMessage");
            const barberIds = Array.from(document.querySelectorAll("#modalEditServiceBarbers [data-barber-link]:checked")).map((el) => Number(el.value));
            const imageFile = document.getElementById("modalEditServiceImageFile").files?.[0] || null;
            let payloadImage = document.getElementById("modalEditServiceImageUrl").value.trim() || null;
            if (imageFile) {
              if (imageFile.size > 2 * 1024 * 1024) return setMessage(out, "error", "Фото слишком большое (2MB)");
              payloadImage = await fileToDataUrl(imageFile);
            }
            const payload = {
              title: document.getElementById("modalEditServiceTitle").value.trim(),
              price: Number(document.getElementById("modalEditServicePrice").value),
              category: document.getElementById("modalEditServiceCategory").value.trim() || null,
              durationMin: Number(document.getElementById("modalEditServiceDuration").value || 60),
              imageUrl: payloadImage,
              description: document.getElementById("modalEditServiceDescription").value.trim() || null,
              barberIds
            };
            if (payload.title.length < 2 || !Number.isFinite(payload.price) || payload.price <= 0) {
              return setMessage(out, "error", "Проверьте название и цену");
            }
            try {
              await api(`/services/${service.id}`, { method: "PUT", body: JSON.stringify(payload) });
              setMessage(out, "success", "Услуга обновлена");
              setTimeout(renderAdmin, 250);
            } catch (error) {
              setMessage(out, "error", error.message);
            }
          }
        });
      });
    });

    document.querySelectorAll("[data-delete-service]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить услугу?")) return;
        try {
          await api(`/services/${btn.dataset.deleteService}`, { method: "DELETE" });
          await renderAdmin();
        } catch (error) {
          alert(error.message);
        }
      });
    });
  } catch (error) {
    app.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message)}</p></div>`;
  }
}

function renderForbidden() {
  getApp().innerHTML = `
    <section class="card panel empty reveal">
      <h3>Недостаточно прав</h3>
      <p class="sub">Этот раздел доступен только администраторам.</p>
      <div class="btn-row center-row"><a href="/" data-link class="btn-link primary">На главную</a></div>
    </section>
  `;
}

function renderNotFound(text) {
  getApp().innerHTML = `
    <section class="card panel empty reveal">
      <h3>Страница не найдена</h3>
      <p class="sub">${esc(text || `Маршрут ${window.location.pathname} не существует.`)}</p>
      <div class="btn-row center-row"><a href="/" data-link class="btn-link primary">На главную</a></div>
    </section>
  `;
}

async function renderRoute() {
  updateNav();
  const path = getPath();

  if (path === "/") return renderHome();
  if (path === "/auth/login") {
    await renderHome();
    openAuthModal("login");
    return;
  }
  if (path === "/auth/register") {
    await renderHome();
    openAuthModal("register");
    return;
  }
  if (path === "/catalog") return renderCatalog();

  const serviceMatch = path.match(/^\/catalog\/(\d+)$/);
  if (serviceMatch) return renderService(serviceMatch[1]);

  if (path === "/barbers") return renderBarbers();
  const barberMatch = path.match(/^\/barbers\/(\d+)$/);
  if (barberMatch) return renderBarberDetail(barberMatch[1]);

  if (path === "/search") return renderSearchPage();
  if (path === "/profile") return renderProfile();
  if (path === "/records") return renderRecords();
  if (path === "/admin") return renderAdmin();

  renderNotFound();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  event.preventDefault();
  toUrl(link.getAttribute("href"));
});

window.addEventListener("popstate", renderRoute);

(async function init() {
  await hydrateAuthUser();
  await renderRoute();
})();
