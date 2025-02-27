import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DatabaseService } from '../services/database.service';

interface TableMapping {
  excelColumn: string;
  dbColumn: string;
  // Optionnel : pour lookup dans une dimension
  lookupTable?: string;
  lookupColumn?: string | undefined;
}

interface TableData {
  name: string;
  mapping: TableMapping[];
  data: any[];
}

@Component({
  selector: 'app-mapping',
  templateUrl: './mapping.component.html',
  styleUrls: ['./mapping.component.scss']
})
export class MappingComponent implements OnInit {
  databaseName: string = '';
  availableTables: string[] = [];
  selectedTable: string = '';
  dbColumnsMap: { [table: string]: string[] } = {};
  excelColumns: string[] = [];
  filePreview: any[] = [];
  fullData: any[] = [];
  // Sauvegarde des données Excel originales pour la fact
  excelDataBackup: any[] = [];
  mappings: TableMapping[] = [];
  tablesData: TableData[] = [];
  showJson: boolean = false;
  selectedFile: File | null = null;

  constructor(private databaseService: DatabaseService) {}

  ngOnInit(): void {}

  toggleJson(): void {
    this.showJson = !this.showJson;
  }

  fetchTables(): void {
    if (this.databaseName.trim() !== '') {
      this.databaseService.getTables(this.databaseName).subscribe(
        (result: any) => {
          this.availableTables = Object.keys(result);
          this.dbColumnsMap = result;
          // Réinitialiser pour un nouveau mapping
          this.selectedTable = '';
          this.mappings = [];
          this.fullData = [];
          this.excelDataBackup = [];
          console.log('✅ Tables récupérées:', this.availableTables);
        },
        (error: any) => {
          console.error('❌ Erreur lors de la récupération des tables', error);
        }
      );
    } else {
      this.availableTables = [];
      this.selectedTable = '';
    }
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    if (!this.selectedFile) return;

    if (this.selectedFile.type === 'text/csv' || this.selectedFile.name.endsWith('.csv')) {
      Papa.parse(this.selectedFile, {
        header: true,
        complete: (results) => {
          this.excelColumns = results.meta.fields || [];
          this.filePreview = results.data.slice(0, 5);
          this.fullData = results.data;
          // Sauvegarder les données originales pour la fact
          this.excelDataBackup = [...this.fullData];
          console.log('✅ Colonnes extraites du CSV:', this.excelColumns);
          console.log('✅ Aperçu des données:', this.filePreview);
          console.log('✅ Données complètes chargées:', this.fullData);
        },
        error: (err) => console.error('❌ Erreur lors du parsing CSV:', err)
      });
    } else if (this.selectedFile.name.endsWith('.xlsx') || this.selectedFile.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (jsonData.length) {
          this.excelColumns = jsonData[0] as string[];
          this.filePreview = jsonData.slice(1, 6).map(row => this.mapRowToObj(row));
          this.fullData = jsonData.slice(1).map(row => this.mapRowToObj(row));
          // Sauvegarder les données originales pour la fact
          this.excelDataBackup = [...this.fullData];
          console.log('✅ Colonnes extraites de l\'Excel:', this.excelColumns);
          console.log('✅ Aperçu des données:', this.filePreview);
          console.log('✅ Données complètes chargées:', this.fullData);
        } else {
          console.error('❌ Le fichier Excel est vide.');
        }
      };
      reader.readAsArrayBuffer(this.selectedFile);
    } else {
      console.error('❌ Type de fichier non supporté.');
    }
  }

  reloadFile(): void {
    if (this.selectedFile) {
      console.log('🔄 Rechargement du fichier:', this.selectedFile.name);
      const fakeEvent = { target: { files: [this.selectedFile] } };
      this.onFileSelected(fakeEvent);
    } else {
      console.warn("⚠️ Aucun fichier à recharger.");
    }
  }

  mapRowToObj(row: any[]): any {
    const obj: any = {};
    this.excelColumns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  }

  drop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer !== event.container) {
      const draggedColumn = event.item.data;
      const targetColumn = event.container.data[event.currentIndex];
      if (this.selectedTable) {
        const exists = this.mappings.find(m => m.dbColumn === targetColumn);
        if (!exists) {
          this.mappings.push({ excelColumn: draggedColumn, dbColumn: targetColumn });
        } else {
          this.mappings = this.mappings.map(m =>
            m.dbColumn === targetColumn ? { excelColumn: draggedColumn, dbColumn: targetColumn } : m
          );
        }
        console.log('✅ Mapping enregistré:', { excelColumn: draggedColumn, dbColumn: targetColumn });
      }
    } else {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }
  }

  // Enregistrer le mapping et les données pour une dimension
  // On passe le nom de la table en paramètre afin de le conserver avant réinitialisation
  saveTableMapping(tableName: string): void {
    if (!tableName || this.mappings.length === 0 || this.fullData.length === 0) {
      console.error("❌ Table non sélectionnée, mapping vide ou aucune donnée.");
      return;
    }
    console.log(`📌 Enregistrement du mapping pour ${tableName}...`);
    // Supprimer l'ancien mapping pour cette table
    this.tablesData = this.tablesData.filter(t => t.name !== tableName);
    // Ajouter le nouveau mapping et les données
    this.tablesData.push({
      name: tableName,
      mapping: [...this.mappings],
      data: [...this.fullData]
    });
    console.log("✅ Mapping enregistré, état actuel de tablesData:", JSON.stringify(this.tablesData, null, 2));
    // Réinitialiser uniquement le mapping (les données Excel restent disponibles)
    this.mappings = [];
  }

  // Charger et envoyer une dimension (le mapping saisi par l'utilisateur)
  loadAndSendDimension(): void {
    console.log("📌 Vérification avant envoi:");
    console.log("selectedTable:", this.selectedTable);
    console.log("mappings:", this.mappings);
    console.log("fullData:", this.fullData);
    if (!this.selectedTable || this.mappings.length === 0 || this.fullData.length === 0) {
      console.error("❌ Table non sélectionnée, mapping vide ou données absentes.");
      alert("⚠️ Veuillez sélectionner une table, définir un mapping et charger des données.");
      return;
    }
    // Conserver la table actuellement sélectionnée avant réinitialisation
    const currentTable = this.selectedTable;
    // Sauvegarder ce mapping dans tablesData
    this.saveTableMapping(currentTable);
    const tableToSend = this.tablesData.find(t => t.name === currentTable);
    if (!tableToSend || tableToSend.data.length === 0) {
      console.error(`❌ La table ${currentTable} n'existe pas dans tablesData ou n'a pas de données.`);
      alert(`❌ La table ${currentTable} n'est pas correctement enregistrée.`);
      return;
    }
    const jsonOutput = {
      databaseName: this.databaseName,
      table: tableToSend.name,
      mapping: tableToSend.mapping,
      data: tableToSend.data
    };
    console.log(`📤 Envoi de la dimension ${tableToSend.name}...`, JSON.stringify(jsonOutput, null, 2));
    this.databaseService.insertDimensionData(jsonOutput).subscribe(
      (response: any) => {
        console.log(`✅ Insertion réussie pour ${tableToSend.name}`, response);
        alert(`✅ Dimension ${tableToSend.name} insérée avec succès !`);
        // Réinitialisation après envoi réussi (les données Excel restent pour réutilisation)
        this.selectedTable = '';
        this.mappings = [];
        setTimeout(() => {
          this.reloadFile();
        }, 4000);
      },
      (error: any) => {
        console.error(`❌ Erreur lors de l’insertion de ${tableToSend.name}`, error);
        alert(`❌ Erreur lors de l’insertion de ${tableToSend.name}`);
      }
    );
  }

  // Auto-génération du mapping pour la fact à partir des dimensions enregistrées
  autoGenerateFactMapping(): TableMapping[] {
    const factMappingMap: { [dim: string]: TableMapping } = {};
    // Pour chaque dimension enregistrée (tablesData dont le nom ne commence pas par "fact")
    this.tablesData.forEach(dim => {
      if (!dim.name.toLowerCase().startsWith("fact")) {
        const dimKey = dim.name.toLowerCase();
        if (!factMappingMap[dimKey]) {
          // Choisir le mapping qui contient "id" dans le dbColumn si disponible, sinon le premier
          let candidate: TableMapping = dim.mapping[0];
          for (const m of dim.mapping) {
            if (m.dbColumn.toLowerCase().includes("id")) {
              candidate = m;
              break;
            }
          }
          factMappingMap[dimKey] = {
            excelColumn: candidate.excelColumn,
            dbColumn: `${dim.name.toLowerCase()}_id`,
            lookupTable: dim.name,
            lookupColumn: candidate.dbColumn
          };
        }
      }
    });
    const mappingArray = Object.values(factMappingMap);
    console.log("🔍 Auto-mapping généré pour la fact:", mappingArray);
    return mappingArray;
  }

  // Charger et envoyer la fact de manière automatique
  sendFactTable(): void {
    // Rechercher la table fact parmi les tables disponibles (nom commençant par "fact")
    const factTableName = this.availableTables.find(t => t.toLowerCase().startsWith("fact"));
    if (!factTableName) {
      console.error("❌ Aucune table fact définie dans la base de données.");
      alert("❌ Aucune table fact trouvée.");
      return;
    }
    // Essayer de récupérer les données de la fact depuis tablesData
    let factTableData = this.tablesData.find(t => t.name.toLowerCase() === factTableName.toLowerCase());
    if (!factTableData) {
      // Si aucune donnée fact n'est enregistrée, utiliser les données Excel originales sauvegardées
      factTableData = {
        name: factTableName,
        mapping: this.autoGenerateFactMapping(),
        data: [...this.excelDataBackup]
      };
      // Ajouter à tablesData pour référence future
      this.tablesData.push(factTableData);
    }
    if (!factTableData.data || factTableData.data.length === 0) {
      console.error("❌ La table Fact est vide ou non renseignée.");
      alert("❌ La table Fact n'a pas de données.");
      return;
    }
    const jsonOutput = {
      databaseName: this.databaseName,
      factTable: factTableData.name,
      mapping: factTableData.mapping,
      data: factTableData.data
    };
    console.log("📤 Envoi de la table Fact...", JSON.stringify(jsonOutput, null, 2));
    this.databaseService.insertFactData(jsonOutput).subscribe(
      (response: any) => {
        console.log("✅ Table Fact insérée avec succès !", response);
        alert("✅ Fact insérée avec succès !");
      },
      (error: any) => {
        console.error("❌ Erreur lors de l’insertion de la table Fact", error);
        alert("❌ Erreur lors de l’insertion de la table Fact");
      }
    );
  }

  onTableSelected(): void {
    // Réinitialiser le mapping et les données lors de la sélection d'une nouvelle table
    this.mappings = [];
    this.fullData = [];
    this.filePreview = [];
    console.log(`📌 Table sélectionnée : ${this.selectedTable}, réinitialisation du mapping.`);
  }
}
