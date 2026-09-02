import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CONFIG_PENDIENTE, STORAGE_KEYS } from '../../core/config';
import type { Usuario } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DatosService } from '../../core/services/datos.service';

@Component({
  imports: [FormsModule],
  templateUrl: './config.html',
})
export class ConfigPage implements OnInit {
  private auth = inject(AuthService);
  private datos = inject(DatosService);
  private router = inject(Router);

  protected usuario = toSignal(this.auth.usuario, { initialValue: null as Usuario | null });
  protected authError = toSignal(this.auth.authError, { initialValue: '' });
  protected iniciandoSesion = signal(false);
  protected saldoInicial = signal('');
  protected guardandoSaldo = signal(false);
  protected error = signal('');
  protected exito = signal('');
  protected configPendiente = CONFIG_PENDIENTE;
  private usuarioRegistrado = false;

  async ngOnInit(): Promise<void> {
    // Si venimos de un login por redirección, la app vuelve sola a esta página.
    if (sessionStorage.getItem(STORAGE_KEYS.loginPendiente)) {
      sessionStorage.removeItem(STORAGE_KEYS.loginPendiente);
      const usuario = this.usuario();
      if (usuario) {
        await this.inicializarParaUsuario(usuario);
        this.router.navigate(['/']);
        return;
      }
    }

    const usuario = this.usuario();
    if (usuario && !this.usuarioRegistrado) {
      await this.inicializarParaUsuario(usuario);
    }
  }

  private async inicializarParaUsuario(usuario: Usuario): Promise<void> {
    this.usuarioRegistrado = true;
    try {
      await this.datos.registrarUsuario(usuario);
      await this.datos.crearCategoriasPredeterminadas();
      this.saldoInicial.set(String(await this.datos.getSaldoInicial()));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron inicializar los datos.');
    }
  }

  async iniciarSesion(): Promise<void> {
    this.iniciandoSesion.set(true);
    this.error.set('');
    sessionStorage.setItem(STORAGE_KEYS.loginPendiente, '1');
    try {
      const sesionActiva = await this.auth.iniciarSesion();
      const usuario = this.usuario();
      if (sesionActiva && usuario) {
        await this.inicializarParaUsuario(usuario);
        this.router.navigate(['/']);
      }
    } catch (e) {
      sessionStorage.removeItem(STORAGE_KEYS.loginPendiente);
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar sesión con Google.';
      this.error.set(msg);
    } finally {
      this.iniciandoSesion.set(false);
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    this.saldoInicial.set('');
    this.exito.set('');
  }

  async guardarSaldoInicial(): Promise<void> {
    const valor = Number(this.saldoInicial());
    if (Number.isNaN(valor)) {
      this.error.set('Ingresá un número válido para el saldo inicial.');
      return;
    }
    this.guardandoSaldo.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      await this.datos.setSaldoInicial(valor);
      this.exito.set('Saldo inicial guardado.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el saldo inicial.');
    } finally {
      this.guardandoSaldo.set(false);
    }
  }
}