import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { etudiantsApi } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_app/etudiants/create")({
  head: () => ({ meta: [{ title: "Nouvel étudiant — UniPlus" }] }),
  component: EtudiantCreatePage,
});

// ✅ Field accepte maintenant un id pour lier label ↔ input
function Field({ label, required, id, children }: { label: string; required?: boolean; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="font-medium text-muted-foreground text-xs">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

function EtudiantCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    matricule: "", sexe: "M", nom: "", prenom: "", dateNaissance: "",
    lieuNaissance: "", email: "", telephone: "", adresse: "", statut: "actif",
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => etudiantsApi.create(form),
    onSuccess: () => { toast.success("Étudiant créé"); navigate({ to: "/etudiants" }); },
    onError: (e: any) => toast.error(e?.message ?? "Création impossible — API hors-ligne"),
  });

  return (
    <div>
      <PageHeader
        title="Nouvel étudiant"
        subtitle="Créer un nouveau dossier étudiant"
        actions={
          <>
            <Link to="/etudiants"><Button variant="secondary">Annuler</Button></Link>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </>
        }
      />
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Section title="Informations personnelles" subtitle="Identité et état civil de l'étudiant">
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            {/* ✅ id sur Field + input */}
            <Field label="Matricule" required id="matricule">
              <input id="matricule" className={input} placeholder="202312345" value={form.matricule} onChange={(e) => set("matricule", e.target.value)} required />
            </Field>
            <Field label="Sexe" required> {/* radio wrappés dans <label>, pas besoin d'id */}
              <div className="flex items-center gap-6 h-10">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="sexe" checked={form.sexe === "M"} onChange={() => set("sexe", "M")} className="accent-primary" /> Masculin</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="sexe" checked={form.sexe === "F"} onChange={() => set("sexe", "F")} className="accent-primary" /> Féminin</label>
              </div>
            </Field>
            <Field label="Nom" required id="nom">
              <input id="nom" className={input} placeholder="Benali" value={form.nom} onChange={(e) => set("nom", e.target.value)} required />
            </Field>
            <Field label="Prénom" required id="prenom">
              <input id="prenom" className={input} placeholder="Amina" value={form.prenom} onChange={(e) => set("prenom", e.target.value)} required />
            </Field>
            <Field label="Date de naissance" required id="dateNaissance">
              {/* ✅ id + aria-label pour le date picker */}
              <input id="dateNaissance" type="date" aria-label="Date de naissance" className={input} value={form.dateNaissance} onChange={(e) => set("dateNaissance", e.target.value)} required />
            </Field>
            <Field label="Lieu de naissance" id="lieuNaissance">
              <input id="lieuNaissance" className={input} placeholder="Alger" value={form.lieuNaissance} onChange={(e) => set("lieuNaissance", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Coordonnées" subtitle="Comment contacter l'étudiant">
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <Field label="Email" id="etudiant-email">
              <input id="etudiant-email" type="email" className={input} placeholder="etudiant@univ.dz" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Téléphone" id="telephone">
              <input id="telephone" className={input} placeholder="+213 ..." value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
            </Field>
            <Field label="Adresse" id="adresse">
              <textarea id="adresse" className={`${input} h-24 py-2`} placeholder="Adresse complète" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Statut" subtitle="Informations administratives">
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
            <Field label="Statut" required id="statut">
  <select
    id="statut"
    aria-label="Statut"
    className={input}
    value={form.statut}
    onChange={(e) => set("statut", e.target.value)}
  >
    <option value="actif">Actif</option>
    <option value="archive">Archivé</option>
  </select>
</Field>
          </div>
        </Section>
      </form>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card shadow-sm p-6 border border-border rounded-xl">
      <div className="mb-5">
        <h3 className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}