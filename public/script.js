// Page
const stationListEl = document.getElementById("station-list");
const stationFormEl = document.getElementById("station-form");
const searchInputEl = document.getElementById("search-input");
const statusFilterEl = document.getElementById("status-filter");
const sortSelectEl = document.getElementById("sort-select");
const prevButtonEl = document.getElementById("prev-btn");
const nextButtonEl = document.getElementById("next-btn");
const pageInfoEl = document.getElementById("page-info");

// Modal
const modalEl = document.getElementById("modal");
const kwhInputEl = document.getElementById("kwh-input");
const confirmStopButtonEl = document.getElementById("confirm-stop-btn");
const cancelStopButtonEl = document.getElementById("cancel-stop-btn");

const API_URL = "http://localhost:3000/api/stations";
const CARDS_PER_PAGE = 6;

let currentPage = 1;
let statusFilter = "";
let sortOption = "";
let totalStations = 0;
let stopSessionId = null;

async function fetchStations() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: CARDS_PER_PAGE,
    });

    if (statusFilter) params.append("status", statusFilter);
    if (sortOption) params.append("sort", sortOption);

    const response = await fetch(`${API_URL}?${params}`);
    const data = await response.json();

    totalStations = data.total;
    renderStations(data.data);
    updatePagination();
  } catch {
    stationListEl.innerHTML =
      '<p style="color:red">Помилка завантаження даних</p>';
  }
}

function renderStations(stations) {
  stationListEl.innerHTML = "";

  if (stations.length === 0) {
    stationListEl.innerHTML = "<p>Станцій не знайдено</p>";
    return;
  }

  stations.forEach((station) => {
    const card = document.createElement("div");
    card.className = "station-card";

    const isOffline = station.status === "offline";
    const hasFreeChargers = station.availableChargers > 0;

    let statusClass = "station-card__status--active";
    let statusText = "Активна";

    if (station.status === "busy") {
      statusClass = "station-card__status--busy";
      statusText = "Зайнята";
    } else if (station.status === "offline") {
      statusClass = "station-card__status--offline";
      statusText = "Не працює";
    }

    const startDisabled = (!hasFreeChargers || isOffline) && "disabled";
    const stopDisabled =
      (station.availableChargers === station.chargerCount || isOffline) &&
      "disabled";

    card.innerHTML = `
      <div class="station-card__header">
          <h3 class="station-card__title">${station.name}</h3>
          <span class="station-card__status ${statusClass}">${statusText}</span>
      </div>
      <div class="station-card__info">
          <p><strong>Адреса:</strong> ${station.address}</p>
          <p><strong>Потужність:</strong> ${station.maxPower} кВт</p>
          <p><strong>Порти:</strong> ${station.availableChargers}/${station.chargerCount}</p>
          <p><strong>Всього енергії:</strong> ${station.totalEnergy} кВт⋅год</p>
      </div>
      <div class="station-card__actions">
          <button class="button button--success" onclick="handleStartSession(${station.id})" ${startDisabled}>
              Почати
          </button>
          <button class="button button--danger" onclick="openStopModal(${station.id})" ${stopDisabled}>
              Закінчити
          </button>
          <button class="button span-2 ${isOffline ? "button--info" : "button--warning"}" onclick="handleToggleStatus(${station.id}, '${station.status}')">
              ${isOffline ? "Увімкнути" : "Вимкнути"}
          </button>
      </div>
    `;

    stationListEl.appendChild(card);
  });
}

stationFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name-input").value;
  const address = document.getElementById("address-input").value;
  const maxPower = Number(document.getElementById("power-input").value);
  const chargerCount = Number(document.getElementById("chargers-input").value);

  if (maxPower < 50 || maxPower > 500) {
    alert("Потужність повинна бути від 50 до 500 кВт");
    return;
  }
  if (chargerCount < 1 || chargerCount > 10) {
    alert("Кількість портів повинна бути від 1 до 10");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, maxPower, chargerCount }),
    });

    if (!response.ok) {
      alert("Помилка при додаванні станції");
      return;
    }

    stationFormEl.reset();
    fetchStations();
  } catch (error) {
    console.error("Error adding station:", error);
  }
});

window.handleStartSession = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}/start-session`, {
      method: "POST",
    });

    if (!response.ok) {
      const err = await response.json();
      alert(err.message || "Error starting session");
      return;
    }

    fetchStations();
  } catch (error) {
    console.error("Error starting session:", error);
  }
};

window.openStopModal = (id) => {
  stopSessionId = id;
  modalEl.classList.remove("hidden");
  kwhInputEl.value = "";
  kwhInputEl.focus();
};

window.handleStopSession = async () => {
  if (!stopSessionId) return;

  const kwh = Number(kwhInputEl.value);
  if (kwh < 1 || kwh > 300) {
    alert("Спожита енергія повинна бути від 1 до 300 кВт⋅год");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${stopSessionId}/stop-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kwh }),
    });

    if (!response.ok) {
      const err = await response.json();
      alert(err.message || "Error stopping session");
      return;
    }

    modalEl.classList.add("hidden");
    stopSessionId = null;
    fetchStations();
  } catch (error) {
    console.error("Error stopping session:", error);
  }
};

window.handleToggleStatus = async (id, currentStatus) => {
  try {
    const newStatus = currentStatus === "offline" ? "active" : "offline";
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const err = await response.json();
      alert(err.message || "Error toggling status");
      return;
    }

    fetchStations();
  } catch (error) {
    console.error("Error toggling status:", error);
  }
};

confirmStopButtonEl.addEventListener("click", handleStopSession);
cancelStopButtonEl.addEventListener("click", () => {
  modalEl.classList.add("hidden");
  stopSessionId = null;
});

statusFilterEl.addEventListener("change", (e) => {
  statusFilter = e.target.value;
  currentPage = 1;
  fetchStations();
});

sortSelectEl.addEventListener("change", (e) => {
  sortOption = e.target.value;
  currentPage = 1;
  fetchStations();
});

searchInputEl.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const cards = document.querySelectorAll(".station-card");

  cards.forEach((card) => {
    const title = card
      .querySelector(".station-card__title")
      .textContent.toLowerCase();

    const address = card
      .querySelector(".station-card__info p")
      .textContent.toLowerCase();

    if (title.includes(term) || address.includes(term)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});

function updatePagination() {
  pageInfoEl.textContent = `Сторінка ${currentPage}`;
  prevButtonEl.disabled = currentPage === 1;
  nextButtonEl.disabled = currentPage * CARDS_PER_PAGE >= totalStations;
}

prevButtonEl.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchStations();
  }
});

nextButtonEl.addEventListener("click", () => {
  if (currentPage * CARDS_PER_PAGE < totalStations) {
    currentPage++;
    fetchStations();
  }
});

fetchStations();
