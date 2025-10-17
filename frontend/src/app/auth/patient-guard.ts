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

  // Helper para obtener el nombre del rol de manera segura
  const getRoleName = (): string => {
    if (!currentUser?.role) return '';
    return typeof currentUser.role === 'string' 
      ? currentUser.role 
      : currentUser.role.name || '';
  };

  const roleName = getRoleName().toLowerCase();

  // Verificar que el usuario sea cliente/customer/patient
  if (roleName === 'customer' || roleName === 'cliente' || roleName === 'patient') {
    return true;
  }

  // Redirigir según el rol del usuario
  if (roleName === 'admin' || roleName === 'administrador') {
    router.navigate(['/admin-dashboard']);
  } else if (roleName === 'employee' || roleName === 'empleado' || roleName === 'doctor') {
    router.navigate(['/employee-dashboard']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};