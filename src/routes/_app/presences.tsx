import { createFileRoute } from "@tanstack/react-router";
import { Plus, Eye, X, Printer, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { presencesApi, affectationsApi, anneesApi, inscriptionsApi } from "@/lib/api/endpoints";
import type { AnneeScolaireSemestre } from "@/lib/lmd";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface FeuillePresence {
  id: number;
  matiere: string;
  groupe: string;
  enseignant: string;
  date: string;
  titre: string;
  presents: number;
}

type StatutPresence = "present" | "absent" | "retard" | "justifie";

interface EtudiantPresenceRow {
  id: number | string;
  matricule: string;
  nom: string;
  prenom: string;
  statut: StatutPresence;
  justif: string;
}

// ─── CSS Animations ───────────────────────────────────────────────────────────
const ANIMATIONS = `
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.88) translateY(24px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .anim-backdrop { animation: backdropIn 0.2s ease; }
  .anim-modal    { animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
`;

// ─── New Seance Modal ────────────────────────────────────────────────────────
function NewSeanceModal({
  isOpen,
  onClose,
  affectations,
  calendarSemestres,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  affectations: any[];
  calendarSemestres: AnneeScolaireSemestre[];
  onCreated: () => void;
}) {
  const [affectationId, setAffectationId] = useState("");
  const [calendarSemestreId, setCalendarSemestreId] = useState("");
  const [dateSeance, setDateSeance] = useState(new Date().toISOString().slice(0, 10));
  const [titreSeance, setTitreSeance] = useState("");

  const create = useMutation({
    mutationFn: () => presencesApi.createSheet({
      affectationCoursId: Number(affectationId),
      semestreId: Number(calendarSemestreId),
      dateSeance,
      titreSeance: titreSeance || undefined,
    }),
    onSuccess: () => {
      toast.success("Nouvelle séance créée avec succès !");
      onCreated();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Création impossible"),
  });

  if (!isOpen) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop" onClick={onClose} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-md pointer-events-auto anim-modal">
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b">
            <h2 className="font-bold text-lg">Nouvelle séance</h2>
            <button onClick={onClose} aria-label="Fermer" title="Fermer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <label htmlFor="affectation" className="font-medium text-sm">Affectation *</label>
              <select id="affectation" className="mt-1 px-3 py-2 border rounded-lg w-full" value={affectationId} onChange={(e) => setAffectationId(e.target.value)}>
                <option value="">Sélectionner une affectation</option>
                {affectations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.matiere?.code ?? a.matiereId} — {a.groupe?.nom ?? a.groupeId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="semestre-cal" className="font-medium text-sm">Semestre calendaire *</label>
              <select id="semestre-cal" className="mt-1 px-3 py-2 border rounded-lg w-full" value={calendarSemestreId} onChange={(e) => setCalendarSemestreId(e.target.value)}>
                <option value="">Sélectionner</option>
                {calendarSemestres.map((s) => (
                  <option key={s.id} value={s.id}>{s.semestre?.code ?? `S${s.semestre?.numero}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="titre" className="font-medium text-sm">Titre</label>
              <input id="titre" type="text" value={titreSeance} onChange={(e) => setTitreSeance(e.target.value)} className="mt-1 px-3 py-2 border rounded-lg w-full" placeholder="Ex : Cours 3 — Boucles" />
            </div>
            <div>
              <label htmlFor="date" className="font-medium text-sm">Date *</label>
              <input id="date" type="date" value={dateSeance} onChange={(e) => setDateSeance(e.target.value)} className="mt-1 px-3 py-2 border rounded-lg w-full" />
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl font-medium">Annuler</button>
            <button onClick={() => create.mutate()} disabled={!affectationId || !calendarSemestreId || create.isPending} className="flex-1 bg-emerald-600 disabled:opacity-50 py-2.5 rounded-xl font-medium text-white">
              {create.isPending ? "Création…" : "Créer la séance"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Imprimer Liste View ──────────────────────────────────────────────────────
function ImprimerListeView({ affectations, onClose }: { affectations: any[]; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [selectedAffectationId, setSelectedAffectationId] = useState("");

  // Derive unique groupes from affectations
  const groupes: { id: string | number; nom: string }[] = [];
  const seenGroupes = new Set<string>();
  for (const a of affectations) {
    const gid = String(a.groupe?.id ?? a.groupeId ?? "");
    const gnom = a.groupe?.nom ?? `Groupe ${gid}`;
    if (gid && !seenGroupes.has(gid)) {
      seenGroupes.add(gid);
      groupes.push({ id: gid, nom: gnom });
    }
  }

  // Matieres for selected groupe
  const matiereOptions = affectations.filter(
    (a) => String(a.groupe?.id ?? a.groupeId ?? "") === selectedGroupeId,
  );

  const selectedAffectation = affectations.find((a) => String(a.id) === selectedAffectationId);
  const groupeId = selectedAffectation?.groupe?.id ?? selectedAffectation?.groupeId;

  const { data: inscriptions = [], isLoading } = useQuery({
    queryKey: ["inscriptions-by-group-print", groupeId],
    queryFn: async () => {
      if (!groupeId) return [];
      const res = await inscriptionsApi.byGroup(groupeId) as any;
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!groupeId,
  });

  const matiereName =
    selectedAffectation?.matiere?.intitule ??
    selectedAffectation?.matiere?.code ??
    "—";
  const groupeName =
    selectedAffectation?.groupe?.nom ?? "—";

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleGroupeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroupeId(e.target.value);
    setSelectedAffectationId("");
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Liste de présence — ${matiereName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 32px 40px; font-size: 12px; color: #000; }
        .header { text-align: center; margin-bottom: 28px; }
        .header h1 { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .header p { font-size: 12px; color: #444; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; font-weight: bold; padding: 8px 10px; border: 1px solid #000; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
        td { border: 1px solid #000; padding: 6px 10px; font-size: 11px; vertical-align: middle; }
        .col-num  { width: 5%;  text-align: center; }
        .col-mat  { width: 14%; }
        .col-nom  { width: 18%; }
        .col-prenom { width: 18%; }
        .col-cb   { width: 7%;  text-align: center; }
        .col-sig  { width: 38%; }
        td.row-num { text-align: center; color: #555; }
        td.row-sig { height: 36px; }
        td.row-cb  { text-align: center; }
        .cb-box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #000; }
        tr:nth-child(even) td { background: #fafafa; }
        @media print {
          body { padding: 20px 28px; }
          tr:nth-child(even) td { background: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head><body>`);
    printWindow.document.write(printRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  const students: { id: any; matricule: string; nom: string; prenom: string }[] =
    (inscriptions as any[]).map((ins) => ({
      id: ins.id,
      matricule: ins.etudiant?.matricule ?? ins.matricule ?? "",
      nom: ins.etudiant?.nom ?? ins.nom ?? "",
      prenom: ins.etudiant?.prenom ?? ins.prenom ?? "",
    }));

  const canPrint = !!selectedAffectationId && students.length > 0;

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-sm">Imprimer liste de présence</span>
      </div>

      {/* Filters */}
      <div className="bg-card shadow-sm mb-6 p-5 border border-border rounded-xl">
        <h2 className="mb-4 font-semibold text-sm">Sélectionner le groupe et la matière</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-1 font-medium text-muted-foreground text-xs">Groupe *</label>
            <select
              className="bg-background px-3 py-2 border border-border rounded-lg w-full text-sm"
              value={selectedGroupeId}
              onChange={handleGroupeChange}
            >
              <option value="">Sélectionner un groupe</option>
              {groupes.map((g) => (
                <option key={g.id} value={String(g.id)}>{g.nom}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-1 font-medium text-muted-foreground text-xs">Matière *</label>
            <select
              className="bg-background px-3 py-2 border border-border rounded-lg w-full text-sm"
              value={selectedAffectationId}
              onChange={(e) => setSelectedAffectationId(e.target.value)}
              disabled={!selectedGroupeId}
            >
              <option value="">Sélectionner une matière</option>
              {matiereOptions.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.matiere?.intitule ?? a.matiere?.code ?? `Matière ${a.matiereId}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handlePrint}
              disabled={!canPrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* Preview table */}
      {selectedAffectationId && (
        <div className="bg-card shadow-sm border border-border rounded-xl overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-border border-b">
            <div>
              <p className="font-semibold text-sm">
                Liste de présence — {matiereName}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {groupeName} · {today}
              </p>
            </div>
            {isLoading && (
              <span className="text-muted-foreground text-xs animate-pulse">Chargement…</span>
            )}
            {!isLoading && (
              <span className="text-muted-foreground text-xs">{students.length} étudiant{students.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {!isLoading && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 border-border border-b w-10 text-center">#</th>
                    <th className="px-4 py-3 border-border border-b text-left">Matricule</th>
                    <th className="px-4 py-3 border-border border-b text-left">Nom</th>
                    <th className="px-4 py-3 border-border border-b text-left">Prénom</th>
                    <th className="px-4 py-3 border-border border-b w-12 text-center" title="Case de présence">☑</th>
                    <th className="px-4 py-3 border-border border-b text-left">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-muted/20 border-border last:border-0 border-b">
                      <td className="px-4 py-3 text-muted-foreground text-xs text-center">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.matricule}</td>
                      <td className="px-4 py-3 font-medium">{s.nom}</td>
                      <td className="px-4 py-3">{s.prenom}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block border-2 border-muted-foreground rounded-sm w-4 h-4" />
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && students.length === 0 && selectedAffectationId && (
            <div className="px-5 py-10 text-muted-foreground text-sm text-center">
              Aucun étudiant inscrit dans ce groupe.
            </div>
          )}
        </div>
      )}

      {/* Hidden print-ready template */}
      <div ref={printRef} style={{ display: "none" }}>
        <div className="header">
          <h1>Liste de présence — {matiereName}</h1>
          <p>Groupe : {groupeName} &nbsp;·&nbsp; Le {today}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-mat">Matricule</th>
              <th className="col-nom">Nom</th>
              <th className="col-prenom">Prénom</th>
              <th className="col-cb">Présence</th>
              <th className="col-sig">Signature</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="row-num">{i + 1}</td>
                <td>{s.matricule}</td>
                <td>{s.nom}</td>
                <td>{s.prenom}</td>
                <td className="row-cb"><span className="cb-box" /></td>
                <td className="row-sig" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const Route = createFileRoute("/_app/presences")({
  head: () => ({ meta: [{ title: "Présences — UniPlus" }] }),
  component: PresencesPage,
});

function PresencesPage() {
  const [view, setView] = useState<"list" | "saisie" | "imprimer">("list");
  const [showNewModal, setShowNewModal] = useState(false);
  const [currentSeance, setCurrentSeance] = useState<any>(null);
  const [filterCalendarSemestreId, setFilterCalendarSemestreId] = useState("");

  const { data: annees = [] } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const res = await anneesApi.list({ limit: 100 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const activeAnneeId = (annees as any[]).find((a) => a.actif)?.id ?? (annees as any[])[0]?.id;

  const { data: calendarSemestres = [] } = useQuery({
    queryKey: ["annee-semestres", activeAnneeId],
    queryFn: async () => {
      if (!activeAnneeId) return [];
      const res = await anneesApi.listSemestres(activeAnneeId) as any;
      return (res?.data ?? res ?? []) as AnneeScolaireSemestre[];
    },
    enabled: !!activeAnneeId,
  });

  const { data: affectations = [] } = useQuery({
    queryKey: ["affectations"],
    queryFn: async () => {
      const res = await affectationsApi.list({ limit: 500 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const { data: feuilles = [], isLoading, refetch, isError } = useQuery({
    queryKey: ["feuilles-presence", filterCalendarSemestreId],
    queryFn: async () => {
      const res = await presencesApi.list(
        filterCalendarSemestreId ? { anneeScolaireSemestreId: Number(filterCalendarSemestreId) } : {},
      ) as any;
      return res?.data?.data ?? res?.data ?? res ?? [];
    },
  });

  const openNewSeance = () => setShowNewModal(true);
  const openSaisie = (feuille: any) => {
    setCurrentSeance(feuille);
    setView("saisie");
  };

  if (view === "saisie" && currentSeance) {
    return (
      <SaisiePresence
        seance={currentSeance}
        onClose={() => { setView("list"); setCurrentSeance(null); }}
      />
    );
  }

  if (view === "imprimer") {
    return (
      <ImprimerListeView
        affectations={affectations as any[]}
        onClose={() => setView("list")}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Présences"
        subtitle="Gestion des feuilles de présence"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setView("imprimer")}>
              <Printer className="mr-1 w-4 h-4" /> Imprimer liste
            </Button>
            <Button size="sm" onClick={openNewSeance}>
              <Plus className="mr-1 w-4 h-4" /> Nouvelle séance
            </Button>
          </div>
        }
      />

      <FilterBar>
        <SelectInput
          label="Semestre"
          value={filterCalendarSemestreId}
          onChange={(e) => setFilterCalendarSemestreId(e.target.value)}
        >
          <option value="">Tous les semestres</option>
          {(calendarSemestres as AnneeScolaireSemestre[]).map((s) => (
            <option key={s.id} value={s.id}>
              {s.semestre?.code ?? `S${s.semestre?.numero}`}
            </option>
          ))}
        </SelectInput>
      </FilterBar>

      <ApiStatusBanner isLoading={isLoading} isError={isError} />

      <DataTable>
        <THead>
          <TR>
            <TH>Matière</TH>
            <TH>Groupe</TH>
            <TH>Enseignant</TH>
            <TH>Date</TH>
            <TH>Titre</TH>
            <TH>Actions</TH>
          </TR>
        </THead>
        <tbody>
          {(feuilles as any[]).map((f) => (
            <TR key={f.id}>
              <TD>{f.affectationCours?.matiere?.intitule ?? "—"}</TD>
              <TD>{f.affectationCours?.groupe?.nom ?? "—"}</TD>
              <TD>{f.affectationCours?.enseignant ? `${f.affectationCours.enseignant.nom} ${f.affectationCours.enseignant.prenom}` : "—"}</TD>
              <TD>{f.dateSeance?.slice(0, 10) ?? "—"}</TD>
              <TD>{f.titreSeance ?? "—"}</TD>
              <TD>
                <ActionButton onClick={() => openSaisie(f)} title="Saisir les présences">
                  <Eye className="w-4 h-4" />
                </ActionButton>
              </TD>
            </TR>
          ))}
        </tbody>
      </DataTable>

      <NewSeanceModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        affectations={affectations as any[]}
        calendarSemestres={calendarSemestres as AnneeScolaireSemestre[]}
        onCreated={refetch}
      />
    </>
  );
}

// ─── Saisie Presence ─────────────────────────────────────────────────────────
function SaisiePresence({ seance, onClose }: { seance: any; onClose: () => void }) {
  const [rows, setRows] = useState<EtudiantPresenceRow[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: inscriptions = [] } = useQuery({
    queryKey: ["inscriptions-by-group", seance?.affectationCours?.groupeId],
    queryFn: async () => {
      if (!seance?.affectationCours?.groupeId) return [];
      const res = await inscriptionsApi.byGroup(seance.affectationCours.groupeId) as any;
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!seance?.affectationCours?.groupeId,
  });

  const { data: existingPresences = [] } = useQuery({
    queryKey: ["presences-for-sheet", seance?.id],
    queryFn: async () => {
      if (!seance?.id) return [];
      const res = await presencesApi.forSheet(seance.id) as any;
      return res?.data?.data ?? res?.data ?? res ?? [];
    },
    enabled: !!seance?.id,
  });

  useEffect(() => {
    if (inscriptions.length > 0) {
      const newRows = inscriptions.map((ins: any) => {
        const existing = existingPresences.find((p: any) => p.inscriptionId === ins.id);
        return {
          id: ins.id,
          matricule: ins.etudiant?.matricule ?? ins.matricule ?? "",
          nom: ins.etudiant?.nom ?? "",
          prenom: ins.etudiant?.prenom ?? "",
          statut: (existing?.statut || "present") as StatutPresence,
          justif: existing?.justification || "",
        };
      });
      setRows(newRows);
    }
  }, [inscriptions, existingPresences]);

  const save = useMutation({
    mutationFn: () => presencesApi.bulk({
      feuilleId: seance.id,
      presences: rows.map((r) => ({
        inscriptionId: Number(r.id),
        statut: r.statut,
        justification: r.statut === "justifie" ? r.justif : undefined,
      })),
    }),
    onSuccess: () => {
      toast.success("Présences enregistrées avec succès !");
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur d'enregistrement"),
  });

  const count = (s: StatutPresence) => rows.filter((r) => r.statut === s).length;

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open("", "", "height=auto,width=auto");
      if (printWindow) {
        printWindow.document.write(printRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  };

  const styles: Record<StatutPresence, string> = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-red-100 text-red-700",
    retard: "bg-amber-100 text-amber-700",
    justifie: "bg-blue-100 text-blue-700",
  };

  const matiereName = seance?.affectationCours?.matiere?.intitule || seance?.titreSeance || "—";
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <div className="bg-card shadow-sm mb-4 p-4 border border-border rounded-xl">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div><span className="text-muted-foreground">Matière :</span> <strong>{matiereName}</strong></div>
          <div><span className="text-muted-foreground">Groupe :</span> <strong>{seance?.affectationCours?.groupe?.nom || "—"}</strong></div>
          <div><span className="text-muted-foreground">Date :</span> <strong>{seance?.dateSeance?.slice(0, 10) || "—"}</strong></div>
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={() => setRows(p => p.map(r => ({ ...r, statut: "present" })))}>Tous présents</Button>
            <Button variant="secondary" size="sm" onClick={() => setRows(p => p.map(r => ({ ...r, statut: "absent" })))}>Tous absents</Button>
            <Button variant="secondary" size="sm" onClick={handlePrint} title="Imprimer la liste de présence">
              <Printer className="w-4 h-4" /> Imprimer
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      <DataTable>
        <THead>
          <TR>
            <TH>#</TH>
            <TH>Matricule</TH>
            <TH>Étudiant</TH>
            <TH>Statut</TH>
            <TH>Justification</TH>
          </TR>
        </THead>
        <tbody>
          {rows.map((r, i) => (
            <TR key={r.id}>
              <TD className="text-muted-foreground">{i + 1}</TD>
              <TD className="font-mono text-xs">{r.matricule}</TD>
              <TD className="font-medium">{r.nom} {r.prenom}</TD>
              <TD>
                <select
                  value={r.statut}
                  onChange={(e) => setRows(p => p.map((x, j) => j === i ? { ...x, statut: e.target.value as StatutPresence } : x))}
                  title={`Statut de ${r.nom} ${r.prenom}`}
                  aria-label={`Statut de présence de ${r.nom} ${r.prenom}`}
                  className={cn("px-3 py-1 border-0 rounded-md font-semibold text-xs", styles[r.statut])}
                >
                  <option value="present">Présent</option>
                  <option value="absent">Absent</option>
                  <option value="retard">Retard</option>
                  <option value="justifie">Justifié</option>
                </select>
              </TD>
              <TD>
                {r.statut === "justifie" && (
                  <input
                    value={r.justif}
                    onChange={(e) => setRows(p => p.map((x, j) => j === i ? { ...x, justif: e.target.value } : x))}
                    placeholder="Motif de justification..."
                    title="Justification"
                    className="bg-background px-3 border border-border rounded-md w-full h-9 text-sm"
                  />
                )}
              </TD>
            </TR>
          ))}
        </tbody>
      </DataTable>

      {/* Hidden print template */}
      <div ref={printRef} style={{ display: "none" }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; padding: 32px 40px; font-size: 12px; color: #000; }
          .header { text-align: center; margin-bottom: 28px; }
          .header h1 { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
          .header p { font-size: 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f0f0; font-weight: bold; padding: 8px 10px; border: 1px solid #000; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { border: 1px solid #000; padding: 6px 10px; font-size: 11px; vertical-align: middle; }
          .col-num { width: 5%; text-align: center; }
          .col-mat { width: 14%; }
          .col-nom { width: 18%; }
          .col-prenom { width: 18%; }
          .col-cb { width: 7%; text-align: center; }
          .col-sig { width: 38%; }
          td.row-num { text-align: center; color: #555; }
          td.row-sig { height: 36px; }
          td.row-cb { text-align: center; }
          .cb-box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #000; }
          tr:nth-child(even) td { background: #fafafa; }
        `}</style>
        <div className="header">
          <h1>Liste de présence — {matiereName}</h1>
          <p>Groupe : {seance?.affectationCours?.groupe?.nom || "—"} &nbsp;·&nbsp; Le {today}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-mat">Matricule</th>
              <th className="col-nom">Nom</th>
              <th className="col-prenom">Prénom</th>
              <th className="col-cb">Présence</th>
              <th className="col-sig">Signature</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="row-num">{i + 1}</td>
                <td>{r.matricule}</td>
                <td>{r.nom}</td>
                <td>{r.prenom}</td>
                <td className="row-cb"><span className="cb-box" /></td>
                <td className="row-sig" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}