import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SearchInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD, Avatar, ActionButton } from "@/components/ui/data-table";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { enseignantsApi, departementsApi } from "@/lib/api/endpoints";
import { useApiList } from "@/lib/api/use-api-list";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Enseignant {
  id: number | string;
  nom: string;
  prenom: string;
  departementId?: number | string;
  departement?: string | {
    id: number | string;
    nom: string;
    code: string;
  };
  grade: string;
  specialite: string;
  email: string;
  actif: boolean;
}

type FormData = Omit<Enseignant, "id" | "departement"> & {
  departementId: number | string;
};

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
  initial?: Partial<Enseignant>;
  onSave: (data: FormData & { id?: Enseignant["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
  departements: any[];
}

function FormModal({
  isOpen,
  mode,
  initial,
  onSave,
  onCancel,
  isSaving,
  departements,
}: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    nom: "",
    prenom: "",
    departementId: "",
    grade: "",
    specialite: "",
    email: "",
    actif: true,
  });

  useEffect(() => {
    if (isOpen) {
      const depId = initial?.departementId ?? (typeof initial?.departement === "object" ? initial?.departement?.id : "");
      setForm({
        nom:           initial?.nom           ?? "",
        prenom:        initial?.prenom        ?? "",
        departementId: depId                  ?? "",
        grade:         initial?.grade         ?? "",
        specialite:    initial?.specialite    ?? "",
        email:         initial?.email         ?? "",
        actif:         initial?.actif         ?? true,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit =
    form.nom.trim() !== "" && form.prenom.trim() !== "" && form.departementId !== "" && !isSaving;

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
                {mode === "add" ? "Nouvel enseignant" : "Modifier l'enseignant"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add"
                  ? "Remplissez les informations de l'enseignant"
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

            {/* Nom + Prénom */}
            <div className="gap-4 grid grid-cols-2">
              <Field label="Nom *" htmlFor="ens-nom">
                <input
                  id="ens-nom"
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Rakoto"
                  title="Nom de famille de l'enseignant"
                  className={inputCls}
                />
              </Field>
              <Field label="Prénom *" htmlFor="ens-prenom">
                <input
                  id="ens-prenom"
                  type="text"
                  value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  placeholder="Ex : Jean"
                  title="Prénom de l'enseignant"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Département + Grade */}
            <div className="gap-4 grid grid-cols-2">
              <Field label="Département *" htmlFor="ens-dept">
                <select
                  id="ens-dept"
                  value={form.departementId}
                  onChange={(e) => setForm((f) => ({ ...f, departementId: e.target.value ? Number(e.target.value) : "" }))}
                  title="Département de l'enseignant"
                  className={inputCls}
                >
                  <option value="">Sélectionner...</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom} ({d.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grade" htmlFor="ens-grade">
                <input
                  id="ens-grade"
                  type="text"
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  placeholder="Ex : MCF"
                  title="Grade académique de l'enseignant"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Spécialité */}
            <Field label="Spécialité" htmlFor="ens-specialite">
              <input
                id="ens-specialite"
                type="text"
                value={form.specialite}
                onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))}
                placeholder="Ex : Algorithmique, Réseaux..."
                title="Spécialité de l'enseignant"
                className={inputCls}
              />
            </Field>

            {/* Email + Actif */}
            <div className="gap-4 grid grid-cols-2">
              <Field label="Email" htmlFor="ens-email">
                <input
                  id="ens-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Ex : jean@univ.mg"
                  title="Adresse email de l'enseignant"
                  className={inputCls}
                />
              </Field>

              <Field label="Actif" htmlFor="ens-actif">
                <div className="flex items-center h-[38px]">
                  <label className="inline-flex relative items-center w-9 h-5 cursor-pointer">
                    <input
                      id="ens-actif"
                      type="checkbox"
                      checked={form.actif}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, actif: e.target.checked }))
                      }
                      className="sr-only peer"
                      aria-label="Enseignant actif"
                      title="Enseignant actif"
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
  target: Enseignant | null;
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
          aria-labelledby="del-ens-title"
          aria-describedby="del-ens-desc"
        >
          <div className="px-6 pt-8 pb-6">
            <div
              className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse"
              aria-hidden="true"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h3 id="del-ens-title" className="mb-2 font-bold text-lg">
              Confirmer la suppression
            </h3>
            <p
              id="del-ens-desc"
              className="mb-1 text-gray-500 dark:text-gray-400 text-sm leading-relaxed"
            >
              Vous êtes sur le point de supprimer l'enseignant
            </p>
            <p className="mb-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">
              {target.nom} {target.prenom}
              <span className="bg-gray-100 dark:bg-gray-800 ml-2 px-1.5 py-0.5 rounded font-mono text-gray-500 text-xs">
                {target.departement && typeof target.departement === "object" ? (target.departement as any).nom : target.departement || ""}
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

