import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requiere sesión de Google iniciada; si no, redirige a /config. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.estaLogueado) {
    return true;
  }
  return router.createUrlTree(['/config']);
};