import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { groupesApi, filieresApi, anneesApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Groupe {
  id: number | string;
  nom: string;
  filiereId?: number | string;
  filiere?: string | { id: number | string; nom: string; code: string };
  niveauAnnee: string;
  anneeScolaireId?: number | string;
  anneeScolaire?: string | { id: number | string; label: string };
  capaciteMax: number;
  nbInscrits: number;
}

type FormData = Omit<Groupe, "id" | "filiere" | "anneeScolaire"> & {
  filiereId: number | string;
  anneeScolaireId: number | string;
};

// ─── CSS Animations ───────────────────────────────────────────────────────────
const ANIMATIONS = `
  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.88) translateY(24px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes deletePopIn {
    0%   { opacity: 0; transform: scale(0.5) rotate(-6deg); }
    60%  { opacity: 1; transform: scale(1.06) rotate(2deg); }
    80%  { transform: scale(0.97) rotate(-1deg); }
    100% { transform: scale(1)    rotate(0deg); }
  }
  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 0 0    rgba(239, 68, 68, 0.35); }
    50%      { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
  @keyframes spinLoader {
    to { transform: rotate(360deg); }
  }

  .anim-backdrop   { animation: backdropIn  0.2s ease; }
  .anim-modal      { animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .anim-delete-pop { animation: deletePopIn  0.45s cubic-bezier(0.36,0.07,0.19,0.97); }
  .anim-icon-pulse { animation: iconPulse    1.8s ease-in-out infinite; }
  .anim-spin       { animation: spinLoader   0.7s linear infinite; }
`;

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-medium text-gray-700 dark:text-gray-300 text-sm"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800 text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-shadow";

// ─── Form Modal (Add / Edit) ─────────────────────────────────────────────────
interface FormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initial?: Partial<Groupe>;
  onSave: (data: FormData & { id?: Groupe["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
  filieres: any[];
  annees: any[];
}

function FormModal({
  isOpen,
  mode,
  initial,
  onSave,
  onCancel,
  isSaving,
  filieres,
  annees,
}: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    nom: "",
    filiereId: "",
    niveauAnnee: "L1",
    anneeScolaireId: "",
    capaciteMax: 30,
    nbInscrits: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const fId = initial?.filiereId ?? (typeof initial?.filiere === "object" ? initial?.filiere?.id : "");
      const aId = initial?.anneeScolaireId ?? (typeof initial?.anneeScolaire === "object" ? initial?.anneeScolaire?.id : "");
      setForm({
        nom:             initial?.nom             ?? "",
        filiereId:       fId                      ?? "",
        niveauAnnee:     initial?.niveauAnnee     ?? "L1",
        anneeScolaireId: aId                      ?? "",
        capaciteMax:     initial?.capaciteMax     ?? 30,
        nbInscrits:      initial?.nbInscrits      ?? 0,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.nom.trim() !== "" && form.filiereId !== "" && form.anneeScolaireId !== "" && !isSaving;

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
              <h2 className="font-bold text-lg leading-tight">
                {mode === "add" ? "Nouveau groupe" : "Modifier le groupe"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add" ? "Remplissez les informations du nouveau groupe" : "Modifiez les champs à mettre à jour"}
              </p>
            </div>
            <button
              onClick={onCancel}
              aria-label="Fermer"
              title="Fermer"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Field label="Nom du groupe *" htmlFor="groupe-nom">
              <input
                id="groupe-nom"
                type="text"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : INFO-L2-G1"
                title="Nom du groupe"
                className={inputCls + " font-mono"}
              />
            </Field>

            <Field label="Filière *" htmlFor="groupe-filiere">
              <select
                id="groupe-filiere"
                value={form.filiereId}
                onChange={(e) => setForm((f) => ({ ...f, filiereId: e.target.value ? Number(e.target.value) : "" }))}
                title="Filière rattachée"
                className={inputCls}
              >
                <option value="">Sélectionner une filière</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom} ({f.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Niveau *" htmlFor="groupe-niveau">
              <select
                id="groupe-niveau"
                value={form.niveauAnnee}
                onChange={(e) => setForm((f) => ({ ...f, niveauAnnee: e.target.value }))}
                title="Niveau d'étude"
                className={inputCls}
              >
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="M2">M2</option>
              </select>
            </Field>

            <Field label="Année académique *" htmlFor="groupe-annee">
              <select
                id="groupe-annee"
                value={form.anneeScolaireId}
                onChange={(e) => setForm((f) => ({ ...f, anneeScolaireId: e.target.value ? Number(e.target.value) : "" }))}
                title="Année universitaire"
                className={inputCls}
              >
                <option value="">Sélectionner une année</option>
                {annees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Capacité max" htmlFor="groupe-capacite">
                <input
                  id="groupe-capacite"
                  type="number"
                  min={1}
                  value={form.capaciteMax}
                  onChange={(e) => setForm((f) => ({ ...f, capaciteMax: Math.max(1, +e.target.value) }))}
                  title="Capacité maximale"
                  className={inputCls}
                />
              </Field>
              <Field label="Inscrits actuels" htmlFor="groupe-inscrits">
                <input
                  id="groupe-inscrits"
                  type="number"
                  min={0}
                  value={form.nbInscrits}
                  onChange={(e) => setForm((f) => ({ ...f, nbInscrits: Math.max(0, +e.target.value) }))}
                  title="Nombre d'inscrits"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              className="flex-1 bg-red-50 hover:bg-red-100 active:bg-red-200 px-4 py-2.5 border border-red-200 rounded-xl font-semibold text-red-600 text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex flex-1 justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" aria-hidden="true" />
              ) : (
                <Check className="w-4 h-4" aria-hidden="true" />
              )}
              {mode === "add" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────
interface DeleteDialogProps {
  isOpen: boolean;
  target: Groupe | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteDialog({ isOpen, target, onConfirm, onCancel, isDeleting }: DeleteDialogProps) {
  if (!isOpen || !target) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/60 backdrop-blur-sm anim-backdrop" onClick={onCancel} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-sm text-center pointer-events-auto anim-delete-pop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="px-6 pt-8 pb-6">
            <div className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 id="delete-dialog-title" className="mb-2 font-bold text-lg">
              Confirmer la suppression
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Vous êtes sur le point de supprimer le groupe <strong>{target.nom}</strong>
            </p>
            <p className="mt-3 text-gray-400 text-xs">Cette action est irréversible.</p>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              className="flex-1 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex flex-1 justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Route ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_app/groupes")({
  head: () => ({ meta: [{ title: "Groupes — UniPlus" }] }),
  component: GroupesPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────
function GroupesPage() {
  const { data, isFallback, refetch } = useApiList(
    ["groupes"],
    () => groupesApi.list(),
  );
  const { data: filieres } = useApiList(
    ["filieres"],
    () => filieresApi.list({ limit: 1000 }),
  );
  const { data: annees } = useApiList(
    ["annees-scolaires"],
    () => anneesApi.list({ limit: 1000 }),
  );

  const getFiliereName = (g: Groupe) => {
    if (!g.filiere) return "";
    if (typeof g.filiere === "object") return (g.filiere as any).nom || "";
    const found = filieres.find((f: any) => f.id === g.filiereId) as any;
    if (found) return found.nom;
    return String(g.filiere);
  };

  const getAnneeLabel = (g: Groupe) => {
    if (!g.anneeScolaire) return "";
    if (typeof g.anneeScolaire === "object") return (g.anneeScolaire as any).label || "";
    const found = annees.find((a: any) => a.id === g.anneeScolaireId) as any;
    if (found) return found.label;
    return String(g.anneeScolaire);
  };

  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Groupe> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Groupe | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => groupesApi.create(payload),
    onSuccess: () => {
      toast.success("Groupe ajouté avec succès !");
      qc.invalidateQueries({ queryKey: ["groupes"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Groupe["id"] }) =>
      groupesApi.update(id, payload),
    onSuccess: () => {
      toast.success("Groupe modifié avec succès !");
      qc.invalidateQueries({ queryKey: ["groupes"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Groupe["id"]) => groupesApi.remove(id),
    onSuccess: () => {
      toast.success("Groupe supprimé avec succès !");
      qc.invalidateQueries({ queryKey: ["groupes"] });
      refetch();
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Suppression impossible"),
  });

  const openAdd = () => {
    setFormMode("add");
    setFormInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (g: Groupe) => {
    setFormMode("edit");
    setFormInitial(g);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Groupe["id"] }) => {
    if (formMode === "add") {
      add.mutate(data as FormData);
    } else if (data.id !== undefined) {
      edit.mutate({ id: data.id, ...data });
    }
  };

  return (
    <>
      {/* Generated CSS to avoid inline style usage for progress widths */}
      <style>{(data as Groupe[]).map((g) => {
        const pct = Math.round((g.nbInscrits / g.capaciteMax) * 100);
        return `.grp-fill-${g.id} { width: ${pct}% }`;
      }).join("\n")}</style>
      <div>
        <PageHeader
          title="Groupes"
          subtitle={`${(data as any[]).length} groupe${(data as any[]).length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouveau groupe
            </Button>
          }
        />

        <FilterBar>
          <SelectInput>
            <option value="">Toutes les années</option>
            {annees.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </SelectInput>
          <SelectInput>
            <option value="">Toutes les filières</option>
            {filieres.map((f: any) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </SelectInput>
        </FilterBar>

        <ApiStatusBanner show={isFallback} />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Nom</TH>
              <TH>Filière</TH>
              <TH>Niveau</TH>
              <TH>Année</TH>
              <TH>Capacité</TH>
              <TH>Inscrits</TH>
              <TH>Remplissage</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Groupe[]).map((g) => {
              const pct = Math.round((g.nbInscrits / g.capaciteMax) * 100);
              const color = pct < 80 ? "bg-emerald-500" : pct < 95 ? "bg-amber-500" : "bg-rose-500";

              return (
                <TR key={g.id}>
                  <TD className="text-muted-foreground">{g.id}</TD>
                  <TD className="font-mono font-medium">{g.nom}</TD>
                  <TD>{getFiliereName(g)}</TD>
                  <TD>
                    <span className="bg-muted px-2 py-0.5 rounded-md font-medium text-xs">{g.niveauAnnee}</span>
                  </TD>
                  <TD>{getAnneeLabel(g)}</TD>
                  <TD>{g.capaciteMax}</TD>
                  <TD>{g.nbInscrits}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="bg-muted rounded-full w-24 h-2 overflow-hidden">
                        <div className={`h-full ${color} grp-fill-${g.id}`} />
                      </div>
                      <span className="font-medium text-xs">{pct}%</span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <ActionButton
                        onClick={() => openEdit(g)}
                        aria-label={`Modifier ${g.nom}`}
                        title={`Modifier ${g.nom}`}
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => setDeleteTarget(g)}
                        aria-label={`Supprimer ${g.nom}`}
                        title={`Supprimer ${g.nom}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </ActionButton>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      </div>

      <FormModal
        isOpen={formOpen}
        mode={formMode}
        initial={formInitial}
        onSave={handleSave}
        onCancel={() => setFormOpen(false)}
        isSaving={add.isPending || edit.isPending}
        filieres={filieres}
        annees={annees}
      />

      <DeleteDialog
        isOpen={!!deleteTarget}
        target={deleteTarget}
        onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={del.isPending}
      />
    </>
  );
}