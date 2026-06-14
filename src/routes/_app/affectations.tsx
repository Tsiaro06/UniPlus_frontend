import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { affectations as mock, annees, groupes } from "@/lib/mock-data";
import { affectationsApi } from "@/lib/api/endpoints";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Affectation {
  id: number | string;
  enseignant: string;
  matiere: string;
  groupe: string;
  semestre: string;
  annee: string;
}

type FormData = Omit<Affectation, "id">;

// ─── CSS Animations (named classes — no inline styles) ────────────────────────

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

const SEMESTRES = ["S1", "S2", "S3", "S4", "S5", "S6"];

// ─── Form Modal (Add / Edit) ─────────────────────────────────────────────────

interface FormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initial?: Partial<Affectation>;
  onSave: (data: FormData & { id?: Affectation["id"] }) => void;
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
    enseignant: "",
    matiere: "",
    groupe: groupes[0]?.nom ?? "",
    semestre: "S1",
    annee: annees[0]?.label ?? "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        enseignant: initial?.enseignant ?? "",
        matiere: initial?.matiere ?? "",
        groupe: initial?.groupe ?? groupes[0]?.nom ?? "",
        semestre: initial?.semestre ?? "S1",
        annee: initial?.annee ?? annees[0]?.label ?? "",
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit =
    form.enseignant.trim() !== "" && form.matiere.trim() !== "" && !isSaving;

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
                {mode === "add" ? "Nouvelle affectation" : "Modifier l'affectation"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add"
                  ? "Remplissez les informations de l'affectation"
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
            <Field label="Enseignant *" htmlFor="aff-enseignant">
              <input
                id="aff-enseignant"
                type="text"
                value={form.enseignant}
                onChange={(e) => setForm((f) => ({ ...f, enseignant: e.target.value }))}
                placeholder="Ex : Dr. Rakoto"
                className={inputCls}
              />
            </Field>

            <Field label="Matière *" htmlFor="aff-matiere">
              <input
                id="aff-matiere"
                type="text"
                value={form.matiere}
                onChange={(e) => setForm((f) => ({ ...f, matiere: e.target.value }))}
                placeholder="Ex : Algorithmique"
                className={inputCls}
              />
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Groupe" htmlFor="aff-groupe">
                <select
                  id="aff-groupe"
                  value={form.groupe}
                  onChange={(e) => setForm((f) => ({ ...f, groupe: e.target.value }))}
                  title="Groupe"
                  className={inputCls}
                >
                  {groupes.map((g) => (
                    <option key={g.id} value={g.nom}>
                      {g.nom}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Semestre" htmlFor="aff-semestre">
                <select
                  id="aff-semestre"
                  value={form.semestre}
                  onChange={(e) => setForm((f) => ({ ...f, semestre: e.target.value }))}
                  title="Semestre"
                  className={inputCls}
                >
                  {SEMESTRES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Année académique" htmlFor="aff-annee">
              <select
                id="aff-annee"
                value={form.annee}
                onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))}
                title="Année académique"
                className={inputCls}
              >
                {annees.map((a) => (
                  <option key={a.id} value={a.label}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
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

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────

interface DeleteDialogProps {
  isOpen: boolean;
  target: Affectation | null;
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
          aria-labelledby="del-aff-title"
          aria-describedby="del-aff-desc"
        >
          <div className="px-6 pt-8 pb-6">
            <div
              className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse"
              aria-hidden="true"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h3 id="del-aff-title" className="mb-2 font-bold text-lg">
              Confirmer la suppression
            </h3>
            <p
              id="del-aff-desc"
              className="mb-1 text-gray-500 dark:text-gray-400 text-sm leading-relaxed"
            >
              Vous êtes sur le point de supprimer l'affectation de
            </p>
            <p className="mb-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {target.enseignant}
              <span className="bg-gray-100 dark:bg-gray-800 ml-2 px-1.5 py-0.5 rounded font-mono text-gray-500 text-xs">
                {target.matiere}
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

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_app/affectations")({
  head: () => ({ meta: [{ title: "Affectations — UniPlus" }] }),
  component: AffectationsPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────

function AffectationsPage() {
  // FIX: affectationsApi only exposes { create }; list/update/remove are managed
  //      locally with useState seeded from mock data.
  const [items, setItems] = useState<Affectation[]>(mock as Affectation[]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterAnnee, setFilterAnnee] = useState("");
  const [filterSemestre, setFilterSemestre] = useState("");
  const [filterGroupe, setFilterGroupe] = useState("");

  // ── Modal state ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Affectation> | undefined>();

  // ── Delete state ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Affectation | null>(null);

  // ── Add via API (only available endpoint) ────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (payload: FormData) => affectationsApi.create(payload),
    onSuccess: (created: any) => {
      // Append the returned item (or a local surrogate if API returns nothing)
      const newItem: Affectation = {
        id: created?.id ?? Date.now(),
        enseignant: created?.enseignant ?? "",
        matiere: created?.matiere ?? "",
        groupe: created?.groupe ?? "",
        semestre: created?.semestre ?? "",
        annee: created?.annee ?? "",
      };
      setItems((prev) => [...prev, newItem]);
      toast.success("Affectation ajoutée avec succès !");
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormMode("add");
    setFormInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (a: Affectation) => {
    setFormMode("edit");
    setFormInitial(a);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Affectation["id"] }) => {
    if (formMode === "add") {
      const { id: _ignored, ...payload } = data as any;
      addMutation.mutate(payload);
    } else if (data.id !== undefined) {
      // FIX: no update endpoint — update local state directly
      setItems((prev) =>
        prev.map((item) =>
          item.id === data.id ? ({ ...item, ...data } as Affectation) : item
        )
      );
      toast.success("Affectation modifiée avec succès !");
      setFormOpen(false);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    // FIX: no remove endpoint — remove from local state directly
    setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    toast.success("Affectation supprimée avec succès !");
    setDeleteTarget(null);
  };

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const rows = items.filter((a) => {
    if (filterAnnee && a.annee !== filterAnnee) return false;
    if (filterSemestre && a.semestre !== filterSemestre) return false;
    if (filterGroupe && a.groupe !== filterGroupe) return false;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div>
        <PageHeader
          title="Affectations de cours"
          subtitle={`${rows.length} affectation${rows.length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouvelle affectation
            </Button>
          }
        />

        <FilterBar>
          {/* FIX: SelectInput.onChange expects (v: string) => void, not a ChangeEvent */}
          <SelectInput
            value={filterAnnee}
            onChange={(v) => setFilterAnnee(v)}
            aria-label="Filtrer par année"
            title="Filtrer par année"
          >
            <option value="">Toutes les années</option>
            {annees.map((a) => (
              <option key={a.id} value={a.label}>
                {a.label}
              </option>
            ))}
          </SelectInput>

          <SelectInput
            value={filterSemestre}
            onChange={(v) => setFilterSemestre(v)}
            aria-label="Filtrer par semestre"
            title="Filtrer par semestre"
          >
            <option value="">Tous les semestres</option>
            {SEMESTRES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectInput>

          <SelectInput
            value={filterGroupe}
            onChange={(v) => setFilterGroupe(v)}
            aria-label="Filtrer par groupe"
            title="Filtrer par groupe"
          >
            <option value="">Tous les groupes</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.nom}>
                {g.nom}
              </option>
            ))}
          </SelectInput>
        </FilterBar>

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Enseignant</TH>
              <TH>Matière</TH>
              <TH>Groupe</TH>
              <TH>Semestre</TH>
              <TH>Année</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {rows.map((a) => (
              <TR key={a.id}>
                <TD className="text-muted-foreground">{a.id}</TD>
                <TD className="font-medium">{a.enseignant}</TD>
                <TD>{a.matiere}</TD>
                <TD className="font-mono">{a.groupe}</TD>
                <TD>{a.semestre}</TD>
                <TD>{a.annee}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(a)}
                      aria-label={`Modifier l'affectation de ${a.enseignant}`}
                      title={`Modifier l'affectation de ${a.enseignant}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(a)}
                      aria-label={`Supprimer l'affectation de ${a.enseignant}`}
                      title={`Supprimer l'affectation de ${a.enseignant}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                  </div>
                </TD>
              </TR>
            ))}

            {/* FIX: TD does not accept colSpan — use native <tr><td> */}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-gray-400 text-sm text-center"
                >
                  Aucune affectation ne correspond aux filtres sélectionnés.
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
        isSaving={addMutation.isPending}
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