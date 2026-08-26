import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { STORAGE_KEYS } from '../../core/config';
import type { Categoria, TipoMovimiento } from '../../core/models';
import { GoogleSheetsService } from '../../core/services/google-sheets.service';

@Component({
  imports: [FormsModule],
  templateUrl: './categorias.html',
})
export class CategoriasPage implements OnInit {
  private sheets = inject(GoogleSheetsService);
  private hojaId = localStorage.getItem(STORAGE_KEYS.hojaId) ?? '';

  protected tab = signal<TipoMovimiento>('Salida');
  protected categoriasSalida = signal<Categoria[]>([]);
  protected categoriasEntrada = signal<Categoria[]>([]);
  protected nuevoNombre = signal('');
  protected editandoRow = signal<number | null>(null);
  protected editandoNombre = signal('');
  protected trabajando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  protected categoriasActuales = computed(() =>
    this.tab() === 'Salida' ? this.categoriasSalida() : this.categoriasEntrada(),
  );

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    try {
      const todas = await this.sheets.getCategorias(this.hojaId);
      this.categoriasSalida.set(todas.filter((c) => c.tipo === 'Salida'));
      this.categoriasEntrada.set(todas.filter((c) => c.tipo === 'Entrada'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las categorías.');
    }
  }

  async agregar(): Promise<void> {
    const nombre = this.nuevoNombre().trim();
    if (!nombre) return;
    if (this.categoriasActuales().some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      this.error.set('Esa categoría ya existe.');
      return;
    }
    this.trabajando.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      await this.sheets.agregarCategoria(this.hojaId, this.tab(), nombre);
      this.nuevoNombre.set('');
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo agregar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }

  empezarEdicion(c: Categoria): void {
    this.editandoRow.set(c.rowNumber);
    this.editandoNombre.set(c.nombre);
  }

  async guardarEdicion(c: Categoria): Promise<void> {
    const nombre = this.editandoNombre().trim();
    if (!nombre) {
      this.cancelarEdicion();
      return;
    }
    this.trabajando.set(true);
    this.error.set('');
    try {
      await this.sheets.actualizarCategoria(this.hojaId, c.rowNumber, nombre);
      this.editandoRow.set(null);
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo actualizar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }

  cancelarEdicion(): void {
    this.editandoRow.set(null);
  }

  async eliminar(c: Categoria): Promise<void> {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    this.trabajando.set(true);
    this.error.set('');
    try {
      await this.sheets.eliminarCategoria(this.hojaId, c.rowNumber);
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo eliminar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }
}