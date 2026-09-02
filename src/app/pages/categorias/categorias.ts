import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Categoria, TipoMovimiento } from '../../core/models';
import { DatosService } from '../../core/services/datos.service';

@Component({
  imports: [FormsModule],
  templateUrl: './categorias.html',
})
export class CategoriasPage implements OnInit {
  private datos = inject(DatosService);

  protected tab = signal<TipoMovimiento>('Salida');
  protected categoriasSalida = signal<Categoria[]>([]);
  protected categoriasEntrada = signal<Categoria[]>([]);
  protected nuevoNombre = signal('');
  protected editandoId = signal<string | null>(null);
  protected editandoNombre = signal('');
  protected trabajando = signal(false);
  protected error = signal('');

  protected categoriasActuales = computed(() =>
    this.tab() === 'Salida' ? this.categoriasSalida() : this.categoriasEntrada(),
  );

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    try {
      const todas = await this.datos.getCategorias();
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
    try {
      await this.datos.agregarCategoria(this.tab(), nombre);
      this.nuevoNombre.set('');
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo agregar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }

  empezarEdicion(c: Categoria): void {
    this.editandoId.set(c.id);
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
      await this.datos.actualizarCategoria(c.id, nombre);
      this.editandoId.set(null);
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo actualizar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  async eliminar(c: Categoria): Promise<void> {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    this.trabajando.set(true);
    this.error.set('');
    try {
      await this.datos.eliminarCategoria(c.id);
      await this.recargar();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo eliminar la categoría.');
    } finally {
      this.trabajando.set(false);
    }
  }
}