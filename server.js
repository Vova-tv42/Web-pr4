import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let stations = [
  {
    id: 1,
    name: "Станція перша",
    address: "перша вулиця",
    chargerCount: 4,
    maxPower: 150,
    availableChargers: 4,
    totalEnergy: 1200,
    status: "active",
  },
  {
    id: 2,
    name: "Крута станція",
    address: "проспект крутий",
    chargerCount: 2,
    maxPower: 50,
    availableChargers: 0,
    totalEnergy: 450,
    status: "busy",
  },
  {
    id: 3,
    name: "Станція третя",
    address: "вулиця третя",
    chargerCount: 6,
    maxPower: 120,
    availableChargers: 2,
    totalEnergy: 3400,
    status: "active",
  },
];

// GET /api/stations
app.get("/api/stations", (req, res) => {
  let result = [...stations];

  if (req.query.status) {
    result = result.filter((s) => s.status === req.query.status);
  }

  if (req.query.sort) {
    const [field, order] = req.query.sort.split("_");
    const multiplier = order === "asc" ? 1 : -1;

    result.sort((a, b) => {
      let valA, valB;

      switch (field) {
        case "power":
          valA = Number(a.maxPower);
          valB = Number(b.maxPower);
          break;

        case "energy":
          valA = Number(a.totalEnergy);
          valB = Number(b.totalEnergy);
          break;

        case "ports":
          valA = Number(a.chargerCount);
          valB = Number(b.chargerCount);
          break;

        default:
          return 0;
      }

      if (valA < valB) return -1 * multiplier;
      if (valA > valB) return 1 * multiplier;

      return 0;
    });
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 6;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  res.json({
    data: paginatedResult,
    total: result.length,
    page,
    limit,
  });
});

// GET /api/stations/:id
app.get("/api/stations/:id", (req, res) => {
  const station = stations.find((s) => s.id === Number(req.params.id));
  if (!station) {
    return res.status(404).json({ message: "Станцію не знайдено" });
  }

  res.json(station);
});

// POST /api/stations
let nextId = 4;
app.post("/api/stations", (req, res) => {
  const { name, address, maxPower, chargerCount } = req.body;
  if (!name || !address || !maxPower || !chargerCount) {
    return res.status(400).json({ message: "Відсутні обов'язкові поля" });
  }

  const power = Number(maxPower);
  const count = Number(chargerCount);

  if (power < 50 || power > 500) {
    return res
      .status(400)
      .json({ message: "Максимальна потужність має бути від 50 до 500 кВт" });
  }

  if (count < 1 || count > 10) {
    return res
      .status(400)
      .json({ message: "Кількість зарядних пристроїв має бути від 1 до 10" });
  }

  const newStation = {
    id: nextId++,
    name,
    address,
    maxPower: power,
    chargerCount: count,
    availableChargers: count,
    totalEnergy: 0,
    status: "active",
  };

  stations.push(newStation);
  res.status(201).json(newStation);
});

// PUT /api/stations/:id
app.put("/api/stations/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = stations.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "Станцію не знайдено" });
  }

  stations[index] = { ...stations[index], ...req.body };
  res.json(stations[index]);
});

// POST /api/stations/:id/start-session
app.post("/api/stations/:id/start-session", (req, res) => {
  const station = stations.find((s) => s.id === Number(req.params.id));
  if (!station) {
    return res.status(404).json({ message: "Станцію не знайдено" });
  }

  if (station.availableChargers <= 0) {
    return res
      .status(400)
      .json({ message: "Немає доступних зарядних пристроїв" });
  }

  station.availableChargers--;
  if (station.availableChargers === 0) {
    station.status = "busy";
  }

  res.json(station);
});

// POST /api/stations/:id/stop-session
app.post("/api/stations/:id/stop-session", (req, res) => {
  const station = stations.find((s) => s.id === Number(req.params.id));
  if (!station) {
    return res.status(404).json({ message: "Станцію не знайдено" });
  }

  const kwh = Number(req.body.kwh);
  if (isNaN(kwh) || kwh < 1 || kwh > 300) {
    return res
      .status(400)
      .json({ message: "Спожита енергія повинна бути від 1 до 300 кВт" });
  }

  if (station.availableChargers >= station.chargerCount) {
    res.status(400).json({ message: "Усі зарядні пристрої вже вільні" });
    return;
  }

  station.availableChargers++;
  station.totalEnergy += kwh;

  if (station.status === "busy") {
    station.status = "active";
  }

  res.json(station);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