export const Route = createFileRoute("/_app/enseignants")({
  head: () => ({ meta: [{ title: "Enseignants — UniPlus" }] }),
  component: EnseignantsPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function EnseignantsPage() {
  const { data: items, isFallback, refetch } = useApiList(["enseignants"], () => enseignantsApi.list?.() ?? Promise.resolve([]), [] as Enseignant[]);
  const { data: depts } = useApiList(["departements"], () => departementsApi.list?.({ limit: 1000 }) ?? Promise.resolve([]));
  const [q, setQ]         = useState("");

  const getDeptName = (e: Enseignant) => {
    if (!e.departement) return "";
    if (typeof e.departement === "object") return (e.departement as any).nom || "";
    const found = depts.find((d: any) => d.id === e.departementId) as any;
    if (found) return found.nom;
    return String(e.departement);
  };

  // ── Modal state ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen]       = useState(false);
  const [formMode, setFormMode]       = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Enseignant> | undefined>();

  // ── Delete state ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Enseignant | null>(null);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const list = items.filter(
    (e) =>
      !q ||
      `${e.nom} ${e.prenom} ${getDeptName(e)}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormMode("add");
    setFormInitial(undefined);
    setFormOpen(true);
  };

  const openEdit = (e: Enseignant) => {
    setFormMode("edit");
    setFormInitial(e);
    setFormOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (payload: FormData) => enseignantsApi.create?.(payload)
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: FormData }) => enseignantsApi.update?.(id, payload)
  });
  const removeMutation = useMutation({
    mutationFn: (id: number | string) => enseignantsApi.remove?.(id)
  });

  const handleSave = async (data: FormData & { id?: Enseignant["id"] }) => {
    try {
      if (formMode === "add") {
        await createMutation.mutateAsync(data);
        toast.success("Enseignant ajouté avec succès !");
      } else if (data.id !== undefined) {
        await updateMutation.mutateAsync({ id: data.id, payload: data });
        toast.success("Enseignant modifié avec succès !");
      }
      setFormOpen(false);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeMutation.mutateAsync(deleteTarget.id);
      toast.success("Enseignant supprimé avec succès !");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de supprimer l'enseignant.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div>
        <PageHeader
          title="Enseignants"
          subtitle={`${list.length} enseignants`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Nouvel enseignant
            </Button>
          }
        />

        <FilterBar>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Nom, département..."
          />
        </FilterBar>

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Enseignant</TH>
              <TH>Département</TH>
              <TH>Grade</TH>
              <TH>Spécialité</TH>
              <TH>Email</TH>
              <TH>Actif</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {list.map((e) => (
              <TR key={e.id}>
                <TD className="text-muted-foreground">{e.id}</TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${e.nom} ${e.prenom}`} />
                    <span className="font-medium">{e.nom} {e.prenom}</span>
                  </div>
                </TD>
                <TD>{getDeptName(e)}</TD>
                <TD>
                  <span className="bg-purple-100 px-2 py-0.5 rounded-md font-semibold text-purple-700 text-xs">
                    {e.grade}
                  </span>
                </TD>
                <TD className="text-muted-foreground">{e.specialite}</TD>
                <TD className="text-muted-foreground">{e.email}</TD>
                <TD>
                  {e.actif
                    ? <span className="text-emerald-600">●</span>
                    : <span className="text-muted-foreground">○</span>}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(e)}
                      aria-label={`Modifier ${e.nom} ${e.prenom}`}
                      title={`Modifier ${e.nom} ${e.prenom}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(e)}
                      aria-label={`Supprimer ${e.nom} ${e.prenom}`}
                      title={`Supprimer ${e.nom} ${e.prenom}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                  </div>
                </TD>
              </TR>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-gray-400 text-sm text-center">
                  Aucun enseignant ne correspond à la recherche.
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
        isSaving={createMutation.isPending || updateMutation.isPending}
        departements={depts}
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