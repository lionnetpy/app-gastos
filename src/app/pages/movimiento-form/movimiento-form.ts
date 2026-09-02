import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Categoria, Movimiento, TipoMovimiento } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { DatosService } from '../../core/services/datos.service';
import { hoyISO } from '../../shared/format';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './movimiento-form.html',
})
export class MovimientoFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private datos = inject(DatosService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  protected form = new FormGroup({
    tipo: new FormControl<TipoMovimiento>('Salida', Validators.required),
    categoria: new FormControl('', Validators.required),
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fecha: new FormControl(hoyISO(), Validators.required),
    descripcion: new FormControl(''),
  });

  protected categorias = signal<Categoria[]>([]);
  protected esEdicion = signal(false);
  protected guardando = signal(false);
  protected error = signal('');
  protected exito = signal(false);

  protected tipoSeleccionado = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: 'Salida' as TipoMovimiento,
  });

  protected categoriasFiltradas = computed(() =>
    this.categorias().filter((c) => c.tipo === this.tipoSeleccionado()),
  );

  private idEdicion: string | null = null;

  async ngOnInit(): Promise<void> {
    const tipo = this.route.snapshot.queryParamMap.get('tipo');
    if (tipo === 'Entrada' || tipo === 'Salida') {
      this.form.patchValue({ tipo });
    }
    const id = this.route.snapshot.queryParamMap.get('id');
    try {
      this.categorias.set(await this.datos.getCategorias());
      if (id) {
        const movimientos = await this.datos.getMovimientos();
        const movimiento = movimientos.find((m) => m.id === id);
        if (movimiento) {
          this.idEdicion = id;
          this.esEdicion.set(true);
          this.form.patchValue({
            tipo: movimiento.tipo,
            categoria: movimiento.categoria,
            monto: movimiento.monto,
            fecha: movimiento.fecha,
            descripcion: movimiento.descripcion,
          });
        }
      }
      this.ajustarCategoria();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudieron cargar las categorías.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** Al cambiar el tipo, si la categoría elegida no corresponde se limpia. */
  protected ajustarCategoria(): void {
    const tipo = this.tipoSeleccionado();
    const categoria = this.form.get('categoria')?.value;
    if (categoria && !this.categorias().some((c) => c.tipo === tipo && c.nombre === categoria)) {
      this.form.patchValue({ categoria: '' });
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const movimiento: Omit<Movimiento, 'id'> = {
      fecha: v.fecha ?? hoyISO(),
      usuario: this.auth.usuarioActual?.email ?? '',
      tipo: (v.tipo ?? 'Salida') as TipoMovimiento,
      categoria: v.categoria ?? '',
      monto: Number(v.monto) || 0,
      descripcion: v.descripcion ?? '',
    };

    this.guardando.set(true);
    this.error.set('');
    try {
      if (this.idEdicion) {
        await this.datos.actualizarMovimiento(this.idEdicion, movimiento);
      } else {
        await this.datos.agregarMovimiento(movimiento);
      }
      this.exito.set(true);
      this.cdr.markForCheck();
      setTimeout(() => this.router.navigate(['/']), 600);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el movimiento.');
    } finally {
      this.guardando.set(false);
      this.cdr.markForCheck();
    }
  }
}