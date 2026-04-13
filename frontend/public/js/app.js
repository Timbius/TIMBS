/*
  Barber Factory SPA
  Modern classic UI + auth modal flow.
*/

const API_URL = "http://localhost:5000/api";

const state = {
  services: [],
  filters: { search: "", category: "", sort: "" },
  modal: {
    open: false,
    mode: "login", // login | register
    bookingContext: null,
  },
};

const getApp = () => document.getElementById("app");
const getNav = () => document.getElementById("nav");
const getPath = () => {
  const p = window.location.pathname.replace(/\/+$/, "");
  return p || "/";
};

const getToken = () => localStorage.getItem("token");
const getUser = () => {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
};

const isAuth = () => Boolean(getToken());
const isAdmin = () => Boolean(getUser() && getUser().role === "admin");

const setSession = (data) => {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (v) => `${new Intl.NumberFormat("ru-RU").format(Number(v) || 0)} ₽`;

const setMessage = (el, type, text) => {
  el.className = `msg ${type}`;
  el.textContent = text;
};

const toUrl = (href) => {
  const p = href.replace(/\/+$/, "") || "/";
  if (window.location.pathname !== p) history.pushState({}, "", p);
  renderRoute();
};

const qs = () => {
  const params = new URLSearchParams();
  if (state.filters.category) params.set("category", state.filters.category);
  if (state.filters.sort) params.set("sort", state.filters.sort);
  return params.toString() ? `?${params.toString()}` : "";
};

const uniqueCategories = (items) =>
  [...new Set(items.map((item) => item.category).filter(Boolean))].sort();

const filteredServices = (items) => {
  const q = state.filters.search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.title, item.description, item.category].join(" ").toLowerCase().includes(q),
  );
};

const featuredServices = (items) => {
  const popular = items.filter((item) => item.isPopular);
  return (popular.length ? popular : items).slice(0, 3);
};

async function fetchServices() {
  const res = await fetch(API_URL + "/services" + qs());
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Не удалось загрузить услуги");
  state.services = data;
  return data;
}

async function fetchMe() {
  const res = await fetch(API_URL + "/auth/me", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Unauthorized");
  const data = await res.json();
  localStorage.setItem("user", JSON.stringify(data));
  return data;
}

async function bootstrap() {
  if (state.services.length) return;
  try {
    await fetchServices();
  } catch {
    state.services = [];
  }
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

function afterAuthSuccess() {
  const pending = state.modal.bookingContext;
  closeAuthModal();
  updateNav();

  if (pending) {
    alert(`Запись на \"${pending}\" будет доступна в следующем шаге.`);
  }

  toUrl("/profile");
}

function renderAuthModal() {
  const root = ensureModalRoot();
  if (!state.modal.open) {
    root.innerHTML = "";
    return;
  }

  const isLogin = state.modal.mode === "login";
  const title = isLogin ? "Вход" : "Регистрация";
  const subtitle = isLogin
    ? "Введите почту и пароль, чтобы продолжить."
    : "Создайте аккаунт для записи и личного кабинета.";

  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="${title}" onclick="event.stopPropagation()">
        <button class="modal-close" type="button" data-close-modal aria-label="Закрыть">×</button>
        <div class="modal-head">
          <span class="eyebrow">Barber Factory</span>
          <h2>${title}</h2>
          <p class="sub">${subtitle}</p>
        </div>

        <form class="form" id="authModalForm">
          ${
            isLogin
              ? ""
              : `
              <div class="form-group">
                <label for="modalName">Имя</label>
                <input id="modalName" class="field" type="text" minlength="2" required>
              </div>
            `
          }

          <div class="form-group">
            <label for="modalEmail">Email</label>
            <input id="modalEmail" class="field" type="email" required>
          </div>

          <div class="form-group">
            <label for="modalPassword">Пароль</label>
            <input id="modalPassword" class="field" type="password" minlength="6" required>
          </div>

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

  root.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeAuthModal);
  });

  root.querySelectorAll("[data-switch-auth]").forEach((el) => {
    el.addEventListener("click", () => switchAuthMode(el.dataset.switchAuth));
  });

  const form = document.getElementById("authModalForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const out = document.getElementById("authModalMessage");

    try {
      const body = {
        email: document.getElementById("modalEmail").value,
        password: document.getElementById("modalPassword").value,
      };
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      if (!isLogin) body.name = document.getElementById("modalName").value;

      const res = await fetch(API_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const text = data.message || (data.errors && data.errors[0] && data.errors[0].msg) || "Ошибка";
        setMessage(out, "error", text);
        return;
      }

      setSession(data);
      setMessage(out, "success", isLogin ? "Вход выполнен" : "Регистрация выполнена");
      setTimeout(afterAuthSuccess, 350);
    } catch {
      setMessage(out, "error", "Не удалось связаться с сервером");
    }
  });
}

