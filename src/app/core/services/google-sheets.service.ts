import { Injectable } from '@angular/core';
import { CATEGORIAS_PREDETERMINADAS, NOMBRE_TABLAS } from '../config';
import type { Categoria, DesgloseCategoria, Movimiento, ResumenMes, TipoMovimiento } from '../models';
import { hoyISO } from '../../shared/format';
import { GoogleAuthService } from './google-auth.service';

interface SheetMetadata {
  properties: { title: string; sheetId: number };
}

interface SpreadsheetInfo {
  properties: { title: string };
  sheets: SheetMetadata[];
}

interface ValuesResponse {
  values?: unknown[][];
}

interface AppendResponse {
  updates?: { updatedRange?: string };
}

interface BatchUpdateResponse {
  replies?: unknown[];
}

/**
 * Acceso a Google Sheets API v4 directamente desde el cliente,
 * usando el access token del usuario autenticado.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  constructor(private auth: GoogleAuthService) {}

  private async api<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await this.auth.obtenerAccessToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google Sheets API (${res.status}): ${body.slice(0, 300)}`);
    }
    return (res.status === 204 ? {} : await res.json()) as T;
  }

  private async getMetadatos(hojaId: string): Promise<SpreadsheetInfo> {
    return this.api<SpreadsheetInfo>(
      `https://sheets.googleapis.com/v4/spreadsheets/${hojaId}?fields=properties.title,sheets.properties(sheetId,title)`,
    );
  }

  private async leerRango(hojaId: string, rango: string): Promise<unknown[][]> {
    const res = await this.api<ValuesResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${hojaId}/values/${encodeURIComponent(rango)}`,
    );
    return res.values ?? [];
  }

private async escribirRango(hojaId: string, rango: string, valores: unknown[][]): Promise<void> {
    await this.api(`https://sheets.googleapis.com/v4/spreadsheets/${hojaId}/values/${encodeURIComponent(rango)}`, {
      method: 'PUT',
      body: JSON.stringify({
        range: rango,
        majorDimension: 'ROWS',
        values: valores,
      }),
    });
  }

  private async appendRango(hojaId: string, rango: string, valores: unknown[][]): Promise<void> {
    await this.api<AppendResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${hojaId}/values/${encodeURIComponent(rango)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({
          range: rango,
          majorDimension: 'ROWS',
          values: valores,
        }),
      },
    );
  }

  private async batchUpdate(hojaId: string, requests: unknown[]): Promise<void> {
    await this.api<BatchUpdateResponse>(`https://sheets.googleapis.com/v4/spreadsheets/${hojaId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  // ---------------------------------------------------------------- estructura

  /**
   * Valida que la hoja tenga la estructura esperada (pestañas Movimientos,
   * Categorias, Usuarios y Config) y la crea automáticamente si falta algo.
   */
  async validarOCrearEstructura(hojaId: string): Promise<void> {
    const meta = await this.getMetadatos(hojaId);
    const tabsExistentes = meta.sheets.map((s) => s.properties.title);

    const crearTabs: unknown[] = [];
    for (const tab of [
      NOMBRE_TABLAS.movimientos,
      NOMBRE_TABLAS.categorias,
      NOMBRE_TABLAS.usuarios,
      NOMBRE_TABLAS.config,
    ]) {
      if (!tabsExistentes.includes(tab)) {
        crearTabs.push({ addSheet: { properties: { title: tab } } });
      }
    }
    if (crearTabs.length > 0) {
      await this.batchUpdate(hojaId, crearTabs);
    }

    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.movimientos}!A1:F1`, [
      ['Fecha', 'Usuario', 'Tipo', 'Categoría', 'Monto', 'Descripción'],
    ]);
    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.categorias}!A1:B1`, [['Tipo', 'Nombre']]);
    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.usuarios}!A1:B1`, [['Correo', 'Fecha de alta']]);
    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.config}!A1:B1`, [['Clave', 'Valor']]);

    const categorias = await this.leerRango(hojaId, `${NOMBRE_TABLAS.categorias}!A2:B`);
    if (categorias.length === 0) {
      const filas: string[][] = [];
      for (const tipo of ['Salida', 'Entrada'] as const) {
        for (const nombre of CATEGORIAS_PREDETERMINADAS[tipo]) {
          filas.push([tipo, nombre]);
        }
      }
      await this.appendRango(hojaId, `${NOMBRE_TABLAS.categorias}!A2:B`, filas);
    }

    const config = await this.leerRango(hojaId, `${NOMBRE_TABLAS.config}!A2:B`);
    if (!config.some((f) => f[0] === 'Saldo inicial')) {
      await this.appendRango(hojaId, `${NOMBRE_TABLAS.config}!A2:B`, [['Saldo inicial', 0]]);
    }
  }

  /** Obtiene el ID de la pestaña por nombre (necesario para borrar filas). */
  private async getSheetId(hojaId: string, tab: string): Promise<number> {
    const meta = await this.getMetadatos(hojaId);
    const sheet = meta.sheets.find((s) => s.properties.title === tab);
    if (!sheet) {
      throw new Error(`La pestaña "${tab}" no existe en la hoja.`);
    }
    return sheet.properties.sheetId;
  }

  // ---------------------------------------------------------------- usuario

  /** Registra el correo en la pestaña Usuarios si no está ya registrado. */
  async registrarUsuario(hojaId: string, email: string): Promise<void> {
    const filas = await this.leerRango(hojaId, `${NOMBRE_TABLAS.usuarios}!A2:A`);
    const yaRegistrado = filas.some((f) => String(f[0] ?? '').toLowerCase() === email.toLowerCase());
    if (!yaRegistrado) {
      await this.appendRango(hojaId, `${NOMBRE_TABLAS.usuarios}!A2:B`, [[email, hoyISO()]]);
    }
  }

  // ---------------------------------------------------------------- movimientos

  async getMovimientos(hojaId: string): Promise<Movimiento[]> {
    const filas = await this.leerRango(hojaId, `${NOMBRE_TABLAS.movimientos}!A2:F`);
    const movimientos: Movimiento[] = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (!f[0]) continue;
      const tipo = String(f[2] ?? '') as TipoMovimiento;
      const monto = Number(f[4]);
      if (tipo !== 'Entrada' && tipo !== 'Salida') continue;
      if (Number.isNaN(monto)) continue;
      movimientos.push({
        rowNumber: i,
        fecha: String(f[0]),
        usuario: String(f[1] ?? ''),
        tipo,
        categoria: String(f[3] ?? ''),
        monto,
        descripcion: String(f[5] ?? ''),
      });
    }
    return movimientos;
  }

  async agregarMovimiento(hojaId: string, m: Omit<Movimiento, 'rowNumber'>): Promise<void> {
    await this.appendRango(hojaId, `${NOMBRE_TABLAS.movimientos}!A2:F`, [
      [m.fecha, m.usuario, m.tipo, m.categoria, m.monto, m.descripcion],
    ]);
  }

  async actualizarMovimiento(hojaId: string, rowNumber: number, m: Omit<Movimiento, 'rowNumber'>): Promise<void> {
    const fila = rowNumber + 2;
    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.movimientos}!A${fila}:F${fila}`, [
      [m.fecha, m.usuario, m.tipo, m.categoria, m.monto, m.descripcion],
    ]);
  }

  async eliminarMovimiento(hojaId: string, rowNumber: number): Promise<void> {
    const sheetId = await this.getSheetId(hojaId, NOMBRE_TABLAS.movimientos);
    await this.batchUpdate(hojaId, [
      {
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowNumber + 1, endIndex: rowNumber + 2 },
        },
      },
    ]);
  }

  // ---------------------------------------------------------------- categorias

  async getCategorias(hojaId: string): Promise<Categoria[]> {
    const filas = await this.leerRango(hojaId, `${NOMBRE_TABLAS.categorias}!A2:B`);
    const categorias: Categoria[] = [];
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (!f[0] || !f[1]) continue;
      const tipo = String(f[0]) as TipoMovimiento;
      if (tipo !== 'Entrada' && tipo !== 'Salida') continue;
      categorias.push({ rowNumber: i, tipo, nombre: String(f[1]) });
    }
    return categorias;
  }

  async agregarCategoria(hojaId: string, tipo: TipoMovimiento, nombre: string): Promise<void> {
    await this.appendRango(hojaId, `${NOMBRE_TABLAS.categorias}!A2:B`, [[tipo, nombre]]);
  }

  async actualizarCategoria(hojaId: string, rowNumber: number, nombre: string): Promise<void> {
    const fila = rowNumber + 2;
    await this.escribirRango(hojaId, `${NOMBRE_TABLAS.categorias}!B${fila}:B${fila}`, [[nombre]]);
  }

  async eliminarCategoria(hojaId: string, rowNumber: number): Promise<void> {
    const sheetId = await this.getSheetId(hojaId, NOMBRE_TABLAS.categorias);
    await this.batchUpdate(hojaId, [
      {
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowNumber + 1, endIndex: rowNumber + 2 },
        },
      },
    ]);
  }

  // ---------------------------------------------------------------- config

  async getConfig(hojaId: string): Promise<Map<string, string>> {
    const filas = await this.leerRango(hojaId, `${NOMBRE_TABLAS.config}!A2:B`);
    const mapa = new Map<string, string>();
    for (const f of filas) {
      if (f[0]) mapa.set(String(f[0]), String(f[1] ?? ''));
    }
    return mapa;
  }

  async setConfig(hojaId: string, clave: string, valor: string | number): Promise<void> {
    const config = await this.getConfig(hojaId);
    if (config.has(clave)) {
      const filas = await this.leerRango(hojaId, `${NOMBRE_TABLAS.config}!A2:B`);
      const indice = filas.findIndex((f) => f[0] === clave);
      if (indice >= 0) {
        await this.escribirRango(hojaId, `${NOMBRE_TABLAS.config}!B${indice + 2}:B${indice + 2}`, [[valor]]);
      }
    } else {
      await this.appendRango(hojaId, `${NOMBRE_TABLAS.config}!A2:B`, [[clave, valor]]);
    }
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