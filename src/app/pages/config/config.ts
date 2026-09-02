import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CONFIG_PENDIENTE } from '../../core/config';
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

  protected usuario = toSignal(this.auth.usuario, { initialValue: null as Usuario | null });
  protected iniciandoSesion = signal(false);
  protected saldoInicial = signal('');
  protected guardandoSaldo = signal(false);
  protected error = signal('');
  protected exito = signal('');
  protected configPendiente = CONFIG_PENDIENTE;
  private usuarioRegistrado = false;

  async ngOnInit(): Promise<void> {
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
    try {
      await this.auth.iniciarSesion();
      // con flujo de redirección, la app vuelve sola; el estado se refleja al regresar
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