function updateNav() {
  const nav = getNav();
  if (isAuth()) {
    nav.innerHTML = `
      <a href="/catalog" data-link class="nav-link ${getPath().startsWith("/catalog") ? "active" : ""}">Каталог</a>
      <a href="/profile" data-link class="btn-link primary nav-main">Профиль</a>
      <button type="button" class="btn-link ghost" id="logoutNav">Выйти</button>
    `;
    document.getElementById("logoutNav").addEventListener("click", () => {
      clearSession();
      updateNav();
      toUrl("/");
    });
    return;
  }

  nav.innerHTML = `
    <a href="/catalog" data-link class="nav-link ${getPath().startsWith("/catalog") ? "active" : ""}">Каталог</a>
    <button type="button" class="btn-link primary nav-main" id="openLoginNav">Вход</button>
  `;

  document.getElementById("openLoginNav").addEventListener("click", () => openAuthModal("login"));
}

function renderHome() {
  getApp().innerHTML = `
    <section class="hero-main">
      <div class="hero-center">
        <h1 class="brand-title-xl">BARBER FACTORY</h1>
        <p class="hero-slogan">Стиль, который говорит за вас</p>
        <p class="hero-description">
          Премиальный барбершоп с классическим подходом, современным комфортом
          и понятной онлайн-записью без лишних звонков.
        </p>
        <button class="btn primary hero-cta" type="button" id="heroEnrollBtn">Записаться</button>
      </div>
    </section>

    <section class="style-strip">
      <article class="style-photo style-photo-1 reveal"></article>
      <article class="style-photo style-photo-2 reveal"></article>
    </section>

    <section class="home-preview">
      <div class="section-head">
        <div>
          <span class="eyebrow">Популярные услуги</span>
          <h2>Выберите формат ухода</h2>
        </div>
        <a href="/catalog" data-link class="btn-link secondary">Открыть каталог</a>
      </div>
      <div class="services" id="homeServices"></div>
    </section>
  `;

  const items = featuredServices(state.services);
  document.getElementById("homeServices").innerHTML =
    items.length
      ? items.map((item) => serviceCard(item)).join("")
      : `<div class="empty"><h3>Каталог обновляется</h3><p class="sub">Список услуг появится после загрузки данных.</p></div>`;

  bindEnrollButtons();

  document.getElementById("heroEnrollBtn").addEventListener("click", () => {
    if (!isAuth()) {
      openAuthModal("login", "любую услугу");
      return;
    }
    alert("Функционал записи будет добавлен следующим шагом.");
  });
}

function serviceCard(item, admin = false) {
  return `
    <article class="service-card reveal">
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
        ${admin ? `<button class="btn danger" type="button" data-delete-id="${item.id}">Удалить</button>` : ""}
      </div>
    </article>
  `;
}

function bindEnrollButtons() {
  document.querySelectorAll("[data-enroll-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.dataset.enrollTitle || "услугу";
      if (!isAuth()) {
        openAuthModal("login", title);
        return;
      }
      alert(`Запись на \"${title}\" будет добавлена в следующем этапе.`);
    });
  });
}

function renderLoginRoute() {
  toUrl("/");
  openAuthModal("login");
}

function renderRegisterRoute() {
  toUrl("/");
  openAuthModal("register");
}

async function renderProfile() {
  if (!isAuth()) {
    toUrl("/auth/login");
    return;
  }

  getApp().innerHTML = `
    <section class="profile-wrap card panel reveal">
      <span class="eyebrow">Профиль</span>
      <h1>Личный кабинет</h1>
      <p class="sub">Ваши данные и текущий статус аккаунта.</p>

      <div class="profile-grid">
        <div class="profile-row"><span class="profile-label">Имя</span><strong id="userName">Загрузка...</strong></div>
        <div class="profile-row"><span class="profile-label">Email</span><strong id="userEmail">Загрузка...</strong></div>
        <div class="profile-row"><span class="profile-label">Роль</span><strong id="userRole">Загрузка...</strong></div>
      </div>

      <div class="btn-row" style="margin-top:22px">
        <a href="/catalog" data-link class="btn-link secondary">Перейти в каталог</a>
      </div>
      <div id="profileMessage" aria-live="polite"></div>
    </section>
  `;

  try {
    const me = await fetchMe();
    document.getElementById("userName").textContent = me.name;
    document.getElementById("userEmail").textContent = me.email;
    document.getElementById("userRole").textContent = me.role;
  } catch {
    clearSession();
    updateNav();
    const out = document.getElementById("profileMessage");
    setMessage(out, "error", "Сессия истекла. Войдите снова.");
    openAuthModal("login");
    setTimeout(() => toUrl("/"), 450);
  }
}

