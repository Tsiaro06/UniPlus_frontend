import React, { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  GraduationCap,
  UserCog,
  ClipboardList,
  Hash,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { StatusBadge } from "@/components/ui/badge-status";
import { Avatar } from "@/components/ui/data-table";
import { useApiList, useApiItem } from "@/lib/api/use-api-list";
import { etudiantsApi, anneesApi, inscriptionsApi, enseignantsApi } from "@/lib/api/endpoints";
import { auth } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — UniPlus" }] }),
  component: Dashboard,
});

const PIE_COLORS = ["#2563EB", "#3B82F6", "#60A5FA", "#94A3B8", "#A5B4FC"];
const PIE_COLOR_CLASSES = ["bg-blue-600", "bg-blue-500", "bg-sky-500", "bg-slate-400", "bg-indigo-400"];

const pageClass = "min-h-screen space-y-5 bg-slate-50 p-6 text-slate-900 md:p-8";
const shellCardClass = "rounded-3xl border border-slate-200 bg-white shadow-[0_22px_55px_-20px_rgba(15,23,42,0.45)]";
const smallCardClass = "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_38px_-18px_rgba(15,23,42,0.45)]";
const cardHeaderClass = "flex items-center justify-between border-b border-slate-200 p-5";
const sectionTitleClass = "text-[15px] font-semibold text-slate-900";
const sectionSubtitleClass = "text-[12px] text-slate-500";
const accentButtonClass =
  "inline-flex items-center gap-2 rounded-[10px] border border-blue-600/10 bg-blue-600 px-[18px] py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700";
const iconWrapClass = "flex shrink-0 items-center justify-center rounded-xl bg-blue-50 p-2.5 text-blue-600";
const selectClass =
  "cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 shadow-sm";

const pendingTasks = [
  { id: 1, label: "Valider 5 nouvelles inscriptions", done: true, date: "Nov 11" },
  { id: 2, label: "Vérifier notes L2 Informatique", done: true, date: "Nov 11" },
  { id: 3, label: "Réunion conseil pédagogique", done: false, date: "Nov 12" },
  { id: 4, label: "Saisir résultats du semestre 1", done: false, date: "Nov 13" },
  { id: 5, label: "Mettre à jour les emplois du temps", done: false, date: "Nov 14" },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string | number | null }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow-lg px-3 py-2 border border-slate-200 rounded-[10px] text-slate-900 text-xs">
      {label != null ? <p className="mb-1 text-slate-500">{label}</p> : null}
      <p className="font-semibold">{payload[0]?.name ?? "Valeur"}: {payload[0]?.value}</p>
    </div>
  );
}

function CircularProgress({ value }: { value: number }): React.ReactElement {
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-18 h-18">
      <svg viewBox="0 0 36 36" className="w-18 h-18 -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="drop-shadow-[0_0_5px_rgba(37,99,235,0.2)]"
        />
      </svg>
      <div className="absolute inset-0 flex justify-center items-center">
        <span className="font-bold text-slate-900 text-sm">{value}%</span>
      </div>
    </div>
  );
}

