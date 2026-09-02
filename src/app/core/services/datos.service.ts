import { Injectable } from '@angular/core';
import { getFirestore, addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { CATEGORIAS_PREDETERMINADAS } from '../config';
import type { Categoria, DesgloseCategoria, Movimiento, ResumenMes, TipoMovimiento, Usuario } from '../models';
import { hoyISO } from '../../shared/format';
import { AuthService } from './auth.service';

type SinId<T> = Omit<T, 'id'>;

/**
 * Datos en Firestore, aislados por usuario (reglas de seguridad por UID):
 *   usuarios/{uid}                      → perfil { email, nombre, foto, alta }
 *   usuarios/{uid}/movimientos/{id}     → { fecha, usuario, tipo, categoria, monto, descripcion }
 *   usuarios/{uid}/categorias/{id}      → { tipo, nombre }
 *   usuarios/{uid}/config/principal     → { saldoInicial }
 */
@Injectable({ providedIn: 'root' })
export class DatosService {
  private db = getFirestore();

  constructor(private auth: AuthService) {}

  private uidRequerido(): string {
    const uid = this.auth.usuarioActual?.uid;
    if (!uid) {
      throw new Error('Necesitás iniciar sesión para usar la app.');
    }
    return uid;
  }

  // ---------------------------------------------------------------- perfil

  async registrarUsuario(u: Usuario): Promise<void> {
    await setDoc(
      doc(this.db, `usuarios/${u.uid}`),
      { email: u.email, nombre: u.nombre, foto: u.foto, alta: hoyISO() },
      { merge: true },
    );
  }

  // ---------------------------------------------------------------- movimientos

  async getMovimientos(): Promise<Movimiento[]> {
    const uid = this.uidRequerido();
    const q = query(collection(this.db, `usuarios/${uid}/movimientos`), orderBy('fecha', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SinId<Movimiento>) }));
  }

  async agregarMovimiento(m: SinId<Movimiento>): Promise<void> {
    const uid = this.uidRequerido();
    await addDoc(collection(this.db, `usuarios/${uid}/movimientos`), m);
  }

  async actualizarMovimiento(id: string, m: SinId<Movimiento>): Promise<void> {
    const uid = this.uidRequerido();
    await updateDoc(doc(this.db, `usuarios/${uid}/movimientos/${id}`), { ...m });
  }

  async eliminarMovimiento(id: string): Promise<void> {
    const uid = this.uidRequerido();
    await deleteDoc(doc(this.db, `usuarios/${uid}/movimientos/${id}`));
  }

  // ---------------------------------------------------------------- categorias

  async getCategorias(): Promise<Categoria[]> {
    const uid = this.uidRequerido();
    const snap = await getDocs(collection(this.db, `usuarios/${uid}/categorias`));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SinId<Categoria>) }));
  }

  async agregarCategoria(tipo: TipoMovimiento, nombre: string): Promise<void> {
    const uid = this.uidRequerido();
    await addDoc(collection(this.db, `usuarios/${uid}/categorias`), { tipo, nombre });
  }

  async actualizarCategoria(id: string, nombre: string): Promise<void> {
    const uid = this.uidRequerido();
    await updateDoc(doc(this.db, `usuarios/${uid}/categorias/${id}`), { nombre });
  }

  async eliminarCategoria(id: string): Promise<void> {
    const uid = this.uidRequerido();
    await deleteDoc(doc(this.db, `usuarios/${uid}/categorias/${id}`));
  }

  /** Crea las categorías predeterminadas para un usuario nuevo. */
  async crearCategoriasPredeterminadas(): Promise<void> {
    const uid = this.uidRequerido();
    const snap = await getDocs(collection(this.db, `usuarios/${uid}/categorias`));
    if (snap.size > 0) return;
    const col = collection(this.db, `usuarios/${uid}/categorias`);
    for (const tipo of ['Salida', 'Entrada'] as const) {
      for (const nombre of CATEGORIAS_PREDETERMINADAS[tipo]) {
        await addDoc(col, { tipo, nombre });
      }
    }
  }

  // ---------------------------------------------------------------- config

  async getSaldoInicial(): Promise<number> {
    const uid = this.uidRequerido();
    const snap = await getDoc(doc(this.db, `usuarios/${uid}/config`, 'principal'));
    const data = snap.data() as { saldoInicial?: number } | undefined;
    return Number(data?.saldoInicial ?? 0) || 0;
  }

  async setSaldoInicial(valor: number): Promise<void> {
    const uid = this.uidRequerido();
    await setDoc(doc(this.db, `usuarios/${uid}/config`, 'principal'), { saldoInicial: valor }, { merge: true });
  }

  // ---------------------------------------------------------------- cálculos

  /**
   * Resumen del mes actual:
   * saldoAnterior = saldo inicial + (ingresos - egresos) de meses anteriores.
   */
  calcularResumen(movimientos: Movimiento[], saldoInicial: number, referencia: Date = new Date()): ResumenMes {
    const mesActual = referencia.getFullYear() * 12 + referencia.getMonth();
    const enMesActual = (fecha: string): boolean => {
      const [y, m] = fecha.split('-').map(Number);
      return y * 12 + (m - 1) === mesActual;
    };

    let saldoAnterior = saldoInicial;
    let ingresosMes = 0;
    let gastosMes = 0;

    for (const m of movimientos) {
      if (enMesActual(m.fecha)) {
        if (m.tipo === 'Entrada') ingresosMes += m.monto;
        else gastosMes += m.monto;
      } else {
        if (m.tipo === 'Entrada') saldoAnterior += m.monto;
        else saldoAnterior -= m.monto;
      }
    }

    return {
      saldoAnterior,
      ingresosMes,
      gastosMes,
      saldoActual: saldoAnterior + ingresosMes - gastosMes,
    };
  }

  desglosePorCategoria(movimientos: Movimiento[], tipo: TipoMovimiento, referencia: Date = new Date()): DesgloseCategoria[] {
    const mesActual = referencia.getFullYear() * 12 + referencia.getMonth();
    const acumulado = new Map<string, number>();
    let total = 0;

    for (const m of movimientos) {
      if (m.tipo !== tipo) continue;
      const [y, mes] = m.fecha.split('-').map(Number);
      if (y * 12 + (mes - 1) !== mesActual) continue;
      acumulado.set(m.categoria, (acumulado.get(m.categoria) ?? 0) + m.monto);
      total += m.monto;
    }

    return [...acumulado.entries()]
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);
  }
}