async function renderCatalog() {
  getApp().innerHTML = `
    <section class="catalog-topbar reveal">
      <h1 class="catalog-logo">BARBER FACTORY</h1>
      <p class="sub catalog-sub">Каталог услуг</p>

      <div class="toolbar catalog-toolbar">
        <input class="field" id="searchInput" type="search" placeholder="Поиск услуги" />
        <select class="select" id="categorySelect"><option value="">Все категории</option></select>
        <select class="select" id="sortSelect">
          <option value="">Без сортировки</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
        </select>
      </div>

      <div class="summary catalog-summary">
        <span id="catalogSummary">Загрузка каталога...</span>
        <div class="catalog-summary-actions">
          ${isAdmin() ? `<button class="btn secondary" type="button" id="toggleCreateServiceBtn">Добавить услугу</button>` : ""}
          ${isAdmin() ? `<span class="pill">Администратор</span>` : `<span class="pill">Клиент</span>`}
        </div>
      </div>
    </section>

    ${
      isAdmin()
        ? `
      <section class="catalog-admin-wrap">
        <section class="card panel reveal catalog-admin-panel" id="catalogAdminPanel" hidden>
          <div class="section-head">
            <div>
              <span class="eyebrow">Панель администратора</span>
              <h2>Новая услуга</h2>
            </div>
          </div>

          <form class="form" id="serviceCreateForm">
            <div class="toolbar catalog-admin-form-grid">
              <input class="field" id="serviceTitle" type="text" placeholder="Название услуги" required />
              <input class="field" id="servicePrice" type="number" min="0" step="0.01" placeholder="Цена" required />
              <input class="field" id="serviceCategory" type="text" placeholder="Категория" />
            </div>

            <div class="form-group">
              <label for="serviceDescription">Описание</label>
              <textarea class="area" id="serviceDescription" placeholder="Краткое описание услуги"></textarea>
            </div>

            <div class="form-group">
              <label for="serviceImageUrl">Ссылка на изображение (необязательно)</label>
              <input class="field" id="serviceImageUrl" type="url" placeholder="https://..." />
            </div>

            <div class="form-group">
              <label for="servicePopular">
                <input id="servicePopular" type="checkbox" />
                Популярная услуга
              </label>
            </div>

            <div class="btn-row">
              <button class="btn primary" type="submit">Сохранить услугу</button>
            </div>
            <div id="serviceCreateMessage" aria-live="polite"></div>
          </form>
        </section>
      </section>
    `
        : ""
    }

    <section class="catalog-list-wrap">
      <div id="servicesList" class="services services-vertical"></div>
    </section>
  `;

  const searchInput = document.getElementById("searchInput");
  const categorySelect = document.getElementById("categorySelect");
  const sortSelect = document.getElementById("sortSelect");
  const toggleCreateServiceBtn = document.getElementById("toggleCreateServiceBtn");
  const catalogAdminPanel = document.getElementById("catalogAdminPanel");
  const serviceCreateForm = document.getElementById("serviceCreateForm");

  searchInput.value = state.filters.search;
  sortSelect.value = state.filters.sort;

  const loadCatalog = async () => {
    const list = document.getElementById("servicesList");
    const summary = document.getElementById("catalogSummary");
    list.innerHTML = `<div class="empty"><h3>Загрузка...</h3></div>`;

    try {
      const data = await fetchServices();
      categorySelect.innerHTML =
        `<option value="">Все категории</option>` +
        uniqueCategories(data)
          .map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`)
          .join("");
      categorySelect.value = state.filters.category;

      const visible = filteredServices(data);
      summary.textContent = `Найдено услуг: ${visible.length}`;

      if (!visible.length) {
        list.innerHTML = `<div class="empty"><h3>Ничего не найдено</h3><p class="sub">Измени параметры фильтра.</p></div>`;
        return;
      }

      list.innerHTML = visible.map((item) => serviceCard(item, isAdmin())).join("");
      bindEnrollButtons();
      bindDeleteButtons(loadCatalog);
    } catch (error) {
      summary.textContent = "Не удалось загрузить каталог";
      list.innerHTML = `<div class="empty"><h3>Ошибка</h3><p class="sub">${esc(error.message || "Сервер временно недоступен")}</p></div>`;
    }
  };

  searchInput.addEventListener("input", () => {
    state.filters.search = searchInput.value;
    const visible = filteredServices(state.services);
    document.getElementById("catalogSummary").textContent = `Найдено услуг: ${visible.length}`;
    document.getElementById("servicesList").innerHTML =
      visible.length
        ? visible.map((item) => serviceCard(item, isAdmin())).join("")
        : `<div class="empty"><h3>Ничего не найдено</h3></div>`;

    bindEnrollButtons();
    bindDeleteButtons(loadCatalog);
  });

  categorySelect.addEventListener("change", async () => {
    state.filters.category = categorySelect.value;
    await loadCatalog();
  });

  sortSelect.addEventListener("change", async () => {
    state.filters.sort = sortSelect.value;
    await loadCatalog();
  });

  if (isAdmin() && toggleCreateServiceBtn && catalogAdminPanel && serviceCreateForm) {
    toggleCreateServiceBtn.addEventListener("click", () => {
      const willOpen = catalogAdminPanel.hidden;
      catalogAdminPanel.hidden = !willOpen;
      toggleCreateServiceBtn.textContent = willOpen ? "Скрыть форму" : "Добавить услугу";
    });

    serviceCreateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const out = document.getElementById("serviceCreateMessage");

      try {
        const payload = {
          title: document.getElementById("serviceTitle").value.trim(),
          price: Number(document.getElementById("servicePrice").value),
          category: document.getElementById("serviceCategory").value.trim() || null,
          description: document.getElementById("serviceDescription").value.trim() || null,
          imageUrl: document.getElementById("serviceImageUrl").value.trim() || null,
          isPopular: document.getElementById("servicePopular").checked,
        };

        const res = await fetch(`${API_URL}/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(out, "error", data.message || "Не удалось добавить услугу");
          return;
        }

        setMessage(out, "success", "Услуга добавлена");
        serviceCreateForm.reset();
        await loadCatalog();
      } catch {
        setMessage(out, "error", "Не удалось связаться с сервером");
      }
    });
  }

  await loadCatalog();
}

