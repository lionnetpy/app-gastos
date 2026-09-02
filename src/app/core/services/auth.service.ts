import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Usuario } from '../models';

/**
 * Autenticación con Firebase Auth (proveedor Google).
 * Firebase maneja el OAuth de Google con credenciales verificadas: sin
 * pantallas de consentimiento, usuarios de prueba ni orígenes autorizados.
 * Se usa el flujo por redirección (funciona también en PWA instalada / iOS).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);
  private usuarioSubject = new BehaviorSubject<Usuario | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
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
    });
    getRedirectResult(this.auth).catch(() => undefined);
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

  /** Inicia sesión con Google (redirige y vuelve automáticamente a la app). */
  iniciarSesion(): Promise<void> {
    return signInWithRedirect(this.auth, new GoogleAuthProvider());
  }

  async cerrarSesion(): Promise<void> {
    await signOut(this.auth);
  }
}