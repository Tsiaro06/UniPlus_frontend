import { createFileRoute } from "@tanstack/react-router";
import { Plus, Eye, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { etudiants, groupes, matieres, affectations } from "@/lib/mock-data";
import { useApiList } from "@/lib/api/use-api-list";
import { presencesApi } from "@/lib/api/endpoints";
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
function NewSeanceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const handleCreate = () => {
    toast.success("Nouvelle séance créée avec succès !");
    onClose();
  };

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
              <label htmlFor="matiere" className="font-medium text-sm">Matière *</label>
              <select id="matiere" className="mt-1 px-3 py-2 border rounded-lg w-full" title="Sélectionner une matière">
                {matieres.map((m) => <option key={m.id}>{m.intitule}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="groupe" className="font-medium text-sm">Groupe *</label>
              <select id="groupe" className="mt-1 px-3 py-2 border rounded-lg w-full" title="Sélectionner un groupe">
                {groupes.map((g) => <option key={g.id}>{g.nom}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="font-medium text-sm">Date *</label>
              <input
                id="date"
                type="date"
                defaultValue="2026-01-15"
                className="mt-1 px-3 py-2 border rounded-lg w-full"
                title="Date de la séance"
              />
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl font-medium">Annuler</button>
            <button onClick={handleCreate} className="flex-1 bg-emerald-600 py-2.5 rounded-xl font-medium text-white">Créer la séance</button>
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

  const { data, isFallback } = useApiList(
    ["presences"],
    () => Promise.resolve(affectations), // fallback car ton API n'a pas de .list()
    affectations
  );

  const feuilles = (data || affectations).map((a: any, i: number) => ({
    ...a,
    id: i + 1,
    date: `2026-01-${10 + i}`,
    titre: `Séance ${i + 1}`,
    presents: 24 - i,
  }));

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

        <ApiStatusBanner show={isFallback} />

        {view === "list" ? (
          <>
            <FilterBar>
              <SelectInput title="Filtrer par groupe" aria-label="Filtrer par groupe">
                {groupes.map((g) => <option key={g.id}>{g.nom}</option>)}
              </SelectInput>
              <SelectInput title="Filtrer par semestre" aria-label="Filtrer par semestre">
                {[1,2,3,4,5,6].map((s) => <option key={s}>S{s}</option>)}
              </SelectInput>
              <SelectInput title="Filtrer par matière" aria-label="Filtrer par matière">
                {matieres.map((m) => <option key={m.id}>{m.intitule}</option>)}
              </SelectInput>
            </FilterBar>

            <DataTable>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Matière</TH>
                  <TH>Groupe</TH>
                  <TH>Enseignant</TH>
                  <TH>Date</TH>
                  <TH>Titre</TH>
                  <TH>Présents</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {feuilles.map((f: any) => (
                  <TR key={f.id}>
                    <TD className="text-muted-foreground">{f.id}</TD>
                    <TD className="font-medium">{f.matiere}</TD>
                    <TD className="font-mono">{f.groupe}</TD>
                    <TD>{f.enseignant}</TD>
                    <TD className="text-muted-foreground">{f.date}</TD>
                    <TD>{f.titre}</TD>
                    <TD>
                      <span className="bg-emerald-100 px-2 py-0.5 rounded-md font-semibold text-emerald-700 text-xs">
                        {f.presents}
                      </span>
                    </TD>
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

      <NewSeanceModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} />
    </>
  );
}

function SaisiePresence({ seance, onClose }: { seance: any; onClose: () => void }) {
  const [rows, setRows] = useState<EtudiantPresenceRow[]>(
    etudiants.slice(0, 16).map((e: any) => ({
      ...e,
      statut: "present" as StatutPresence,
      justif: "",
    }))
  );

  const count = (s: StatutPresence) => rows.filter((r) => r.statut === s).length;

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
          <div><span className="text-muted-foreground">Matière :</span> <strong>{seance?.matiere || "Algorithmique"}</strong></div>
          <div><span className="text-muted-foreground">Groupe :</span> <strong>{seance?.groupe || "L1-INF-G1"}</strong></div>
          <div><span className="text-muted-foreground">Date :</span> <strong>{seance?.date || "2026-01-15"}</strong></div>
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={() => setRows(p => p.map(r => ({ ...r, statut: "present" })))}>Tous présents</Button>
            <Button variant="secondary" size="sm" onClick={() => setRows(p => p.map(r => ({ ...r, statut: "absent" })))}>Tous absents</Button>
            <Button size="sm">Enregistrer</Button>
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
    </>
  );
}