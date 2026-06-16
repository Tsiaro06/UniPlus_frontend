import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Calendar, Pencil, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, Avatar } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { inscriptions, notes, resultatsSemestre, stages } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Etudiant {
  id: number | string;
  nom: string;
  prenom: string;
  matricule: string;
  statut: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  lieuNaissance: string;
  adresse: string;
  sexe?: string;
}

type EditData = Omit<Etudiant, "id" | "matricule">;

// ─── CSS Animations ───────────────────────────────────────────────────────────

const ANIMATIONS = `
  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.88) translateY(24px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes spinLoader {
    to { transform: rotate(360deg); }
  }

  .anim-backdrop { animation: backdropIn  0.2s ease; }
  .anim-modal    { animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .anim-spin     { animation: spinLoader   0.7s linear infinite; }
`;

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800 text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-shadow";

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-medium text-gray-700 dark:text-gray-300 text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  initial: Etudiant;
  onSave: (data: EditData) => void;
  onCancel: () => void;
}

function EditModal({ isOpen, initial, onSave, onCancel }: EditModalProps) {
  const [form, setForm] = useState<EditData>({
    nom: "", prenom: "", email: "", telephone: "",
    dateNaissance: "", lieuNaissance: "", adresse: "", statut: "actif", sexe: "M",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        nom:           initial.nom           ?? "",
        prenom:        initial.prenom        ?? "",
        email:         initial.email         ?? "",
        telephone:     initial.telephone     ?? "",
        dateNaissance: initial.dateNaissance ?? "",
        lieuNaissance: initial.lieuNaissance ?? "",
        adresse:       initial.adresse       ?? "",
        statut:        initial.statut        ?? "actif",
        sexe:          initial.sexe          ?? "M",
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.nom.trim() !== "" && form.prenom.trim() !== "";

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop" onClick={onCancel} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-lg pointer-events-auto anim-modal">

          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-gray-100 dark:border-gray-800 border-b">
            <div>
              <h2 className="font-bold text-lg leading-tight">Modifier le profil</h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                Matricule : <span className="font-mono">{initial.matricule}</span>
              </p>
            </div>
            <button onClick={onCancel} aria-label="Fermer" title="Fermer"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5 max-h-[60vh] overflow-y-auto">
            <div className="gap-4 grid grid-cols-2">
              <Field label="Nom *" htmlFor="ep-nom">
                <input id="ep-nom" type="text" value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Rakoto" title="Nom de famille" className={inputCls} />
              </Field>
              <Field label="Prénom *" htmlFor="ep-prenom">
                <input id="ep-prenom" type="text" value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  placeholder="Ex : Jean" title="Prénom" className={inputCls} />
              </Field>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Email" htmlFor="ep-email">
                <input id="ep-email" type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="etudiant@univ.mg" title="Adresse email" className={inputCls} />
              </Field>
              <Field label="Téléphone" htmlFor="ep-tel">
                <input id="ep-tel" type="text" value={form.telephone}
                  onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  placeholder="+261 ..." title="Numéro de téléphone" className={inputCls} />
              </Field>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Date de naissance" htmlFor="ep-dob">
                <input id="ep-dob" type="text" value={form.dateNaissance}
                  onChange={(e) => setForm((f) => ({ ...f, dateNaissance: e.target.value }))}
                  placeholder="Ex : 01/01/2000" title="Date de naissance" className={inputCls} />
              </Field>
              <Field label="Lieu de naissance" htmlFor="ep-lieu">
                <input id="ep-lieu" type="text" value={form.lieuNaissance}
                  onChange={(e) => setForm((f) => ({ ...f, lieuNaissance: e.target.value }))}
                  placeholder="Ex : Antananarivo" title="Lieu de naissance" className={inputCls} />
              </Field>
            </div>

            <Field label="Adresse" htmlFor="ep-adresse">
              <textarea id="ep-adresse" value={form.adresse}
                onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                placeholder="Adresse complète..." title="Adresse"
                rows={3} className={`${inputCls} resize-none py-2`} />
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Sexe" htmlFor="ep-sexe">
                <select id="ep-sexe" value={form.sexe}
                  onChange={(e) => setForm((f) => ({ ...f, sexe: e.target.value }))}
                  title="Sexe" aria-label="Sexe" className={inputCls}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Field>
              <Field label="Statut" htmlFor="ep-statut">
                <select id="ep-statut" value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  title="Statut" aria-label="Statut" className={inputCls}>
                  <option value="actif">Actif</option>
                  <option value="archive">Archivé</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onCancel}
              className="flex-1 bg-red-50 hover:bg-red-100 active:bg-red-200 px-4 py-2.5 border border-red-200 rounded-xl font-semibold text-red-600 text-sm transition-colors">
              Annuler
            </button>
            <button onClick={() => canSubmit && onSave(form)} disabled={!canSubmit}
              className="flex flex-1 justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed">
              <Check className="w-4 h-4" aria-hidden="true" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_app/etudiants/$id")({
  head: () => ({ meta: [{ title: "Détail étudiant — UniPlus" }] }),
  component: EtudiantDetailPage,
});

