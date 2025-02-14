import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WarehouseDesignerComponent } from './warehouse-designer/warehouse-designer.component'; // Import du component
import { HomeComponent } from './home/home.component';
import { MappingComponent } from './mapping/mapping.component';

const routes: Routes = [
  { path: '', component: HomeComponent },  // Page d'accueil par défaut
  { path: 'warehouse-designer', component: WarehouseDesignerComponent },
  { path: 'mapping', component: MappingComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
