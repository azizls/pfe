import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import * as go from 'gojs';
import { DatabaseService } from '../services/database.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface TableColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  foreignKey?: boolean;
  referenceTable?: string;
}

interface TableNode {
  key: number;
  name: string;
  columns: TableColumn[];
}

interface TableLink {
  from: number;
  to: number;
  relationName?: string;
}

@Component({
  selector: 'app-warehouse-designer',
  templateUrl: './warehouse-designer.component.html',
  styleUrls: ['./warehouse-designer.component.css']
})
export class WarehouseDesignerComponent implements OnInit {
  @ViewChild('diagramDiv', { static: true }) diagramDiv!: ElementRef;
  private diagram!: go.Diagram;
  jsonOutput: string = '';
  databaseName: string = 'MyDatabase';

  attributeTypes: string[] = [
    "INT", "VARCHAR", "NVARCHAR", "DATETIME", "BIT",
    "DECIMAL", "FLOAT", "CHAR", "NCHAR"
  ];

  selectedAttributeType: string = "VARCHAR";
  selectedKeyType: string = "Aucun";

  constructor(
    private DatabaseService: DatabaseService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initializeDiagram();
  }

  private initializeDiagram() {
    this.diagram = new go.Diagram(this.diagramDiv.nativeElement, {
      'undoManager.isEnabled': true,
      'draggingTool.dragsLink': true,
      'linkingTool.isEnabled': true,
      'allowDrop': true,
      initialContentAlignment: go.Spot.Center,
      "grid.visible": true,
      "grid.gridCellSize": new go.Size(10, 10)
    });

    this.diagram.model = new go.GraphLinksModel({ nodeKeyProperty: 'key' });

    // 📌 Template des tables
    this.diagram.nodeTemplate =
      new go.Node("Auto")
        .add(new go.Shape("RoundedRectangle", { fill: "#e0f7fa", stroke: "#0288d1", strokeWidth: 2 }))
        .add(
          new go.Panel("Vertical")
            .add(new go.TextBlock({
              margin: 8,
              font: "bold 14px sans-serif",
              editable: true
            }).bind(new go.Binding("text", "name").makeTwoWay()))

            .add(
              new go.Panel("Vertical", { name: "COLUMN_PANEL", itemTemplate: 
                  new go.Panel("Horizontal")
                    .add(new go.TextBlock({
                      margin: 4,
                      font: "12px sans-serif",
                      editable: true
                    }).bind(new go.Binding("text", "name").makeTwoWay()))

                    .add(new go.TextBlock({
                      margin: 4,
                      font: "12px sans-serif",
                      stroke: "gray"
                    }).bind(new go.Binding("text", "type")))

                    .add(new go.TextBlock({
                      margin: 4,
                      font: "12px sans-serif",
                      stroke: "red"
                    }).bind(new go.Binding("text", "", (col: any) => col.primaryKey ? "🔑" : (col.foreignKey ? "🔗" : ""))))
              })
              .bind(new go.Binding("itemArray", "columns"))
            )
        );

    // 📌 Template des relations
    this.diagram.linkTemplate =
      new go.Link({ routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver })
        .add(new go.Shape({ strokeWidth: 2 }))
        .add(new go.Shape({ toArrow: "Standard" }))
        .add(new go.TextBlock({
          segmentOffset: new go.Point(0, -10),
          font: "bold 12px sans-serif",
          stroke: "#333"
        }).bind(new go.Binding("text", "relationName")));
  }

  addTable() {
    const model = this.diagram.model as go.GraphLinksModel;
    const newKey = model.nodeDataArray.length + 1;
    model.startTransaction("Ajout de table");
    model.addNodeData({
      key: newKey,
      name: `Table_${newKey}`,
      columns: [{ name: 'id', type: 'INT', primaryKey: true }]
    });
    model.commitTransaction("Ajout de table");
    this.snackBar.open('Table ajoutée', 'OK', { duration: 2000 });
  }


  addAttribute() {
    const selectedNode = this.diagram.selection.first();
    if (selectedNode instanceof go.Node) {
      const model = this.diagram.model as go.GraphLinksModel;
      const nodeData = selectedNode.data as TableNode;

      if (nodeData && nodeData.columns) {
        model.startTransaction("Ajout d'attribut");

        let newColumn: TableColumn = {
          name: 'NewColumn',
          type: this.selectedAttributeType
        };

        if (this.selectedKeyType === "Clé primaire") {
          newColumn.primaryKey = true;
        } else if (this.selectedKeyType === "Clé étrangère") {
          newColumn.foreignKey = true;

          // 📌 Demander la table de référence
          const tableNames = this.diagram.model.nodeDataArray
            .map((node: any) => node.name)
            .filter((name: string) => name !== nodeData.name);

          const selectedTable = prompt("Sélectionnez la table de référence :\n" + tableNames.join("\n"));

          if (selectedTable && tableNames.includes(selectedTable)) {
            this.snackBar.open(`Clé étrangère liée à ${selectedTable}`, 'OK', { duration: 3000 });

            // 📌 Associer la clé étrangère
            newColumn.name = `${selectedTable}_id`;
            newColumn.referenceTable = selectedTable;

            // 📌 Trouver la clé primaire de la table référencée
            const refTable = model.nodeDataArray.find((node: any) => node.name === selectedTable) as TableNode;
            const primaryKeyColumn = refTable.columns.find(col => col.primaryKey);
            if (primaryKeyColumn) {
              newColumn.type = primaryKeyColumn.type;
            }

            // 📌 Ajout automatique de la relation
            model.addLinkData({ from: this.getTableKey(selectedTable), to: nodeData.key });
          } else {
            this.snackBar.open('Aucune table valide sélectionnée.', 'OK', { duration: 3000 });
            model.commitTransaction("Ajout d'attribut");
            return;
          }
        }

        const newColumns = [...nodeData.columns, newColumn];
        model.setDataProperty(nodeData, 'columns', newColumns);
        model.commitTransaction("Ajout d'attribut");

        this.snackBar.open('Attribut ajouté avec succès !', 'OK', { duration: 2000 });
      }
    } else {
      this.snackBar.open('Sélectionnez une table avant d\'ajouter un attribut.', 'OK', { duration: 2000 });
    }
  }


