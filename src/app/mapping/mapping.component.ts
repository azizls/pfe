import { Component } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import * as Papa from 'papaparse';
// Pour Excel, vous pouvez utiliser : import * as XLSX from 'xlsx';

@Component({
  selector: 'app-mapping',
  templateUrl: './mapping.component.html',
  styleUrls: ['./mapping.component.scss']
})
export class MappingComponent {
  // Liste des colonnes extraites du fichier importé.
  fileColumns: string[] = [];
  // Liste des colonnes de la base de données. En pratique, cette liste pourrait être récupérée via une API.
  dbColumns: string[] = ['id', 'name', 'email', 'created_at'];
  // Stocke les correspondances effectuées.
  mapping: { fileColumn: string, dbColumn: string }[] = [];

  // Gère la sélection du fichier (CSV ou Excel)
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Pour CSV
      if (file.type === 'text/csv') {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            // Récupère les colonnes à partir de la première ligne du CSV.
            this.fileColumns = results.meta.fields || [];
          },
          error: (err) => {
            console.error('Erreur lors du parsing CSV:', err);
          }
        });
      } else {
        // Pour Excel, utiliser XLSX
        // Exemple (à décommenter et adapter si besoin):
        /*
        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          // Choisit la première feuille
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          // La première ligne contient les colonnes
          this.fileColumns = jsonData[0] as string[];
        };
        reader.readAsArrayBuffer(file);
        */
      }
    }
  }

  // Fonction de drag & drop pour réaliser le mapping
  drop(event: CdkDragDrop<string[]>): void {
    // Si on déplace dans la même liste
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transfère l'élément entre listes
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Enregistre la correspondance : ici, nous associons la colonne déplacée du fichier avec la colonne de la BD où elle a été déposée.
      // (Cette logique peut être améliorée pour gérer des mappings plus complexes.)
      const fileCol = event.previousContainer.data[event.previousIndex];
      const dbCol = event.container.data[event.currentIndex];
      this.mapping.push({ fileColumn: fileCol, dbColumn: dbCol });
    }
  }
}
