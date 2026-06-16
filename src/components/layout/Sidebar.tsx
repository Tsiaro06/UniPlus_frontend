import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, CalendarDays, Building2, GraduationCap, Users,
  BookOpen, FileText, Link2, UserCircle, UserCog, ClipboardList,
  Hash, CheckSquare, Briefcase, BarChart3, Trophy, FileBarChart,
  Settings, Plus, ChevronLeft, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Section = { title: string; items: Item[] };

const sections: Section[] = [
  { title: "Principal", items: [
    { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  ]},
  { title: "Académique", items: [
    { to: "/annees", label: "Années scolaires", icon: Calendar },
    { to: "/semestres", label: "Semestres", icon: CalendarDays },
    { to: "/departements", label: "Départements", icon: Building2 },
    { to: "/filieres", label: "Filières", icon: GraduationCap },
    { to: "/groupes", label: "Groupes", icon: Users },
  ]},
  { title: "Cursus", items: [
    { to: "/ue", label: "Unités d'enseignement", icon: BookOpen },
    { to: "/matieres", label: "Matières", icon: FileText },
    { to: "/affectations", label: "Affectations", icon: Link2 },
  ]},
  { title: "Personnes", items: [
    { to: "/etudiants", label: "Étudiants", icon: UserCircle },
    { to: "/enseignants", label: "Enseignants", icon: UserCog },
    { to: "/inscriptions", label: "Inscriptions", icon: ClipboardList },
  ]},
  { title: "Évaluation", items: [
    { to: "/notes", label: "Notes", icon: Hash },
    { to: "/presences", label: "Présences", icon: CheckSquare },
    { to: "/stages", label: "Stages", icon: Briefcase },
  ]},
  { title: "Résultats", items: [
    { to: "/resultats/semestre", label: "Résultats semestre", icon: BarChart3 },
    { to: "/resultats/annuel", label: "Résultats annuels", icon: Trophy },
    { to: "/reports/bulletin", label: "Bulletins", icon: FileBarChart },
  ]},
  { title: "Système", items: [
    { to: "/settings", label: "Paramètres", icon: Settings },
  ]},
];

export function UniLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-1">
      <div className="relative flex justify-center items-center bg-primary shadow-md shadow-primary/30 rounded-lg w-9 h-9 text-white">
        <GraduationCap className="w-5 h-5" />
        <div className="-top-1 -right-1 absolute flex justify-center items-center bg-white rounded-full ring-2 ring-primary w-4 h-4 text-primary">
          <Plus className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-slate-900 text-base">
            Uni<span className="text-primary">Plus</span>
          </span>
          <span className="font-medium text-[10px] text-slate-500">LMD System</span>
        </div>
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((s) => {
      initial[s.title] = true;
    });
    return initial;
  });

  function toggleSection(title: string) {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  return (
    <aside
      className={cn(
        "left-0 z-30 fixed inset-y-0 flex flex-col bg-white border-slate-100 border-r text-slate-900 transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="flex justify-between items-center px-4 border-slate-100 border-b h-16">
        <UniLogo collapsed={collapsed} />
      </div>
      <nav className="flex-1 px-2 py-3 overflow-x-hidden overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            <div className="px-2">
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex justify-between items-center hover:bg-slate-50 px-3 py-2 rounded-md w-full font-semibold text-slate-700 text-sm"
                >
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">{section.title}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", openSections[section.title] && "rotate-180")} />
                </button>
              ) : (
                <div className="flex justify-center items-center py-2">
                  <span className="sr-only">{section.title}</span>
                </div>
              )}
            </div>

            <div className={cn("flex flex-col gap-0.5 mt-1 overflow-hidden transition-all", !openSections[section.title] && "hidden")}>
              {section.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className="group relative flex items-center gap-3 hover:bg-slate-100 px-6 py-2 rounded-md text-slate-600 text-xs font-medium"
                  activeOptions={{ exact: false }}
                  title={collapsed ? it.label : undefined}
                >
                  <it.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <button
        onClick={onToggle}
        className="flex justify-center items-center gap-2 hover:bg-slate-50 m-3 border border-slate-100 rounded-lg h-9 text-slate-700 text-xs"
      >
        <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        {!collapsed && <span>Réduire</span>}
      </button>
    </aside>
  );
}