function bindDeleteButtons(onDone) {
  if (!isAdmin()) return;
  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const res = await fetch(`${API_URL}/services/${button.dataset.deleteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Не удалось удалить услугу");
        await onDone();
      } catch (error) {
        alert(error.message || "Ошибка удаления");
      }
    });
  });
}

async function renderService(id) {
  let item = state.services.find((s) => String(s.id) === String(id));

  if (!item) {
    try {
      const res = await fetch(`${API_URL}/services/${id}`);
      if (!res.ok) throw new Error("Услуга не найдена");
      item = await res.json();
    } catch {
      renderNotFound("Не удалось найти услугу.");
      return;
    }
  }

  getApp().innerHTML = `
    <section class="detail-wrap card panel reveal">
      <a href="/catalog" data-link class="back">← Вернуться в каталог</a>
      <span class="eyebrow">${esc(item.category || "Услуга")}</span>
      <h1>${esc(item.title)}</h1>
      <p class="sub">${esc(item.description || "Подробное описание услуги появится позже.")}</p>
      <div class="price">${money(item.price)}</div>
      <div class="btn-row">
        <button class="btn primary" type="button" data-enroll-id="${item.id}" data-enroll-title="${esc(item.title)}">Записаться</button>
        <a href="/catalog" data-link class="btn-link secondary">Все услуги</a>
      </div>
    </section>
  `;

  bindEnrollButtons();
}

function renderNotFound(text) {
  getApp().innerHTML = `
    <section class="card panel empty reveal">
      <h3>Страница не найдена</h3>
      <p class="sub">${esc(text || `Маршрут ${window.location.pathname} не существует.`)}</p>
      <div class="btn-row" style="justify-content:center;margin-top:18px">
        <a href="/" data-link class="btn-link primary">На главную</a>
      </div>
    </section>
  `;
}

async function renderRoute() {
  updateNav();
  const p = getPath();

  if (p === "/") {
    await bootstrap();
    renderHome();
    return;
  }

  if (p === "/auth/login") {
    await bootstrap();
    renderHome();
    openAuthModal("login");
    return;
  }

  if (p === "/auth/register") {
    await bootstrap();
    renderHome();
    openAuthModal("register");
    return;
  }

  if (p === "/profile") {
    await renderProfile();
    return;
  }

  if (p === "/catalog") {
    await renderCatalog();
    return;
  }

  const match = p.match(/^\/catalog\/(\d+)$/);
  if (match) {
    await bootstrap();
    await renderService(match[1]);
    return;
  }

  renderNotFound();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  event.preventDefault();
  toUrl(link.getAttribute("href"));
});

window.addEventListener("popstate", renderRoute);
renderRoute();
