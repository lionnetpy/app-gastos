import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GOOGLE_SCOPES, STORAGE_KEYS } from '../config';
import type { Usuario } from '../models';

/**
 * Autenticación con Google Identity Services (GIS).
 * Un solo flujo: al hacer clic en "Iniciar sesión con Google" se pide un
 * access_token con los scopes de Sheets/Drive (consentimiento único), y con
 * ese token se obtiene el perfil del usuario (correo, nombre, foto) desde
 * el endpoint userinfo. No se guardan contraseñas.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private scriptsLoaded: Promise<void>;
  private pendiente: { resolve: (token: string) => void; reject: (err: unknown) => void } | null = null;
  private usuarioSubject = new BehaviorSubject<Usuario | null>(this.cargarUsuarioLocal());

  constructor() {
    this.scriptsLoaded = this.cargarScriptGIS();
  }

  get usuario(): Observable<Usuario | null> {
    return this.usuarioSubject.asObservable();
  }

  get usuarioActual(): Usuario | null {
    return this.usuarioSubject.value;
  }

  get estaLogueado(): boolean {
    return !!this.usuarioActual;
  }

  private cargarScriptGIS(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.accounts) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar la librería de Google Identity Services.'));
      document.head.appendChild(script);
    });
  }

  private cargarUsuarioLocal(): Usuario | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.usuario);
      return raw ? (JSON.parse(raw) as Usuario) : null;
    } catch {
      return null;
    }
  }

  private obtenerTokenClient(): google.accounts.oauth2.TokenClient {
    if (!this.tokenClient) {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: GOOGLE_SCOPES,
        callback: (resp) => this.manejarRespuestaToken(resp),
        error_callback: (err) => {
          if (this.pendiente) {
            this.pendiente.reject(new Error(err?.message ?? 'Error al iniciar sesión con Google.'));
            this.pendiente = null;
          }
        },
      });
    }
    return this.tokenClient;
  }

  private manejarRespuestaToken(resp: google.accounts.oauth2.TokenResponse): void {
    if (this.pendiente) {
      if (resp.error) {
        this.pendiente.reject(new Error(resp.error_description ?? resp.error));
      } else {
        this.accessToken = resp.access_token;
        this.tokenExpiry = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
        this.pendiente.resolve(this.accessToken);
      }
      this.pendiente = null;
    }
  }

  /**
   * Devuelve un access token vigente. Si está vencido o no existe, intenta
   * obtener uno; con prompt 'consent' siempre muestra el consentimiento
   * de Google (usado en el botón de login) y con prompt '' intenta renovar
   * silenciosamente (usado en llamadas a la API).
   */
  async obtenerAccessToken(prompt: '' | 'consent' = ''): Promise<string> {
    await this.scriptsLoaded;
    if (environment.googleClientId.includes('PONER_AQUI')) {
      throw new Error(
        'La app aún no está configurada con Google. Seguí los pasos de la sección "Configuración en Google Cloud" del README y pegá tu Client ID y API Key en src/environments/environment.ts.',
      );
    }
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }
    return new Promise<string>((resolve, reject) => {
      this.pendiente = { resolve, reject };
      try {
        this.obtenerTokenClient().requestAccessToken({ prompt });
      } catch (err) {
        this.pendiente = null;
        reject(err);
      }
    });
  }

  /** Inicia sesión (consentimiento de Google) y guarda el perfil del usuario. */
  async iniciarSesion(): Promise<Usuario> {
    const token = await this.obtenerAccessToken('consent');
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('No se pudo obtener el perfil de Google.');
    }
    const info = (await res.json()) as { email: string; name: string; picture: string };
    const usuario: Usuario = {
      email: info.email,
      nombre: info.name ?? info.email,
      foto: info.picture ?? '',
    };
    localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(usuario));
    this.usuarioSubject.next(usuario);
    return usuario;
  }

  /** Cierra sesión: revoca el token y limpia el estado local. */
  async cerrarSesion(): Promise<void> {
    if (this.accessToken) {
      try {
        google.accounts.oauth2.revoke(this.accessToken, () => undefined);
      } catch {
        // el token puede estar vencido; se ignora
      }
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.usuarioSubject.next(null);
    localStorage.removeItem(STORAGE_KEYS.usuario);
  }
}