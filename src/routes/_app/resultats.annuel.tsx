import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { resultatsAnnuel as mockResultats, groupes, annees } from "@/lib/mock-data";
import { useApiList } from "@/lib/api/use-api-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ResultatAnnuel {
  id: number | string;
  matricule: string;
  etudiant: string;
  groupe?: string;           // ← Ajouté (optionnel)
  moyenneTheorique: number;
  moyennePratique: number;
  moyenneFinal: number;
  decision: string;
}

export const Route = createFileRoute("/_app/resultats/annuel")({
  head: () => ({ meta: [{ title: "Résultats annuels — UniPlus" }] }),
  component: ResultatsAnnuelPage,
});

function ResultatsAnnuelPage() {
  const [selectedGroupe, setSelectedGroupe] = useState("");
  const [selectedAnnee, setSelectedAnnee] = useState("");

  const { data, isFallback, refetch } = useApiList(
    ["resultats-annuel"],
    () => Promise.resolve(mockResultats),
    mockResultats
  );

  const qc = useQueryClient();

  const filtered = (data as ResultatAnnuel[]).filter((r) => {
    const groupeMatch = !selectedGroupe || r.groupe === selectedGroupe;
    return groupeMatch;
  });

  // Statistiques
  const c = (decision: string) => filtered.filter((r) => r.decision === decision).length;

  const tiles = [
    { label: "Admis", value: c("admis"), color: "bg-emerald-100 text-emerald-700" },
    { label: "Redoublement", value: c("redoublement"), color: "bg-purple-100 text-purple-700" },
    { label: "Exclusion", value: c("exclusion"), color: "bg-red-100 text-red-700" },
    { label: "Jury", value: c("jury"), color: "bg-amber-100 text-amber-700" },
    { label: "En attente", value: c("en_attente"), color: "bg-slate-100 text-slate-700" },
  ];

  // Mutations
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
      toast.success("Tous les résultats annuels ont été recalculés !");
      refetch();
    },
    onError: () => toast.error("Erreur lors du calcul global"),
  });

  return (
    <>
      <div>
        <PageHeader
          title="Résultats annuels"
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

        {/* Statistiques */}
        <div className="gap-3 grid grid-cols-2 sm:grid-cols-5 mb-6">
          {tiles.map((t) => (
            <div key={t.label} className="bg-card shadow-sm p-4 border border-border rounded-xl">
              <div className={`mb-2 inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold ${t.color}`}>
                {t.label}
              </div>
              <div className="font-bold text-3xl">{t.value}</div>
            </div>
          ))}
        </div>

        <FilterBar>
          <SelectInput 
            value={selectedGroupe} 
            onChange={(value) => setSelectedGroupe(value)}
            title="Filtrer par groupe"
          >
            <option value="">Tous les groupes</option>
            {groupes.map((g) => (
              <option key={g.id} value={g.nom}>{g.nom}</option>
            ))}
          </SelectInput>

          <SelectInput 
            value={selectedAnnee} 
            onChange={(value) => setSelectedAnnee(value)}
            title="Filtrer par année"
          >
            <option value="">Toutes les années</option>
            {annees.map((a) => (
              <option key={a.id} value={a.label}>{a.label}</option>
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
              <TH>Moy. théorique</TH>
              <TH>Moy. pratique</TH>
              <TH>Moy. finale</TH>
              <TH>Décision</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.map((r) => (
              <TR key={r.id}>
                <TD className="text-muted-foreground">{r.id}</TD>
                <TD className="font-mono text-xs">{r.matricule}</TD>
                <TD className="font-medium">{r.etudiant}</TD>
                <TD>{r.groupe || "—"}</TD>
                <TD>{r.moyenneTheorique.toFixed(2)}</TD>
                <TD>{r.moyennePratique.toFixed(2)}</TD>
                <TD className={r.moyenneFinal >= 10 ? "font-bold text-emerald-600" : "font-bold text-danger"}>
                  {r.moyenneFinal.toFixed(2)}/20
                </TD>
                <TD><StatusBadge status={r.decision} /></TD>
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