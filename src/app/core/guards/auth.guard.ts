import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { STORAGE_KEYS } from '../config';
import { GoogleAuthService } from '../services/google-auth.service';

/** Requiere sesión de Google iniciada y una hoja vinculada; si no, redirige a /config. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(GoogleAuthService);
  const router = inject(Router);
  const hojaId = localStorage.getItem(STORAGE_KEYS.hojaId);

  if (auth.estaLogueado && hojaId) {
    return true;
  }
  return router.createUrlTree(['/config']);
};