/* ================================================================
   WPInfo24 — Pointage | app.js
   ================================================================

   ⚙️  CONFIGURATION — MODIFIE TON LIEN ONEDRIVE ICI
   ================================================================ */
const ONEDRIVE_URL = "https://sncf-my.sharepoint.com/:x:/r/personal/9301004m_commun_ad_sncf_fr/_layouts/15/Doc.aspx?sourcedoc=%7B3E5D1FE8-CEBA-4DAF-8FA5-BB9FD329B4D9%7D&file=Pointage%20PRM%206%201.xlsx&fromShare=true&action=default&mobileredirect=true";
/* ================================================================ */

const HEURES_JOUR = 7.75;   // Durée de la journée en heures décimales
const NB_LIGNES   = 10;
const STORAGE_KEY = "wpinfo24_pointage_v1";

/* ----------------------------------------------------------------
   INITIALISATION
---------------------------------------------------------------- */
function init() {
  buildRows();
  chargerDepuisStorage();
  setDateAujourdhui();
  attachListeners();
  updateCounter();
}

function buildRows() {
  const container = document.getElementById("rows-container");
  container.innerHTML = "";
  for (let i = 0; i < NB_LIGNES; i++) {
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <span class="row-num">${i + 1}</span>
      <input type="text"   id="of-${i}"  placeholder="OF…"  oninput="onInput()">
      <input type="text"   id="sym-${i}" placeholder="Sym…" oninput="onInput()">
      <input type="number" id="tps-${i}" placeholder="0.00" step="0.25" min="0" max="24" oninput="onInput()">
    `;
    container.appendChild(row);
  }
}

function setDateAujourdhui() {
  const d = document.getElementById("field-date");
  if (!d.value) {
    d.value = formatDateISO(new Date());
  }
}

function attachListeners() {
  document.getElementById("field-nom").addEventListener("input",  sauvegarderSilencieux);
  document.getElementById("field-date").addEventListener("input", sauvegarderSilencieux);
}

/* ----------------------------------------------------------------
   CALCUL DU COMPTEUR — TOUT EN HEURES DÉCIMALES
   Les temps saisis (ex : 1.75, 0.5, 2.25) sont additionnés tels
   quels. Le décompte restant s'affiche aussi en décimal (ex :
   "5.75" et non "5h45"). Pas de conversion en minutes nulle part.
---------------------------------------------------------------- */
function getTotalHeures() {
  let total = 0;
  for (let i = 0; i < NB_LIGNES; i++) {
    const v = parseFloat(document.getElementById(`tps-${i}`).value) || 0;
    total += v;
  }
  /* Arrondi à 2 décimales pour éliminer les erreurs flottantes (ex: 0.1+0.2) */
  return Math.round(total * 100) / 100;
}

function updateCounter() {
  const total = getTotalHeures();
  const reste = Math.round((HEURES_JOUR - total) * 100) / 100;

  const el  = document.getElementById("counter-display");
  const bar = document.getElementById("progress-bar");
  const tot = document.getElementById("total-heures");

  /* Total pointé en bas du tableau, toujours en décimal */
  tot.textContent = total.toFixed(2);

  el.classList.remove("neg", "done", "extra");

  if (reste > 0.001) {
    /* --- Journée en cours : rouge décroissant, ex "5.75" --- */
    el.textContent = reste.toFixed(2);
    el.classList.add("neg");
    const pct = Math.max(0, (reste / HEURES_JOUR) * 100);
    bar.style.width      = pct.toFixed(2) + "%";
    bar.style.background = "#ff4d4d";

  } else if (reste >= -0.001) {
    /* --- Pile poil : vert fixe "0.00" --- */
    el.textContent = "0.00";
    el.classList.add("done");
    bar.style.width      = "100%";
    bar.style.background = "#2ecc71";

  } else {
    /* --- Heures supplémentaires : vert avec +, ex "+1.00" --- */
    const supp = Math.abs(reste);
    el.textContent = "+" + supp.toFixed(2);
    el.classList.add("extra");
    bar.style.width      = "100%";
    bar.style.background = "#2ecc71";
  }
}

function onInput() {
  updateCounter();
  sauvegarderSilencieux();
}

/* ----------------------------------------------------------------
   SAUVEGARDE LOCALE (localStorage)
---------------------------------------------------------------- */
function getEtat() {
  const rows = [];
  for (let i = 0; i < NB_LIGNES; i++) {
    rows.push({
      of:  document.getElementById(`of-${i}`).value,
      sym: document.getElementById(`sym-${i}`).value,
      tps: document.getElementById(`tps-${i}`).value,
    });
  }
  return {
    nom:     document.getElementById("field-nom").value,
    date:    document.getElementById("field-date").value,
    rows,
    savedAt: new Date().toISOString(),
  };
}

function chargerEtat(etat) {
  document.getElementById("field-nom").value  = etat.nom  || "";
  document.getElementById("field-date").value = etat.date || "";
  if (etat.rows) {
    etat.rows.forEach((r, i) => {
      if (i >= NB_LIGNES) return;
      document.getElementById(`of-${i}`).value  = r.of  || "";
      document.getElementById(`sym-${i}`).value = r.sym || "";
      document.getElementById(`tps-${i}`).value = r.tps || "";
    });
  }
  updateCounter();
}

function sauvegarder() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getEtat()));
    toast("✓ Sauvegardé avec succès", "success");
  } catch (e) {
    toast("Erreur de sauvegarde : " + e.message, "error");
  }
}

function sauvegarderSilencieux() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getEtat()));
  } catch (e) { /* silencieux */ }
}

function chargerDepuisStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) chargerEtat(JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

/* ----------------------------------------------------------------
   NOUVELLE JOURNÉE
---------------------------------------------------------------- */
function nouvelleJournee() {
  if (!confirm("Démarrer une nouvelle journée ?\nLes données actuelles seront effacées.")) return;
  localStorage.removeItem(STORAGE_KEY);
  for (let i = 0; i < NB_LIGNES; i++) {
    document.getElementById(`of-${i}`).value  = "";
    document.getElementById(`sym-${i}`).value = "";
    document.getElementById(`tps-${i}`).value = "";
  }
  document.getElementById("field-nom").value  = "";
  document.getElementById("field-date").value = formatDateISO(new Date());
  updateCounter();
  toast("Nouvelle journée démarrée ✓", "success");
}

/* ----------------------------------------------------------------
   EXPORT CSV + ONEDRIVE
---------------------------------------------------------------- */
function envoyerOneDrive() {
  const etat  = getEtat();
  const total = getTotalHeures();

  const lignesCsv = [
    ["Nom", "Date", "OF", "Symbole", "Temps (h)"],
    ...etat.rows
      .filter(r => r.of || r.sym || r.tps)
      .map(r => [etat.nom, etat.date, r.of, r.sym, r.tps]),
    [],
    ["Total", "", "", "", total.toFixed(2)],
  ];

  const csv = lignesCsv
    .map(row => row.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");

  /* Téléchargement */
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const nom  = etat.nom ? etat.nom.replace(/\s+/g, "_") : "pointage";

  a.href     = url;
  a.download = `Pointage_${nom}_${etat.date || "date"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  /* Ouverture OneDrive */
  if (ONEDRIVE_URL && ONEDRIVE_URL !== "https://VOTRE-LIEN-ONEDRIVE-ICI") {
    window.open(ONEDRIVE_URL, "_blank");
    toast("Fichier téléchargé → OneDrive ouvert !\nGlisse le fichier CSV dedans.", "success");
  } else {
    toast("Fichier CSV téléchargé ✓\nConfigure ONEDRIVE_URL dans app.js", "success");
  }
}

/* ----------------------------------------------------------------
   UTILITAIRES
---------------------------------------------------------------- */
function formatDateISO(date) {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const dd   = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = "show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3500);
}

/* ---- DÉMARRAGE ---- */
init();
