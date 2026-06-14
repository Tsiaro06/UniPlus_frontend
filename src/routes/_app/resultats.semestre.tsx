import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { resultatsSemestre as mockResultats, groupes } from "@/lib/mock-data";
import { useApiList } from "@/lib/api/use-api-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ResultatSemestre {
  id: number | string;
  matricule: string;
  etudiant: string;
  groupe: string;
  semestre: string | number;
  moyenne: number;
  decision: string;
  deliberation: boolean;
}

export const Route = createFileRoute("/_app/resultats/semestre")({
  head: () => ({ meta: [{ title: "Résultats semestre — UniPlus" }] }),
  component: ResultatsSemestrePage,
});

function ResultatsSemestrePage() {
  const [selectedGroupe, setSelectedGroupe] = useState("");
  const [selectedSemestre, setSelectedSemestre] = useState("");

  const { data, isFallback, refetch } = useApiList(
    ["resultats-semestre"],
    () => Promise.resolve(mockResultats),
    mockResultats
  );

  const qc = useQueryClient();

  const filtered = (data as ResultatSemestre[]).filter((r) => {
    const groupeMatch = !selectedGroupe || r.groupe === selectedGroupe;
    const semestreMatch = !selectedSemestre || String(r.semestre) === selectedSemestre;
    return groupeMatch && semestreMatch;
  });

  const calculerUn = useMutation({
    mutationFn: (id: number | string) => Promise.resolve({ id, success: true }),
    onSuccess: (_, id) => {
      toast.success(`Résultats calculés pour l'étudiant #${id}`);
      refetch();
    },
    onError: () => toast.error("Erreur lors du calcul individuel"),
  });

  const calculerTout = useMutation({
    mutationFn: () => Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success("Tous les résultats ont été recalculés avec succès !");
      refetch();
    },
    onError: () => toast.error("Erreur lors du calcul global"),
  });

  return (
    <>
      <div>
        <PageHeader
          title="Résultats semestre"
          subtitle={`${filtered.length} étudiants`}
          actions={
            <Button 
              onClick={() => calculerTout.mutate()} 
              disabled={calculerTout.isPending}
            >
              <Calculator className="w-4 h-4" />
              {calculerTout.isPending ? "Calcul en cours..." : "Tout calculer"}
            </Button>
          }
        />

        <ApiStatusBanner show={isFallback} />

        <FilterBar>
          <SelectInput 
            value={selectedGroupe} 
            onChange={setSelectedGroupe}        // ← Correction ici
            title="Filtrer par groupe"
          >
            <option value="">Tous les groupes</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.nom}>{g.nom}</option>
            ))}
          </SelectInput>

          <SelectInput 
            value={selectedSemestre} 
            onChange={setSelectedSemestre}      // ← Correction ici
            title="Filtrer par semestre"
          >
            <option value="">Tous les semestres</option>
            {[1,2,3,4,5,6].map((s) => (
              <option key={s} value={s}>S{s}</option>
            ))}
          </SelectInput>
        </FilterBar>

        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Matricule</TH>
              <TH>Étudiant</TH>
              <TH>Groupe</TH>
              <TH>Semestre</TH>
              <TH>Moy. théorique</TH>
              <TH>Décision</TH>
              <TH>Délibération</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.map((r) => (
              <TR key={r.id}>
                <TD className="text-muted-foreground">{r.id}</TD>
                <TD className="font-mono text-xs">{r.matricule}</TD>
                <TD className="font-medium">{r.etudiant}</TD>
                <TD>{r.groupe}</TD>
                <TD>S{r.semestre}</TD>
                <TD className={r.moyenne >= 10 ? "font-bold text-emerald-600" : "font-bold text-danger"}>
                  {r.moyenne.toFixed(2)}/20
                </TD>
                <TD><StatusBadge status={r.decision} /></TD>
                <TD>{r.deliberation ? "Oui" : "—"}</TD>
                <TD>
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => calculerUn.mutate(r.id)}
                      disabled={calculerUn.isPending}
                    >
                      <Calculator className="mr-1 w-3 h-3" />
                      {calculerUn.isPending ? "Calcul..." : "Calculer"}
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}