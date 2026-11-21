import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Search, GitFork, Trophy, Baby, BarChart3,
  Stethoscope, Settings, HelpCircle, Bell, ChevronDown, Plus,
  MoreHorizontal, ArrowUpRight, ArrowRight, SlidersHorizontal,
  Users, Medal, MapPin, CalendarDays, Heart, CheckCircle2, Trash2, X,
  FileText, Upload, Pencil
} from "lucide-react";
import "./styles.css";

const initialHorses = [
  { name: "Бор Олбо", id: "HU-2024-001", sex: "Азарга", breed: "Моринд", age: "6 настай", image: "/uploads/azraga.png", accent: "#b7e4cb" },
  { name: "Сартуул", id: "HU-2024-018", sex: "Гүү", breed: "Соёмбо", age: "5 настай", image: "https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?auto=format&fit=crop&w=300&q=85", accent: "#d7d1ff" },
  { name: "Хара Ноён", id: "HU-2023-042", sex: "Азарга", breed: "Адани", age: "7 настай", image: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&w=300&q=85", accent: "#f1d39a" },
];

const nav = [
  ["dashboard", LayoutDashboard, "Хяналтын самбар"],
  ["horse", Search, "Адууны бүртгэл"],
  ["pedigree", GitFork, "Удам угшил"],
  ["race", Trophy, "Уралдааны амжилт"],
  ["progeny", Baby, "Үр төл"],
  ["breeding", Heart, "Хослолын шинжилгээ"],
  ["analytics", BarChart3, "Статистик"],
  ["herd", Users, "Сүргийн бүтэц"],
];

const herdMemberStatuses = [
  ["үржилд", "Үржилд"],
  ["унагатай гүү", "Унагатай гүү"],
  ["хусран гүү", "Хусран гүү"],
  ["сувай гүү", "Сувай гүү"],
  ["хээлтэй гүү", "Хээлтэй гүү"],
  ["унага алдсан гүү", "Унага алдсан гүү"],
  ["бусад сүргийн гишүүд", "Бусад сүргийн гишүүд"],
];

function App() {
  const [active, setActive] = useState("dashboard");
  const [horses, setHorses] = useState(initialHorses);
  const [selected, setSelected] = useState(horses[0]);
  const [herds, setHerds] = useState([]);
  const [herdDetail, setHerdDetail] = useState(null);
  const [selectedHerdId, setSelectedHerdId] = useState(null);
  const [showHerdForm, setShowHerdForm] = useState(false);
  const [editingHerd, setEditingHerd] = useState(null);
  const [showHerdMemberForm, setShowHerdMemberForm] = useState(false);
  const [editingHerdMember, setEditingHerdMember] = useState(null);
  const [detailHerdMember, setDetailHerdMember] = useState(null);
  const [herdFilter, setHerdFilter] = useState("all");
  const [showHorseForm, setShowHorseForm] = useState(false);
  const [editingHorse, setEditingHorse] = useState(null);
  const [savingHorse, setSavingHorse] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [editingRace, setEditingRace] = useState(null);
  const [showPedigreeForm, setShowPedigreeForm] = useState(false);
  const [savingRace, setSavingRace] = useState(false);
  const [savingPedigree, setSavingPedigree] = useState(false);
  const [detailHorse, setDetailHorse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [horseRaces, setHorseRaces] = useState([]);
  const [horsePedigree, setHorsePedigree] = useState(null);
  const [deletingHorse, setDeletingHorse] = useState(false);
  const [profile, setProfile] = useState({ name: "Батбаяр Д.", role: "Үржлийн зөвлөх", phone: "", email: "", avatar: "" });
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/horses").then((r) => r.ok ? r.json() : []),
      fetch("/api/profile").then((r) => r.ok ? r.json() : null),
      fetch("/api/herds").then((r) => r.ok ? r.json() : []),
    ])
      .then(([horseRows, profileRow, herdRows]) => {
        setHorses(horseRows.map((horse) => ({ ...horse, accent: horse.accent || "#dce7df" })));
        setSelected(horseRows[0] || null);
        if (profileRow) setProfile(profileRow);
        setHerds(herdRows);
      })
      .catch(() => openDashboardAction("Сервертэй холбогдсонгүй"));
  }, []);

  useEffect(() => {
    if (active !== "herd" || !selectedHerdId) {
      setHerdDetail(null);
      return;
    }
    fetch(`/api/herds/${encodeURIComponent(selectedHerdId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Сүргийн мэдээлэл ачаалсангүй");
        setHerdDetail(await response.json());
      })
      .catch((error) => openDashboardAction(error.message));
  }, [active, selectedHerdId]);

  const modules = {
    horse: { title: "Адууны бүртгэл", text: "Адуу нэмэх, засах, хайх" },
    pedigree: { title: "Удам угшил", text: "Эцэг эх, ах дүү, төрөл садны мэдээлэл" },
    race: { title: "Уралдааны амжилт", text: "Уралдааны байр, нас, зай, нөхцөл" },
    progeny: { title: "Үр төл", text: "Үр төл болон эцэг, эхийн холболт" },
    breeding: { title: "Хослолын шинжилгээ", text: "Азарга, гүүний хослолын үнэлгээ" },
    analytics: { title: "Статистик", text: "Амжилт, хувьсал, өгөгдлийн тайлан" },
  };

  const savePedigree = async (event) => {
    event.preventDefault();
    if (!detailHorse || savingPedigree) return;
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    setSavingPedigree(true);
    try {
      const response = await fetch(`/api/pedigrees/${encodeURIComponent(detailHorse.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Удам угшил хадгалагдсангүй");
      setHorsePedigree(result);
      setShowPedigreeForm(false);
      openDashboardAction("Удам угшлын мэдээлэл хадгалагдлаа");
    } catch (error) {
      openDashboardAction(error.message || "Удам угшил хадгалах үед алдаа гарлаа");
    } finally {
      setSavingPedigree(false);
    }
  };

  const saveRace = async (event) => {
    event.preventDefault();
    if (!detailHorse || savingRace) return;
    const formData = new FormData(event.currentTarget);
    const attachment = formData.get("attachment");
    const notes = String(formData.get("notes") || "").trim();
    if (!notes && !(attachment instanceof File && attachment.size > 0) && !editingRace?.attachment_path) {
      openDashboardAction("Амжилтын текст бичих эсвэл файл хавсаргана уу");
      return;
    }
    formData.set("horse_id", detailHorse.id);
    setSavingRace(true);
    try {
      const response = await fetch(editingRace ? `/api/races/${editingRace.id}` : "/api/races", {
        method: editingRace ? "PUT" : "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Амжилт хадгалагдсангүй");
      setHorseRaces((rows) => editingRace
        ? rows.map((race) => race.id === result.id ? result : race)
        : [result, ...rows]);
      setShowRaceForm(false);
      setEditingRace(null);
      openDashboardAction(editingRace ? "Уралдааны амжилт шинэчлэгдлээ" : "Уралдааны амжилт хадгалагдлаа");
    } catch (error) {
      openDashboardAction(error.message || "Амжилт хадгалах үед алдаа гарлаа");
    } finally {
      setSavingRace(false);
    }
  };

  const saveHorse = async (event) => {
    event.preventDefault();
    if (savingHorse) return;
    setSavingHorse(true);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(editingHorse ? `/api/horses/${encodeURIComponent(editingHorse.id)}` : "/api/horses", {
        method: editingHorse ? "PUT" : "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Адууны мэдээлэл хадгалагдсангүй");
      const updatedHorse = { ...result, accent: result.accent || "#dce7df" };
      setHorses((rows) => editingHorse
        ? rows.map((horse) => horse.id === result.id ? updatedHorse : horse)
        : [updatedHorse, ...rows]);
      setSelected(updatedHorse);
      if (editingHorse) setDetailHorse(updatedHorse);
      setShowHorseForm(false);
      setEditingHorse(null);
      openDashboardAction(editingHorse ? "Адууны мэдээлэл шинэчлэгдлээ" : "Адууны мэдээлэл хадгалагдлаа");
    } catch (error) {
      openDashboardAction(error.message || "Адууны мэдээлэл хадгалах үед алдаа гарлаа");
    } finally {
      setSavingHorse(false);
    }
  };

  const openDashboardAction = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const refreshHerdData = async (herdId = selectedHerdId) => {
    const responses = await Promise.all([
      fetch("/api/herds"),
      herdId ? fetch(`/api/herds/${encodeURIComponent(herdId)}`) : Promise.resolve(null),
    ]);
    if (!responses[0].ok || (responses[1] && !responses[1].ok)) throw new Error("Сүргийн мэдээлэл шинэчилж чадсангүй");
    setHerds(await responses[0].json());
    if (responses[1]) setHerdDetail(await responses[1].json());
  };

  const saveHerd = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(editingHerd ? `/api/herds/${encodeURIComponent(editingHerd.id)}` : "/api/herds", {
        method: editingHerd ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Бүлэг хадгалагдсангүй");
      setShowHerdForm(false);
      setEditingHerd(null);
      setSelectedHerdId(result.id);
      await refreshHerdData(result.id);
      openDashboardAction(editingHerd ? "Бүлгийн мэдээлэл шинэчлэгдлээ" : "Шинэ бүлэг бүртгэгдлээ");
    } catch (error) {
      openDashboardAction(error.message || "Бүлэг хадгалах үед алдаа гарлаа");
    }
  };

  const saveHerdMember = async (event) => {
    event.preventDefault();
    if (!selectedHerdId) return;
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(editingHerdMember
        ? `/api/herds/${encodeURIComponent(selectedHerdId)}/members/${editingHerdMember.id}`
        : `/api/herds/${encodeURIComponent(selectedHerdId)}/members`, {
        method: editingHerdMember ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Гишүүний мэдээлэл хадгалагдсангүй");
      setShowHerdMemberForm(false);
      setEditingHerdMember(null);
      setDetailHerdMember(result);
      await refreshHerdData(selectedHerdId);
      openDashboardAction(editingHerdMember ? "Гишүүний мэдээлэл шинэчлэгдлээ" : "Гишүүн бүлэгт нэмэгдлээ");
    } catch (error) {
      openDashboardAction(error.message || "Гишүүн хадгалах үед алдаа гарлаа");
    }
  };

  const deleteHerdMember = async (member) => {
    if (!window.confirm(`${member.name} гишүүнийг бүлгээс устгах уу?`)) return;
    try {
      const response = await fetch(`/api/herds/${encodeURIComponent(selectedHerdId)}/members/${member.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Гишүүн устгасангүй");
      }
      setDetailHerdMember(null);
      await refreshHerdData(selectedHerdId);
      openDashboardAction("Гишүүн бүлгээс хасагдлаа");
    } catch (error) {
      openDashboardAction(error.message || "Гишүүн устгах үед алдаа гарлаа");
    }
  };

  const deleteHerd = async (herd) => {
    if (!window.confirm(`“${herd.name}” бүлэг болон доторх бүх гишүүнийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    try {
      const response = await fetch(`/api/herds/${encodeURIComponent(herd.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Бүлэг устгасангүй");
      }
      setHerds((rows) => rows.filter((row) => row.id !== herd.id));
      setSelectedHerdId(null);
      setHerdDetail(null);
      setHerdFilter("all");
      openDashboardAction("Бүлэг болон гишүүд устгагдлаа");
    } catch (error) {
      openDashboardAction(error.message || "Бүлэг устгах үед алдаа гарлаа");
    }
  };

  const filteredHorses = horses.filter((horse) =>
    `${horse.name} ${horse.id} ${horse.sex} ${horse.breed}`.toLowerCase().includes(search.toLowerCase())
  );

  const showHorseDetails = async (horse) => {
    setDetailHorse(horse);
    setConfirmDelete(false);
    try {
      const [racesResponse, pedigreeResponse] = await Promise.all([
        fetch(`/api/races?horse_id=${encodeURIComponent(horse.id)}`),
        fetch(`/api/pedigrees/${encodeURIComponent(horse.id)}`),
      ]);
      if (!racesResponse.ok || !pedigreeResponse.ok) throw new Error("Адууны дэлгэрэнгүй мэдээлэл ачаалсангүй");
      setHorseRaces(await racesResponse.json());
      setHorsePedigree(await pedigreeResponse.json());
    } catch (error) {
      openDashboardAction(error.message || "Адууны мэдээлэл ачаалсангүй");
    }
  };

  const deleteHorse = async () => {
    if (!detailHorse || deletingHorse) return;
    setDeletingHorse(true);
    try {
      const response = await fetch(`/api/horses/${encodeURIComponent(detailHorse.id)}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Адуу устгагдсангүй");
      }
      setHorses((rows) => rows.filter((horse) => horse.id !== detailHorse.id));
      if (selected?.id === detailHorse.id) setSelected(horses.find((horse) => horse.id !== detailHorse.id) || null);
      setDetailHorse(null);
      setConfirmDelete(false);
      openDashboardAction(`${detailHorse.name} бүртгэлээс устгагдлаа`);
    } catch (error) {
      openDashboardAction(error.message || "Адуу устгах үед алдаа гарлаа");
    } finally {
      setDeletingHorse(false);
    }
  };

  const renderModule = () => {
    if (active === "herd") return renderHerdModule();
    const module = modules[active];
    if (!module) return null;

    return (
      <section className="module-page">
        <div className="module-title">
          <div><span className="eyebrow">ХУРДАН УНАГА</span><h2>{module.title}</h2><p>{module.text}</p></div>
          {active === "horse" && <button className="primary" onClick={() => setShowHorseForm(true)}><Plus size={17}/>Адуу бүртгэх</button>}
          {active === "race" && <button className="primary" onClick={() => openDashboardAction("Уралдааны бүртгэлийн цонх нээлттэй")}>Уралдаан нэмэх</button>}
          {active === "breeding" && <button className="primary" onClick={() => openDashboardAction("Шинэ хослолын шинжилгээ эхэллээ")}>Хослол сонгох</button>}
        </div>

        <div className="module-toolbar">
          <label><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Адууны нэр, ID, зүсээр хайх..."/></label>
          <button className="filter-button"><SlidersHorizontal size={16}/>Шүүлтүүр</button>
        </div>

        <div className="module-grid">
          {active === "pedigree" ? (
            <div className="pedigree-card wide-card">
              <h3>Сартуул — удам угшлын мод</h3>
              <div className="pedigree-tree">
                <div className="pedigree-row grand"><span>Өвөг</span><b>Саруул Ноён</b></div>
                <div className="pedigree-row"><span>Эцэг</span><b>Бор Олбо</b></div>
                <div className="pedigree-row main"><span>Гүү</span><b>Сартуул</b></div>
                <div className="pedigree-row"><span>Үргэлжилж 3 үе...</span><b /></div>
              </div>
            </div>
          ) : active === "breeding" ? (
            <>
              <div className="panel breeding-detail wide-card">
                <div className="panel-heading"><div><h3>Шинжилгээний дүн</h3><p>Тодорхойлолтын түвшин: 86%</p></div></div>
                <div className="breeding-bars">
                  {[["Удам угшил",92],["Үржлийн амжилт",84],["Галбирын нийцэл",78],["Уралдааны потенциал",88]].map(([label,value]) =>
                    <div key={label}><span>{label}<b>{value}%</b></span><div className="bar"><i style={{width:`${value}%`}}/></div></div>
                  )}
                </div>
              </div>
              <div className="panel recommendation"><CheckCircle2 size={24}/><h3>AI дүгнэлт</h3><p>Сайн хослол. Удам угшилд дотоод уялдаа 92% байна.</p></div>
            </>
          ) : (
            filteredHorses.length ? filteredHorses.map((horse) => (
              <button className="module-horse-card" key={horse.id} onClick={() => { setSelected(horse); showHorseDetails(horse); }}>
                <img src={horse.image} alt={horse.name}/>
                <div><strong>{horse.name}</strong><small>{horse.id}</small></div>
                <span>{horse.sex}</span>
              </button>
            )) : <p className="empty-horses">Хайлтад тохирох адуу олдсонгүй.</p>
          )}
        </div>
      </section>
    );
  };

  const renderHerdModule = () => {
    const herd = herdDetail;
    const visibleMembers = (herd?.members || []).filter((member) => {
      if (herdFilter === "mares") return member.kind === "mare";
      if (herdFilter === "foals") return member.kind === "foal";
      if (herdFilter === "other-members") return member.status === "бусад сүргийн гишүүд";
      return true;
    });

    return (
      <section className="module-page herd-page">
        <div className="module-title">
          <div><span className="eyebrow">СТАТИСТИК · СҮРГИЙН БҮТЭЦ</span><h2>{herd?.name || "Сүргийн бүтэц"}</h2><p>{herd ? herd.description || "Бүлгийн гишүүдийн бүртгэл" : "Өөрийн сүргийн бүлгүүдийг үүсгэж, гишүүдээ бүртгэнэ үү"}</p></div>
          {herd
            ? <div className="herd-header-actions"><button className="filter-button" onClick={() => { setEditingHerd(herd); setShowHerdForm(true); }}><Pencil size={14}/>Бүлэг засах</button><button className="danger-button" onClick={() => deleteHerd(herd)}><Trash2 size={14}/>Бүлэг устгах</button><button className="filter-button" onClick={() => { setSelectedHerdId(null); setHerdFilter("all"); }}><ArrowRight size={15}/>Бүлгийн жагсаалт</button></div>
            : <button className="primary" onClick={() => { setEditingHerd(null); setShowHerdForm(true); }}><Plus size={17}/>Бүлэг нэмэх</button>}
        </div>
        {!selectedHerdId ? (
          <div className="herd-list-grid">
            {herds.map((item) => (
              <button className="herd-list-card" key={item.id} onClick={() => { setSelectedHerdId(item.id); setHerdFilter("all"); }}>
                <img src={item.stallion_image || "/uploads/azraga.png"} alt={item.stallion_name || item.name}/>
                <span className="herd-list-card-body"><small>СҮРГИЙН БҮЛЭГ</small><strong>{item.name}</strong><span>Азарга: {item.stallion_name || "холбоогүй"}</span><span>Нийт {item.total_count} · {item.mare_count} гүү · {item.foal_count} төл</span></span>
                <ArrowRight size={18}/>
              </button>
            ))}
            {!herds.length && <div className="panel herd-loading">Одоогоор бүлэг бүртгээгүй байна. “Бүлэг нэмэх” товчоор шинээр үүсгэнэ үү.</div>}
          </div>
        ) : !herd ? <div className="panel herd-loading">Сүргийн мэдээлэл ачаалж байна...</div> : (
          <>
            {herd.stallion && <button className="herd-stallion" onClick={() => showHorseDetails(herd.stallion)}>
              <img src={herd.stallion?.image || "/uploads/azraga.png"} alt={herd.stallion?.name || "Азарга"}/>
              <span className="herd-stallion-copy"><small>ХОЛБОГДСОН АЗАРГА</small><strong>{herd.stallion.name}</strong><span>{herd.stallion.id}</span></span>
              <span className="herd-stallion-meta">{herd.stallion?.age || ""} <ArrowRight size={17}/></span>
            </button>}
            <div className="herd-count-grid">
              <button className={herdFilter === "all" ? "herd-count active" : "herd-count"} onClick={() => setHerdFilter("all")}><span className="herd-count-icon purple"><Users size={20}/></span><span><small>Нийт сүргийн тоо</small><strong>{herd.total_count}</strong></span></button>
              <button className={herdFilter === "mares" ? "herd-count active" : "herd-count"} onClick={() => setHerdFilter(herdFilter === "mares" ? "all" : "mares")}><span className="herd-count-icon green"><Heart size={20}/></span><span><small>Нийт гүү</small><strong>{herd.mare_count}</strong></span></button>
              <button className={herdFilter === "foals" ? "herd-count active" : "herd-count"} onClick={() => setHerdFilter(herdFilter === "foals" ? "all" : "foals")}><span className="herd-count-icon blue"><Baby size={20}/></span><span><small>Нийт төл</small><strong>{herd.foal_count}</strong></span></button>
              <button className={herdFilter === "other-members" ? "herd-count active" : "herd-count"} onClick={() => setHerdFilter(herdFilter === "other-members" ? "all" : "other-members")}><span className="herd-count-icon amber"><Users size={20}/></span><span><small>Бусад сүргийн гишүүд</small><strong>{herd.other_member_count}</strong></span></button>
            </div>
            <section className="panel herd-members-panel">
              <div className="panel-heading">
                <div><h3>{herdFilter === "all" ? "Бүлгийн гишүүд" : herdFilter === "mares" ? "Гүүнүүд" : herdFilter === "foals" ? "Төлүүд" : "Бусад сүргийн гишүүд"}</h3><p>Бүртгэгдсэн гишүүд · {visibleMembers.length}</p></div>
                <button className="primary herd-add-member" onClick={() => { setEditingHerdMember(null); setShowHerdMemberForm(true); }}><Plus size={15}/>Гишүүн нэмэх</button>
                {herdFilter !== "all" && <button className="text-button" onClick={() => setHerdFilter("all")}>Бүгдийг харуулах <X size={14}/></button>}
              </div>
              <div className="herd-members-list">
                {visibleMembers.map((member) => (
                  <article className="herd-member" key={member.id}>
                    <span className={`herd-member-icon ${member.kind === "mare" ? "mare" : "foal"}`}>{member.kind === "mare" ? <Heart size={17}/> : <Baby size={17}/>}</span>
                    <button className="herd-member-name" onClick={() => setDetailHerdMember(member)}><strong>{member.name}</strong><small>{member.kind === "mare" ? "Гүү" : member.sex === "Эр" ? "Эр төл" : "Эм төл"}</small></button>
                    <span className="herd-member-color">{member.color || "Зүс —"}</span>
                    <span className="herd-member-age">{member.age || "Нас бүртгээгүй"}</span>
                    {member.status && <span className={`status-tag ${member.status === "үржилд" ? "breeding" : ""}`}>{herdMemberStatuses.find(([value]) => value === member.status)?.[1] || (member.status === "сувай" ? "Сувай гүү" : member.status)}</span>}
                    <button className="icon-button herd-member-edit" aria-label={`${member.name} засах`} onClick={() => { setEditingHerdMember(member); setShowHerdMemberForm(true); }}><Pencil size={14}/></button>
                    <button className="icon-button herd-member-edit" aria-label={`${member.name} устгах`} onClick={() => deleteHerdMember(member)}><Trash2 size={14}/></button>
                  </article>
                ))}
                {!visibleMembers.length && <p className="empty-horses">Энэ ангилалд бүртгэл алга.</p>}
              </div>
            </section>
          </>
        )}
      </section>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <path d="M10 31c6-1 8-6 8-12 0-5 3-9 8-9 4 0 7 3 7 7 0 6-5 11-12 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M17 34c2-5 7-7 12-7M13 18l-5-4M29 11l4-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div><strong>ХУРДАН</strong><span>УНАГА</span></div>
        </div>

        <nav>
          {nav.map(([key, Icon, label]) => (
            <button key={key} title={label} aria-label={label} className={active === key ? "active" : ""} onClick={() => { if (key === "herd") setSelectedHerdId(null); setActive(key); }}>
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
          {!horses.length && <p className="empty-horses">Бүртгэлтэй адуу алга. “Бүгдийг харах” хэсгээс шинээр бүртгэнэ үү.</p>}
        </nav>

        <div className="side-bottom">
          <button><Stethoscope size={19} /><span>Малын эмч</span></button>
          <button onClick={() => setShowProfileForm(true)}><Settings size={19} /><span>Тохиргоо</span></button>
          <button><HelpCircle size={19} /><span>Тусламж</span></button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">Өнөөдөр, 21 Хүнсэлмэн</p>
            <h1>Сайн байна уу, {profile.name?.split(" ")[0] || "Батбаяр"}</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={20}/><i /></button>
            <button className="profile" onClick={() => setShowProfileForm(true)}>
              {profile.avatar
                ? <span className="avatar"><img src={profile.avatar} alt="" /></span>
                : <span className="avatar">{profile.name?.charAt(0) || "Б"}</span>}
              <span><strong>{profile.name}</strong><small>{profile.role}</small></span>
              <ChevronDown size={16}/>
            </button>
          </div>
        </header>

        <section className="content">
          {active === "dashboard" ? (
          <>
          <div className="hero">
            <div className="hero-copy">
              <span className="hero-tag">ХУРДАН УНАГА</span>
              <h2>Удамшлын дээд үнэ цэнийг<br/>хамт олж мэдье</h2>
              <p>Адуу бүртгэж, удам угшилтай холбон ухаалаг хослолын дүгнэлт аваарай.</p>
              <button className="primary" onClick={() => setShowHorseForm(true)}><Plus size={18}/>Шинэ адуу бүртгэх</button>
            </div>
            <div className="hero-art">
              <div className="sun"/>
              <div className="mountain one"/>
              <div className="mountain two"/>
              <img src="/uploads/azraga.png" alt="Бор Олбо азарга"/>
            </div>
          </div>

          <div className="stats-grid">
            <article>
              <div className="stat-icon green"><Search size={20}/></div>
              <div><span>Нийт адуу</span><strong>248</strong></div>
              <small className="up"><ArrowUpRight size={13}/>12 энэ сарын</small>
            </article>
            <article>
              <div className="stat-icon blue"><GitFork size={20}/></div>
              <div><span>Удам угшил</span><strong>186</strong></div>
              <small>75% бүрэн</small>
            </article>
            <article>
              <div className="stat-icon amber"><Medal size={20}/></div>
              <div><span>Уралдааны ялагч</span><strong>34</strong></div>
              <small className="up"><ArrowUpRight size={13}/>8% өсөлт</small>
            </article>
            <article>
              <div className="stat-icon red"><Baby size={20}/></div>
              <div><span>Үр төл</span><strong>92</strong></div>
              <small>18 насанд хүрсэн</small>
            </article>
          </div>

          <div className="dashboard-grid">
            <section className="panel horses-panel">
              <div className="panel-heading">
                <div><h3>Сүүлд бүртгэгдсэн адуу</h3><p>Манай сан дахь хамгийн шинэ бүртгэлүүд</p></div>
                <button className="text-button" onClick={() => setActive("horse")}>Бүгдийг харах <ArrowRight size={15}/></button>
              </div>
              <div className="horse-list">
                {horses.map((horse) => (
                  <button className={`horse-row ${selected?.id === horse.id ? "selected" : ""}`} key={horse.id} onClick={() => { setSelected(horse); showHorseDetails(horse); }}>
                    <span className="horse-thumb" style={{background: horse.accent}}><img src={horse.image} alt="" /></span>
                    <span className="horse-name"><strong>{horse.name}</strong><small>{horse.id}</small></span>
                    <span className="sex">{horse.sex}</span>
                    <span className="breed">{horse.breed}</span>
                    <span className="age">{horse.age}</span>
                    <MoreHorizontal size={18}/>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel breeding-panel">
              <div className="panel-heading">
                <div><h3>Хослолын шинжилгээ</h3><p>Сүүлийн 30 хоног</p></div>
                <button className="icon-button subtle"><SlidersHorizontal size={17}/></button>
              </div>
              <div className="matchup">
                <div className="match-horse">
                    <span><img src={horses[0]?.image || "/uploads/azraga.png"} alt=""/></span>
                    <strong>{horses[0]?.name || "Азарга сонгоно уу"}</strong><small>{horses[0]?.sex || "—"}</small>
                </div>
                <div className="match-score">
                  <div className="rings"><span>86</span><small>оноо</small></div>
                  <b><Heart size={13}/> Сайн хослол</b>
                </div>
                <div className="match-horse">
                  <span><img src={horses[1]?.image || "/uploads/azraga.png"} alt=""/></span>
                  <strong>{horses[1]?.name || "Гүү сонгоно уу"}</strong><small>{horses[1]?.sex || "—"}</small>
                </div>
              </div>
              <div className="compatibility">
                <div><span>Удам угшил</span><b>92%</b></div>
                <div className="bar"><i style={{width:"92%"}}/></div>
                <div><span>Үржлийн амжилт</span><b>84%</b></div>
                <div className="bar"><i style={{width:"84%"}}/></div>
              </div>
              <button className="outline-button" onClick={() => setActive("breeding")}>Дэлгэрэнгүй шинжилгээ <ArrowRight size={16}/></button>
            </section>
          </div>
          </>
          ) : renderModule()}
        </section>
      </main>
      {showHorseForm && (
        <div className={editingHorse ? "modal-backdrop edit-horse-backdrop" : "modal-backdrop"} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !savingHorse && setShowHorseForm(false)}>
          <form className="horse-modal" onSubmit={saveHorse}>
            <div className="modal-heading"><div><span className="eyebrow">{editingHorse ? "АДУУНЫ МЭДЭЭЛЭЛ" : "ШИНЭ БҮРТГЭЛ"}</span><h2>{editingHorse ? "Адуу засах" : "Адууны мэдээлэл"}</h2></div><button type="button" disabled={savingHorse} onClick={() => { setShowHorseForm(false); setEditingHorse(null); }}>×</button></div>
            <div className="form-grid">
              <label>Адууны нэр<input name="name" required defaultValue={editingHorse?.name || ""} placeholder="Жишээ: Алтан Шувуу"/></label>
              <label>Хүйс<select name="sex" defaultValue={editingHorse?.sex || "Азарга"}><option>Азарга</option><option>Гүү</option><option>Эр төл</option><option>Эм төл</option></select></label>
              <label>Нас<input name="age" defaultValue={editingHorse?.age || ""} placeholder="Жишээ: 6 настай"/></label>
              <label>Зүс<input name="color" defaultValue={editingHorse?.color || ""} placeholder="Бор, саарал..."/></label>
              <label>Үүлдэр/угшил<input name="breed" defaultValue={editingHorse?.breed || ""} placeholder="Жишээ: Моринд"/></label>
              <label>Эзэмшигч<input name="owner" defaultValue={editingHorse?.owner || ""} placeholder="Эзэмшигчийн нэр"/></label>
              <label>Байршил<input name="location" defaultValue={editingHorse?.location || ""} placeholder="Аймаг, сум"/></label>
              <label>Адууны зураг<input name="image" type="file" accept="image/jpeg,image/png,image/webp"/></label>
            </div>
            {editingHorse?.image && <p className="form-hint">Одоогийн зураг хадгалагдана. Шинэ зураг сонговол солино.</p>}
            <button className="primary modal-submit" type="submit" disabled={savingHorse}><CheckCircle2 size={17}/>{savingHorse ? "Хадгалж байна..." : editingHorse ? "Өөрчлөлт хадгалах" : "Бүртгэл хадгалах"}</button>
          </form>
        </div>
      )}
      {showHerdForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowHerdForm(false)}>
          <form className="horse-modal" onSubmit={saveHerd}>
            <div className="modal-heading"><div><span className="eyebrow">{editingHerd ? "БҮЛГИЙН МЭДЭЭЛЭЛ" : "ШИНЭ БҮЛЭГ"}</span><h2>{editingHerd ? "Бүлэг засах" : "Сүргийн бүлэг нэмэх"}</h2></div><button type="button" onClick={() => { setShowHerdForm(false); setEditingHerd(null); }}>×</button></div>
            <div className="form-grid">
              <label>Бүлгийн нэр<input name="name" required defaultValue={editingHerd?.name || ""} placeholder="Жишээ: Манай удмын гүү"/></label>
              <label>Холбогдох азарга (сонголтоор)<select name="stallion_id" defaultValue={editingHerd?.stallion_id || ""}><option value="">Азарга холбохгүй</option>{horses.filter((horse) => String(horse.sex || "").includes("Азарга")).map((horse) => <option key={horse.id} value={horse.id}>{horse.name} · {horse.id}</option>)}</select></label>
              <label className="form-wide">Тайлбар<input name="description" defaultValue={editingHerd?.description || ""} placeholder="Бүлгийн тухай нэмэлт мэдээлэл"/></label>
            </div>
            <button className="primary modal-submit" type="submit"><CheckCircle2 size={17}/>{editingHerd ? "Өөрчлөлт хадгалах" : "Бүлэг хадгалах"}</button>
          </form>
        </div>
      )}
      {showHerdMemberForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowHerdMemberForm(false)}>
          <form className="horse-modal" onSubmit={saveHerdMember}>
            <div className="modal-heading"><div><span className="eyebrow">{herdDetail?.name || "СҮРГИЙН БҮЛЭГ"}</span><h2>{editingHerdMember ? "Гишүүн засах" : "Шинэ гишүүн бүртгэх"}</h2></div><button type="button" onClick={() => { setShowHerdMemberForm(false); setEditingHerdMember(null); }}>×</button></div>
            <div className="form-grid">
              <label>Нэр<input name="name" required defaultValue={editingHerdMember?.name || ""} placeholder="Гишүүний нэр"/></label>
              <label>Төрөл<select name="kind" defaultValue={editingHerdMember?.kind || "mare"}><option value="mare">Гүү</option><option value="foal">Төл</option></select></label>
              <label>Хүйс<select name="sex" defaultValue={editingHerdMember?.sex || "Эм"}><option>Эм</option><option>Эр</option></select></label>
              <label>Нас<input name="age" defaultValue={editingHerdMember?.age || ""} placeholder="Жишээ: 5 настай"/></label>
              <label>Зүс<input name="color" defaultValue={editingHerdMember?.color || ""} placeholder="Бор, саарал..."/></label>
              <label>Төлөв<select name="status" defaultValue={editingHerdMember?.status || ""}><option value="">Төлөв сонгохгүй</option>{herdMemberStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <button className="primary modal-submit" type="submit"><CheckCircle2 size={17}/>{editingHerdMember ? "Өөрчлөлт хадгалах" : "Гишүүн бүртгэх"}</button>
          </form>
        </div>
      )}
      {detailHerdMember && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetailHerdMember(null)}>
          <section className="horse-modal herd-member-detail" role="dialog" aria-modal="true" aria-labelledby="herd-member-title">
            <div className="modal-heading"><div><span className="eyebrow">{herdDetail?.name || "СҮРГИЙН БҮЛЭГ"}</span><h2 id="herd-member-title">{detailHerdMember.name}</h2></div><button type="button" onClick={() => setDetailHerdMember(null)}>×</button></div>
            <dl className="herd-member-details">
              <div><dt>Төрөл</dt><dd>{detailHerdMember.kind === "mare" ? "Гүү" : "Төл"}</dd></div>
              <div><dt>Хүйс</dt><dd>{detailHerdMember.sex || "Бүртгээгүй"}</dd></div>
              <div><dt>Зүс</dt><dd>{detailHerdMember.color || "Бүртгээгүй"}</dd></div>
              <div><dt>Нас</dt><dd>{detailHerdMember.age || "Бүртгээгүй"}</dd></div>
              <div><dt>Төлөв</dt><dd>{detailHerdMember.status || "Бүртгээгүй"}</dd></div>
            </dl>
            <div className="herd-member-detail-actions"><button className="filter-button" onClick={() => { setEditingHerdMember(detailHerdMember); setShowHerdMemberForm(true); setDetailHerdMember(null); }}><Pencil size={14}/>Засах</button><button className="danger-button" onClick={() => deleteHerdMember(detailHerdMember)}><Trash2 size={14}/>Устгах</button></div>
          </section>
        </div>
      )}
      {showProfileForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowProfileForm(false)}>
          <form className="horse-modal" onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const response = await fetch("/api/profile", { method: "PUT", body: formData });
            if (!response.ok) return openDashboardAction("Профайл хадгалагдсангүй");
            setProfile(await response.json());
            setShowProfileForm(false);
            openDashboardAction("Профайл шинэчлэгдлээ");
          }}>
            <div className="modal-heading"><div><span className="eyebrow">ХЭРЭГЛЭГЧИЙН МЭДЭЭЛЭЛ</span><h2>Профайл засах</h2></div><button type="button" onClick={() => setShowProfileForm(false)}>×</button></div>
            <div className="form-grid">
              <label>Нэр<input name="name" required defaultValue={profile.name}/></label>
              <label>Үүрэг<input name="role" defaultValue={profile.role}/></label>
              <label>Утас<input name="phone" defaultValue={profile.phone || ""}/></label>
              <label>Имэйл<input name="email" type="email" defaultValue={profile.email || ""}/></label>
              <label>Профайл зураг<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"/></label>
            </div>
            <button className="primary modal-submit" type="submit"><CheckCircle2 size={17}/>Профайл хадгалах</button>
          </form>
        </div>
      )}
      {showRaceForm && detailHorse && (
        <div className="modal-backdrop race-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !savingRace && setShowRaceForm(false)}>
          <form className="horse-modal race-modal" onSubmit={saveRace}>
            <div className="modal-heading"><div><span className="eyebrow">{detailHorse.name} · АМЖИЛТ</span><h2>{editingRace ? "Уралдааны амжилт засах" : "Уралдааны амжилт бүртгэх"}</h2></div><button type="button" disabled={savingRace} onClick={() => { setShowRaceForm(false); setEditingRace(null); }}>×</button></div>
            <div className="form-grid">
              <label>Уралдааны нэр<input name="event_name" defaultValue={editingRace?.event_name || ""} placeholder="Жишээ: Ардын хувьсгалын ой"/></label>
              <label>Огноо<input name="race_date" type="date" defaultValue={editingRace?.race_date || ""}/></label>
              <label>Зай<input name="distance" defaultValue={editingRace?.distance || ""} placeholder="Жишээ: 25 км"/></label>
              <label>Эзэлсэн байр<input name="place" type="number" min="1" defaultValue={editingRace?.place || ""} placeholder="Жишээ: 1"/></label>
              <label>Байршил<input name="location" defaultValue={editingRace?.location || ""} placeholder="Аймаг, сум"/></label>
              <label>Нөхцөл<input name="weather" defaultValue={editingRace?.weather || ""} placeholder="Цаг агаар, замын нөхцөл"/></label>
              <label className="form-wide">Амжилтын тайлбар<textarea name="notes" rows="4" defaultValue={editingRace?.notes || ""} placeholder="Байр, уралдааны явц болон бусад мэдээллийг текстээр бичих эсвэл доорх файлаар хавсаргана уу."/></label>
              <label className="form-wide race-upload-label"><span>Нотлох файл <small>PDF, зураг, TXT, CSV, XLS, XLSX · 8 MB хүртэл</small></span><input name="attachment" type="file" accept=".pdf,.txt,.csv,.xls,.xlsx,image/jpeg,image/png,image/webp"/></label>
            </div>
            <div className="race-form-footer"><span>{editingRace?.attachment_name ? `Одоогийн файл: ${editingRace.attachment_name}` : "Текстээр эсвэл файл хавсаргаж хадгална."}</span><button className="primary" type="submit" disabled={savingRace}><Upload size={16}/>{savingRace ? "Хадгалж байна..." : editingRace ? "Өөрчлөлт хадгалах" : "Амжилт хадгалах"}</button></div>
          </form>
        </div>
      )}
      {showPedigreeForm && detailHorse && (
        <div className="modal-backdrop race-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !savingPedigree && setShowPedigreeForm(false)}>
          <form className="horse-modal race-modal" onSubmit={savePedigree}>
            <div className="modal-heading"><div><span className="eyebrow">{detailHorse.name} · УДАМ УГШИЛ</span><h2>Удам угшил бүртгэх / засах</h2></div><button type="button" disabled={savingPedigree} onClick={() => setShowPedigreeForm(false)}>×</button></div>
            <div className="form-grid">
              <label>Эцгийн нэр<input name="sire_name" defaultValue={horsePedigree?.sire_name || ""} placeholder="Эцэг адууны нэр"/></label>
              <label>Эцгийн ID<input name="sire_id" defaultValue={horsePedigree?.sire_id || ""} placeholder="Бүртгэлийн ID (байвал)"/></label>
              <label>Эхийн нэр<input name="dam_name" defaultValue={horsePedigree?.dam_name || ""} placeholder="Эх адууны нэр"/></label>
              <label>Эхийн ID<input name="dam_id" defaultValue={horsePedigree?.dam_id || ""} placeholder="Бүртгэлийн ID (байвал)"/></label>
              <label>Өвөг эцгийн нэр<input name="grand_sire_name" defaultValue={horsePedigree?.grand_sire_name || ""} placeholder="Эцгийн эцэг"/></label>
              <label>Өвөг эхийн нэр<input name="grand_dam_name" defaultValue={horsePedigree?.grand_dam_name || ""} placeholder="Эцгийн эх"/></label>
              <label>Хэдэн үеийн мэдээлэл<input name="generations" type="number" min="1" max="20" defaultValue={horsePedigree?.generations || 3}/></label>
            </div>
            <div className="race-form-footer"><span>Бүртгэсэн мэдээлэл энэ адууны профайлд хадгалагдана.</span><button className="primary" type="submit" disabled={savingPedigree}><CheckCircle2 size={16}/>{savingPedigree ? "Хадгалж байна..." : "Удам угшил хадгалах"}</button></div>
          </form>
        </div>
      )}
      {detailHorse && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetailHorse(null)}>
          <section className="horse-detail-modal" role="dialog" aria-modal="true" aria-labelledby="horse-detail-title">
            <div className="detail-top">
              <div><span className="eyebrow">АДУУНЫ ДЭЛГЭРЭНГҮЙ</span><h2 id="horse-detail-title">{detailHorse.name}</h2><p>{detailHorse.id}</p></div>
              <button className="close-detail" aria-label="Хаах" onClick={() => setDetailHorse(null)}><X size={19}/></button>
            </div>
            <div className="detail-main">
              <img className="detail-photo" src={detailHorse.image || "/uploads/azraga.png"} alt={detailHorse.name}/>
              <div className="detail-fields">
                <div><span>Хүйс</span><strong>{detailHorse.sex || "Бүртгээгүй"}</strong></div>
                <div><span>Нас</span><strong>{detailHorse.age || "Бүртгээгүй"}</strong></div>
                <div><span>Зүс</span><strong>{detailHorse.color || "Бүртгээгүй"}</strong></div>
                <div><span>Үүлдэр / угшил</span><strong>{detailHorse.breed || "Бүртгээгүй"}</strong></div>
                <div><span>Эзэмшигч</span><strong>{detailHorse.owner || "Бүртгээгүй"}</strong></div>
                <div><span>Байршил</span><strong>{detailHorse.location || "Бүртгээгүй"}</strong></div>
                <div><span>Бүртгэсэн огноо</span><strong>{detailHorse.created_at ? new Date(`${detailHorse.created_at.replace(" ", "T")}Z`).toLocaleDateString("mn-MN") : "—"}</strong></div>
              </div>
            </div>
            <div className="detail-related">
              <section>
                <div className="race-heading">
                  <h3><GitFork size={16}/>Удам угшил</h3>
                  <button className="race-add-button" onClick={() => setShowPedigreeForm(true)}><Pencil size={14}/>{horsePedigree?.sire_name || horsePedigree?.dam_name ? "Засах" : "Удам угшил нэмэх"}</button>
                </div>
                <p>Эцэг: <strong>{horsePedigree?.sire_name || "Мэдээлэл бүртгээгүй"}</strong></p>
                <p>Эх: <strong>{horsePedigree?.dam_name || "Мэдээлэл бүртгээгүй"}</strong></p>
                <p>Өвөг эцэг: <strong>{horsePedigree?.grand_sire_name || "Мэдээлэл бүртгээгүй"}</strong></p>
                <p>Өвөг эх: <strong>{horsePedigree?.grand_dam_name || "Мэдээлэл бүртгээгүй"}</strong></p>
              </section>
              <section>
                <div className="race-heading">
                  <h3><Trophy size={16}/>Уралдааны амжилт</h3>
                  <button className="race-add-button" onClick={() => { setEditingRace(null); setShowRaceForm(true); }}><Plus size={14}/>Амжилт бүртгэх</button>
                </div>
                {horseRaces.length ? horseRaces.map((race) => (
                  <article className="race-record" key={race.id}>
                    <p>{race.race_date || "Огноогүй"} · {race.event_name || "Уралдаан"} · {race.place ? `${race.place}-р байр` : "Байр бүртгээгүй"}</p>
                    {(race.distance || race.location) && <small>{[race.distance, race.location].filter(Boolean).join(" · ")}</small>}
                    {race.notes && <p className="race-notes">{race.notes}</p>}
                    {race.attachment_path && <a className="race-file-link" href={race.attachment_path} target="_blank" rel="noreferrer"><FileText size={14}/>{race.attachment_name || "Хавсаргасан файл"}</a>}
                    <button className="race-edit-button" onClick={() => { setEditingRace(race); setShowRaceForm(true); }}><Pencil size={13}/>Засах</button>
                  </article>
                )) : <p>Уралдааны амжилт бүртгээгүй</p>}
              </section>
            </div>
            <div className="detail-actions">
              <button className="outline-button edit-horse-button" onClick={() => { setEditingHorse(detailHorse); setShowHorseForm(true); }}><Pencil size={15}/>Адуу засах</button>
              <button className="outline-button" onClick={() => setConfirmDelete(true)}><Trash2 size={16}/>Адуу устгах</button>
              <button className="primary" onClick={() => setDetailHorse(null)}>Хаах</button>
            </div>
          </section>
        </div>
      )}
      {confirmDelete && detailHorse && (
        <div className="modal-backdrop confirm-backdrop" role="presentation">
          <section className="delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
            <span className="delete-icon"><Trash2 size={22}/></span>
            <h2 id="delete-title">Адууны бүртгэл устгах уу?</h2>
            <p><strong>{detailHorse.name}</strong> ({detailHorse.id}) бүртгэлийг устгавал буцаах боломжгүй.</p>
            <div>
              <button className="filter-button" disabled={deletingHorse} onClick={() => setConfirmDelete(false)}>Болих</button>
              <button className="danger-button" disabled={deletingHorse} onClick={deleteHorse}>{deletingHorse ? "Устгаж байна..." : "Тийм, устгах"}</button>
            </div>
          </section>
        </div>
      )}
      {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}</div>}
    </div>
  );
}

const container = document.getElementById("root");
const root = import.meta.hot?.data.root ?? createRoot(container);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(<App />);
