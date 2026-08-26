export interface Usuario {
  email: string;
  nombre: string;
  foto: string;
}

export type TipoMovimiento = 'Entrada' | 'Salida';

export interface Movimiento {
  rowNumber: number;
  fecha: string;
  usuario: string;
  tipo: TipoMovimiento;
  categoria: string;
  monto: number;
  descripcion: string;
}

export interface Categoria {
  rowNumber: number;
  tipo: TipoMovimiento;
  nombre: string;
}

export interface ResumenMes {
  saldoAnterior: number;
  ingresosMes: number;
  gastosMes: number;
  saldoActual: number;
}

export interface DesgloseCategoria {
  categoria: string;
  monto: number;
  porcentaje: number;
}

export interface HojaVinculada {
  id: string;
  nombre: string;
}