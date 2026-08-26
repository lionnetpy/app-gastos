import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { CategoriasPage } from './pages/categorias/categorias';
import { ConfigPage } from './pages/config/config';
import { DashboardPage } from './pages/dashboard/dashboard';
import { HistorialPage } from './pages/historial/historial';
import { MovimientoFormPage } from './pages/movimiento-form/movimiento-form';

export const routes: Routes = [
  { path: 'config', component: ConfigPage },
  { path: '', component: DashboardPage, canActivate: [authGuard] },
  { path: 'nuevo', component: MovimientoFormPage, canActivate: [authGuard] },
  { path: 'historial', component: HistorialPage, canActivate: [authGuard] },
  { path: 'categorias', component: CategoriasPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];