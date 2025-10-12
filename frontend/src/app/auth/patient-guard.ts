import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from './auth';

export const patientGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const currentUser = authService.getCurrentUser();
  
  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar que el usuario sea paciente
  if (currentUser.role.name === 'patient' || currentUser.role.id === 3) {
    return true;
  }

  // Redirigir según el rol del usuario
  if (currentUser.role.name === 'admin' || currentUser.role.id === 1) {
    router.navigate(['/admin-dashboard']);
  } else if (currentUser.role.name === 'doctor' || currentUser.role.id === 2) {
    router.navigate(['/doctor-dashboard']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};