import express from "express";
import cors from "cors";
import multer from "multer";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
const port = 3001;
const dataDir = path.resolve("data");
const uploadDir = path.resolve("uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(dataDir, "unaga.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS horses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sex TEXT,
    breed TEXT,
    age TEXT,
    color TEXT,
    owner TEXT,
    location TEXT,
    image TEXT,
    accent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    horse_id TEXT,
    event_name TEXT,
    race_date TEXT,
    distance TEXT,
    place INTEGER,
    location TEXT,
    weather TEXT,
    notes TEXT DEFAULT '',
    attachment_path TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS progeny (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sire_id TEXT,
    dam_id TEXT,
    birth_year TEXT,
    sex TEXT,
    image TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS pedigrees (
    horse_id TEXT PRIMARY KEY,
    sire_id TEXT,
    dam_id TEXT,
    sire_name TEXT,
    dam_name TEXT,
    grand_sire_name TEXT,
    grand_dam_name TEXT,
    generations INTEGER DEFAULT 3,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS herds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stallion_id TEXT,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stallion_id) REFERENCES horses(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS herd_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    herd_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('mare', 'foal')),
    sex TEXT NOT NULL DEFAULT '',
    age TEXT DEFAULT '',
    status TEXT DEFAULT '',
    image TEXT DEFAULT '',
    color TEXT DEFAULT '',
    FOREIGN KEY (herd_id) REFERENCES herds(id) ON DELETE CASCADE
  );
`);
db.pragma("foreign_keys = ON");
const herdMemberColumns = new Set(db.prepare("PRAGMA table_info(herd_members)").all().map((column) => column.name));
if (!herdMemberColumns.has("color")) db.exec("ALTER TABLE herd_members ADD COLUMN color TEXT DEFAULT ''");
const raceColumns = new Set(db.prepare("PRAGMA table_info(races)").all().map((column) => column.name));
for (const [column, definition] of [
  ["notes", "TEXT DEFAULT ''"],
  ["attachment_path", "TEXT DEFAULT ''"],
  ["attachment_name", "TEXT DEFAULT ''"],
]) {
  if (!raceColumns.has(column)) db.exec(`ALTER TABLE races ADD COLUMN ${column} ${definition}`);
}

const horseCount = db.prepare("SELECT COUNT(*) AS count FROM horses").get().count;
if (horseCount === 0) {
  const insertHorse = db.prepare(`INSERT INTO horses (id,name,sex,breed,age,color,owner,location,image,accent) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const seed = [
    ["HU-2024-001","Бор Олбо","Азарга","Моринд","6 настай","Бор","Батбаяр Д.","Увс","/uploads/azraga.png","#b7e4cb"],
    ["HU-2024-018","Сартуул","Гүү","Соёмбо","5 настай","Саарал","Батбаяр Д.","Ховд","https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?auto=format&fit=crop&w=300&q=85","#d7d1ff"],
    ["HU-2023-042","Хара Ноён","Азарга","Адани","7 настай","Хар","Батбаяр Д.","Архангай","https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=300&q=85","#f1d39a"],
  ];
  seed.forEach((row) => insertHorse.run(...row));
}
if (db.prepare("SELECT COUNT(*) AS count FROM users").get().count === 0) {
  db.prepare("INSERT INTO users (name,role,phone,email) VALUES (?,?,?,?)").run("Батбаяр Д.","Үржлийн зөвлөх","+976 9911 2233","batbayar@example.mn");
}
if (!db.prepare("SELECT id FROM herds WHERE id = ?").get("herd-default")) {
  const stallion = db.prepare("SELECT id FROM horses WHERE sex LIKE '%Азарга%' ORDER BY created_at DESC LIMIT 1").get();
  db.prepare("INSERT INTO herds (id,name,stallion_id,description) VALUES (?,?,?,?)")
    .run("herd-default", "Азарга адуу", stallion?.id || null, "Азарга, гүү болон төлүүдийн сүргийн бүртгэл");
  const insertMember = db.prepare("INSERT INTO herd_members (herd_id,name,kind,sex,age,status,image) VALUES (?,?,?,?,?,?,?)");
  [
    ["Цагаан Сартуул", "mare", "Гүү", "5 настай", "үржилд", ""],
    ["Хөх Дэл", "mare", "Гүү", "6 настай", "үржилд", ""],
    ["Үүлэн", "mare", "Гүү", "4 настай", "үржилд", ""],
    ["Хонгор", "mare", "Гүү", "7 настай", "үржилд", ""],
    ["Сувай гүү", "mare", "Гүү", "8 настай", "сувай", ""],
    ["Хээр даага", "foal", "Эр", "1 настай", "", ""],
    ["Бор даага", "foal", "Эр", "1 настай", "", ""],
    ["Хүрэн даага", "foal", "Эр", "1 настай", "", ""],
    ["Цагаан унага", "foal", "Эм", "1 настай", "", ""],
  ].forEach((member) => insertMember.run("herd-default", ...member));
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadDir));
const removeUploadedFile = (urlPath) => {
  if (!urlPath?.startsWith("/uploads/")) return;
  const filePath = path.resolve(uploadDir, path.basename(urlPath));
  if (filePath.startsWith(`${uploadDir}${path.sep}`)) fs.rmSync(filePath, { force: true });
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/webp"].includes(file.mimetype)),
});
const raceFileUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      "application/pdf", "text/plain", "text/csv", "image/jpeg", "image/png", "image/webp",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]);
    if (!allowed.has(file.mimetype)) return cb(new Error("Амжилтын файл PDF, TXT, CSV, XLS, XLSX эсвэл зураг байх ёстой"));
    cb(null, true);
  },
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const herdSummaryQuery = `
  SELECT h.id, h.name, h.stallion_id, h.description,
    s.name AS stallion_name, s.image AS stallion_image, s.age AS stallion_age,
    (SELECT COUNT(*) FROM herd_members m WHERE m.herd_id = h.id) + CASE WHEN h.stallion_id IS NULL THEN 0 ELSE 1 END AS total_count,
    (SELECT COUNT(*) FROM herd_members m WHERE m.herd_id = h.id AND m.kind = 'mare') AS mare_count,
    (SELECT COUNT(*) FROM herd_members m WHERE m.herd_id = h.id AND m.kind = 'foal') AS foal_count,
    (SELECT COUNT(*) FROM herd_members m WHERE m.herd_id = h.id AND m.status = 'бусад сүргийн гишүүд') AS other_member_count
  FROM herds h LEFT JOIN horses s ON s.id = h.stallion_id
`;
app.get("/api/herds", (_req, res) => {
  res.json(db.prepare(herdSummaryQuery + " ORDER BY h.name").all());
});
app.post("/api/herds", (req, res) => {
  const name = String(req.body.name || "").trim();
  const stallionId = String(req.body.stallion_id || "").trim();
  if (!name) return res.status(400).json({ error: "Сүргийн нэр шаардлагатай" });
  const stallion = stallionId ? db.prepare("SELECT id, sex FROM horses WHERE id = ?").get(stallionId) : null;
  if (stallionId && (!stallion || !String(stallion.sex || "").includes("Азарга"))) {
    return res.status(400).json({ error: "Сонгосон адуу азарганы бүртгэл биш байна" });
  }
  if (db.prepare("SELECT id FROM herds WHERE name = ? COLLATE NOCASE").get(name)) {
    return res.status(409).json({ error: "Ийм нэртэй сүрэг бүртгэлтэй байна" });
  }
  const id = `herd-${crypto.randomBytes(6).toString("hex")}`;
  db.prepare("INSERT INTO herds (id,name,stallion_id,description) VALUES (?,?,?,?)")
    .run(id, name, stallionId || null, String(req.body.description || "").trim());
  res.status(201).json(db.prepare(herdSummaryQuery + " WHERE h.id = ?").get(id));
});
app.put("/api/herds/:id", (req, res) => {
  const current = db.prepare("SELECT * FROM herds WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Бүлэг олдсонгүй" });
  const name = String(req.body.name ?? current.name).trim();
  const stallionId = String(req.body.stallion_id ?? current.stallion_id ?? "").trim();
  const description = String(req.body.description ?? current.description ?? "").trim();
  if (!name) return res.status(400).json({ error: "Бүлгийн нэр шаардлагатай" });
  const duplicate = db.prepare("SELECT id FROM herds WHERE name = ? COLLATE NOCASE AND id != ?").get(name, req.params.id);
  if (duplicate) return res.status(409).json({ error: "Ийм нэртэй бүлэг бүртгэлтэй байна" });
  const stallion = stallionId ? db.prepare("SELECT id, sex FROM horses WHERE id = ?").get(stallionId) : null;
  if (stallionId && (!stallion || !String(stallion.sex || "").includes("Азарга"))) {
    return res.status(400).json({ error: "Сонгосон адуу азарганы бүртгэл биш байна" });
  }
  db.prepare("UPDATE herds SET name = ?, stallion_id = ?, description = ? WHERE id = ?")
    .run(name, stallionId || null, description, req.params.id);
  res.json(db.prepare(herdSummaryQuery + " WHERE h.id = ?").get(req.params.id));
});
app.delete("/api/herds/:id", (req, res) => {
  const result = db.prepare("DELETE FROM herds WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Бүлэг олдсонгүй" });
  res.status(204).end();
});
app.get("/api/herds/:id", (req, res) => {
  const herd = db.prepare(herdSummaryQuery + " WHERE h.id = ?").get(req.params.id);
  if (!herd) return res.status(404).json({ error: "Сүрэг олдсонгүй" });
  const stallion = herd.stallion_id ? db.prepare("SELECT * FROM horses WHERE id = ?").get(herd.stallion_id) : null;
  const members = db.prepare("SELECT * FROM herd_members WHERE herd_id = ? ORDER BY kind, status DESC, name").all(req.params.id);
  res.json({ ...herd, stallion, members });
});
app.post("/api/herds/:id/members", (req, res) => {
  if (!db.prepare("SELECT id FROM herds WHERE id = ?").get(req.params.id)) return res.status(404).json({ error: "Бүлэг олдсонгүй" });
  const name = String(req.body.name || "").trim();
  const kind = String(req.body.kind || "");
  if (!name) return res.status(400).json({ error: "Гишүүний нэр шаардлагатай" });
  if (!["mare", "foal"].includes(kind)) return res.status(400).json({ error: "Гишүүний төрөл буруу байна" });
  const result = db.prepare("INSERT INTO herd_members (herd_id,name,kind,sex,age,color,status,image) VALUES (?,?,?,?,?,?,?,?)")
    .run(req.params.id, name, kind, String(req.body.sex || "").trim(), String(req.body.age || "").trim(), String(req.body.color || "").trim(), String(req.body.status || "").trim(), "");
  res.status(201).json(db.prepare("SELECT * FROM herd_members WHERE id = ?").get(result.lastInsertRowid));
});
app.put("/api/herds/:herdId/members/:memberId", (req, res) => {
  const member = db.prepare("SELECT * FROM herd_members WHERE id = ? AND herd_id = ?").get(req.params.memberId, req.params.herdId);
  if (!member) return res.status(404).json({ error: "Бүлгийн гишүүн олдсонгүй" });
  const name = String(req.body.name ?? member.name).trim();
  const kind = String(req.body.kind ?? member.kind);
  if (!name) return res.status(400).json({ error: "Гишүүний нэр шаардлагатай" });
  if (!["mare", "foal"].includes(kind)) return res.status(400).json({ error: "Гишүүний төрөл буруу байна" });
  db.prepare("UPDATE herd_members SET name = ?, kind = ?, sex = ?, age = ?, color = ?, status = ? WHERE id = ?")
    .run(name, kind, String(req.body.sex ?? member.sex).trim(), String(req.body.age ?? member.age).trim(), String(req.body.color ?? member.color).trim(), String(req.body.status ?? member.status).trim(), member.id);
  res.json(db.prepare("SELECT * FROM herd_members WHERE id = ?").get(member.id));
});
app.delete("/api/herds/:herdId/members/:memberId", (req, res) => {
  const result = db.prepare("DELETE FROM herd_members WHERE id = ? AND herd_id = ?").run(req.params.memberId, req.params.herdId);
  if (!result.changes) return res.status(404).json({ error: "Бүлгийн гишүүн олдсонгүй" });
  res.status(204).end();
});

