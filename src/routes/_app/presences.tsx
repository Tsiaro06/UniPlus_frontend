import { createFileRoute } from "@tanstack/react-router";
import { Plus, Eye, X, Printer } from "lucide-react";
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
            <button onClick={() => create.mutate()} disabled={!affectationId || !calendarSemestreId || create.isPending} className="flex-1 bg-emerald-600 py-2.5 rounded-xl font-medium text-white disabled:opacity-50">
              {create.isPending ? "Création…" : "Créer la séance"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export const Route = createFileRoute("/_app/presences")({
  head: () => ({ meta: [{ title: "Présences — UniPlus" }] }),
  component: PresencesPage,
});

function PresencesPage() {
  const [view, setView] = useState<"list" | "saisie">("list");
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

  return (
    <>
      <div>
        <PageHeader
          title="Feuilles de présence"
          subtitle={view === "list" ? `${feuilles.length} feuilles` : "Saisie de présence"}
          actions={
            view === "list" ? (
              <Button onClick={openNewSeance}>
                <Plus className="w-4 h-4" /> Nouvelle séance
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setView("list")}>Retour à la liste</Button>
            )
          }
        />

        <ApiStatusBanner show={isError} />

        {view === "list" ? (
          <>
            <FilterBar>
              <SelectInput title="Filtrer par semestre calendaire" value={filterCalendarSemestreId} onChange={setFilterCalendarSemestreId}>
                <option value="">Tous les semestres</option>
                {calendarSemestres.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.semestre?.code ?? `S${s.semestre?.numero}`}</option>
                ))}
              </SelectInput>
            </FilterBar>

            <DataTable>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Matière</TH>
                  <TH>Groupe</TH>
                  <TH>Date</TH>
                  <TH>Titre</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {isLoading ? (
                  <TR><TD colSpan={6} className="py-8 text-center text-muted-foreground">Chargement…</TD></TR>
                ) : (feuilles as any[]).length === 0 ? (
                  <TR><TD colSpan={6} className="py-8 text-center text-muted-foreground">Aucune feuille de présence</TD></TR>
                ) : (feuilles as any[]).map((f: any) => (
                  <TR key={f.id}>
                    <TD className="text-muted-foreground">{f.id}</TD>
                    <TD className="font-medium">{f.affectationCours?.matiere?.intitule ?? f.titreSeance ?? "—"}</TD>
                    <TD className="font-mono">{f.affectationCours?.groupe?.nom ?? "—"}</TD>
                    <TD className="text-muted-foreground">{f.dateSeance?.slice?.(0, 10) ?? f.date ?? "—"}</TD>
                    <TD>{f.titreSeance ?? "—"}</TD>
                    <TD>
                      <ActionButton onClick={() => openSaisie(f)} title="Voir / Saisir présences">
                        <Eye className="w-4 h-4" />
                      </ActionButton>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </DataTable>
          </>
        ) : (
          <SaisiePresence seance={currentSeance} onClose={() => setView("list")} />
        )}
      </div>

      <NewSeanceModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        affectations={affectations as any[]}
        calendarSemestres={calendarSemestres}
        onCreated={() => refetch()}
      />
    </>
  );
}

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

  return (
    <>
      <div className="bg-card shadow-sm mb-4 p-4 border border-border rounded-xl">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div><span className="text-muted-foreground">Matière :</span> <strong>{seance?.affectationCours?.matiere?.intitule || seance?.titreSeance || "—"}</strong></div>
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
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .print-header { text-align: center; margin-bottom: 30px; }
          .print-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .print-info { font-size: 12px; color: #666; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .signature-cell { height: 60px; vertical-align: bottom; }
          .justification-cell { width: 30%; }
          tr { page-break-inside: avoid; }
        `}</style>
        <div className="print-header">
          <div className="print-title">
            Liste de présence pour {seance?.affectationCours?.matiere?.intitule || seance?.titreSeance || "—"}
          </div>
          <div className="print-info">
            Groupe: {seance?.affectationCours?.groupe?.nom || "—"}
          </div>
          <div className="print-info">
            Date: {formatDate(seance?.dateSeance || new Date().toISOString())}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: "15%" }}>Matricule</th>
              <th style={{ width: "15%" }}>Nom</th>
              <th style={{ width: "15%" }}>Prénom</th>
              <th style={{ width: "20%" }}>Signature</th>
              <th className="justification-cell">Justification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{r.matricule}</td>
                <td>{r.nom}</td>
                <td>{r.prenom}</td>
                <td className="signature-cell"></td>
                <td className="justification-cell"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