const tabs = ["Inscriptions", "Notes", "Résultats", "Présences", "Stage"];

// ─── Page ─────────────────────────────────────────────────────────────────────

function EtudiantDetailPage() {
  const { id } = Route.useParams();
  const [etudiant, setEtudiant] = useState<Etudiant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Inscriptions");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const fetchEtudiant = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api<{ success: boolean; data: Etudiant }>(`/etudiants/${id}`);
        if (response.success && response.data) {
          setEtudiant(response.data);
        } else {
          setError("Impossible de charger les données de l'étudiant");
        }
      } catch (err) {
        console.error("[v0] Error fetching student:", err);
        setError("Erreur lors du chargement des données de l'étudiant");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEtudiant();
    }
  }, [id]);

  const myNotes  = etudiant ? notes.filter((n) => n.matricule === etudiant.matricule) : [];
  const myStages = etudiant ? stages.filter((s) => s.matricule === etudiant.matricule) : [];
  const myRes    = etudiant ? resultatsSemestre.filter((r) => r.matricule === etudiant.matricule) : [];

  const handleSave = async (data: EditData) => {
    if (!etudiant) return;
    try {
      const response = await api<{ success: boolean; data: Etudiant }>(`/etudiants/${etudiant.id}`, {
        method: "PUT",
        body: data,
      });
      if (response.success && response.data) {
        setEtudiant(response.data);
        toast.success("Profil mis à jour avec succès !");
        setFormOpen(false);
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error("[v0] Error saving student:", err);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="text-muted-foreground">Chargement des données...</div>
      </div>
    );
  }

  if (error || !etudiant) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <div className="text-danger">{error || "Étudiant non trouvé"}</div>
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeader
          title={`${etudiant.nom} ${etudiant.prenom}`}
          subtitle={`Matricule ${etudiant.matricule}`}
          actions={
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="w-4 h-4" /> Modifier
            </Button>
          }
        />

        <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">

          {/* Profile card */}
          <div className="bg-card shadow-sm p-6 border border-border rounded-xl">
            <div className="flex flex-col items-center text-center">
              <Avatar name={`${etudiant.nom} ${etudiant.prenom}`} className="w-20 h-20 text-xl" />
              <div className="mt-4 font-bold text-xl">{etudiant.nom} {etudiant.prenom}</div>
              <div className="mt-1 font-mono text-muted-foreground text-xs">{etudiant.matricule}</div>
              <div className="mt-3"><StatusBadge status={etudiant.statut} /></div>
            </div>
            <div className="my-6 border-border border-t" />
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" /> <span className="text-foreground">{etudiant.email}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4" /> <span className="text-foreground">{etudiant.telephone}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-4 h-4" /> <span className="text-foreground">{etudiant.dateNaissance}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4" /> <span className="text-foreground">{etudiant.lieuNaissance} — {etudiant.adresse}</span>
              </li>
            </ul>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => setFormOpen(true)}>
              Modifier le profil
            </Button>
          </div>

          {/* Tabs panel */}
          <div className="lg:col-span-2">
            <div className="flex gap-1 bg-card shadow-sm mb-4 p-1 border border-border rounded-xl overflow-x-auto">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                    tab === t
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "Inscriptions" && (
              <DataTable>
                <THead><TR><TH>Année</TH><TH>Groupe</TH><TH>Niveau</TH><TH>Statut</TH><TH>Redoublant</TH><TH>Paiement</TH></TR></THead>
                <tbody>
                  {inscriptions.slice(0, 3).map((i) => (
                    <TR key={i.id}>
                      <TD>{i.anneeScolaire}</TD>
                      <TD className="font-medium">{i.groupe}</TD>
                      <TD>{i.niveau}</TD>
                      <TD><StatusBadge status={i.statut} /></TD>
                      <TD>{i.estRedoublant ? "🔄" : "—"}</TD>
                      <TD><StatusBadge status={i.paye ? "paye" : "impaye"} /></TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}

            {tab === "Notes" && (
              <DataTable>
                <THead><TR><TH>Matière</TH><TH>UE</TH><TH>Normale</TH><TH>Rattrapage</TH><TH>Finale</TH><TH>Absence</TH></TR></THead>
                <tbody>
                  {(myNotes.length ? myNotes : notes.slice(0, 6)).map((n) => {
                    const finale = n.absenceInjustifiee ? 0 : (n.noteRattrapage ?? n.noteNormale ?? 0);
                    return (
                      <TR key={n.id}>
                        <TD className="font-medium">{n.matiere}</TD>
                        <TD className="text-muted-foreground">{n.ue}</TD>
                        <TD>{n.noteNormale?.toFixed(2) ?? "—"}</TD>
                        <TD>{n.noteRattrapage?.toFixed(2) ?? "—"}</TD>
                        <TD className={finale < 10 ? "font-semibold text-danger" : "font-semibold text-emerald-600"}>
                          {finale.toFixed(2)}
                        </TD>
                        <TD>{n.absenceInjustifiee && <span className="font-semibold text-danger text-xs">ABS</span>}</TD>
                      </TR>
                    );
                  })}
                </tbody>
              </DataTable>
            )}

            {tab === "Résultats" && (
              <DataTable>
                <THead><TR><TH>Semestre</TH><TH>Moyenne</TH><TH>Décision</TH><TH>Délibération</TH></TR></THead>
                <tbody>
                  {(myRes.length ? myRes : resultatsSemestre.slice(0, 4)).map((r) => (
                    <TR key={r.id}>
                      <TD className="font-medium">{r.semestre}</TD>
                      <TD className={r.moyenne >= 10 ? "font-semibold text-emerald-600" : "font-semibold text-danger"}>
                        {r.moyenne.toFixed(2)}/20
                      </TD>
                      <TD><StatusBadge status={r.decision} /></TD>
                      <TD>{r.deliberation ? "Oui" : "—"}</TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}

            {tab === "Présences" && (
              <DataTable>
                <THead><TR><TH>Matière</TH><TH>Total</TH><TH>Présent</TH><TH>Absent</TH><TH>Retard</TH><TH>Justifié</TH><TH>Taux</TH></TR></THead>
                <tbody>
                  {["Algorithmique", "Programmation C", "Analyse 1", "Algèbre 1"].map((m, i) => (
                    <TR key={m}>
                      <TD className="font-medium">{m}</TD>
                      <TD>{14}</TD>
                      <TD className="text-emerald-600">{12 - i}</TD>
                      <TD className="text-danger">{1 + i}</TD>
                      <TD className="text-amber-600">{i}</TD>
                      <TD className="text-blue-600">{1}</TD>
                      <TD className="font-semibold">{Math.round(((12 - i) / 14) * 100)}%</TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}

            {tab === "Stage" && (
              <div className="bg-card shadow-sm p-6 border border-border rounded-xl">
                {myStages.length ? myStages.map((s) => (
                  <div key={s.id} className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    <Info label="Entreprise"        value={s.entreprise} />
                    <Info label="Encadrant"          value={s.enseignant} />
                    <Info label="Sujet"              value={s.sujet} className="md:col-span-2" />
                    <Info label="Note encadrant"     value={`${s.noteEncadrant}/20`} />
                    <Info label="Note soutenance"    value={`${s.noteSoutenance}/20`} />
                    <Info label="Moyenne pratique"   value={`${s.moyPratique.toFixed(2)}/20`} />
                    <Info label="Date soutenance"    value={s.dateSoutenance} />
                  </div>
                )) : (
                  <div className="text-muted-foreground text-sm">Aucun stage enregistré pour cet étudiant.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={formOpen}
        initial={etudiant}
        onSave={handleSave}
        onCancel={() => setFormOpen(false)}
      />
    </>
  );
}

function Info({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{label}</div>
      <div className="mt-1 font-medium text-sm">{value}</div>
    </div>
  );
}
