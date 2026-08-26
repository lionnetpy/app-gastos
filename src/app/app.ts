import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { Usuario } from './core/models';
import { GoogleAuthService } from './core/services/google-auth.service';

interface NavItem {
  label: string;
  link: string;
  exact: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  private auth = inject(GoogleAuthService);

  protected usuario = toSignal(this.auth.usuario, { initialValue: null as Usuario | null });

  protected navItems: NavItem[] = [
    { label: 'Inicio', link: '/', exact: true },
    { label: 'Nuevo', link: '/nuevo', exact: false },
    { label: 'Historial', link: '/historial', exact: false },
    { label: 'Categorías', link: '/categorias', exact: false },
    { label: 'Config', link: '/config', exact: false },
  ];
}