import { useEffect, useState } from "react";
import Header from "./header";
import {
  FaEye,
  FaEyeSlash,
  FaCrown,
  FaUser,
  FaCog,
  FaStore,
  FaInfoCircle,
  FaTrash,
  FaPlus,
} from "react-icons/fa";

interface User {
  id: number;
  nomUtilisateur: string;
  motDePasse: string;
  isAdmin: boolean;
}

type TabId = "users" | "prefs" | "pharmacy" | "about";

const API_URL = "http://localhost:7194/api/utilisateurs";

// ─── localStorage-backed preferences ───────────────────────────────────────
const PREFS_KEY = "pharmaPrefs";
const PHARMA_KEY = "pharmaInfos";

type Prefs = {
  lowStockThreshold: number;
  expiryAlertMonths: number;
  showBarcodeBeep: boolean;
  confirmBeforeDelete: boolean;
  autoClearCart: boolean;
};
const defaultPrefs: Prefs = {
  lowStockThreshold: 5,
  expiryAlertMonths: 3,
  showBarcodeBeep: true,
  confirmBeforeDelete: true,
  autoClearCart: true,
};

type PharmaInfos = {
  nom: string;
  adresse: string;
  telephone: string;
  ice: string;
  pharmacien: string;
  tva: string;
};
const defaultPharma: PharmaInfos = {
  nom: "Pharmacie El Abawain",
  adresse: "",
  telephone: "",
  ice: "",
  pharmacien: "",
  tva: "20",
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

// ───────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

  const [prefs, setPrefs] = useState<Prefs>(() => loadJSON(PREFS_KEY, defaultPrefs));
  const [pharma, setPharma] = useState<PharmaInfos>(() =>
    loadJSON(PHARMA_KEY, defaultPharma)
  );
  const [savedToast, setSavedToast] = useState("");

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur lors du chargement des utilisateurs");
        setLoading(false);
      });
  }, []);

  const persistPrefs = (next: Prefs) => {
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    flashToast("Préférences enregistrées");
  };
  const persistPharma = (next: PharmaInfos) => {
    setPharma(next);
    localStorage.setItem(PHARMA_KEY, JSON.stringify(next));
    flashToast("Informations pharmacie enregistrées");
  };
  const flashToast = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(""), 1800);
  };

  // User ops
  const handleAddUser = () => {
    setError("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomUtilisateur: newUsername.trim(),
        motDePasse: newPassword,
        isAdmin: false,
      }),
    })
      .then((res) => {
        if (res.status === 409) throw new Error("Ce nom d'utilisateur existe déjà");
        if (!res.ok) throw new Error("Erreur lors de l'ajout");
        return res.json();
      })
      .then((u) => {
        setUsers([...users, u]);
        setNewUsername("");
        setNewPassword("");
      })
      .catch((err) => setError(err.message));
  };

  const handleDeleteUser = (id: number) => {
    setError("");
    if (users.length === 1) {
      setError("Vous ne pouvez pas supprimer le dernier utilisateur");
      return;
    }
    if (prefs.confirmBeforeDelete && !window.confirm("Supprimer cet utilisateur ?"))
      return;

    fetch(`${API_URL}/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur lors de la suppression");
        setUsers(users.filter((u) => u.id !== id));
      })
      .catch(() => setError("Impossible de supprimer l'utilisateur"));
  };

  const toggleAdmin = (user: User) => {
    const updated = { ...user, isAdmin: !user.isAdmin };
    fetch(`${API_URL}/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      })
      .catch(() => setError("Impossible de mettre à jour le rôle"));
  };

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── render helpers ────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "users", label: "Utilisateurs", icon: FaUser },
    { id: "prefs", label: "Préférences", icon: FaCog },
    { id: "pharmacy", label: "Pharmacie", icon: FaStore },
    { id: "about", label: "À propos", icon: FaInfoCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header titre="Réglages" />

      <div className="max-w-[1200px] mx-auto px-6 pt-5 pb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Réglages
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gérez les utilisateurs et les préférences de l'application
            </p>
          </div>
          {savedToast && (
            <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              ✓ {savedToast}
            </div>
          )}
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <nav className="w-56 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === id
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="text-sm" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab === "users" && (
              <UsersTab
                users={users}
                loading={loading}
                error={error}
                newUsername={newUsername}
                newPassword={newPassword}
                setNewUsername={setNewUsername}
                setNewPassword={setNewPassword}
                handleAddUser={handleAddUser}
                handleDeleteUser={handleDeleteUser}
                toggleAdmin={toggleAdmin}
                togglePasswordVisibility={togglePasswordVisibility}
                visiblePasswords={visiblePasswords}
              />
            )}

            {tab === "prefs" && (
              <PrefsTab prefs={prefs} onSave={persistPrefs} />
            )}

            {tab === "pharmacy" && (
              <PharmacyTab pharma={pharma} onSave={persistPharma} />
            )}

            {tab === "about" && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────
function UsersTab(props: any) {
  const {
    users,
    loading,
    error,
    newUsername,
    newPassword,
    setNewUsername,
    setNewPassword,
    handleAddUser,
    handleDeleteUser,
    toggleAdmin,
    togglePasswordVisibility,
    visiblePasswords,
  } = props;
  return (
    <div className="space-y-4">
      <Section
        title="Ajouter un utilisateur"
        subtitle="Les nouveaux comptes sont créés par défaut comme utilisateurs normaux."
      >
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nom utilisateur"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
          <button
            onClick={handleAddUser}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <FaPlus className="text-xs" /> Ajouter
          </button>
        </div>
      </Section>

      <Section title={`Liste des utilisateurs (${users.length})`}>
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Nom utilisateur", "Mot de passe", "Rôle", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user: User) => {
                  const isVisible = visiblePasswords.has(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {user.nomUtilisateur}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {isVisible
                              ? user.motDePasse
                              : "•".repeat(Math.min(user.motDePasse.length, 12))}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {isVisible ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full">
                            <FaCrown className="text-[10px]" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
                            Utilisateur
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleAdmin(user)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              user.isAdmin
                                ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {user.isAdmin ? "Retirer admin" : "Rendre admin"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-2.5 py-1 text-xs font-medium bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <FaTrash className="text-[10px]" /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Préférences tab ───────────────────────────────────────────────────────
function PrefsTab({ prefs, onSave }: { prefs: Prefs; onSave: (p: Prefs) => void }) {
  const [local, setLocal] = useState(prefs);
  const dirty = JSON.stringify(local) !== JSON.stringify(prefs);

  return (
    <Section
      title="Préférences de l'application"
      subtitle="Ces réglages sont stockés localement sur cette machine."
      actions={
        dirty && (
          <button
            onClick={() => onSave(local)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md"
          >
            Enregistrer
          </button>
        )
      }
    >
      <div className="space-y-4">
        <NumberField
          label="Seuil de stock faible"
          help="Un médicament avec une quantité ≤ cette valeur apparaît comme 'stock faible'."
          value={local.lowStockThreshold}
          min={0}
          max={100}
          onChange={(v) => setLocal({ ...local, lowStockThreshold: v })}
          suffix="unités"
        />
        <NumberField
          label="Alerte péremption"
          help="Les médicaments expirant dans ≤ cette durée sont signalés."
          value={local.expiryAlertMonths}
          min={1}
          max={24}
          onChange={(v) => setLocal({ ...local, expiryAlertMonths: v })}
          suffix="mois"
        />
        <Toggle
          label="Bip sonore au scan code-barres"
          value={local.showBarcodeBeep}
          onChange={(v) => setLocal({ ...local, showBarcodeBeep: v })}
        />
        <Toggle
          label="Confirmation avant suppression"
          help="Demande une confirmation lors de la suppression d'un utilisateur / produit."
          value={local.confirmBeforeDelete}
          onChange={(v) => setLocal({ ...local, confirmBeforeDelete: v })}
        />
        <Toggle
          label="Vider le panier après une vente"
          value={local.autoClearCart}
          onChange={(v) => setLocal({ ...local, autoClearCart: v })}
        />
      </div>
    </Section>
  );
}

// ── Pharmacie tab ─────────────────────────────────────────────────────────
function PharmacyTab({
  pharma,
  onSave,
}: {
  pharma: PharmaInfos;
  onSave: (p: PharmaInfos) => void;
}) {
  const [local, setLocal] = useState(pharma);
  const dirty = JSON.stringify(local) !== JSON.stringify(pharma);
  return (
    <Section
      title="Informations de la pharmacie"
      subtitle="Ces informations apparaissent sur les factures / reçus PDF."
      actions={
        dirty && (
          <button
            onClick={() => onSave(local)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md"
          >
            Enregistrer
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          label="Nom de la pharmacie"
          value={local.nom}
          onChange={(v) => setLocal({ ...local, nom: v })}
        />
        <TextField
          label="Pharmacien titulaire"
          value={local.pharmacien}
          onChange={(v) => setLocal({ ...local, pharmacien: v })}
        />
        <TextField
          label="Adresse"
          value={local.adresse}
          onChange={(v) => setLocal({ ...local, adresse: v })}
          className="md:col-span-2"
        />
        <TextField
          label="Téléphone"
          value={local.telephone}
          onChange={(v) => setLocal({ ...local, telephone: v })}
        />
        <TextField
          label="ICE"
          value={local.ice}
          onChange={(v) => setLocal({ ...local, ice: v })}
        />
        <TextField
          label="TVA (%)"
          value={local.tva}
          onChange={(v) => setLocal({ ...local, tva: v })}
          type="number"
        />
      </div>
    </Section>
  );
}

// ── À propos ──────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <Section title="À propos">
      <div className="space-y-4 text-sm text-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 64 64" className="w-8 h-8">
              <rect x="26" y="14" width="12" height="36" rx="2" fill="#fff" />
              <rect x="14" y="26" width="36" height="12" rx="2" fill="#fff" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">PharmaPro</p>
            <p className="text-xs text-slate-500">Version 1.0 · © 2025</p>
          </div>
        </div>
        <p>
          Logiciel de gestion pour Pharmacie El Abawain : caisse, stock, crédits,
          commandes et statistiques.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
          <Info label="Backend" value="http://localhost:7194" />
          <Info label="Frontend" value="http://localhost:5173" />
          <Info label="Base" value="SQL Server · dataBD" />
        </div>
      </div>
    </Section>
  );
}

// ── Primitives ────────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  help,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  help?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {help && <p className="text-xs text-slate-500 mt-0.5">{help}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
        />
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {help && <p className="text-xs text-slate-500 mt-0.5">{help}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          value ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </p>
      <p className="text-xs font-mono text-slate-800 truncate">{value}</p>
    </div>
  );
}
