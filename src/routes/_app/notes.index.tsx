import { createFileRoute, Link } from "@tanstack/react-router";
import { PencilLine, Ban, Printer } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { DataTable, THead, TH, TR, TD } from "@/components/ui/data-table";
import { notesApi, inscriptionsApi, groupesApi, anneesApi } from "@/lib/api/endpoints";
import type { AnneeScolaireSemestre } from "@/lib/lmd";

export const Route = createFileRoute("/_app/notes/")(
  {
    head: () => ({ meta: [{ title: "Notes — UniPlus" }] }),
    component: NotesIndexPage,
  },
);

function NotesIndexPage() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [selectedCalendarSemestreId, setSelectedCalendarSemestreId] = useState("");
  const [selectedInscriptionId, setSelectedInscriptionId] = useState("");
  const [selectedMatiereId, setSelectedMatiereId] = useState("");

  // Fetch groupes
  const { data: groupes = [] } = useQuery({
    queryKey: ["groupes"],
    queryFn: async () => {
      const res = await groupesApi.list({ limit: 500 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  // Fetch academic years to find active one
  const { data: annees = [] } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const res = await anneesApi.list({ limit: 100 }) as any;
      return res?.data?.data ?? res?.data ?? [];
    },
  });

  const activeAnneeId = (annees as any[]).find((a) => a.actif)?.id ?? (annees as any[])[0]?.id;

  // Fetch calendar semesters for active academic year
  const { data: calendarSemestres = [] } = useQuery({
    queryKey: ["annee-semestres", activeAnneeId],
    queryFn: async () => {
      if (!activeAnneeId) return [];
      const res = await anneesApi.listSemestres(activeAnneeId) as any;
      return (res?.data ?? res ?? []) as AnneeScolaireSemestre[];
    },
    enabled: !!activeAnneeId,
  });

  // Auto-select active semester
  useEffect(() => {
    if (!selectedCalendarSemestreId && calendarSemestres.length > 0) {
      const active = calendarSemestres.find((s) => s.actif) ?? calendarSemestres[0];
      setSelectedCalendarSemestreId(String(active.id));
    }
  }, [calendarSemestres, selectedCalendarSemestreId]);

  // Fetch inscriptions by selected group
  const { data: inscriptions = [] } = useQuery({
    queryKey: ["inscriptions-by-group", selectedGroupeId],
    queryFn: async () => {
      if (!selectedGroupeId) return [];
      const res = await inscriptionsApi.byGroup(selectedGroupeId) as any;
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!selectedGroupeId,
  });

  // Fetch notes for selected inscription and semester
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes", selectedInscriptionId, selectedCalendarSemestreId],
    queryFn: async () => {
      if (!selectedInscriptionId || !selectedCalendarSemestreId) return [];
      const res = await notesApi.forSemester(selectedInscriptionId, selectedCalendarSemestreId) as any;
      const list = res?.data?.data ?? res?.data ?? res ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!selectedInscriptionId && !!selectedCalendarSemestreId,
  });

  // Fetch all notes for group (all inscriptions in selected semester)
  const { data: allGroupNotes = [], isLoading: allNotesLoading } = useQuery({
    queryKey: ["notes-group", selectedGroupeId, selectedCalendarSemestreId, inscriptions],
    queryFn: async () => {
      if (!selectedGroupeId || !selectedCalendarSemestreId || inscriptions.length === 0) return [];
      const allNotes: any[] = [];
      for (const ins of inscriptions) {
        try {
          const res = await notesApi.forSemester(ins.id, selectedCalendarSemestreId) as any;
          const list = res?.data?.data ?? res?.data ?? res ?? [];
          if (Array.isArray(list)) {
            allNotes.push(...list.map((n: any) => ({
              ...n,
              etudiantNom: [ins.etudiant?.prenom, ins.etudiant?.nom].filter(Boolean).join(" ") || `Inscription #${ins.id}`,
              matricule: ins.etudiant?.matricule ?? ins.matricule ?? "",
            })));
          }
        } catch {
          // Skip failed fetches
        }
      }
      return allNotes;
    },
    enabled: !!selectedGroupeId && !!selectedCalendarSemestreId && inscriptions.length > 0 && !selectedInscriptionId,
  });

  const displayNotes = selectedInscriptionId ? notes : allGroupNotes;
  const loading = selectedInscriptionId ? notesLoading : allNotesLoading;

  // Extract unique matieres from current notes
  const matieres = Array.from(
    new Map(
      displayNotes.map((n: any) => [
        n.matiereId,
        { id: n.matiereId, code: n.matiere?.code, intitule: n.matiere?.intitule }
      ])
    ).values()
  ).sort((a: any, b: any) => (a.intitule || "").localeCompare(b.intitule || ""));

  // Filter notes by selected matière
  const filteredNotes = selectedMatiereId
    ? displayNotes.filter((n: any) => String(n.matiereId) === selectedMatiereId)
    : displayNotes;

  // Print function
  const handlePrint = () => {
    if (!tableRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impression - Notes</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          h2 { text-align: center; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h2>Liste des Notes</h2>
        ${tableRef.current.outerHTML}
        <script>
          window.print();
          window.close();
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle={`${filteredNotes.length} notes enregistrées`}
        actions={<div className="flex gap-2"><Link to="/notes/saisie"><Button><PencilLine className="w-4 h-4" /> Saisie de notes</Button></Link><Button variant="secondary" onClick={handlePrint} disabled={filteredNotes.length === 0}><Printer className="w-4 h-4" /> Imprimer</Button></div>}
      />
      <FilterBar>
        <SelectInput aria-label="Groupe" value={selectedGroupeId} onChange={(v: string) => { setSelectedGroupeId(v); setSelectedInscriptionId(""); setSelectedMatiereId(""); }}>
          <option value="">Sélectionner un groupe</option>
          {(groupes as any[]).map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </SelectInput>
        <SelectInput aria-label="Semestre" value={selectedCalendarSemestreId} onChange={(v: string) => { setSelectedCalendarSemestreId(v); setSelectedMatiereId(""); }}>
          <option value="">Sélectionner un semestre</option>
          {calendarSemestres.map((s) => (
            <option key={s.id} value={s.id}>
              {s.semestre?.code ?? `S${s.semestre?.numero}`} (ID {s.id})
            </option>
          ))}
        </SelectInput>
        <SelectInput aria-label="Inscription" value={selectedInscriptionId} onChange={(v: string) => { setSelectedInscriptionId(v); setSelectedMatiereId(""); }}>
          <option value="">Toutes les inscriptions</option>
          {(inscriptions as any[]).map((ins) => (
            <option key={ins.id} value={ins.id}>
              {[ins.etudiant?.prenom, ins.etudiant?.nom].filter(Boolean).join(" ") || `#${ins.id}`} ({ins.etudiant?.matricule ?? ins.matricule ?? ""})
            </option>
          ))}
        </SelectInput>
        <SelectInput aria-label="Matière" value={selectedMatiereId} onChange={setSelectedMatiereId}>
          <option value="">Toutes les matières</option>
          {matieres.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.intitule ?? m.code ?? `Matière #${m.id}`}
            </option>
          ))}
        </SelectInput>
      </FilterBar>
      <DataTable>
        <table ref={tableRef} style={{ width: "100%" }}>
        <THead><TR><TH>#</TH><TH>Étudiant</TH><TH>Matière</TH><TH>Semestre</TH><TH>Normale</TH><TH>Rattrapage</TH><TH>Finale</TH><TH>Abs. inj.</TH></TR></THead>
        <tbody>
          {loading ? (
            <TR><TD colSpan={8} className="py-8 text-muted-foreground text-center">Chargement…</TD></TR>
          ) : displayNotes.length === 0 ? (
            <TR><TD colSpan={8} className="py-8 text-muted-foreground text-center">
              {!selectedGroupeId ? "Sélectionnez un groupe pour afficher les notes" :
               !selectedCalendarSemestreId ? "Sélectionnez un semestre" :
               "Aucune note trouvée"}
            </TD></TR>
          ) : filteredNotes.length === 0 ? (
            <TR><TD colSpan={8} className="py-8 text-muted-foreground text-center">Aucune note trouvée pour cette matière</TD></TR>
          ) : filteredNotes.map((n: any, i: number) => {
            const noteNormale = n.noteNormale != null ? Number(n.noteNormale) : null;
            const noteRattrapage = n.noteRattrapage != null ? Number(n.noteRattrapage) : null;
            const finale = n.absenceInjustifiee ? 0 : (n.noteFinal != null ? Number(n.noteFinal) : (noteRattrapage ?? noteNormale ?? 0));
            return (
              <TR key={n.id ?? i}>
                <TD className="text-muted-foreground">{i + 1}</TD>
                <TD className="font-medium">{n.etudiantNom ?? `Inscription #${n.inscriptionId}`}</TD>
                <TD>{n.matiere?.intitule ?? n.matiere?.code ?? `Matière #${n.matiereId}`}</TD>
                <TD>{n.anneeScolaireSemestre?.semestre?.code ?? n.anneeScolaireSemestre?.semestre?.numero ?? `Sem #${n.anneeScolaireSemestreId}`}</TD>
                <TD>{noteNormale != null ? noteNormale.toFixed(2) : "—"}</TD>
                <TD>{noteRattrapage != null ? noteRattrapage.toFixed(2) : "—"}</TD>
                <TD className={finale < 10 ? "font-bold text-danger" : "font-bold text-emerald-600"}>{finale.toFixed(2)}</TD>
                <TD>{n.absenceInjustifiee && <Ban className="w-4 h-4 text-danger" />}</TD>
              </TR>
            );
          })}
        </tbody>
        </table>
      </DataTable>
    </div>
  );
}
