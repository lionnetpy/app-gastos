import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GoogleAuthService } from './google-auth.service';

declare const gapi:
  | { load: (lib: string, opts: { callback: () => void }) => void }
  | undefined;

interface HojaSeleccionada {
  id: string;
  nombre: string;
}

/**
 * Google Picker API: abre el selector nativo de Google Drive para que el
 * usuario elija su hoja de cálculo visualmente (sin copiar/pegar IDs).
 */
@Injectable({ providedIn: 'root' })
export class GooglePickerService {
  private gapiCargado: Promise<void> | null = null;

  constructor(private auth: GoogleAuthService) {}

  private cargarGapi(): Promise<void> {
    if (this.gapiCargado) return this.gapiCargado;
    this.gapiCargado = new Promise<void>((resolve, reject) => {
      if (typeof gapi !== 'undefined') {
        gapi.load('picker', { callback: () => resolve() });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => gapi!.load('picker', { callback: () => resolve() });
      script.onerror = () => {
        this.gapiCargado = null;
        reject(new Error('No se pudo cargar Google Picker.'));
      };
      document.head.appendChild(script);
    });
    return this.gapiCargado;
  }

  /** Abre el Picker filtrado a hojas de cálculo y devuelve la elegida. */
  async seleccionarHoja(): Promise<HojaSeleccionada> {
    if (environment.googleApiKey.includes('PONER_AQUI')) {
      throw new Error(
        'La app aún no está configurada con Google. Pegá tu API Key en src/environments/environment.ts (ver README, sección "Configuración en Google Cloud").',
      );
    }
    const token = await this.auth.obtenerAccessToken();
    await this.cargarGapi();

    return new Promise<HojaSeleccionada>((resolve, reject) => {
      const vista = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes('application/vnd.google-apps.spreadsheet');

      const picker = new google.picker.PickerBuilder()
        .addView(vista)
        .setOAuthToken(token)
        .setDeveloperKey(environment.googleApiKey)
        .setTitle('Selecciona tu hoja de gastos')
        .setCallback((resp: google.picker.ResponseObject) => {
          const accion = resp[google.picker.Response.ACTION];
          if (accion === google.picker.Action.PICKED && resp[google.picker.Response.DOCUMENTS]?.length) {
            const doc = resp[google.picker.Response.DOCUMENTS]![0];
            resolve({
              id: doc[google.picker.Document.ID],
              nombre: doc[google.picker.Document.NAME] ?? 'Hoja sin nombre',
            });
          } else if (accion === google.picker.Action.CANCEL) {
            reject(new Error('Selección cancelada.'));
          }
        })
        .build();

      picker.setVisible(true);
    });
  }
}