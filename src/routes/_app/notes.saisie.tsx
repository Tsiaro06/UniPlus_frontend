import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD } from "@/components/ui/data-table";
import { etudiants, groupes, matieres } from "@/lib/mock-data";
import { notesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notes/saisie")({
  head: () => ({ meta: [{ title: "Saisie de notes — UniPlus" }] }),
  component: () => {
    type Row = { matricule: string; nom: string; normale: string; rattrapage: string; absent: boolean };
    const [rows, setRows] = useState<Row[]>(
      etudiants.slice(0, 12).map((e) => ({ matricule: e.matricule, nom: `${e.nom} ${e.prenom}`, normale: "", rattrapage: "", absent: false }))
    );
    const compute = (r: Row) => r.absent ? 0 : (parseFloat(r.rattrapage) || parseFloat(r.normale) || 0);

    const save = useMutation({
      mutationFn: () => notesApi.bulkUpsert({
        notes: rows
          .filter((r) => r.normale || r.rattrapage || r.absent)
          .map((r) => ({
            matricule: r.matricule,
            noteNormale: r.normale ? parseFloat(r.normale) : null,
            noteRattrapage: r.rattrapage ? parseFloat(r.rattrapage) : null,
            absenceInjustifiee: r.absent,
          })),
      }),
      onSuccess: () => toast.success("Notes enregistrées"),
      onError: (e: any) => toast.error(e?.message ?? "Enregistrement impossible — API hors-ligne"),
    });

    return (
      <div>
        <PageHeader
          title="Saisie de notes"
          subtitle="Saisie en masse pour un groupe et une matière"
          actions={<Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="w-4 h-4" /> {save.isPending ? "Enregistrement…" : "Enregistrer tout"}</Button>}
        />
        <FilterBar>
          {/* ✅ aria-label ajouté sur chaque SelectInput */}
          <SelectInput aria-label="Filtrer par groupe">{groupes.map((g) => <option key={g.id}>{g.nom}</option>)}</SelectInput>
          <SelectInput aria-label="Filtrer par semestre">{[1,2,3,4,5,6].map((s) => <option key={s}>Semestre S{s}</option>)}</SelectInput>
          <SelectInput aria-label="Filtrer par matière">{matieres.map((m) => <option key={m.id}>{m.intitule}</option>)}</SelectInput>
        </FilterBar>

        <DataTable>
          <THead><TR><TH>#</TH><TH>Matricule</TH><TH>Étudiant</TH><TH>Normale (0-20)</TH><TH>Rattrapage (0-20)</TH><TH>Absence injustifiée</TH><TH>Note finale</TH></TR></THead>
          <tbody>
            {rows.map((r, i) => {
              const finale = compute(r);
              const fail = finale < 10 && (r.normale || r.rattrapage || r.absent);
              return (
                <TR key={r.matricule} className={cn(fail && "bg-red-50/60")}>
                  <TD className="text-muted-foreground">{i + 1}</TD>
                  <TD className="font-mono text-xs">{r.matricule}</TD>
                  <TD className="font-medium">{r.nom}</TD>
                  <TD>
                    {/* ✅ aria-label contextuel */}
                    <input
                      aria-label={`Note normale de ${r.nom}`}
                      type="number" min={0} max={20} step={0.25} value={r.normale} disabled={r.absent}
                      onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, normale: e.target.value } : x))}
                      className="bg-background disabled:bg-muted px-2 border border-border focus:border-primary rounded-md outline-none focus:ring-2 focus:ring-primary/15 w-24 h-9 text-sm"
                    />
                  </TD>
                  <TD>
                    <input
                      aria-label={`Note de rattrapage de ${r.nom}`}
                      type="number" min={0} max={20} step={0.25} value={r.rattrapage} disabled={r.absent}
                      onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, rattrapage: e.target.value } : x))}
                      className="bg-background disabled:bg-muted px-2 border border-border focus:border-primary rounded-md outline-none focus:ring-2 focus:ring-primary/15 w-24 h-9 text-sm"
                    />
                  </TD>
                  <TD>
                    <input
                      aria-label={`Absence injustifiée de ${r.nom}`}
                      type="checkbox" checked={r.absent}
                      onChange={(e) => setRows((p) => p.map((x, j) => j === i ? { ...x, absent: e.target.checked, normale: e.target.checked ? "" : x.normale, rattrapage: e.target.checked ? "" : x.rattrapage } : x))}
                      className="w-4 h-4 accent-danger"
                    />
                  </TD>
                  <TD className={cn("font-bold", finale < 10 ? "text-danger" : "text-emerald-600")}>{finale.toFixed(2)}</TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      </div>
    );
  },
});