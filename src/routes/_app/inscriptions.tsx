import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle, Eye, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SearchInput, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, Avatar, ActionButton } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { inscriptionsApi, anneesApi, groupesApi, etudiantsApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Inscription {
  id: number | string;
  etudiant: string;
  matricule: string;
  groupe: string;
  filiere: string;
  niveau: string;
  statut: string;
  estRedoublant: boolean;
  dateInscription: string;
  paye: boolean;
}

type FormData = Omit<Inscription, "id">;

// ─── CSS Animations ───────────────────────────────────────────────────────────
const ANIMATIONS = `
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.88) translateY(24px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes deletePopIn { 0% { opacity: 0; transform: scale(0.5) rotate(-6deg); } 60% { opacity: 1; transform: scale(1.06) rotate(2deg); } 80% { transform: scale(0.97) rotate(-1deg); } 100% { transform: scale(1) rotate(0deg); } }
  @keyframes iconPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); } 50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } }
  @keyframes spinLoader { to { transform: rotate(360deg); } }

  .anim-backdrop   { animation: backdropIn  0.2s ease; }
  .anim-modal      { animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .anim-delete-pop { animation: deletePopIn  0.45s cubic-bezier(0.36,0.07,0.19,0.97); }
  .anim-icon-pulse { animation: iconPulse    1.8s ease-in-out infinite; }
  .anim-spin       { animation: spinLoader   0.7s linear infinite; }
`;

// ─── Reusable Field ───────────────────────────────────────────────────────────
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

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-shadow";

// ─── Detail Modal (Œil) ─────────────────────────────────────────────────────
function DetailModal({ isOpen, inscription, onClose }: { isOpen: boolean; inscription: Inscription | null; onClose: () => void }) {
  if (!isOpen || !inscription) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop" onClick={onClose} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-lg pointer-events-auto anim-modal">
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b">
            <h2 className="font-bold text-xl">Détails de l'inscription</h2>
            <button onClick={onClose} aria-label="Fermer"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
              <Avatar name={inscription.etudiant} />
              <div>
                <div className="font-semibold text-2xl">{inscription.etudiant}</div>
                <div className="font-mono text-muted-foreground">{inscription.matricule}</div>
              </div>
            </div>

            <div className="gap-x-8 gap-y-3 grid grid-cols-2 text-sm">
              <div><strong>Groupe :</strong> {inscription.groupe}</div>
              <div><strong>Filière :</strong> {inscription.filiere}</div>
              <div><strong>Niveau :</strong> {inscription.niveau}</div>
              <div><strong>Date :</strong> {inscription.dateInscription}</div>
              <div><strong>Statut :</strong> <StatusBadge status={inscription.statut} /></div>
              <div><strong>Paiement :</strong> <StatusBadge status={inscription.paye ? "paye" : "impaye"} /></div>
            </div>

            {inscription.estRedoublant && (
              <div className="flex items-center gap-2 font-medium text-amber-600">
                <RefreshCw className="w-5 h-5" /> Redoublant
              </div>
            )}
          </div>

          <div className="flex justify-end px-6 py-4 border-t">
            <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 px-6 py-2.5 rounded-xl font-medium">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Form Modal (Add/Edit) ───────────────────────────────────────────────────
interface FormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initial?: Partial<Inscription>;
  onSave: (data: FormData & { id?: Inscription["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
  groupes: any[];
  etudiants: any[];
}

function FormModal({ isOpen, mode, initial, onSave, onCancel, isSaving, groupes, etudiants }: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    etudiant: "", matricule: "", groupe: "", filiere: "", niveau: "",
    statut: "actif", estRedoublant: false, dateInscription: "", paye: false,
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentList, setShowStudentList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter students based on search query
  const filteredStudents = etudiants.filter(e =>
    e.matricule.toLowerCase().includes(studentSearch.toLowerCase()) ||
    `${e.nom} ${e.prenom}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectStudent = (student: any) => {
    setForm(f => ({
      ...f,
      etudiant: `${student.nom} ${student.prenom}`,
      matricule: student.matricule
    }));
    setStudentSearch("");
    setShowStudentList(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentList(false);
      }
    };
    if (showStudentList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showStudentList]);

  useEffect(() => {
    if (isOpen && initial) {
      setForm({ ...initial } as FormData);
      setStudentSearch("");
    } else if (isOpen) {
      setForm({ etudiant: "", matricule: "", groupe: "", filiere: "", niveau: "", statut: "actif", estRedoublant: false, dateInscription: "", paye: false });
      setStudentSearch("");
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.etudiant.trim() !== "" && form.matricule.trim() !== "" && form.groupe.trim() !== "" && !isSaving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({ ...form, ...(initial?.id !== undefined ? { id: initial.id } : {}) });
  };

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop" onClick={onCancel} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-md pointer-events-auto anim-modal">
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-gray-100 dark:border-gray-800 border-b">
            <div>
              <h2 className="font-bold text-lg">{mode === "add" ? "Nouvelle inscription" : "Modifier l'inscription"}</h2>
            </div>
            <button onClick={onCancel} aria-label="Fermer"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Field label="Sélectionner un étudiant *" htmlFor="student-search">
              <div ref={dropdownRef} className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    id="student-search"
                    type="text"
                    value={studentSearch || form.matricule}
                    onChange={e => {
                      setStudentSearch(e.target.value);
                      setShowStudentList(true);
                    }}
                    onFocus={() => setShowStudentList(true)}
                    placeholder="Chercher par matricule ou nom..."
                    className={inputCls + " pl-10"}
                  />
                </div>
                
                {showStudentList && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => selectStudent(student)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-sm">{student.nom} {student.prenom}</div>
                          <div className="text-xs text-gray-500 font-mono">{student.matricule}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        {studentSearch ? "Aucun étudiant trouvé" : "Commencez à taper pour chercher"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            {form.etudiant && form.matricule && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-sm font-medium text-green-800 dark:text-green-200">{form.etudiant}</div>
                <div className="text-xs text-green-600 dark:text-green-300 font-mono">{form.matricule}</div>
              </div>
            )}

            <Field label="Groupe" htmlFor="groupe">
              <select id="groupe" value={form.groupe} onChange={e => setForm(f => ({...f, groupe: e.target.value}))} title="Groupe" aria-label="Groupe" className={inputCls}>
                <option value="">Sélectionner un groupe</option>
                {groupes.map(g => <option key={g.id} value={g.nom}>{g.nom}</option>)}
              </select>
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Statut" htmlFor="statut">
                <select id="statut" value={form.statut} onChange={e => setForm(f => ({...f, statut: e.target.value}))} title="Statut" aria-label="Statut" className={inputCls}>
                  <option value="actif">Actif</option>
                  <option value="redoublant">Redoublant</option>
                  <option value="exclu">Exclu</option>
                  <option value="diplome">Diplômé</option>
                </select>
              </Field>
              <Field label="Date d'inscription" htmlFor="date">
                <input id="date" type="date" value={form.dateInscription} onChange={e => setForm(f => ({...f, dateInscription: e.target.value}))} title="Date d'inscription" aria-label="Date d'inscription" className={inputCls} />
              </Field>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="redoublant" checked={form.estRedoublant} onChange={e => setForm(f => ({...f, estRedoublant: e.target.checked}))} className="w-5 h-5 accent-primary" />
              <label htmlFor="redoublant" className="text-sm">Redoublant</label>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="paye" checked={form.paye} onChange={e => setForm(f => ({...f, paye: e.target.checked}))} className="w-5 h-5 accent-primary" />
              <label htmlFor="paye" className="text-sm">Paiement effectué</label>
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onCancel} className="flex-1 bg-red-50 hover:bg-red-100 px-4 py-2.5 border border-red-200 rounded-xl font-semibold text-red-600">Annuler</button>
            <button onClick={handleSubmit} disabled={!canSubmit} className="flex flex-1 justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-semibold text-white">
              {isSaving ? <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" /> : <Check className="w-4 h-4" />}
              {mode === "add" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Dialog ───────────────────────────────────────────────────────────
function DeleteDialog({ isOpen, target, onConfirm, onCancel, isDeleting }: {
  isOpen: boolean; target: Inscription | null; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  if (!isOpen || !target) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/60 backdrop-blur-sm anim-backdrop" onClick={onCancel} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-sm text-center pointer-events-auto anim-delete-pop" role="alertdialog">
          <div className="px-6 pt-8 pb-6">
            <div className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="mb-2 font-bold text-lg">Confirmer la suppression</h3>
            <p className="text-gray-500">Voulez-vous vraiment supprimer l'inscription de <strong>{target.etudiant}</strong> ?</p>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl font-medium">Annuler</button>
            <button onClick={onConfirm} disabled={isDeleting} className="flex flex-1 justify-center items-center gap-2 bg-red-600 hover:bg-red-700 py-2.5 rounded-xl font-medium text-white">
              {isDeleting ? <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_app/inscriptions")({
  head: () => ({ meta: [{ title: "Inscriptions — UniPlus" }] }),
  component: InscriptionsPage,
});

function InscriptionsPage() {
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Inscription> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Inscription | null>(null);
  const [detailTarget, setDetailTarget] = useState<Inscription | null>(null);

  const { data, isFallback, refetch } = useApiList(["inscriptions"], () => inscriptionsApi.list?.() ?? Promise.resolve([]), []);

  const { data: anneesData } = useApiList(["annees"], () => anneesApi.list?.() ?? Promise.resolve([]), []);
  const { data: groupesData } = useApiList(["groupes"], () => groupesApi.list?.() ?? Promise.resolve([]), []);
  const { data: etudiantsData } = useApiList(["etudiants"], () => etudiantsApi.list?.() ?? Promise.resolve([]), []);

  const qc = useQueryClient();

  const filteredData = (data as Inscription[]).filter(i =>
    (!q || `${i.etudiant} ${i.matricule}`.toLowerCase().includes(q.toLowerCase())) &&
    (!statut || i.statut === statut)
  );

  const add = useMutation({
    mutationFn: (payload: FormData) => inscriptionsApi.create?.(payload) ?? Promise.resolve({ ...payload, id: Date.now() }),
    onSuccess: () => { toast.success("Inscription ajoutée avec succès !"); qc.invalidateQueries({ queryKey: ["inscriptions"] }); refetch(); setFormOpen(false); },
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Inscription["id"] }) => inscriptionsApi.update?.(id, payload) ?? Promise.resolve({ id, ...payload }),
    onSuccess: () => { toast.success("Inscription modifiée avec succès !"); qc.invalidateQueries({ queryKey: ["inscriptions"] }); refetch(); setFormOpen(false); },
  });

  const del = useMutation({
    mutationFn: (id: Inscription["id"]) => inscriptionsApi.remove?.(id) ?? Promise.resolve(id),
    onSuccess: () => { toast.success("Inscription supprimée avec succès !"); qc.invalidateQueries({ queryKey: ["inscriptions"] }); refetch(); setDeleteTarget(null); },
  });

  const openAdd = () => { setFormMode("add"); setFormInitial(undefined); setFormOpen(true); };
  const openEdit = (i: Inscription) => { setFormMode("edit"); setFormInitial(i); setFormOpen(true); };

  const handleSave = (data: FormData & { id?: Inscription["id"] }) => {
    if (formMode === "add") add.mutate(data as FormData);
    else if (data.id) edit.mutate({ id: data.id, ...data });
  };

  return (
    <>
      <div>
        <PageHeader
          title="Inscriptions"
          subtitle={`${filteredData.length} inscriptions`}
          actions={<Button onClick={openAdd}><Plus className="w-4 h-4" /> Nouvelle inscription</Button>}
        />

        <ApiStatusBanner show={isFallback} />

        <FilterBar>
          <SearchInput placeholder="Matricule ou nom..." value={q} onChange={setQ} />
          <SelectInput>
            <option>Toutes les années</option>
            {anneesData.map((a: any) => <option key={a.id}>{a.label}</option>)}
          </SelectInput>
          <SelectInput>
            <option>Tous les groupes</option>
            {groupesData.map((g: any) => <option key={g.id}>{g.nom}</option>)}
          </SelectInput>
          <SelectInput value={statut} onChange={(value) => setStatut(value)}>
            <option value="">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="redoublant">Redoublant</option>
            <option value="exclu">Exclu</option>
            <option value="diplome">Diplômé</option>
          </SelectInput>
        </FilterBar>

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH><TH>Étudiant</TH><TH>Groupe</TH><TH>Filière</TH><TH>Niveau</TH><TH>Statut</TH><TH>Redoublant</TH><TH>Date</TH><TH>Paiement</TH><TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {filteredData.map((i) => (
              <TR key={i.id}>
                <TD className="text-muted-foreground">{i.id}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={i.etudiant} />
                    <div>
                      <div className="font-medium">{i.etudiant}</div>
                      <div className="font-mono text-muted-foreground text-xs">{i.matricule}</div>
                    </div>
                  </div>
                </TD>
                <TD className="font-medium">{i.groupe}</TD>
                <TD className="text-muted-foreground">{i.filiere}</TD>
                <TD>{i.niveau}</TD>
                <TD><StatusBadge status={i.statut} /></TD>
                <TD>{i.estRedoublant && <RefreshCw className="w-4 h-4 text-amber-600" />}</TD>
                <TD className="text-muted-foreground">{i.dateInscription}</TD>
                <TD><StatusBadge status={i.paye ? "paye" : "impaye"} /></TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton onClick={() => setDetailTarget(i)}><Eye className="w-4 h-4" /></ActionButton>
                    <ActionButton onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></ActionButton>
                    <ActionButton variant="danger" onClick={() => setDeleteTarget(i)}><Trash2 className="w-4 h-4" /></ActionButton>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </DataTable>
      </div>

      <FormModal isOpen={formOpen} mode={formMode} initial={formInitial} onSave={handleSave} onCancel={() => setFormOpen(false)} isSaving={add.isPending || edit.isPending} groupes={groupesData} etudiants={etudiantsData} />

      <DeleteDialog isOpen={!!deleteTarget} target={deleteTarget} onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} isDeleting={del.isPending} />

      <DetailModal isOpen={!!detailTarget} inscription={detailTarget} onClose={() => setDetailTarget(null)} />
    </>
  );
}
