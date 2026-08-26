import { environment } from '../../environments/environment';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export const STORAGE_KEYS = {
  hojaId: 'app_gastos.hojaId',
  hojaNombre: 'app_gastos.hojaNombre',
  usuario: 'app_gastos.usuario',
  currency: 'app_gastos.currency',
} as const;

export const NOMBRE_TABLAS = {
  movimientos: 'Movimientos',
  categorias: 'Categorias',
  usuarios: 'Usuarios',
  config: 'Config',
} as const;

export const CATEGORIAS_PREDETERMINADAS = {
  Salida: ['Casa', 'Auto', 'Alquiler', 'Luz', 'Agua', 'Comida', 'Recreación', 'Otros'],
  Entrada: ['Sueldo', 'Ingreso extra', 'Devolución', 'Otros'],
} as const;

/** true si faltan las credenciales reales de Google Cloud en environment.ts. */
export const CONFIG_PENDIENTE =
  environment.googleClientId.includes('PONER_AQUI') || environment.googleApiKey.includes('PONER_AQUI');