import { environment } from '../../environments/environment';

export const STORAGE_KEYS = {
  currency: 'app_gastos.currency',
  loginPendiente: 'app_gastos.login_pendiente',
} as const;

export const CATEGORIAS_PREDETERMINADAS = {
  Salida: ['Casa', 'Auto', 'Alquiler', 'Luz', 'Agua', 'Comida', 'Recreación', 'Otros'],
  Entrada: ['Sueldo', 'Ingreso extra', 'Devolución', 'Otros'],
} as const;

/** true si faltan las credenciales reales de Firebase en environment.ts. */
export const CONFIG_PENDIENTE =
  environment.firebase.apiKey.includes('PONER_AQUI') || environment.firebase.projectId.includes('PONER_AQUI');