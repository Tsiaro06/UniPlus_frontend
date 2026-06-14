import { Bell, Search, ChevronDown, Menu, LogOut, UserCircle } from "lucide-react";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { auth } from "@/lib/api/client";

const labels: Record<string, string> = {
  dashboard: "Tableau de bord",
  etudiants: "Étudiants",
  enseignants: "Enseignants",
  inscriptions: "Inscriptions",
  departements: "Départements",
  filieres: "Filières",
  annees: "Années scolaires",
  semestres: "Semestres",
  groupes: "Groupes",
  ue: "Unités d'enseignement",
  matieres: "Matières",
  affectations: "Affectations",
  notes: "Notes",
  presences: "Présences",
  stages: "Stages",
  resultats: "Résultats",
  semestre: "Semestre",
  annuel: "Annuel",
  reports: "Rapports",
  bulletin: "Bulletins",
  settings: "Paramètres",
  saisie: "Saisie",
  create: "Nouveau",
  edit: "Modifier",
};

export function TopNavbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = auth.getUser<{ email?: string; nom?: string; prenom?: string }>();
  const initials = `${user?.prenom?.[0] ?? "A"}${user?.nom?.[0] ?? "A"}`.toUpperCase();
  const handleLogout = () => { auth.clear(); navigate({ to: "/login", replace: true }); };

  return (
    <header className="top-0 z-20 sticky flex items-center gap-4 bg-card/80 backdrop-blur-lg px-6 border-border border-b h-16">
      {/* ✅ Fix 1 : Menu → bon composant, onClick branché, className correct */}
      <button
        aria-label="Ouvrir le menu"
        onClick={onMenuClick}
        className="flex justify-center items-center hover:bg-muted rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      <nav className="flex items-center gap-1.5 text-sm">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Accueil</Link>
        {parts.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/50">/</span>
            <span className={i === parts.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}>
              {labels[p] ?? p}
            </span>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 ml-auto">
        <div className="hidden md:block relative">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
          <input
            placeholder="Rechercher..."
            aria-label="Rechercher"
            className="bg-background pr-3 pl-9 border border-border focus:border-primary rounded-lg outline-none focus:ring-2 focus:ring-primary/15 w-64 h-9 text-sm"
          />
        </div>

        {/* ✅ Fix 2 : aria-label ajouté sur le bouton Bell */}
        <button
          aria-label="Notifications"
          className="relative flex justify-center items-center hover:bg-muted rounded-lg w-9 h-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-5 h-5" />
          <span className="top-1.5 right-1.5 absolute bg-danger rounded-full ring-2 ring-card w-2 h-2" />
        </button>

        <button className="flex items-center gap-2 bg-background hover:bg-muted px-3 border border-border rounded-lg h-9 font-medium text-foreground text-sm">
          <span className="hidden sm:inline">2025-2026</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="relative">
          {/* ✅ Fix 3 : aria-label ajouté sur le bouton profil */}
          <button
            aria-label={`Menu utilisateur — ${user?.prenom ?? "Admin"} ${user?.nom ?? ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 hover:bg-muted pr-2 pl-1 rounded-lg h-9"
          >
            <div className="flex justify-center items-center bg-primary rounded-full w-7 h-7 font-semibold text-white text-xs">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="top-11 right-0 absolute bg-card shadow-lg border border-border rounded-lg w-52 overflow-hidden">
              <div className="p-3 border-border border-b">
                <div className="font-semibold text-sm">{user?.prenom || "Admin"} {user?.nom || ""}</div>
                <div className="text-muted-foreground text-xs">{user?.email || "admin@univ.dz"}</div>
              </div>
              <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 hover:bg-muted px-3 py-2 text-sm">
                <UserCircle className="w-4 h-4" /> Profil
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-2 hover:bg-muted px-3 py-2 w-full text-danger text-sm"
              >
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}