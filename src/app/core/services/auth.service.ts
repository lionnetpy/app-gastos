import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Usuario } from '../models';

/**
 * Autenticación con Firebase Auth (proveedor Google).
 * Flujo: popup de Google y, si el navegador lo bloquea (PWA instalada / iOS),
 * se redirige automáticamente y la app vuelve sola.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);
  private usuarioSubject = new BehaviorSubject<Usuario | null>(null);
  private errorSubject = new BehaviorSubject<string>('');

  constructor() {
    onAuthStateChanged(
      this.auth,
      (user) => {
        if (user) {
          this.usuarioSubject.next({
            uid: user.uid,
            email: user.email ?? '',
            nombre: user.displayName ?? user.email ?? '',
            foto: user.photoURL ?? '',
          });
        } else {
          this.usuarioSubject.next(null);
        }
      },
      (err) => this.errorSubject.next(this.mensajeError(err)),
    );
    getRedirectResult(this.auth)
      .then(() => undefined)
      .catch((err) => this.errorSubject.next(this.mensajeError(err)));
  }

  get usuario(): Observable<Usuario | null> {
    return this.usuarioSubject.asObservable();
  }

  get usuarioActual(): Usuario | null {
    return this.usuarioSubject.value;
  }

  get estaLogueado(): boolean {
    return !!this.usuarioSubject.value;
  }

  get authError(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  /**
   * Inicia sesión con Google. Devuelve true si ya hay sesión activa.
   * Con fallback de redirección, devuelve false (la app vuelve sola al terminar).
   */
  async iniciarSesion(): Promise<boolean> {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(this.auth, provider);
      return true;
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(this.auth, provider);
        return false;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return false;
      }
      throw e;
    }
  }

  async cerrarSesion(): Promise<void> {
    await signOut(this.auth);
  }

  private mensajeError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    switch (code) {
      case 'auth/operation-not-allowed':
        return 'El inicio de sesión con Google no está habilitado en Firebase (Authentication → Sign-in method → Google).';
      case 'auth/unauthorized-domain':
        return 'Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).';
      case 'auth/network-request-failed':
        return 'Sin conexión. Verificá tu internet e intentá de nuevo.';
      default:
        return (err as Error)?.message ?? 'Error de autenticación con Firebase.';
    }
  }
}