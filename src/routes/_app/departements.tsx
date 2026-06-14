import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { departementsApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Departement {
  id: number | string;
  code: string;
  nom: string;
  chefDepartement: string;
  nbFilieres: number;
  nbEnseignants: number;
}

type FormData = Omit<Departement, "id">;

// ─── CSS Animations (classes, no inline styles) ───────────────────────────────
// FIX: replaced all style={{ animation }} with named CSS classes

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
    50%       { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
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
// FIX: added htmlFor prop so <label> is properly linked to its <input> (axe/forms)

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
  initial?: Partial<Departement>;
  onSave: (data: FormData & { id?: Departement["id"] }) => void;
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
    nom: "",
    chefDepartement: "",
    nbFilieres: 0,
    nbEnseignants: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        code: initial?.code ?? "",
        nom: initial?.nom ?? "",
        chefDepartement: initial?.chefDepartement ?? "",
        nbFilieres: initial?.nbFilieres ?? 0,
        nbEnseignants: initial?.nbEnseignants ?? 0,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.code.trim() !== "" && form.nom.trim() !== "" && !isSaving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({ ...form, ...(initial?.id !== undefined ? { id: initial.id } : {}) });
  };

  return (
    <>
      <style>{ANIMATIONS}</style>

      {/* Backdrop — FIX: className instead of style={{ animation }} */}
      <div
        className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        {/* FIX: className instead of style={{ animation }} */}
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-md pointer-events-auto anim-modal">

          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-gray-100 dark:border-gray-800 border-b">
            <div>
              <h2 className="font-bold text-lg leading-tight">
                {mode === "add" ? "Nouveau département" : "Modifier le département"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add"
                  ? "Remplissez les informations du nouveau département"
                  : "Modifiez les champs à mettre à jour"}
              </p>
            </div>
            {/* FIX (axe/name-role-value): added aria-label + title to icon-only button */}
            <button
              onClick={onCancel}
              aria-label="Fermer"
              title="Fermer"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5">
            <Field label="Code *" htmlFor="dept-code">
              <input
                id="dept-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex : INFO"
                maxLength={10}
                className={inputCls + " font-mono tracking-widest uppercase"}
              />
            </Field>

            <Field label="Nom du département *" htmlFor="dept-nom">
              <input
                id="dept-nom"
                type="text"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Informatique"
                className={inputCls}
              />
            </Field>

            <Field label="Chef de département" htmlFor="dept-chef">
              <input
                id="dept-chef"
                type="text"
                value={form.chefDepartement}
                onChange={(e) => setForm((f) => ({ ...f, chefDepartement: e.target.value }))}
                placeholder="Ex : Dr. Martin Rakoto"
                className={inputCls}
              />
            </Field>

            <div className="gap-4 grid grid-cols-2">
              {/* FIX (axe/forms): added id + htmlFor + placeholder to number inputs */}
              <Field label="Nb. Filières" htmlFor="dept-filieres">
                <input
                  id="dept-filieres"
                  type="number"
                  min={0}
                  value={form.nbFilieres}
                  onChange={(e) => setForm((f) => ({ ...f, nbFilieres: Math.max(0, +e.target.value) }))}
                  placeholder="0"
                  title="Nombre de filières"
                  className={inputCls}
                />
              </Field>
              <Field label="Nb. Enseignants" htmlFor="dept-enseignants">
                <input
                  id="dept-enseignants"
                  type="number"
                  min={0}
                  value={form.nbEnseignants}
                  onChange={(e) => setForm((f) => ({ ...f, nbEnseignants: Math.max(0, +e.target.value) }))}
                  placeholder="0"
                  title="Nombre d'enseignants"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
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
              {/* FIX: className instead of style={{ animation }} */}
              {isSaving ? (
                <span
                  className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin"
                  aria-hidden="true"
                />
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
  target: Departement | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteDialog({
  isOpen,
  target,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteDialogProps) {
  if (!isOpen || !target) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>

      {/* Backdrop — FIX: className instead of style={{ animation }} */}
      <div
        className="z-40 fixed inset-0 bg-black/60 backdrop-blur-sm anim-backdrop"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        {/* FIX: className instead of style={{ animation }} */}
        <div
          className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-sm text-center pointer-events-auto anim-delete-pop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="px-6 pt-8 pb-6">
            {/* FIX: className instead of style={{ animation }} */}
            <div
              className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse"
              aria-hidden="true"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h3
              id="delete-dialog-title"
              className="mb-2 font-bold text-lg"
            >
              Confirmer la suppression
            </h3>
            <p
              id="delete-dialog-desc"
              className="mb-1 text-gray-500 dark:text-gray-400 text-sm leading-relaxed"
            >
              Vous êtes sur le point de supprimer le département
            </p>
            <p className="mb-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {target.nom}
              <span className="bg-gray-100 dark:bg-gray-800 ml-2 px-1.5 py-0.5 rounded font-mono text-gray-500 text-xs">
                {target.code}
              </span>
            </p>
            <p className="mt-3 text-gray-400 text-xs">
              Cette action est irréversible.
            </p>
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
              {/* FIX: className instead of style={{ animation }} */}
              {isDeleting ? (
                <span
                  className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin"
                  aria-hidden="true"
                />
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

export const Route = createFileRoute("/_app/departements")({
  head: () => ({ meta: [{ title: "Départements — UniPlus" }] }),
  component: DepartementsPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────

function DepartementsPage() {
  const { data, isFallback, refetch } = useApiList(
    ["departements"],
    () => departementsApi.list(),
  );
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Departement> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Departement | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => departementsApi.create(payload),
    onSuccess: () => {
      toast.success("Département ajouté avec succès !");
      qc.invalidateQueries({ queryKey: ["departements"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Departement["id"] }) =>
      departementsApi.update(id, payload),
    onSuccess: () => {
      toast.success("Département modifié avec succès !");
      qc.invalidateQueries({ queryKey: ["departements"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Departement["id"]) => departementsApi.remove(id),
    onSuccess: () => {
      toast.success("Département supprimé avec succès !");
      qc.invalidateQueries({ queryKey: ["departements"] });
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

  const openEdit = (d: Departement) => {
    setFormMode("edit");
    setFormInitial(d);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Departement["id"] }) => {
    if (formMode === "add") {
      const { id: _ignored, ...payload } = data as any;
      add.mutate(payload);
    } else if (data.id !== undefined) {
      const { id, ...payload } = data as any;
      edit.mutate({ id, ...payload });
    }
  };

  return (
    <>
      <div>
        <PageHeader
          title="Départements"
          subtitle={`${(data as any[]).length} département${(data as any[]).length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouveau département
            </Button>
          }
        />

        <ApiStatusBanner show={isFallback} />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Code</TH>
              <TH>Nom</TH>
              <TH>Chef de département</TH>
              <TH>Filières</TH>
              <TH>Enseignants</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Departement[]).map((d) => (
              <TR key={d.id}>
                <TD className="text-muted-foreground">{d.id}</TD>
                <TD>
                  <span className="bg-primary/10 px-2 py-0.5 rounded-md font-mono font-semibold text-primary text-xs">
                    {d.code}
                  </span>
                </TD>
                <TD className="font-medium">{d.nom}</TD>
                <TD>{d.chefDepartement}</TD>
                <TD>{d.nbFilieres}</TD>
                <TD>{d.nbEnseignants}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(d)}
                      aria-label={`Modifier ${d.nom}`}
                      title={`Modifier ${d.nom}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(d)}
                      aria-label={`Supprimer ${d.nom}`}
                      title={`Supprimer ${d.nom}`}
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