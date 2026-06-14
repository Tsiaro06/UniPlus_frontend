import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useApiList } from "@/lib/api/use-api-list";
import { anneesApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Annee {
  id: number | string;
  label: string;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  nbSemestres: number;
}

type FormData = Omit<Annee, "id">;

// ─── CSS Animations (identiques à affectations.tsx) ──────────────────────────

const ANIMATIONS = `
  @keyframes backdropIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.88) translateY(24px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes deletePopIn {
    0%   { opacity: 0; transform: scale(0.5) rotate(-6deg); }
    60%  { opacity: 1; transform: scale(1.06) rotate(2deg); }
    80%  { transform: scale(0.97) rotate(-1deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 0 0    rgba(239, 68, 68, 0.35); }
    50%       { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }
  @keyframes spinLoader {
    to { transform: rotate(360deg); }
  }

  .anim-backdrop   { animation: backdropIn   0.2s ease; }
  .anim-modal      { animation: modalSlideIn  0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .anim-delete-pop { animation: deletePopIn   0.45s cubic-bezier(0.36,0.07,0.19,0.97); }
  .anim-icon-pulse { animation: iconPulse     1.8s ease-in-out infinite; }
  .anim-spin       { animation: spinLoader    0.7s linear infinite; }
`;

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800 text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-shadow";

// ─── Field wrapper ────────────────────────────────────────────────────────────

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

// ─── Form Modal (Add / Edit) ──────────────────────────────────────────────────

interface FormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initial?: Partial<Annee>;
  onSave: (data: FormData & { id?: Annee["id"] }) => void;
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
    label: "",
    dateDebut: "",
    dateFin: "",
    actif: false,
    nbSemestres: 2,
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        label:       initial?.label       ?? "",
        dateDebut:   initial?.dateDebut   ?? "",
        dateFin:     initial?.dateFin     ?? "",
        actif:       initial?.actif       ?? false,
        nbSemestres: initial?.nbSemestres ?? 2,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.label.trim() !== "" && !isSaving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({
      ...form,
      ...(initial?.id !== undefined ? { id: initial.id } : {}),
    });
  };

  return (
    <>
      <style>{ANIMATIONS}</style>

      <div
        className="z-40 fixed inset-0 bg-black/50 backdrop-blur-sm anim-backdrop"
        onClick={onCancel}
      />

      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-md pointer-events-auto anim-modal">

          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-gray-100 dark:border-gray-800 border-b">
            <div>
              <h2 className="font-bold text-lg leading-tight">
                {mode === "add" ? "Nouvelle année scolaire" : "Modifier l'année scolaire"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add"
                  ? "Remplissez les informations de l'année"
                  : "Modifiez les champs à mettre à jour"}
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

          {/* Body */}
          <div className="space-y-4 px-6 py-5">
            <Field label="Libellé *" htmlFor="annee-label">
              <input
                id="annee-label"
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex : 2024-2025"
                className={inputCls}
              />
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Date début" htmlFor="annee-debut">
                <input
                  id="annee-debut"
                  type="text"
                  value={form.dateDebut}
                  onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                  placeholder="Ex : 01/09/2024"
                  className={inputCls}
                />
              </Field>
              <Field label="Date fin" htmlFor="annee-fin">
                <input
                  id="annee-fin"
                  type="text"
                  value={form.dateFin}
                  onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
                  placeholder="Ex : 30/06/2025"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Nb semestres" htmlFor="annee-semestres">
                <input
                  id="annee-semestres"
                  type="number"
                  min={1}
                  max={4}
                  value={form.nbSemestres}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nbSemestres: Number(e.target.value) }))
                  }
                  title="Nombre de semestres"
                  placeholder="Ex : 2"
                  className={inputCls}
                />
              </Field>

              <Field label="Active" htmlFor="annee-actif">
                <div className="flex items-center h-[38px]">
                  <label className="inline-flex relative items-center w-9 h-5 cursor-pointer">
                    <input
                      id="annee-actif"
                      type="checkbox"
                      checked={form.actif}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, actif: e.target.checked }))
                      }
                      className="sr-only peer"
                      aria-label="Année active"
                      title="Année active"
                    />
                    <span className="bg-slate-300 peer-checked:bg-primary rounded-full w-9 h-5 transition-colors" />
                    <span className="left-0.5 absolute bg-white rounded-full w-4 h-4 transition-transform peer-checked:translate-x-4" />
                  </label>
                </div>
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

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  isOpen: boolean;
  target: Annee | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({ isOpen, target, onConfirm, onCancel }: DeleteDialogProps) {
  if (!isOpen || !target) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>

      <div
        className="z-40 fixed inset-0 bg-black/60 backdrop-blur-sm anim-backdrop"
        onClick={onCancel}
      />

      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-sm text-center pointer-events-auto anim-delete-pop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="del-annee-title"
          aria-describedby="del-annee-desc"
        >
          <div className="px-6 pt-8 pb-6">
            <div
              className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse"
              aria-hidden="true"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h3 id="del-annee-title" className="mb-2 font-bold text-lg">
              Confirmer la suppression
            </h3>
            <p
              id="del-annee-desc"
              className="mb-1 text-gray-500 dark:text-gray-400 text-sm leading-relaxed"
            >
              Vous êtes sur le point de supprimer l'année scolaire
            </p>
            <p className="mb-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">
              <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-500 text-xs">
                {target.label}
              </span>
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
              className="flex flex-1 justify-center items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_app/annees")({
  head: () => ({ meta: [{ title: "Années scolaires — UniPlus" }] }),
  component: AnneesPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function AnneesPage() {
  const { data: items, refetch } = useApiList<Annee>(
    ["annees-scolaires"],
    () => anneesApi.list({ limit: 1000 }),
  );
  const qc = useQueryClient();

  // ── Modal state ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen]       = useState(false);
  const [formMode, setFormMode]       = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Annee> | undefined>();

  // ── Delete state ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Annee | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────
  const create = useMutation({
    mutationFn: (payload: FormData) => anneesApi.create(payload),
    onSuccess: () => {
      toast.success("Année scolaire ajoutée");
      qc.invalidateQueries({ queryKey: ["annees-scolaires"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const update = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Annee["id"] }) => anneesApi.update(id, payload),
    onSuccess: () => {
      toast.success("Année scolaire modifiée");
      qc.invalidateQueries({ queryKey: ["annees-scolaires"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: Annee["id"]) => anneesApi.remove(id),
    onSuccess: () => {
      toast.success("Année scolaire supprimée");
      qc.invalidateQueries({ queryKey: ["annees-scolaires"] });
      refetch();
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormMode("add");
    setFormInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (a: Annee) => {
    setFormMode("edit");
    setFormInitial(a);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Annee["id"] }) => {
    if (formMode === "add") {
      create.mutate(data);
    } else if (data.id !== undefined) {
      update.mutate({ ...data, id: data.id });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div>
        <PageHeader
          title="Années scolaires"
          subtitle={`${items.length} années`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Nouvelle année
            </Button>
          }
        />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Libellé</TH>
              <TH>Date début</TH>
              <TH>Date fin</TH>
              <TH>Active</TH>
              <TH>Semestres</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {items.map((a) => (
              <TR key={a.id}>
                <TD className="text-muted-foreground">{a.id}</TD>
                <TD className="font-mono font-medium">{a.label}</TD>
                <TD className="text-muted-foreground">{a.dateDebut}</TD>
                <TD className="text-muted-foreground">{a.dateFin}</TD>
                <TD>
                  <label className="inline-flex relative items-center w-9 h-5 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={a.actif}
                      className="sr-only peer"
                      aria-label={`Activer l'année ${a.label}`}
                      title={`Activer l'année ${a.label}`}
                    />
                    <span className="bg-slate-300 peer-checked:bg-primary rounded-full w-9 h-5 transition-colors" />
                    <span className="left-0.5 absolute bg-white rounded-full w-4 h-4 transition-transform peer-checked:translate-x-4" />
                  </label>
                </TD>
                <TD>{a.nbSemestres}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(a)}
                      aria-label={`Modifier l'année ${a.label}`}
                      title={`Modifier l'année ${a.label}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(a)}
                      aria-label={`Supprimer l'année ${a.label}`}
                      title={`Supprimer l'année ${a.label}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                  </div>
                </TD>
              </TR>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-gray-400 text-sm text-center">
                  Aucune année scolaire disponible.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>

      {/* Form Modal (Add / Edit) */}
      <FormModal
        isOpen={formOpen}
        mode={formMode}
        initial={formInitial}
        onSave={handleSave}
        onCancel={() => setFormOpen(false)}
        isSaving={false}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        isOpen={!!deleteTarget}
        target={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}