app.get("/api/horses", (req, res) => {
  const search = String(req.query.search || "").trim();
  const rows = search
    ? db.prepare("SELECT * FROM horses WHERE name LIKE ? OR id LIKE ? OR breed LIKE ? OR sex LIKE ? OR owner LIKE ? ORDER BY created_at DESC").all(...Array(5).fill(`%${search}%`))
    : db.prepare("SELECT * FROM horses ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/api/horses", upload.single("image"), (req, res) => {
  const body = req.body;
  if (!body.name?.trim()) return res.status(400).json({ error: "Адууны нэр шаардлагатай" });
  const id = body.id?.trim() || `HU-${new Date().getFullYear()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const existing = db.prepare("SELECT id FROM horses WHERE id = ?").get(id);
  if (existing) return res.status(409).json({ error: "Ижил IDтэй адуу байна" });
  const image = req.file ? `/uploads/${req.file.filename}` : body.image || "";
  db.prepare(`INSERT INTO horses (id,name,sex,breed,age,color,owner,location,image,accent) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, body.name.trim(), body.sex || "Азарга", body.breed || "", body.age || "", body.color || "", body.owner || "", body.location || "", image, body.accent || "#dce7df");
  res.status(201).json(db.prepare("SELECT * FROM horses WHERE id = ?").get(id));
});

app.put("/api/horses/:id", upload.single("image"), (req, res) => {
  const current = db.prepare("SELECT * FROM horses WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Адуу олдсонгүй" });
  const body = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : body.image ?? current.image;
  db.prepare(`UPDATE horses SET name=?,sex=?,breed=?,age=?,color=?,owner=?,location=?,image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(body.name ?? current.name, body.sex ?? current.sex, body.breed ?? current.breed, body.age ?? current.age, body.color ?? current.color, body.owner ?? current.owner, body.location ?? current.location, image, req.params.id);
  if (req.file && current.image !== image) removeUploadedFile(current.image);
  res.json(db.prepare("SELECT * FROM horses WHERE id = ?").get(req.params.id));
});

app.delete("/api/horses/:id", (req, res) => {
  const result = db.prepare("DELETE FROM horses WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Адуу олдсонгүй" });
  res.status(204).end();
});

app.get("/api/races", (req, res) => {
  const rows = req.query.horse_id
    ? db.prepare("SELECT * FROM races WHERE horse_id = ? ORDER BY race_date DESC").all(req.query.horse_id)
    : db.prepare("SELECT * FROM races ORDER BY race_date DESC").all();
  res.json(rows);
});
app.post("/api/races", raceFileUpload.single("attachment"), (req, res) => {
  const r = req.body;
  const notes = String(r.notes || "").trim();
  if (!notes && !req.file) return res.status(400).json({ error: "Амжилтын текст бичих эсвэл файл хавсаргана уу" });
  const eventName = String(r.event_name || "").trim() || "Тэмцээний амжилт";
  const result = db.prepare("INSERT INTO races (horse_id,event_name,race_date,distance,place,location,weather,notes,attachment_path,attachment_name) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(
      r.horse_id || "",
      eventName,
      r.race_date || "",
      r.distance || "",
      Number(r.place) || null,
      r.location || "",
      r.weather || "",
      notes,
      req.file ? `/uploads/${req.file.filename}` : "",
      req.file ? req.file.originalname : "",
    );
  res.status(201).json(db.prepare("SELECT * FROM races WHERE id = ?").get(result.lastInsertRowid));
});
app.put("/api/races/:id", raceFileUpload.single("attachment"), (req, res) => {
  const current = db.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Амжилтын бүртгэл олдсонгүй" });
  const r = req.body;
  const notes = Object.hasOwn(r, "notes") ? String(r.notes || "").trim() : current.notes || "";
  if (!notes && !req.file && !current.attachment_path) {
    return res.status(400).json({ error: "Амжилтын текст бичих эсвэл файл хавсаргана уу" });
  }
  const attachmentPath = req.file ? `/uploads/${req.file.filename}` : current.attachment_path || "";
  const attachmentName = req.file ? req.file.originalname : current.attachment_name || "";
  db.prepare(`UPDATE races SET event_name=?,race_date=?,distance=?,place=?,location=?,weather=?,notes=?,attachment_path=?,attachment_name=? WHERE id=?`)
    .run(
      r.event_name ?? current.event_name,
      r.race_date ?? current.race_date,
      r.distance ?? current.distance,
      r.place === undefined ? current.place : Number(r.place) || null,
      r.location ?? current.location,
      r.weather ?? current.weather,
      notes,
      attachmentPath,
      attachmentName,
      req.params.id,
    );
  if (req.file && current.attachment_path !== attachmentPath) removeUploadedFile(current.attachment_path);
  res.json(db.prepare("SELECT * FROM races WHERE id = ?").get(req.params.id));
});
app.delete("/api/races/:id", (req, res) => {
  const current = db.prepare("SELECT attachment_path FROM races WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Бичлэг олдсонгүй" });
  db.prepare("DELETE FROM races WHERE id = ?").run(req.params.id);
  removeUploadedFile(current.attachment_path);
  res.status(204).end();
});

app.get("/api/progeny", (req, res) => {
  res.json(db.prepare("SELECT * FROM progeny ORDER BY birth_year DESC").all());
});
app.post("/api/progeny", upload.single("image"), (req, res) => {
  const r = req.body;
  if (!r.name?.trim()) return res.status(400).json({ error: "Үр төлд нэр шаардлагатай" });
  const image = req.file ? `/uploads/${req.file.filename}` : r.image || "";
  const result = db.prepare("INSERT INTO progeny (name,sire_id,dam_id,birth_year,sex,image) VALUES (?,?,?,?,?,?)")
    .run(r.name.trim(), r.sire_id || "", r.dam_id || "", r.birth_year || "", r.sex || "", image);
  res.status(201).json(db.prepare("SELECT * FROM progeny WHERE id = ?").get(result.lastInsertRowid));
});
app.delete("/api/progeny/:id", (req, res) => {
  const result = db.prepare("DELETE FROM progeny WHERE id = ?").run(req.params.id);
  result.changes ? res.status(204).end() : res.status(404).json({ error: "Үр төл олдсонгүй" });
});

app.get("/api/pedigrees/:horseId", (req, res) => {
  const row = db.prepare("SELECT * FROM pedigrees WHERE horse_id = ?").get(req.params.horseId);
  res.json(row || { horse_id: req.params.horseId, sire_name: "", dam_name: "", grand_sire_name: "", grand_dam_name: "", generations: 3 });
});
app.put("/api/pedigrees/:horseId", (req, res) => {
  const r = req.body;
  db.prepare(`INSERT INTO pedigrees (horse_id,sire_id,dam_id,sire_name,dam_name,grand_sire_name,grand_dam_name,generations,updated_at)
    VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(horse_id) DO UPDATE SET sire_id=excluded.sire_id,dam_id=excluded.dam_id,sire_name=excluded.sire_name,
    dam_name=excluded.dam_name,grand_sire_name=excluded.grand_sire_name,grand_dam_name=excluded.grand_dam_name,
    generations=excluded.generations,updated_at=CURRENT_TIMESTAMP`)
    .run(req.params.horseId, r.sire_id || "", r.dam_id || "", r.sire_name || "", r.dam_name || "", r.grand_sire_name || "", r.grand_dam_name || "", Number(r.generations) || 3);
  res.json(db.prepare("SELECT * FROM pedigrees WHERE horse_id = ?").get(req.params.horseId));
});

app.get("/api/profile", (_req, res) => {
  res.json(db.prepare("SELECT * FROM users WHERE id = 1").get());
});

app.put("/api/profile", upload.single("avatar"), (req, res) => {
  const current = db.prepare("SELECT * FROM users WHERE id = 1").get();
  const avatar = req.file ? `/uploads/${req.file.filename}` : req.body.avatar || current.avatar;
  db.prepare("UPDATE users SET name=?,role=?,phone=?,email=?,avatar=? WHERE id=1")
    .run(req.body.name || current.name, req.body.role || current.role, req.body.phone || current.phone, req.body.email || current.email, avatar);
  res.json(db.prepare("SELECT * FROM users WHERE id = 1").get());
});

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Файлын хэмжээ 8 MB-аас их байна" });
  }
  if (error.message?.startsWith("Амжилтын файл")) return res.status(400).json({ error: error.message });
  console.error("API error:", error);
  res.status(500).json({ error: "Серверийн алдаа гарлаа" });
});

app.listen(port, "127.0.0.1", () => console.log(`Хурдан Унага API: http://127.0.0.1:${port}`));
