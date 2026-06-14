import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { DataTable, THead, TH, TR, TD, ActionButton } from "@/components/ui/data-table";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { stages as mockStages } from "@/lib/mock-data";
import { useApiList } from "@/lib/api/use-api-list";
import { stagesApi } from "@/lib/api/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Stage {
  id: number | string;
  etudiant: string;
  annee: string;
  entreprise: string;
  sujet: string;
  enseignant: string;
  noteEncadrant: number;
  noteSoutenance: number;
  moyPratique: number;
  dateSoutenance: string;
}

type FormData = Omit<Stage, "id">;

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

// ─── Form Modal (Add / Edit) ─────────────────────────────────────────────────
interface FormModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  initial?: Partial<Stage>;
  onSave: (data: FormData & { id?: Stage["id"] }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function FormModal({ isOpen, mode, initial, onSave, onCancel, isSaving }: FormModalProps) {
  const [form, setForm] = useState<FormData>({
    etudiant: "",
    annee: "",
    entreprise: "",
    sujet: "",
    enseignant: "",
    noteEncadrant: 0,
    noteSoutenance: 0,
    moyPratique: 0,
    dateSoutenance: "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        etudiant: initial?.etudiant ?? "",
        annee: initial?.annee ?? "",
        entreprise: initial?.entreprise ?? "",
        sujet: initial?.sujet ?? "",
        enseignant: initial?.enseignant ?? "",
        noteEncadrant: initial?.noteEncadrant ?? 0,
        noteSoutenance: initial?.noteSoutenance ?? 0,
        moyPratique: initial?.moyPratique ?? 0,
        dateSoutenance: initial?.dateSoutenance ?? "",
      });
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const canSubmit = form.etudiant.trim() !== "" && form.entreprise.trim() !== "" && form.sujet.trim() !== "" && !isSaving;

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
              <h2 className="font-bold text-lg">
                {mode === "add" ? "Nouveau stage" : "Modifier le stage"}
              </h2>
            </div>
            <button onClick={onCancel} aria-label="Fermer" title="Fermer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Field label="Étudiant *" htmlFor="stage-etudiant">
              <input
                id="stage-etudiant"
                value={form.etudiant}
                onChange={(e) => setForm(f => ({ ...f, etudiant: e.target.value }))}
                placeholder="Nom complet de l'étudiant"
                title="Nom de l'étudiant"
                className={inputCls}
              />
            </Field>

            <Field label="Année" htmlFor="stage-annee">
              <input
                id="stage-annee"
                value={form.annee}
                onChange={(e) => setForm(f => ({ ...f, annee: e.target.value }))}
                placeholder="Ex : 2025-2026"
                title="Année académique"
                className={inputCls}
              />
            </Field>

            <Field label="Entreprise *" htmlFor="stage-entreprise">
              <input
                id="stage-entreprise"
                value={form.entreprise}
                onChange={(e) => setForm(f => ({ ...f, entreprise: e.target.value }))}
                placeholder="Nom de l'entreprise"
                title="Entreprise d'accueil"
                className={inputCls}
              />
            </Field>

            <Field label="Sujet *" htmlFor="stage-sujet">
              <textarea
                id="stage-sujet"
                value={form.sujet}
                onChange={(e) => setForm(f => ({ ...f, sujet: e.target.value }))}
                placeholder="Sujet du stage"
                title="Sujet du stage"
                rows={3}
                className={inputCls}
              />
            </Field>

            <Field label="Encadrant" htmlFor="stage-enseignant">
              <input
                id="stage-enseignant"
                value={form.enseignant}
                onChange={(e) => setForm(f => ({ ...f, enseignant: e.target.value }))}
                placeholder="Nom de l'enseignant encadrant"
                title="Encadrant universitaire"
                className={inputCls}
              />
            </Field>

            <div className="gap-4 grid grid-cols-2">
              <Field label="Note Encadrant" htmlFor="note-enc">
                <input
                  id="note-enc"
                  type="number"
                  step="0.1"
                  min={0}
                  max={20}
                  value={form.noteEncadrant}
                  onChange={(e) => setForm(f => ({ ...f, noteEncadrant: +e.target.value }))}
                  placeholder="0.0"
                  title="Note de l'encadrant"
                  className={inputCls}
                />
              </Field>
              <Field label="Note Soutenance" htmlFor="note-sout">
                <input
                  id="note-sout"
                  type="number"
                  step="0.1"
                  min={0}
                  max={20}
                  value={form.noteSoutenance}
                  onChange={(e) => setForm(f => ({ ...f, noteSoutenance: +e.target.value }))}
                  placeholder="0.0"
                  title="Note de soutenance"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Date de soutenance" htmlFor="date-sout">
              <input
                id="date-sout"
                type="date"
                value={form.dateSoutenance}
                onChange={(e) => setForm(f => ({ ...f, dateSoutenance: e.target.value }))}
                title="Date de soutenance"
                className={inputCls}
              />
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
                <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
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
  isOpen: boolean;
  target: Stage | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen || !target) return null;

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div className="z-40 fixed inset-0 bg-black/60 backdrop-blur-sm anim-backdrop" onClick={onCancel} />
      <div className="z-50 fixed inset-0 flex justify-center items-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-sm text-center pointer-events-auto anim-delete-pop"
          role="alertdialog"
        >
          <div className="px-6 pt-8 pb-6">
            <div className="flex justify-center items-center bg-red-100 dark:bg-red-900/30 mx-auto mb-5 rounded-full w-16 h-16 anim-icon-pulse">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-2 font-bold text-lg">Confirmer la suppression</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Voulez-vous supprimer le stage de <strong>{target.etudiant}</strong> ?
            </p>
          </div>
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl font-medium"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex flex-1 justify-center items-center gap-2 bg-red-600 hover:bg-red-700 py-2.5 rounded-xl font-medium text-white"
            >
              {isDeleting ? (
                <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 anim-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Route & Page ────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_app/stages")({
  head: () => ({ meta: [{ title: "Stages — UniPlus" }] }),
  component: StagesPage,
});

function StagesPage() {
  const { data, isFallback, refetch } = useApiList(
    ["stages"],
    () => stagesApi.list?.() ?? Promise.resolve(mockStages),
    mockStages
  );

  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formInitial, setFormInitial] = useState<Partial<Stage> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);

  const add = useMutation({
    mutationFn: (payload: FormData) => stagesApi.create?.(payload) ?? Promise.resolve({ ...payload, id: Date.now() }),
    onSuccess: () => {
      toast.success("Stage ajouté avec succès !");
      qc.invalidateQueries({ queryKey: ["stages"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de l'ajout"),
  });

  const edit = useMutation({
    mutationFn: ({ id, ...payload }: FormData & { id: Stage["id"] }) =>
      stagesApi.update?.(id, payload) ?? Promise.resolve({ id, ...payload }),
    onSuccess: () => {
      toast.success("Stage modifié avec succès !");
      qc.invalidateQueries({ queryKey: ["stages"] });
      refetch();
      setFormOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors de la modification"),
  });

  const del = useMutation({
    mutationFn: (id: Stage["id"]) => stagesApi.remove?.(id) ?? Promise.resolve(id),
    onSuccess: () => {
      toast.success("Stage supprimé avec succès !");
      qc.invalidateQueries({ queryKey: ["stages"] });
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

  const openEdit = (s: Stage) => {
    setFormMode("edit");
    setFormInitial(s);
    setFormOpen(true);
  };

  const handleSave = (data: FormData & { id?: Stage["id"] }) => {
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
          title="Stages"
          subtitle={`${(data as any[]).length} stages enregistrés`}
          actions={
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Nouveau stage
            </Button>
          }
        />

        <ApiStatusBanner show={isFallback} />

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Étudiant</TH>
              <TH>Année</TH>
              <TH>Entreprise</TH>
              <TH>Sujet</TH>
              <TH>Encadrant</TH>
              <TH>N. Enc.</TH>
              <TH>N. Sout.</TH>
              <TH>Moy.</TH>
              <TH>Date</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {(data as Stage[]).map((s) => (
              <TR key={s.id}>
                <TD className="text-muted-foreground">{s.id}</TD>
                <TD className="font-medium">{s.etudiant}</TD>
                <TD>{s.annee}</TD>
                <TD>{s.entreprise}</TD>
                <TD className="max-w-xs text-muted-foreground truncate">{s.sujet}</TD>
                <TD>{s.enseignant}</TD>
                <TD>{s.noteEncadrant}</TD>
                <TD>{s.noteSoutenance}</TD>
                <TD className="font-bold text-primary">{s.moyPratique.toFixed(2)}</TD>
                <TD className="text-muted-foreground">{s.dateSoutenance}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <ActionButton
                      onClick={() => openEdit(s)}
                      aria-label={`Modifier stage de ${s.etudiant}`}
                      title={`Modifier stage de ${s.etudiant}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </ActionButton>
                    <ActionButton
                      variant="danger"
                      onClick={() => setDeleteTarget(s)}
                      aria-label={`Supprimer stage de ${s.etudiant}`}
                      title={`Supprimer stage de ${s.etudiant}`}
                    >
                      <Trash2 className="w-4 h-4" />
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