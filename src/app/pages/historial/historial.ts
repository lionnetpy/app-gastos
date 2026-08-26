import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { STORAGE_KEYS } from '../../core/config';
import type { Categoria, Movimiento, TipoMovimiento } from '../../core/models';
import { GoogleSheetsService } from '../../core/services/google-sheets.service';
import { formatearMonto, hoyMes } from '../../shared/format';

type FiltroTipo = 'Todos' | TipoMovimiento;

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: './historial.html',
})
export class HistorialPage implements OnInit {
  private sheets = inject(GoogleSheetsService);
  private hojaId = localStorage.getItem(STORAGE_KEYS.hojaId) ?? '';

  protected movimientos = signal<Movimiento[]>([]);
  protected categorias = signal<Categoria[]>([]);
  protected filtroMes = signal(hoyMes());
  protected filtroTipo = signal<FiltroTipo>('Todos');
  protected filtroCategoria = signal('Todas');
  protected cargando = signal(true);
  protected error = signal('');
  protected borrando = signal(false);

  protected movimientosFiltrados = computed(() =>
    this.movimientos()
      .filter((m) => this.filtroTipo() === 'Todos' || m.tipo === this.filtroTipo())
      .filter((m) => this.filtroCategoria() === 'Todas' || m.categoria === this.filtroCategoria())
      .filter((m) => !this.filtroMes() || m.fecha.startsWith(this.filtroMes()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.rowNumber - a.rowNumber),
  );

  protected categoriasFiltradas = computed(() =>
    this.categorias().filter((c) => this.filtroTipo() === 'Todos' || c.tipo === this.filtroTipo()),
  );

  async ngOnInit(): Promise<void> {
    try {
      const [movimientos, categorias] = await Promise.all([
        this.sheets.getMovimientos(this.hojaId),
        this.sheets.getCategorias(this.hojaId),
      ]);
      this.movimientos.set(movimientos);
      this.categorias.set(categorias);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el historial.');
    } finally {
      this.cargando.set(false);
    }
  }

  async eliminar(m: Movimiento): Promise<void> {
    if (!confirm(`¿Eliminar el movimiento "${m.descripcion || m.categoria}" de ${formatearMonto(m.monto)}?`)) {
      return;
    }
    this.borrando.set(true);
    this.error.set('');
    try {
      await this.sheets.eliminarMovimiento(this.hojaId, m.rowNumber);
      this.movimientos.set(await this.sheets.getMovimientos(this.hojaId));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento.');
    } finally {
      this.borrando.set(false);
    }
  }

  protected formatearMonto = formatearMonto;
}