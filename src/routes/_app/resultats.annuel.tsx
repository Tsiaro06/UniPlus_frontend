import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/badge-status";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { useApiList } from "@/lib/api/use-api-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { inscriptionsApi, groupesApi, anneesApi, reportsApi } from "@/lib/api/endpoints";

interface ResultatAnnuel {
  id: number | string;
  matricule: string;
  etudiant: string;
  groupe: string;
  moyenneTheorique: number;
  moyennePratique: number;
  moyenneFinal: number;
  decision: string;
  inscriptionId: number | string;
}

interface BulletinAnnuelData {
  etudiant: {
    matricule: string;
    nom: string;
    prenom: string;
  };
  filiere: string;
  groupe: string;
  niveauCode: string;
  anneeScolaire: string;
  theoriqueAverage: number;
  practicalAverage: number | null;
  finalAverage: number;
  decision: string;
}

export const Route = createFileRoute("/_app/resultats/annuel")({
  head: () => ({ meta: [{ title: "Résultats annuels — UniPlus" }] }),
  component: ResultatsAnnuelPage,
});

function ResultatsAnnuelPage() {
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [selectedAnneeId, setSelectedAnneeId] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: inscriptions, isFallback, refetch } = useApiList(
    ["inscriptions"],
    () => inscriptionsApi.list({ limit: 500 }),
  );

  const { data: groupes = [] } = useQuery({
    queryKey: ["groupes"],
    queryFn: async () => {
      const res = await groupesApi.list({ limit: 500 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const { data: annees = [] } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const res = await anneesApi.list({ limit: 100 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const filteredInscriptions = (inscriptions as any[]).filter((ins) => {
    if (selectedGroupeId && String(ins.groupeId ?? ins.groupe?.id) !== selectedGroupeId) return false;
    if (selectedAnneeId && String(ins.anneeScolaireId ?? ins.anneeScolaire?.id) !== selectedAnneeId) return false;
    return true;
  });

  const { data: bulletins = {} } = useQuery({
    queryKey: ["bulletins-annuel", selectedAnneeId, filteredInscriptions.map(i => i.id).join(",")],
    queryFn: async () => {
      const anneeId = selectedAnneeId || (annees as any[]).find((a) => a.actif)?.id;
      if (!anneeId || filteredInscriptions.length === 0) return {};
      
      const bulletinData: Record<string, BulletinAnnuelData> = {};
      
      for (const ins of filteredInscriptions) {
        try {
          const result = await reportsApi.bulletinAnnuel(ins.id, anneeId) as any;
          bulletinData[ins.id] = result?.data ?? result;
        } catch (error) {
          console.error(`[v0] Error fetching bulletin annuel for inscription ${ins.id}:`, error);
        }
      }
      
      return bulletinData;
    },
    enabled: filteredInscriptions.length > 0,
  });

  const rows: ResultatAnnuel[] = filteredInscriptions
    .map((ins) => {
      const bulletin = bulletins[ins.id] as BulletinAnnuelData | undefined;
      
      return {
        id: ins.id,
        inscriptionId: ins.id,
        matricule: bulletin?.etudiant?.matricule ?? ins.etudiant?.matricule ?? "",
        etudiant: bulletin 
          ? [bulletin.etudiant?.prenom, bulletin.etudiant?.nom].filter(Boolean).join(" ")
          : [ins.etudiant?.prenom, ins.etudiant?.nom].filter(Boolean).join(" "),
        groupe: bulletin?.groupe ?? ins.groupe?.nom ?? "",
        moyenneTheorique: bulletin?.theoriqueAverage ?? ins.moyenneTheorique ?? 0,
        moyennePratique: bulletin?.practicalAverage ?? ins.moyennePratique ?? 0,
        moyenneFinal: bulletin?.finalAverage ?? ins.moyenneFinale ?? 0,
        decision: bulletin?.decision ?? ins.statusAnnee ?? ins.statut ?? "en_attente",
      };
    });

  const c = (decision: string) => rows.filter((r) => r.decision === decision).length;

  const tiles = [
    { label: "Admis", value: c("admis"), color: "bg-emerald-100 text-emerald-700" },
    { label: "Redoublement", value: c("redoublement"), color: "bg-purple-100 text-purple-700" },
    { label: "Exclusion", value: c("exclusion"), color: "bg-red-100 text-red-700" },
    { label: "Jury", value: c("jury"), color: "bg-amber-100 text-amber-700" },
    { label: "En attente", value: c("en_attente"), color: "bg-slate-100 text-slate-700" },
  ];

  const handlePrint = () => {
    if (!tableRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const tableClone = tableRef.current.cloneNode(true) as HTMLElement;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Résultats annuels</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .text-muted-foreground { color: #666; }
            .font-mono { font-family: monospace; }
            .font-medium { font-weight: 500; }
            .text-emerald-600 { color: #059669; }
            .text-danger { color: #dc2626; }
          </style>
        </head>
        <body>
          <h2>Résultats annuels - ${rows.length} inscriptions</h2>
          ${tableClone.innerHTML}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const calculerUn = useMutation({
    mutationFn: async (inscriptionId: number | string) => {
      const anneeId = selectedAnneeId || (annees as any[]).find((a) => a.actif)?.id;
      if (!anneeId) throw new Error("Sélectionnez une année scolaire");
      await inscriptionsApi.annualResult(inscriptionId, anneeId);
      const bulletin = await reportsApi.bulletinAnnuel(inscriptionId, anneeId) as any;
      return bulletin?.data ?? bulletin;
    },
    onSuccess: () => {
      toast.success("Résultats annuels calculés");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors du calcul"),
  });

  const calculerTout = useMutation({
    mutationFn: async () => {
      const anneeId = selectedAnneeId || (annees as any[]).find((a) => a.actif)?.id;
      if (!anneeId) throw new Error("Sélectionnez une année scolaire");
      for (const r of rows) {
        await inscriptionsApi.annualResult(r.id, anneeId);
      }
    },
    onSuccess: () => {
      toast.success("Tous les résultats annuels ont été recalculés");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors du calcul global"),
  });

  return (
    <div>
      <PageHeader
        title="Résultats annuels"
        subtitle={`${rows.length} inscriptions`}
        actions={
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            <Button onClick={() => calculerTout.mutate()} disabled={calculerTout.isPending}>
              <Calculator className="w-4 h-4" />
              {calculerTout.isPending ? "Calcul en cours..." : "Tout calculer"}
            </Button>
          </div>
        }
      />

      <ApiStatusBanner show={isFallback} />

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
        <SelectInput value={selectedGroupeId} onChange={setSelectedGroupeId} title="Filtrer par groupe">
          <option value="">Tous les groupes</option>
          {(groupes as any[]).map((g) => (
            <option key={g.id} value={String(g.id)}>{g.nom}</option>
          ))}
        </SelectInput>

        <SelectInput value={selectedAnneeId} onChange={setSelectedAnneeId} title="Filtrer par année">
          <option value="">Toutes les années</option>
          {(annees as any[]).map((a) => (
            <option key={a.id} value={String(a.id)}>{a.label}</option>
          ))}
        </SelectInput>
      </FilterBar>

      <div ref={tableRef}>
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
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="text-muted-foreground">{r.id}</TD>
              <TD className="font-mono text-xs">{r.matricule}</TD>
              <TD className="font-medium">{r.etudiant}</TD>
              <TD>{r.groupe || "—"}</TD>
              <TD>{r.moyenneTheorique ? r.moyenneTheorique.toFixed(2) : "—"}</TD>
              <TD>{r.moyennePratique ? r.moyennePratique.toFixed(2) : "—"}</TD>
              <TD className={r.moyenneFinal >= 10 ? "font-bold text-emerald-600" : "font-bold text-danger"}>
                {r.moyenneFinal ? `${r.moyenneFinal.toFixed(2)}/20` : "—"}
              </TD>
              <TD><StatusBadge status={r.decision} /></TD>
              <TD>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={() => calculerUn.mutate(r.id)} disabled={calculerUn.isPending}>
                    <Calculator className="mr-1 w-3 h-3" />
                    Calculer
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </tbody>
        </DataTable>
      </div>
    </div>
  );
}
