import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseDesignerComponent } from './warehouse-designer.component';

describe('WarehouseDesignerComponent', () => {
  let component: WarehouseDesignerComponent;
  let fixture: ComponentFixture<WarehouseDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WarehouseDesignerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WarehouseDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
