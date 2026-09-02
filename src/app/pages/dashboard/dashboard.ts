import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DesgloseCategoria, ResumenMes } from '../../core/models';
import { DatosService } from '../../core/services/datos.service';
import { formatearMonto, nombreMes } from '../../shared/format';

@Component({
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class DashboardPage implements OnInit {
  private datos = inject(DatosService);

  protected resumen = signal<ResumenMes | null>(null);
  protected desgloseSalida = signal<DesgloseCategoria[]>([]);
  protected desgloseEntrada = signal<DesgloseCategoria[]>([]);
  protected mesLabel = signal('');
  protected cargando = signal(true);
  protected error = signal('');

  protected saldoPositivo = computed(() => (this.resumen()?.saldoActual ?? 0) >= 0);
  protected anteriorPositivo = computed(() => (this.resumen()?.saldoAnterior ?? 0) >= 0);

  async ngOnInit(): Promise<void> {
    try {
      const [movimientos, saldoInicial] = await Promise.all([
        this.datos.getMovimientos(),
        this.datos.getSaldoInicial(),
      ]);
      const ahora = new Date();
      this.resumen.set(this.datos.calcularResumen(movimientos, saldoInicial, ahora));
      this.desgloseSalida.set(this.datos.desglosePorCategoria(movimientos, 'Salida', ahora));
      this.desgloseEntrada.set(this.datos.desglosePorCategoria(movimientos, 'Entrada', ahora));
      this.mesLabel.set(`${nombreMes(ahora.getMonth())} ${ahora.getFullYear()}`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected formatearMonto = formatearMonto;
  protected trackCat = (_: number, c: DesgloseCategoria) => c.categoria;
}