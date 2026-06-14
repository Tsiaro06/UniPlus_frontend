import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { matieresApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Matiere {
  id: number | string;
  code: string;
  intitule: string;
  ue: string;
  coefficient: number;
  volumeHoraire: number;
}

type FormData = Omit<Matiere, "id">;

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
  initial?: Partial<Matiere>;
  onSave: (data: FormData & { id?: Matiere["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function FormModal({
  isOpen,
  mode,
  initial,
  onSave,
  onCancel,
  isSaving,
}: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    code: "",
    intitule: "",
    ue: "",
    coefficient: 1,
    volumeHoraire: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        code: initial?.code ?? "",
        intitule: initial?.intitule ?? "",
        ue: initial?.ue ?? "",
        coefficient: initial?.coefficient ?? 1,
        volumeHoraire: initial?.volumeHoraire ?? 0,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.code.trim() !== "" && form.intitule.trim() !== "" && form.ue.trim() !== "" && !isSaving;

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
                {mode === "add" ? "Nouvelle matière" : "Modifier la matière"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add" ? "Remplissez les informations de la nouvelle matière" : "Modifiez les champs à mettre à jour"}
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
            <Field label="Code *" htmlFor="matiere-code">
              <input
                id="matiere-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex : ALGO101"
                title="Code de la matière"
                maxLength={10}
                className={inputCls + " font-mono uppercase"}
              />
            </Field>

            <Field label="Intitulé *" htmlFor="matiere-intitule">
              <input
                id="matiere-intitule"
                type="text"
                value={form.intitule}
                onChange={(e) => setForm((f) => ({ ...f, intitule: e.target.value }))}
                placeholder="Ex : Algorithmique et Structures de Données"
                title="Intitulé complet"
                className={inputCls}
              />
            </Field>

            <Field label="Unité d'Enseignement (UE) *" htmlFor="matiere-ue">
              <select
                id="matiere-ue"
                value={form.ue}
                onChange={(e) => setForm((f) => ({ ...f, ue: e.target.value }))}
                title="UE rattachée"
                className={inputCls}
              >
                <option value="">Sélectionner une UE</option>
                {ues.map((u) => (
                  <option key={u.id} value={u.code}>
                    {u.code} - {u.intitule}
                  </option>
                ))}
              </select>
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Coefficient" htmlFor="matiere-coeff">
                <input
                  id="matiere-coeff"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.coefficient}
                  onChange={(e) => setForm((f) => ({ ...f, coefficient: Math.max(0.5, +e.target.value) }))}
                  title="Coefficient de la matière"
                  className={inputCls}
                />
              </Field>
              <Field label="Volume horaire (h)" htmlFor="matiere-volume">
                <input
                  id="matiere-volume"
                  type="number"
                  min={0}
                  value={form.volumeHoraire}
                  onChange={(e) => setForm((f) => ({ ...f, volumeHoraire: Math.max(0, +e.target.value) }))}
                  title="Volume horaire total"
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
  target: Matiere | null;
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
              Vous êtes sur le point de supprimer la matière <strong>{target.code}</strong>
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
export const Route = createFileRoute("/_app/matieres")({
  head: () => ({ meta: [{ title: "Matières — UniPlus" }] }),
  component: MatieresPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────
function MatieresPage() {
  const { data, isFallback, refetch } = useApiList(
    ["matieres"],
    () => matieresApi.list(),
  );

  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Matiere> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Matiere | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => matieresApi.create(payload),
    onSuccess: () => {
      toast.success("Matière ajoutée avec succès !");
      qc.invalidateQueries({ queryKey: ["matieres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Matiere["id"] }) =>
      matieresApi.update(id, payload),
    onSuccess: () => {
      toast.success("Matière modifiée avec succès !");
      qc.invalidateQueries({ queryKey: ["matieres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Matiere["id"]) => matieresApi.remove(id),
    onSuccess: () => {
      toast.success("Matière supprimée avec succès !");
      qc.invalidateQueries({ queryKey: ["matieres"] });
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

  const openEdit = (m: Matiere) => {
    setFormMode("edit");
    setFormInitial(m);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Matiere["id"] }) => {
    if (formMode === "add") {
      add.mutate(data as FormData);
    } else if (data.id !== undefined) {
      edit.mutate({ id: data.id, ...data });
    }
  };

  return (
    <>
      <div>
        <PageHeader
          title="Matières"
          subtitle={`${(data as any[]).length} matière${(data as any[]).length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouvelle matière
            </Button>
          }
        />

        <FilterBar>
          <SelectInput>
            <option>Toutes les UE</option>
            {ues.map((u) => (
              <option key={u.id}>{u.code}</option>
            ))}
          </SelectInput>
        </FilterBar>

        <ApiStatusBanner show={isFallback} />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Code</TH>
              <TH>Intitulé</TH>
              <TH>UE</TH>
              <TH>Coefficient</TH>
              <TH>Volume horaire</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Matiere[]).map((m) => (
              <TR key={m.id}>
                <TD className="text-muted-foreground">{m.id}</TD>
                <TD>
                  <span className="bg-primary/10 px-2 py-0.5 rounded-md font-mono font-semibold text-primary text-xs">
                    {m.code}
                  </span>
                </TD>
                <TD className="font-medium">{m.intitule}</TD>
                <TD>{m.ue}</TD>
                <TD>{m.coefficient}</TD>
                <TD>{m.volumeHoraire}h</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(m)}
                      aria-label={`Modifier ${m.code}`}
                      title={`Modifier ${m.code}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(m)}
                      aria-label={`Supprimer ${m.code}`}
                      title={`Supprimer ${m.code}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                  </div>
                </TD>
              </TR>
            ))}
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