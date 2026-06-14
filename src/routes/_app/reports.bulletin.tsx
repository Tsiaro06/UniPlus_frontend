import { createFileRoute } from "@tanstack/react-router";
import { Printer, FileDown, GraduationCap, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/stat-card";
import { FilterBar, SelectInput } from "@/components/ui/filter-bar";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { etudiants } from "@/lib/mock-data";
import { useState } from "react";
import { toast } from "sonner";

// Types pour le bulletin
interface MatiereNote {
  name: string;
  coef: number;
  note: number;
  ratt: number | null;
  finale: number;
}

interface UE {
  nom: string;
  type: string;
  ects: number;
  matieres: MatiereNote[];
}

export const Route = createFileRoute("/_app/reports/bulletin")({
  head: () => ({ meta: [{ title: "Bulletins — UniPlus" }] }),
  component: BulletinPage,
});

function BulletinPage() {
  const [selectedEtudiant, setSelectedEtudiant] = useState(etudiants[0].id);
  const [selectedSemestre, setSelectedSemestre] = useState(1);

  const e = etudiants.find(s => s.id === selectedEtudiant) || etudiants[0];

  const ues: UE[] = [
    { nom: "Fondamentaux Informatique", type: "Fondamentale", ects: 6, matieres: [
      { name: "Algorithmique", coef: 3, note: 12, ratt: null, finale: 12 },
      { name: "Programmation C", coef: 3, note: 8.5, ratt: 11, finale: 11 },
      { name: "Architecture", coef: 2, note: 14, ratt: null, finale: 14 },
    ]},
    { nom: "Mathématiques 1", type: "Fondamentale", ects: 5, matieres: [
      { name: "Analyse 1", coef: 3, note: 10.5, ratt: null, finale: 10.5 },
      { name: "Algèbre 1", coef: 2, note: 13, ratt: null, finale: 13 },
    ]},
    { nom: "Langues", type: "Transversale", ects: 2, matieres: [
      { name: "Anglais Technique", coef: 1, note: 15, ratt: null, finale: 15 },
    ]},
  ];

  const moyUE = (u: UE) => {
    const tot = u.matieres.reduce((s, m) => s + m.finale * m.coef, 0);
    const c = u.matieres.reduce((s, m) => s + m.coef, 0);
    return tot / c;
  };

  const moy = ues.reduce((s, u) => s + moyUE(u) * u.ects, 0) / ues.reduce((s, u) => s + u.ects, 0);
  const admis = moy >= 10;

  // Fonctions des boutons
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.success("Bulletin exporté en PDF avec succès !");
    // Ici tu pourras plus tard intégrer une vraie génération PDF (ex: jsPDF ou react-to-pdf)
  };

  const handleGenerer = () => {
    toast.success(`Bulletin généré pour ${e.nom} ${e.prenom} - S${selectedSemestre}`);
  };

  return (
    <>
      <div>
        <PageHeader 
          title="Bulletin de notes" 
          subtitle="Génération d'un bulletin semestriel officiel" 
          actions={
            <>
              <Button variant="secondary" onClick={handleExportPDF}>
                <FileDown className="w-4 h-4" /> Exporter PDF
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Imprimer
              </Button>
            </>
          } 
        />

        <ApiStatusBanner show={false} />

        <FilterBar>
          <SelectInput 
            value={selectedEtudiant} 
            onChange={(value) => setSelectedEtudiant(Number(value))}
          >
            {etudiants.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom} {s.prenom} — {s.matricule}
              </option>
            ))}
          </SelectInput>

          <SelectInput 
            value={selectedSemestre} 
            onChange={(value) => setSelectedSemestre(Number(value))}
          >
            {[1,2,3,4,5,6].map((s) => (
              <option key={s} value={s}>Semestre S{s}</option>
            ))}
          </SelectInput>

          <Button size="sm" onClick={handleGenerer}>
            <Plus className="w-4 h-4" /> Générer
          </Button>
        </FilterBar>

        <div className="bg-card shadow-sm print:shadow-none mt-6 p-8 border border-border rounded-xl">
          {/* En-tête du bulletin */}
          <div className="flex justify-between items-center mb-6 pb-5 border-primary border-b-2">
            <div className="flex items-center gap-3">
              <div className="relative flex justify-center items-center bg-primary rounded-lg w-12 h-12 text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-xl">UNIVERSITÉ D'ALGER — UniPlus</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Bulletin académique semestriel</div>
              </div>
            </div>
            <div className="text-muted-foreground text-xs text-right">
              <div>Année académique 2025-2026</div>
              <div>Édité le {new Date().toLocaleDateString("fr-FR")}</div>
            </div>
          </div>

          {/* Informations étudiant */}
          <div className="gap-4 grid grid-cols-2 bg-muted/40 mb-6 p-4 rounded-lg text-sm">
            <div><span className="text-muted-foreground">Étudiant :</span> <strong>{e.nom} {e.prenom}</strong></div>
            <div><span className="text-muted-foreground">Matricule :</span> <strong className="font-mono">{e.matricule}</strong></div>
            <div><span className="text-muted-foreground">Filière :</span> <strong>Informatique Générale</strong></div>
            <div><span className="text-muted-foreground">Groupe :</span> <strong>L1-INF-G1</strong></div>
            <div><span className="text-muted-foreground">Semestre :</span> <strong>S{selectedSemestre} — 2025-2026</strong></div>
            <div><span className="text-muted-foreground">Niveau :</span> <strong>L1</strong></div>
          </div>

          {/* Détail des UE */}
          <div className="space-y-5">
            {ues.map((u) => (
              <div key={u.nom} className="border border-border rounded-lg overflow-hidden">
                <div className="flex justify-between items-center bg-primary/5 px-4 py-2.5">
                  <div className="font-semibold text-sm">
                    UE : {u.nom} <span className="font-normal text-muted-foreground text-xs">({u.type} — {u.ects} ECTS)</span>
                  </div>
                  <div className="font-bold text-primary text-sm">Moyenne UE : {moyUE(u).toFixed(2)}/20</div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-border border-b">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-xs text-left uppercase">Matière</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-xs text-center uppercase">Coef</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-xs text-center uppercase">Normale</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-xs text-center uppercase">Rattrapage</th>
                      <th className="px-4 py-2 font-semibold text-muted-foreground text-xs text-center uppercase">Finale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.matieres.map((m) => (
                      <tr key={m.name} className="border-border last:border-0 border-b">
                        <td className="px-4 py-2 font-medium">{m.name}</td>
                        <td className="px-4 py-2 text-center">{m.coef}</td>
                        <td className="px-4 py-2 text-center">{m.note.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">{m.ratt?.toFixed(2) ?? "—"}</td>
                        <td className={`px-4 py-2 text-center font-bold ${m.finale < 10 ? "text-danger" : "text-emerald-600"}`}>
                          {m.finale.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Résultat final */}
          <div className="bg-primary/5 mt-8 p-5 border-2 border-primary rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Moyenne générale du semestre</div>
                <div className="mt-1 font-bold text-primary text-4xl">{moy.toFixed(2)} <span className="text-muted-foreground text-lg">/ 20</span></div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-xs uppercase tracking-wider">Décision</div>
                <div className={`mt-1 inline-flex items-center rounded-lg px-4 py-2 text-lg font-bold ${admis ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {admis ? "✅ ADMIS" : "❌ AJOURNÉ"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}