import { Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STORAGE_KEYS, CONFIG_PENDIENTE } from '../../core/config';
import type { HojaVinculada, Usuario } from '../../core/models';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { GooglePickerService } from '../../core/services/google-picker.service';
import { GoogleSheetsService } from '../../core/services/google-sheets.service';

@Component({
  templateUrl: './config.html',
})
export class ConfigPage implements OnInit {
  private auth = inject(GoogleAuthService);
  private picker = inject(GooglePickerService);
  private sheets = inject(GoogleSheetsService);
  private router = inject(Router);

  protected usuario = toSignal(this.auth.usuario, { initialValue: null as Usuario | null });
  protected hoja = signal<HojaVinculada | null>(null);
  protected iniciandoSesion = signal(false);
  protected vinculando = signal(false);
  protected error = signal('');
  protected exito = signal('');
  protected configPendiente = CONFIG_PENDIENTE;

  ngOnInit(): void {
    const hojaId = localStorage.getItem(STORAGE_KEYS.hojaId);
    if (hojaId) {
      this.hoja.set({ id: hojaId, nombre: localStorage.getItem(STORAGE_KEYS.hojaNombre) ?? 'Hoja vinculada' });
    }
  }

  async iniciarSesion(): Promise<void> {
    this.iniciandoSesion.set(true);
    this.error.set('');
    try {
      await this.auth.iniciarSesion();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo iniciar sesión.';
      if (!msg.includes('cancel')) this.error.set(msg);
    } finally {
      this.iniciandoSesion.set(false);
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.cerrarSesion();
    this.hoja.set(null);
    localStorage.removeItem(STORAGE_KEYS.hojaId);
    localStorage.removeItem(STORAGE_KEYS.hojaNombre);
  }

  async vincularHoja(): Promise<void> {
    this.vinculando.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      const seleccionada = await this.picker.seleccionarHoja();
      await this.sheets.validarOCrearEstructura(seleccionada.id);
      const usuario = this.usuario();
      if (usuario) {
        await this.sheets.registrarUsuario(seleccionada.id, usuario.email);
      }
      this.hoja.set(seleccionada);
      localStorage.setItem(STORAGE_KEYS.hojaId, seleccionada.id);
      localStorage.setItem(STORAGE_KEYS.hojaNombre, seleccionada.nombre);
      this.exito.set(`Hoja "${seleccionada.nombre}" vinculada y lista para usar.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo vincular la hoja.';
      if (!msg.includes('cancel')) this.error.set(msg);
    } finally {
      this.vinculando.set(false);
    }
  }

  desvincular(): void {
    this.hoja.set(null);
    localStorage.removeItem(STORAGE_KEYS.hojaId);
    localStorage.removeItem(STORAGE_KEYS.hojaNombre);
  }

  irAlInicio(): void {
    this.router.navigate(['/']);
  }
}