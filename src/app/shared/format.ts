import { STORAGE_KEYS } from '../core/config';

export function formatearMonto(valor: number): string {
  const moneda = localStorage.getItem(STORAGE_KEYS.currency) ?? 'ARS';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function fechaLocalISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nombreMes(mesIndex: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return meses[mesIndex];
}

export function hoyISO(): string {
  return fechaLocalISO(new Date());
}

export function hoyMes(): string {
  return hoyISO().slice(0, 7);
}