import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { semestresApi, anneesApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Semestre {
  id: number | string;
  numero: number;
  type: string;
  anneeScolaireId?: number | string;
  anneeScolaire?: string | { id: number | string; label: string };
  dateDebut: string;
  dateFin: string;
  actif: boolean;
}

type FormData = Omit<Semestre, "id" | "anneeScolaire"> & {
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
  initial?: Partial<Semestre>;
  onSave: (data: FormData & { id?: Semestre["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
  annees: any[];
}

function FormModal({
  isOpen,
  mode,
  initial,
  onSave,
  onCancel,
  isSaving,
  annees,
}: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    numero: 1,
    type: "impair",
    anneeScolaireId: "",
    dateDebut: "",
    dateFin: "",
    actif: true,
  });

  useEffect(() => {
    if (isOpen) {
      const aId = initial?.anneeScolaireId ?? (typeof initial?.anneeScolaire === "object" ? initial?.anneeScolaire?.id : "");
      setForm({
        numero: initial?.numero ?? 1,
        type: initial?.type ?? "impair",
        anneeScolaireId: aId ?? "",
        dateDebut: initial?.dateDebut ?? "",
        dateFin: initial?.dateFin ?? "",
        actif: initial?.actif ?? true,
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.numero > 0 && form.anneeScolaireId !== "" && !isSaving;

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
                {mode === "add" ? "Nouveau semestre" : "Modifier le semestre"}
              </h2>
              <p className="mt-0.5 text-gray-400 text-xs">
                {mode === "add" ? "Remplissez les informations du nouveau semestre" : "Modifiez les champs à mettre à jour"}
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
            <Field label="Numéro *" htmlFor="semestre-numero">
              <input
                id="semestre-numero"
                type="number"
                min={1}
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: +e.target.value }))}
                placeholder="Ex : 1"
                title="Numéro du semestre"
                className={inputCls}
              />
            </Field>

            <Field label="Type" htmlFor="semestre-type">
              <select
                id="semestre-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                title="Type de semestre"
                className={inputCls}
              >
                <option value="impair">Impair (S1, S3, S5...)</option>
                <option value="pair">Pair (S2, S4, S6...)</option>
              </select>
            </Field>

            <Field label="Année académique *" htmlFor="semestre-annee">
              <select
                id="semestre-annee"
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
              <Field label="Date début" htmlFor="semestre-debut">
                <input
                  id="semestre-debut"
                  type="date"
                  value={form.dateDebut}
                  onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
                  title="Date de début"
                  className={inputCls}
                />
              </Field>
              <Field label="Date fin" htmlFor="semestre-fin">
                <input
                  id="semestre-fin"
                  type="date"
                  value={form.dateFin}
                  onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
                  title="Date de fin"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Actif" htmlFor="semestre-actif">
              <div className="flex items-center gap-2">
                <input
                  id="semestre-actif"
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
                  title="Semestre actif"
                  className="w-5 h-5 accent-primary"
                />
                <span className="text-gray-600 dark:text-gray-400 text-sm">Ce semestre est actuellement actif</span>
              </div>
            </Field>
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
  target: Semestre | null;
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
              Vous êtes sur le point de supprimer le semestre <strong>S{target.numero}</strong>
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
export const Route = createFileRoute("/_app/semestres")({
  head: () => ({ meta: [{ title: "Semestres — UniPlus" }] }),
  component: SemestresPage,
});

// ─── Page ────────────────────────────────────────────────────────────────────
function SemestresPage() {
  const { data, isFallback, refetch } = useApiList(
    ["semestres"],
    () => semestresApi.list(),
  );
  const { data: annees } = useApiList(
    ["annees-scolaires"],
    () => anneesApi.list({ limit: 1000 }),
  );

  const getAnneeLabel = (s: Semestre) => {
    if (!s.anneeScolaire) return "";
    if (typeof s.anneeScolaire === "object") return (s.anneeScolaire as any).label || "";
    const found = annees.find((a: any) => a.id === s.anneeScolaireId) as any;
    if (found) return found.label;
    return String(s.anneeScolaire);
  };

  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Semestre> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Semestre | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => semestresApi.create(payload),
    onSuccess: () => {
      toast.success("Semestre ajouté avec succès !");
      qc.invalidateQueries({ queryKey: ["semestres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Semestre["id"] }) =>
      semestresApi.update(id, payload),
    onSuccess: () => {
      toast.success("Semestre modifié avec succès !");
      qc.invalidateQueries({ queryKey: ["semestres"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Semestre["id"]) => semestresApi.remove(id),
    onSuccess: () => {
      toast.success("Semestre supprimé avec succès !");
      qc.invalidateQueries({ queryKey: ["semestres"] });
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

  const openEdit = (s: Semestre) => {
    setFormMode("edit");
    setFormInitial(s);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Semestre["id"] }) => {
    if (formMode === "add") {
      const { id: _ignored, ...payload } = data as any;
      add.mutate(payload);
    } else if (data.id !== undefined) {
      edit.mutate({ id: data.id, ...data });
    }
  };

  return (
    <>
      <div>
        <PageHeader
          title="Semestres"
          subtitle={`${(data as any[]).length} semestre${(data as any[]).length !== 1 ? "s" : ""}`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouveau semestre
            </Button>
          }
        />

        <ApiStatusBanner show={isFallback} />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Numéro</TH>
              <TH>Type</TH>
              <TH>Année</TH>
              <TH>Début</TH>
              <TH>Fin</TH>
              <TH>Actif</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Semestre[]).map((s) => (
              <TR key={s.id}>
                <TD className="text-muted-foreground">{s.id}</TD>
                <TD className="font-semibold">S{s.numero}</TD>
                <TD>{s.type}</TD>
                <TD>{getAnneeLabel(s)}</TD>
                <TD className="text-muted-foreground">{s.dateDebut}</TD>
                <TD className="text-muted-foreground">{s.dateFin}</TD>
                <TD>
                  {s.actif ? <span className="text-emerald-600">●</span> : <span className="text-muted-foreground">—</span>}
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(s)}
                      aria-label={`Modifier S${s.numero}`}
                      title={`Modifier S${s.numero}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(s)}
                      aria-label={`Supprimer S${s.numero}`}
                      title={`Supprimer S${s.numero}`}
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