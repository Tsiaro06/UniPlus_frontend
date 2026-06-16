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
import { useState, useEffect } from "react";

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

function getEtudiantName(etudiant: unknown): string {
  if (!etudiant) return "";
  if (typeof etudiant === "string") return etudiant;
  if (typeof etudiant === "object") {
    const e = etudiant as { nom?: string; prenom?: string };
    return [e.prenom, e.nom].filter(Boolean).join(" ");
  }
  return String(etudiant);
}

function getMatricule(item: { matricule?: string; etudiant?: unknown }): string {
  if (typeof item.matricule === "string") return item.matricule;
  if (item.etudiant && typeof item.etudiant === "object") {
    return (item.etudiant as { matricule?: string }).matricule ?? "";
  }
  return "";
}

function getRelationLabel(value: unknown, key = "nom"): string {
  if (!value) return "";
  if (typeof value === "object") return String((value as Record<string, string>)[key] ?? "");
  return String(value);
}

function getNiveauLabel(item: { niveau?: unknown; niveauAnnee?: unknown; groupe?: unknown }): string {
  if (item.niveauAnnee && typeof item.niveauAnnee === "object") {
    return String((item.niveauAnnee as { code?: string }).code ?? "");
  }
  if (item.niveau) return getRelationLabel(item.niveau, "niveau") || getRelationLabel(item.niveau, "code");
  if (item.groupe && typeof item.groupe === "object") {
    const g = item.groupe as { niveauAnnee?: { code?: string } };
    if (g.niveauAnnee?.code) return g.niveauAnnee.code;
  }
  return "";
}

function getPaye(item: { paye?: boolean; montantPaye?: number; datePaiement?: string }): boolean {
  if (typeof item.paye === "boolean") return item.paye;
  return !!(item.montantPaye && item.montantPaye > 0) || !!item.datePaiement;
}

function getDateInscription(item: { dateInscription?: string; datePaiement?: string; createdAt?: string }): string {
  return item.dateInscription ?? item.datePaiement ?? item.createdAt?.slice(0, 10) ?? "";
}

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
              <Avatar name={getEtudiantName(inscription.etudiant)} />
              <div>
                <div className="font-semibold text-2xl">{getEtudiantName(inscription.etudiant)}</div>
                <div className="font-mono text-muted-foreground">{getMatricule(inscription)}</div>
              </div>
            </div>

            <div className="gap-x-8 gap-y-3 grid grid-cols-2 text-sm">
              <div><strong>Groupe :</strong> {getRelationLabel(inscription.groupe)}</div>
              <div><strong>Filière :</strong> {getRelationLabel(inscription.filiere)}</div>
              <div><strong>Niveau :</strong> {getNiveauLabel(inscription)}</div>
              <div><strong>Date :</strong> {getDateInscription(inscription)}</div>
              <div><strong>Statut :</strong> <StatusBadge status={inscription.statut} /></div>
              <div><strong>Paiement :</strong> <StatusBadge status={getPaye(inscription) ? "paye" : "impaye"} /></div>
              <div><strong>Montant :</strong> {(inscription as any)?.montantPaye ? `${(inscription as any).montantPaye} Ar` : "-"}</div>
              <div><strong>Bordereau :</strong> {(inscription as any)?.numeroBordereau ? <span className="font-mono">{(inscription as any).numeroBordereau}</span> : "-"}</div>
              <div><strong>Banque :</strong> {(inscription as any)?.nomBanque || "-"}</div>
              <div><strong>Date paiement :</strong> {(inscription as any)?.datePaiement ? new Date((inscription as any).datePaiement).toLocaleDateString("fr-FR") : "-"}</div>
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

