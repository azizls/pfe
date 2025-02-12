import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import * as go from 'gojs';
import { DatabaseService } from '../services/database.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface TableColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  foreignKey?: boolean;
}

interface TableNode {
  key: number;
  name: string;
  columns: TableColumn[];
}

interface TableLink {
  from: number;
  to: number;
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
    "INT",
    "VARCHAR",
    "NVARCHAR",
    "DATETIME",
    "BIT",
    "DECIMAL",
    "FLOAT",
    "CHAR",
    "NCHAR"
  ];

  // Type d'attribut par défaut
  selectedAttributeType: string = "VARCHAR";

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

    // Créer le binding séparément pour la conversion de primaryKey
    const primaryKeyBinding = new go.Binding("text", "primaryKey") as any;
    primaryKeyBinding.converter = (pk: boolean) => pk ? '🔑' : '';

    // Template du noeud amélioré
    this.diagram.nodeTemplate =
      new go.Node("Auto")
        .add(
          new go.Shape("RoundedRectangle", {
            fill: new go.Brush("Linear", { 0: "lightblue", 1: "white" }),
            stroke: "#4682B4",
            strokeWidth: 2
          })
        )
        .add(
          new go.Panel("Vertical")
            .add(
              new go.TextBlock({
                margin: 8,
                font: "bold 16px Roboto, sans-serif",
                editable: true,
                stroke: "#333"
              }).bind(new go.Binding("text", "name").makeTwoWay())
            )
            .add(
              (() => {
                const panel = new go.Panel("Vertical");
                panel.bind(new go.Binding("itemArray", "columns").makeTwoWay());
                panel.itemTemplate = new go.Panel("Horizontal")
                  .add(
                    new go.TextBlock({
                      margin: 4,
                      font: "14px Roboto, sans-serif",
                      editable: true,
                      stroke: "#555"
                    }).bind(new go.Binding("text", "name").makeTwoWay())
                  )
                  .add(
                    new go.TextBlock({
                      margin: 4,
                      font: "14px Roboto, sans-serif",
                      editable: true,
                      stroke: "gray"
                    }).bind(new go.Binding("text", "type").makeTwoWay())
                  )
                  .add(
                    new go.TextBlock({
                      margin: 4,
                      font: "14px Roboto, sans-serif",
                      stroke: "red",
                      editable: false
                    }).bind(primaryKeyBinding)
                  );
                return panel;
              })()
            )
        );

    // Template du lien amélioré
    this.diagram.linkTemplate =
      new go.Link({
        routing: go.Link.AvoidsNodes,
        corner: 10,
        relinkableFrom: true,
        relinkableTo: true,
        reshapable: true,
        curve: go.Link.JumpOver
      })
        .add(new go.Shape({ strokeWidth: 2, stroke: "#333" }))
        .add(new go.Shape({ toArrow: "Standard", stroke: "#333", fill: "#333" }))
        .add(
          new go.TextBlock({
            segmentOffset: new go.Point(0, -10),
            font: "bold 12px Roboto, sans-serif",
            stroke: "#333"
          }).bind(new go.Binding("text", "", this.getTableNames).ofObject())
        );

    const model = this.diagram.model as go.GraphLinksModel;
    model.nodeDataArray = [
      { key: 1, name: 'Users', columns: [{ name: 'id', type: 'INT', primaryKey: true }, { name: 'name', type: 'VARCHAR' }] },
      { key: 2, name: 'Orders', columns: [{ name: 'id', type: 'INT', primaryKey: true }, { name: 'user_id', type: 'INT', foreignKey: true }] },
      { key: 3, name: 'Payments', columns: [{ name: 'id', type: 'INT', primaryKey: true }, { name: 'order_id', type: 'INT', foreignKey: true }] }
    ];
    model.linkDataArray = [{ from: 1, to: 2 }, { from: 2, to: 3 }];
  }

  private getTableNames(link: go.Link): string {
    const fromNode = link.fromNode?.data as TableNode;
    const toNode = link.toNode?.data as TableNode;
    return `${fromNode?.name || 'TableA'} → ${toNode?.name || 'TableB'}`;
  }

  addTable() {
    const model = this.diagram.model as go.GraphLinksModel;
    const newKey = model.nodeDataArray.length + 1;
    model.startTransaction("Ajout de table");
    model.addNodeData({
      key: newKey,
      name: 'NewTable',
      columns: [{ name: 'id', type: 'INT', primaryKey: true }]
    });
    model.commitTransaction("Ajout de table");
    this.snackBar.open('Table ajoutée', 'OK', { duration: 2000 });
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

    addAttribute() {
    const selectedNode = this.diagram.selection.first();
    if (selectedNode instanceof go.Node) {
      const model = this.diagram.model as go.GraphLinksModel;
      const nodeData = selectedNode.data as TableNode;
      if (nodeData && nodeData.columns) {
        model.startTransaction("Ajout d'attribut");
        // Utilise le type choisi dans le combobox pour le nouvel attribut
        const newColumns = [...nodeData.columns, { name: 'NewColumn', type: this.selectedAttributeType }];
        model.setDataProperty(nodeData, 'columns', newColumns);
        model.commitTransaction("Ajout d'attribut");
        this.snackBar.open('Attribut ajouté', 'OK', { duration: 2000 });
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
      model.startTransaction("Ajout de relation");
      model.addLinkData({ from: fromNode.key, to: toNode.key });
      model.commitTransaction("Ajout de relation");
      this.snackBar.open('Relation ajoutée', 'OK', { duration: 2000 });
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
          foreignKey: col.foreignKey || false
        }))
      })),
      relations: linkDataArray.map(link => ({
        fromTable: nodeDataArray.find(node => node.key === link.from)?.name || 'Unknown',
        toTable: nodeDataArray.find(node => node.key === link.to)?.name || 'Unknown'
      }))
    };

    this.jsonOutput = JSON.stringify(jsonOutput, null, 2);
    console.log('🔹 Modèle JSON Exporté :', this.jsonOutput);

    this.DatabaseService.createDatabase(jsonOutput).subscribe(
      response => {
        console.log('✅ Données envoyées avec succès !', response);
        this.snackBar.open('Données envoyées avec succès !', 'OK', { duration: 2000 });
      },
      error => {
        console.error('❌ Erreur lors de l\'envoi des données', error);
        this.snackBar.open('Erreur lors de l\'envoi des données.', 'OK', { duration: 2000 });
      }
    );
  }
}