function Dashboard(): React.ReactElement {
  const user = auth.getUser();
  const userName = user?.nom || "Admin";

  // Fetch data from API
  const { data: students, isLoading: studentsLoading } = useApiList(
    ["etudiants"],
    () => etudiantsApi.list({ limit: 1000 }),
  );

  const { data: activeYear, isLoading: yearLoading } = useApiItem(
    ["annees-scolaires", "active"],
    () => anneesApi.active(),
  );

  const { data: teachers, isLoading: teachersLoading } = useApiList(
    ["enseignants"],
    () => enseignantsApi.list({ limit: 1000 }),
  );

  // Calculate statistics from API data
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter((s: any) => s.statut === "actif").length;
    const totalTeachers = teachers.length;

    return {
      totalStudents,
      activeStudents,
      totalTeachers,
      enrollment: Math.round((activeStudents / totalStudents) * 100) || 0,
    };
  }, [students, teachers]);

  // Calculate students by level (L1-M2)
  const studentsByLevel = useMemo(() => {
    const levels = ["L1", "L2", "L3", "M1", "M2"];
    return levels.map((level) => ({
      name: level,
      value: students.filter((s: any) => s.niveau === level).length,
    }));
  }, [students]);

  // Mock data for students by program (from visible student data)
  const studentsByFiliere = useMemo(() => {
    const programs: Record<string, number> = {};
    students.forEach((s: any) => {
      const program = s.filiere || "Autres";
      programs[program] = (programs[program] || 0) + 1;
    });
    return Object.entries(programs)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 5);
  }, [students]);

  return (
    <div className={pageClass}>
      <div className="flex lg:flex-row flex-col lg:items-stretch gap-6">
        <div className={`${shellCardClass} flex-1 overflow-hidden`}>
          <div className="items-center gap-6 grid lg:grid-cols-[1fr_1.35fr] p-6 lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center bg-slate-50 px-3 py-1 border border-slate-200 rounded-full font-semibold text-[11px] text-slate-600">
                Année académique active · {activeYear?.label || "2025-2026"}
              </div>

              <div className="space-y-2">
                <h1 className="font-bold text-slate-900 text-3xl md:text-4xl tracking-tight">Bonjour, {userName} 👋</h1>
                <p className="max-w-2xl text-slate-500 text-base">Voici ce qui se passe dans votre université aujourd&apos;hui.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div>
                  <p className="font-medium text-slate-600 text-sm">Campus central</p>
                  <p className="font-semibold text-slate-900 text-xl">Administration</p>
                </div>
                <div className="flex-1" />
                <button type="button" className={accentButtonClass}>
                  <Plus size={18} />
                  Ajouter un étudiant
                </button>
              </div>

              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <span>Statut du campus</span>
                <span className="bg-emerald-500 rounded-full w-2.5 h-2.5" aria-hidden="true" />
                <span className="font-semibold text-emerald-600">En ligne</span>
              </div>
            </div>

            <div className="relative bg-slate-900 shadow-[0_24px_55px_-28px_rgba(2,6,23,0.6)] border border-slate-800 rounded-3xl w-full aspect-16/10 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1470&auto=format&fit=crop"
                alt="University Campus"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:w-[320px]">
          <div className={smallCardClass}>
            <div className={iconWrapClass}>
              <GraduationCap size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Total étudiants</p>
              {studentsLoading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <>
                  <p className="font-bold text-[22px] text-slate-900">{stats.totalStudents}</p>
                  <p className="text-[11px] text-emerald-600">+12% ce mois</p>
                </>
              )}
            </div>
          </div>

          <div className={smallCardClass}>
            <div className={iconWrapClass}>
              <UserCog size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Enseignants</p>
              {teachersLoading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <>
                  <p className="font-bold text-[22px] text-slate-900">{stats.totalTeachers}</p>
                  <p className="text-[11px] text-slate-500">Corps pédagogique</p>
                </>
              )}
            </div>
          </div>

          <div className={smallCardClass + " flex-1 justify-between items-center"}>
            <div>
              <p className="text-[11px] text-slate-500">Objectif inscriptions</p>
              <div className="flex gap-4 mt-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500">Cible</p>
                  <p className="font-bold text-[15px] text-slate-900">{stats.totalStudents}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Atteint</p>
                  <p className="font-bold text-[15px] text-emerald-600">{stats.activeStudents}</p>
                </div>
              </div>
            </div>
            <CircularProgress value={stats.enrollment} />
          </div>
        </div>
      </div>

      <div className="gap-3 grid sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Étudiants actifs", value: stats.activeStudents, icon: Users },
          { label: "Inscriptions actives", value: stats.activeStudents, icon: ClipboardList, sub: "En attente de confirmation" },
          { label: "Notes saisies", value: "1 248", icon: Hash },
          { label: "En attente", value: "17", icon: Clock },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className={smallCardClass}>
            <div className={iconWrapClass}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="font-bold text-[19px] text-slate-900">{typeof value === 'number' ? value : value}</p>
              {sub ? <p className="text-[10px] text-emerald-600">{sub}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="gap-4 grid xl:grid-cols-3">
        <div className={`${shellCardClass} overflow-hidden`}>
          <div className={cardHeaderClass}>
            <div>
              <p className={sectionTitleClass}>Étudiants récents</p>
              <p className={`${sectionSubtitleClass} mt-0.5`}>5 derniers inscrits</p>
            </div>
            <button type="button" className="bg-transparent border-0 font-semibold text-[12px] text-blue-600">Voir tout</button>
          </div>

          <div>
            {studentsLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-5 py-3 border-slate-100 border-b">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </>
            ) : (
              students.slice(0, 5).map((student: any) => (
                <div key={student.id} className="flex items-center gap-3 px-5 py-3 border-slate-100 border-b last:border-b-0">
                  <Avatar name={`${student.prenom} ${student.nom}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[13px] text-slate-900 truncate">{student.prenom} {student.nom}</p>
                    <p className="text-[11px] text-slate-500">{student.matricule}</p>
                  </div>
                  <StatusBadge status={student.statut} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`${shellCardClass} p-5`}>
          <div className="flex justify-between items-center gap-4 mb-1">
            <div>
              <p className={sectionTitleClass}>Aperçu par filière</p>
              <p className={`${sectionSubtitleClass} mt-0.5`}>Répartition des étudiants</p>
            </div>
            <select aria-label="Année universitaire" className={selectClass}>
              <option>{activeYear?.label || "2025-2026"}</option>
            </select>
          </div>

          <div className="h-60">
            {studentsByFiliere.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsByFiliere} barSize={18} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {studentsByFiliere.map((_, index) => (
                      <Cell key={index} fill={index % 3 === 0 ? "#2563EB" : index % 3 === 1 ? "#3B82F6" : "#60A5FA"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-slate-500">Pas de données</div>
            )}
          </div>
        </div>

        <div className={`${shellCardClass} overflow-hidden`}>
          <div className={cardHeaderClass}>
            <div>
              <p className={sectionTitleClass}>Tâches administratives</p>
              <p className={`${sectionSubtitleClass} mt-0.5`}>2 sur 5 complétées</p>
            </div>
          </div>

          <div className="space-y-2.5 px-5 py-3">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2.5">
                {task.done ? (
                  <CheckCircle2 size={16} className="mt-px text-blue-600 shrink-0" />
                ) : (
                  <Circle size={16} className="mt-px text-slate-300 shrink-0" />
                )}
                <div className="flex flex-1 justify-between items-start gap-2">
                  <p className={`text-[12px] ${task.done ? "line-through text-slate-500" : "text-slate-700"}`}>{task.label}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{task.date}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 pt-3.5 pb-4 border-slate-100 border-t">
            <p className={`${sectionSubtitleClass} mb-1`}>Répartition par niveau (L1→M2)</p>
            <div className="h-28">
              {studentsByLevel.some((s) => s.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={studentsByLevel} dataKey="value" nameKey="name" innerRadius={32} outerRadius={50} paddingAngle={3}>
                      {studentsByLevel.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-full text-slate-500">Pas de données</div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {studentsByLevel.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <span className={`inline-block h-1.75 w-1.75 shrink-0 rounded-xs ${PIE_COLOR_CLASSES[index % PIE_COLOR_CLASSES.length]}`} />
                  <span className="text-[10px] text-slate-500">{entry.name}</span>
                  <span className="font-bold text-[10px] text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
