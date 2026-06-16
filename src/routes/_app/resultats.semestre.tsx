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
import { useState, useEffect, useRef } from "react";
import { inscriptionsApi, groupesApi, anneesApi, reportsApi } from "@/lib/api/endpoints";
import type { AnneeScolaireSemestre } from "@/lib/lmd";

interface ResultatSemestre {
  id: number | string;
  matricule: string;
  etudiant: string;
  groupe: string;
  semestre: string;
  moyenne: number;
  decision: string;
  inscriptionId: number | string;
}

interface BulletinData {
  etudiant: {
    matricule: string;
    nom: string;
    prenom: string;
  };
  filiere: string;
  groupe: string;
  moyenneGenerale: number;
  decision: string;
}

export const Route = createFileRoute("/_app/resultats/semestre")({
  head: () => ({ meta: [{ title: "Résultats semestre — UniPlus" }] }),
  component: ResultatsSemestrePage,
});

function ResultatsSemestrePage() {
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [selectedCalendarSemestreId, setSelectedCalendarSemestreId] = useState("");
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

  const activeAnneeId = (annees as any[]).find((a) => a.actif)?.id ?? (annees as any[])[0]?.id;

  const { data: calendarSemestres = [] } = useQuery({
    queryKey: ["annee-semestres", activeAnneeId],
    queryFn: async () => {
      if (!activeAnneeId) return [];
      const res = await anneesApi.listSemestres(activeAnneeId) as any;
      return (res?.data ?? res ?? []) as AnneeScolaireSemestre[];
    },
    enabled: !!activeAnneeId,
  });

  useEffect(() => {
    if (!selectedCalendarSemestreId && calendarSemestres.length > 0) {
      const active = calendarSemestres.find((s) => s.actif) ?? calendarSemestres[0];
      setSelectedCalendarSemestreId(String(active.id));
    }
  }, [calendarSemestres, selectedCalendarSemestreId]);

  // Fetch bulletin data for all inscriptions
  const filteredInscriptions = (inscriptions as any[]).filter((ins) => {
    if (selectedGroupeId && String(ins.groupeId ?? ins.groupe?.id) !== selectedGroupeId) return false;
    return true;
  });

  const { data: bulletins = {} } = useQuery({
    queryKey: ["bulletins-semestre", selectedCalendarSemestreId, filteredInscriptions.map(i => i.id).join(",")],
    queryFn: async () => {
      if (!selectedCalendarSemestreId || filteredInscriptions.length === 0) return {};
      
      const bulletinData: Record<string, BulletinData> = {};
      
      for (const ins of filteredInscriptions) {
        try {
          const result = await reportsApi.bulletinSemestre(ins.id, selectedCalendarSemestreId) as any;
          bulletinData[ins.id] = result?.data ?? result;
        } catch (error) {
          console.error(`[v0] Error fetching bulletin for inscription ${ins.id}:`, error);
        }
      }
      
      return bulletinData;
    },
    enabled: !!selectedCalendarSemestreId && filteredInscriptions.length > 0,
  });

  const rows: ResultatSemestre[] = filteredInscriptions
    .map((ins) => {
      const bulletin = bulletins[ins.id] as BulletinData | undefined;
      
      return {
        id: ins.id,
        inscriptionId: ins.id,
        matricule: bulletin?.etudiant?.matricule ?? ins.etudiant?.matricule ?? "",
        etudiant: bulletin 
          ? [bulletin.etudiant?.prenom, bulletin.etudiant?.nom].filter(Boolean).join(" ")
          : [ins.etudiant?.prenom, ins.etudiant?.nom].filter(Boolean).join(" "),
        groupe: ins.groupe?.nom ?? String(ins.groupe ?? ""),
        semestre: calendarSemestres.find((s) => String(s.id) === selectedCalendarSemestreId)?.semestre?.code ?? "—",
        moyenne: bulletin?.moyenneGenerale ?? ins.moyenneSemestre ?? 0,
        decision: bulletin?.decision ?? ins.statusSemestre ?? ins.statut ?? "en_attente",
      };
    });

  const calculerUn = useMutation({
    mutationFn: (inscriptionId: number | string) => {
      if (!selectedCalendarSemestreId) throw new Error("Sélectionnez un semestre calendaire");
      return inscriptionsApi.semesterResult(inscriptionId, selectedCalendarSemestreId);
    },
    onSuccess: () => {
      toast.success("Résultats calculés");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors du calcul"),
  });

  const calculerTout = useMutation({
    mutationFn: async () => {
      if (!selectedCalendarSemestreId) throw new Error("Sélectionnez un semestre calendaire");
      for (const r of rows) {
        await inscriptionsApi.semesterResult(r.id, selectedCalendarSemestreId);
      }
    },
    onSuccess: () => {
      toast.success("Tous les résultats ont été recalculés");
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur lors du calcul global"),
  });

  const handlePrint = () => {
    if (!tableRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const tableClone = tableRef.current.cloneNode(true) as HTMLElement;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Résultats semestre</title>
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
          <h2>Résultats semestre - ${rows.length} inscriptions</h2>
          ${tableClone.innerHTML}
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <PageHeader
        title="Résultats semestre"
        subtitle={`${rows.length} inscriptions`}
        actions={
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
            <Button onClick={() => calculerTout.mutate()} disabled={calculerTout.isPending || !selectedCalendarSemestreId}>
              <Calculator className="w-4 h-4" />
              {calculerTout.isPending ? "Calcul en cours..." : "Tout calculer"}
            </Button>
          </div>
        }
      />

      <ApiStatusBanner show={isFallback} />

      <FilterBar>
        <SelectInput value={selectedGroupeId} onChange={setSelectedGroupeId} title="Filtrer par groupe">
          <option value="">Tous les groupes</option>
          {(groupes as any[]).map((g) => (
            <option key={g.id} value={String(g.id)}>{g.nom}</option>
          ))}
        </SelectInput>

        <SelectInput value={selectedCalendarSemestreId} onChange={setSelectedCalendarSemestreId} title="Semestre calendaire">
          <option value="">Semestre calendaire</option>
          {calendarSemestres.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.semestre?.code ?? `S${s.semestre?.numero}`} (ID {s.id})
            </option>
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
              <TH>Semestre</TH>
              <TH>Moy. théorique</TH>
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
              <TD>{r.groupe}</TD>
              <TD>{r.semestre}</TD>
              <TD className={r.moyenne >= 10 ? "font-bold text-emerald-600" : "font-bold text-danger"}>
                {r.moyenne ? `${r.moyenne.toFixed(2)}/20` : "—"}
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
