import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Categoria, Movimiento, TipoMovimiento } from '../../core/models';
import { DatosService } from '../../core/services/datos.service';
import { formatearMonto, hoyMes } from '../../shared/format';

type FiltroTipo = 'Todos' | TipoMovimiento;

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: './historial.html',
})
export class HistorialPage implements OnInit {
  private datos = inject(DatosService);

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
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id)),
  );

  protected categoriasFiltradas = computed(() =>
    this.categorias().filter((c) => this.filtroTipo() === 'Todos' || c.tipo === this.filtroTipo()),
  );

  protected totales = computed(() => {
    let gastos = 0;
    let ingresos = 0;
    for (const m of this.movimientosFiltrados()) {
      if (m.tipo === 'Salida') gastos += m.monto;
      else ingresos += m.monto;
    }
    return { gastos, ingresos, balance: ingresos - gastos };
  });

  async ngOnInit(): Promise<void> {
    try {
      const [movimientos, categorias] = await Promise.all([
        this.datos.getMovimientos(),
        this.datos.getCategorias(),
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
      await this.datos.eliminarMovimiento(m.id);
      this.movimientos.set(await this.datos.getMovimientos());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo eliminar el movimiento.');
    } finally {
      this.borrando.set(false);
    }
  }

  protected formatearMonto = formatearMonto;
}