  addRelation() {
    const selectedNodes = this.diagram.selection.toArray();
    if (selectedNodes.length === 2 && selectedNodes[0] instanceof go.Node && selectedNodes[1] instanceof go.Node) {
      const model = this.diagram.model as go.GraphLinksModel;
      const fromNode = selectedNodes[0].data as TableNode;
      const toNode = selectedNodes[1].data as TableNode;

      const relationName = prompt("Entrez le nom de la relation entre ces tables :") || "Relation";

      model.startTransaction("Ajout de relation");
      model.addLinkData({ from: fromNode.key, to: toNode.key, relationName: relationName });
      model.commitTransaction("Ajout de relation");
      this.snackBar.open(`Relation ajoutée : ${relationName}`, 'OK', { duration: 2000 });
    } else {
      this.snackBar.open('Sélectionnez exactement deux tables pour créer une relation.', 'OK', { duration: 2000 });
    }
  }




  removeRelation() {
    const selectedLink = this.diagram.selection.first();
    if (selectedLink instanceof go.Link) {
      const model = this.diagram.model as go.GraphLinksModel;
      model.startTransaction("Suppression de relation");
      model.removeLinkData(selectedLink.data);
      model.commitTransaction("Suppression de relation");
      this.snackBar.open('Relation supprimée', 'OK', { duration: 2000 });
    } else {
      this.snackBar.open('Sélectionnez une relation à supprimer.', 'OK', { duration: 2000 });
    }
  }

 


  removeTable() {
    const selectedNode = this.diagram.selection.first();
    if (selectedNode instanceof go.Node) {
      const model = this.diagram.model as go.GraphLinksModel;
      model.startTransaction("Suppression de table");
      model.removeNodeData(selectedNode.data);
      model.commitTransaction("Suppression de table");
      this.snackBar.open('Table supprimée', 'OK', { duration: 2000 });
    } else {
      this.snackBar.open('Sélectionnez une table à supprimer.', 'OK', { duration: 2000 });
    }
  }

  removeAttribute() {
    const selectedNode = this.diagram.selection.first();
    if (selectedNode instanceof go.Node) {
      const model = this.diagram.model as go.GraphLinksModel;
      const nodeData = selectedNode.data as TableNode;
      if (nodeData && nodeData.columns.length > 1) {
        model.startTransaction("Suppression d'attribut");
        nodeData.columns.pop();
        model.updateTargetBindings(nodeData);
        model.commitTransaction("Suppression d'attribut");
        this.snackBar.open('Attribut supprimé', 'OK', { duration: 2000 });
      } else {
        this.snackBar.open('Impossible de supprimer l\'attribut, une table doit contenir au moins un champ.', 'OK', { duration: 2000 });
      }
    } else {
      this.snackBar.open('Sélectionnez une table avant de supprimer un attribut.', 'OK', { duration: 2000 });
    }
  }

  getTableKey(tableName: string): number {
    const model = this.diagram.model as go.GraphLinksModel;
    const table = model.nodeDataArray.find((node: any) => node.name === tableName);
    return table ? table['key'] : -1;
  }

  exportModel() {
    const model = this.diagram.model as go.GraphLinksModel;
    const nodeDataArray: TableNode[] = model.nodeDataArray as TableNode[];
    const linkDataArray: TableLink[] = model.linkDataArray as TableLink[];

    const jsonOutput = {
      databaseName: this.databaseName,
      class: 'GraphLinksModel',
      tables: nodeDataArray.map(table => ({
        name: table.name,
        columns: table.columns.map(col => ({
          name: col.name,
          type: col.type,
          primaryKey: col.primaryKey || false,
          foreignKey: col.foreignKey || false,
          referenceTable: col.referenceTable || null
        }))
      })),
      relations: linkDataArray.map(link => ({
        fromTable: nodeDataArray.find(node => node.key === link.from)?.name || 'Unknown',
        toTable: nodeDataArray.find(node => node.key === link.to)?.name || 'Unknown',
        relationName: link.relationName || ""
      }))
    };

    this.jsonOutput = JSON.stringify(jsonOutput, null, 2);
    console.log('🔹 Modèle JSON Exporté :', this.jsonOutput);

    this.DatabaseService.createDatabase(jsonOutput).subscribe(
      response => {
        console.log('✅ Base créée avec succès !', response);
        this.snackBar.open('Base créée avec succès !', 'OK', { duration: 2000 });
      },
      error => {
        console.error('❌ Erreur lors de la création de la base', error);
        this.snackBar.open('Erreur lors de la création de la base.', 'OK', { duration: 2000 });
      }
    );
  }
}
