import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { filieresApi, departementsApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Filiere {
  id: number | string;
  code: string;
  nom: string;
  departementId?: number | string;
  departement?: string | {
    id: number | string;
    nom: string;
    code: string;
  };
  typeDiplome: string;
  dureeAnnees: number;
  nbGroupes: number;
}

type FormData = Omit<Filiere, "id" | "departement"> & {
  departementId: number | string;
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
  initial?: Partial<Filiere>;
  onSave: (data: FormData & { id?: Filiere["id"] }) => void;
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
    code: "",
    nom: "",
    departementId: "",
    typeDiplome: "",
    dureeAnnees: 3,
    nbGroupes: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const depId = initial?.departementId ?? (typeof initial?.departement === "object" ? initial?.departement?.id : "");
      setForm({
        code: initial?.code ?? "",
        nom: initial?.nom ?? "",
        departementId: depId ?? "",
        typeDiplome: initial?.typeDiplome ?? "",
        dureeAnnees: initial?.dureeAnnees ?? 3,
        nbGroupes: initial?.nbGroupes ?? 0,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.code.trim() !== "" && form.nom.trim() !== "" && form.departementId !== "" && !isSaving;

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
                {mode === "add" ? "Nouvelle filière" : "Modifier la filière"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add" ? "Remplissez les informations de la nouvelle filière" : "Modifiez les champs à mettre à jour"}
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
            <Field label="Code *" htmlFor="filiere-code">
              <input
                id="filiere-code"
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex : INFO-L2"
                title="Code de la filière"
                maxLength={15}
                className={inputCls + " font-mono uppercase"}
              />
            </Field>

            <Field label="Nom de la filière *" htmlFor="filiere-nom">
              <input
                id="filiere-nom"
                type="text"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Licence en Informatique"
                title="Nom complet de la filière"
                className={inputCls}
              />
            </Field>

            <Field label="Département *" htmlFor="filiere-dept">
              <select
                id="filiere-dept"
                value={form.departementId}
                onChange={(e) => setForm((f) => ({ ...f, departementId: e.target.value ? Number(e.target.value) : "" }))}
                title="Département rattaché"
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

            <Field label="Type de diplôme" htmlFor="filiere-diplome">
              <select
                id="filiere-diplome"
                value={form.typeDiplome}
                onChange={(e) => setForm((f) => ({ ...f, typeDiplome: e.target.value }))}
                title="Type de diplôme"
                className={inputCls}
              >
                <option value="">Sélectionner...</option>
                <option value="Licence">Licence</option>
                <option value="Master">Master</option>
                <option value="Doctorat">Doctorat</option>
                <option value="BTS">BTS</option>
              </select>
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Durée (années)" htmlFor="filiere-duree">
                <input
                  id="filiere-duree"
                  type="number"
                  min={1}
                  value={form.dureeAnnees}
                  onChange={(e) => setForm((f) => ({ ...f, dureeAnnees: Math.max(1, +e.target.value) }))}
                  title="Durée en années"
                  className={inputCls}
                />
              </Field>
              <Field label="Nombre de groupes" htmlFor="filiere-groupes">
                <input
                  id="filiere-groupes"
                  type="number"
                  min={0}
                  value={form.nbGroupes}
                  onChange={(e) => setForm((f) => ({ ...f, nbGroupes: Math.max(0, +e.target.value) }))}
                  title="Nombre de groupes"
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
  target: Filiere | null;
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
              Vous êtes sur le point de supprimer la filière <strong>{target.nom}</strong> ({target.departement && typeof target.departement === "object" ? (target.departement as any).nom : target.departement || ""})
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
export const Route = createFileRoute("/_app/filieres")({
  head: () => ({ meta: [{ title: "Filières — UniPlus" }] }),
  component: FilieresPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────
function FilieresPage() {
  const { data, isFallback, refetch } = useApiList(
    ["filieres"],
    () => filieresApi.list(),
  );
  const { data: depts } = useApiList(
    ["departements"],
    () => departementsApi.list({ limit: 1000 }),
  );

  const getDeptName = (f: Filiere) => {
    if (!f.departement) return "";
    if (typeof f.departement === "object") return (f.departement as any).nom || "";
    const found = depts.find((d: any) => d.id === f.departementId) as any;
    if (found) return found.nom;
    return String(f.departement);
  };

  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Filiere> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Filiere | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => filieresApi.create(payload),
    onSuccess: () => {
      toast.success("Filière ajoutée avec succès !");
      qc.invalidateQueries({ queryKey: ["filieres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Filiere["id"] }) =>
      filieresApi.update(id, payload),
    onSuccess: () => {
      toast.success("Filière modifiée avec succès !");
      qc.invalidateQueries({ queryKey: ["filieres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Filiere["id"]) => filieresApi.remove(id),
    onSuccess: () => {
      toast.success("Filière supprimée avec succès !");
      qc.invalidateQueries({ queryKey: ["filieres"] });
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

  const openEdit = (f: Filiere) => {
    setFormMode("edit");
    setFormInitial(f);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Filiere["id"] }) => {
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
          title="Filières"
          subtitle={`${(data as any[]).length} filière${(data as any[]).length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouvelle filière
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
              <TH>Département</TH>
              <TH>Diplôme</TH>
              <TH>Durée</TH>
              <TH>Groupes</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Filiere[]).map((f) => (
              <TR key={f.id}>
                <TD className="text-muted-foreground">{f.id}</TD>
                <TD>
                  <span className="bg-primary/10 px-2 py-0.5 rounded-md font-mono font-semibold text-primary text-xs">
                    {f.code}
                  </span>
                </TD>
                <TD>{f.nom}</TD>
                <TD>{getDeptName(f)}</TD>
                <TD>
                  <StatusBadge status={f.typeDiplome} />
                </TD>
                <TD>{f.dureeAnnees} ans</TD>
                <TD>{f.nbGroupes}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(f)}
                      aria-label={`Modifier ${f.nom}`}
                      title={`Modifier ${f.nom}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(f)}
                      aria-label={`Supprimer ${f.nom}`}
                      title={`Supprimer ${f.nom}`}
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
        departements={depts}
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