// ─── Form Modal (Add/Edit) ────────────────────���──────────────────────────────
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
  const [form, setForm] = useState<{
    etudiantId?: number;
    etudiant: string;
    matricule: string;
    groupe: string;
    groupeId?: number;
    estRedoublant: boolean;
    numeroBordereau: string;
    montantPaye: string;
  }>({
    etudiant: "",
    matricule: "",
    groupe: "",
    groupeId: undefined,
    etudiantId: undefined,
    estRedoublant: false,
    numeroBordereau: "",
    montantPaye: "",
  });

  const [etudiantSearch, setEtudiantSearch] = useState("");
  const [showEtudiantList, setShowEtudiantList] = useState(false);

  // Filter etudiants based on search
  const filteredEtudiants = etudiants.filter((e) => {
    const fullName = `${e.prenom || ""} ${e.nom || ""}`.toLowerCase();
    const matricule = (e.matricule || "").toLowerCase();
    const search = etudiantSearch.toLowerCase();
    return fullName.includes(search) || matricule.includes(search);
  });

  useEffect(() => {
    if (isOpen && initial) {
      const matchedGroupe = (groupesData as any[]).find((g) => g.id === (initial.groupe as any)?.id);
      setForm({
        etudiant: getEtudiantName(initial.etudiant),
        matricule: getMatricule(initial),
        groupe: getRelationLabel(initial.groupe),
        groupeId: matchedGroupe?.id,
        estRedoublant: initial.estRedoublant ?? false,
        numeroBordereau: (initial as any)?.numeroBordereau || "",
        montantPaye: (initial as any)?.montantPaye?.toString() || "",
        etudiantId: (initial.etudiant as any)?.id,
      });
      setEtudiantSearch("");
      setShowEtudiantList(false);
    } else if (isOpen) {
      setForm({ 
        etudiant: "", 
        matricule: "", 
        groupe: "", 
        groupeId: undefined,
        estRedoublant: false, 
        numeroBordereau: "", 
        montantPaye: "",
        etudiantId: undefined 
      });
      setEtudiantSearch("");
      setShowEtudiantList(false);
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.etudiantId !== undefined && form.groupeId !== undefined && !isSaving;

  const handleSelectEtudiant = (etudiant: any) => {
    setForm(f => ({
      ...f,
      etudiantId: etudiant.id,
      etudiant: `${etudiant.prenom || ""} ${etudiant.nom || ""}`.trim(),
      matricule: etudiant.matricule || "",
    }));
    setEtudiantSearch("");
    setShowEtudiantList(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const dataToSend = { ...form, ...(initial?.id !== undefined ? { id: initial.id } : {}) };
    onSave(dataToSend);
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
            <Field label="Sélectionner étudiant *" htmlFor="etudiant-search">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="etudiant-search"
                      type="text"
                      placeholder="Nom ou matricule..."
                      value={etudiantSearch}
                      onChange={e => {
                        setEtudiantSearch(e.target.value);
                        setShowEtudiantList(true);
                      }}
                      onFocus={() => setShowEtudiantList(true)}
                      className={inputCls}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {showEtudiantList && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredEtudiants.length > 0 ? (
                      filteredEtudiants.map(e => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => handleSelectEtudiant(e)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium">{e.prenom} {e.nom}</div>
                          <div className="text-xs text-gray-500">{e.matricule}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">Aucun étudiant trouvé</div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            {form.etudiant && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100">{form.etudiant}</div>
                <div className="text-blue-700 dark:text-blue-300 font-mono">{form.matricule}</div>
              </div>
            )}

            <Field label="Groupe *" htmlFor="groupe">
              <select 
                id="groupe" 
                value={form.groupe} 
                onChange={e => {
                  const selectedGroupe = groupes.find(g => g.nom === e.target.value);
                  setForm(f => ({...f, groupe: e.target.value, groupeId: selectedGroupe?.id}))
                }} 
                title="Groupe" 
                aria-label="Groupe" 
                className={inputCls}
              >
                <option value="">Sélectionner un groupe</option>
                {groupes.map(g => <option key={g.id} value={g.nom}>{g.nom}</option>)}
              </select>
            </Field>

            <Field label="Numéro bordereau" htmlFor="bordereau">
              <input 
                id="bordereau" 
                type="text" 
                value={form.numeroBordereau} 
                onChange={e => setForm(f => ({...f, numeroBordereau: e.target.value}))} 
                placeholder="Ex : BRD-2024-001" 
                className={inputCls} 
              />
            </Field>

            <Field label="Montant payé" htmlFor="montant">
              <input 
                id="montant" 
                type="number" 
                step="0.01"
                value={form.montantPaye} 
                onChange={e => setForm(f => ({...f, montantPaye: e.target.value}))} 
                placeholder="Ex : 25000" 
                className={inputCls} 
              />
            </Field>

            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="redoublant" 
                checked={form.estRedoublant} 
                onChange={e => setForm(f => ({...f, estRedoublant: e.target.checked}))} 
                className="w-5 h-5 accent-primary" 
              />
              <label htmlFor="redoublant" className="text-sm">Redoublant</label>
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
            <p className="text-gray-500">Voulez-vous vraiment supprimer l'inscription de <strong>{getEtudiantName(target.etudiant)}</strong> ?</p>
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

  const filteredData = (data as Inscription[]).filter((i) => {
    const name = getEtudiantName(i.etudiant);
    const matricule = getMatricule(i);
    return (
      (!q || `${name} ${matricule}`.toLowerCase().includes(q.toLowerCase())) &&
      (!statut || i.statut === statut)
    );
  });

  const add = useMutation({
    mutationFn: (payload: any) => {
      const { matricule, etudiant, groupe, groupeId, etudiantId, estRedoublant, numeroBordereau, montantPaye } = payload;
      
      if (!etudiantId) {
        throw new Error("Sélectionnez un étudiant valide");
      }
      if (!groupeId) {
        throw new Error("Sélectionnez un groupe valide");
      }

      const matchedGroupe = (groupesData as any[]).find((g) => g.id === groupeId);
      const niveauAnneeId = matchedGroupe?.niveauAnneeId ?? matchedGroupe?.niveauAnnee?.id;
      const anneeScolaireId = matchedGroupe?.anneeScolaireId ?? matchedGroupe?.anneeScolaire?.id;
      
      if (!niveauAnneeId || !anneeScolaireId) {
        throw new Error("Le groupe sélectionné n'a pas les informations requises");
      }
      
      const apiPayload: any = {
        etudiantId: Number(etudiantId),
        groupeId: Number(groupeId),
        niveauAnneeId: Number(niveauAnneeId),
        anneeScolaireId: Number(anneeScolaireId),
        estRedoublant: Boolean(estRedoublant),
      };
      
      if (numeroBordereau?.trim()) {
        apiPayload.numeroBordereau = numeroBordereau;
      }
      if (montantPaye?.trim()) {
        apiPayload.montantPaye = montantPaye;
      }
      
      return inscriptionsApi.create(apiPayload);
    },
    onSuccess: () => { 
      toast.success("Inscription ajoutée avec succès !"); 
      qc.invalidateQueries({ queryKey: ["inscriptions"] }); 
      refetch(); 
      setFormOpen(false); 
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    }
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Inscription["id"] }) => {
      const { matricule, etudiant, groupe, filiere, niveau, dateInscription, paye, ...data } = payload;
      // PUT only accepts: statut, estRedoublant, numeroBordereau, montantPaye
      return inscriptionsApi.update?.(id, data) ?? Promise.resolve({ id, ...data });
    },
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
              <TH>#</TH><TH>Étudiant</TH><TH>Groupe</TH><TH>Filière</TH><TH>Niveau</TH><TH>Statut</TH><TH>Redoublant</TH><TH>Date</TH><TH>Montant</TH><TH>Bordereau</TH><TH>Banque</TH><TH>Paiement</TH><TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {filteredData.map((i) => (
              <TR key={i.id}>
                <TD className="text-muted-foreground">{i.id}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={getEtudiantName(i.etudiant)} />
                    <div>
                      <div className="font-medium">{getEtudiantName(i.etudiant)}</div>
                      <div className="font-mono text-muted-foreground text-xs">{getMatricule(i)}</div>
                    </div>
                  </div>
                </TD>
                <TD className="font-medium">{getRelationLabel(i.groupe)}</TD>
                <TD className="text-muted-foreground">{getRelationLabel(i.filiere)}</TD>
                <TD>{getNiveauLabel(i)}</TD>
                <TD><StatusBadge status={i.statut} /></TD>
                <TD>{i.estRedoublant && <RefreshCw className="w-4 h-4 text-amber-600" />}</TD>
                <TD className="text-muted-foreground">{getDateInscription(i)}</TD>
                <TD className="font-mono font-semibold">{(i as any)?.montantPaye ? `${(i as any).montantPaye} Ar` : "-"}</TD>
                <TD className="font-mono text-sm">{(i as any)?.numeroBordereau || "-"}</TD>
                <TD className="text-muted-foreground text-sm">{(i as any)?.nomBanque || "-"}</TD>
                <TD><StatusBadge status={getPaye(i) ? "paye" : "impaye"} /></TD>
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
