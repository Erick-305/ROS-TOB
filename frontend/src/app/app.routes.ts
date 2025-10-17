import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { VerifyEmail } from './auth/verify-email/verify-email';
import { Dashboard } from './dashboard/dashboard';
import { AdminDashboard } from './dashboards/admin-dashboard/admin-dashboard';
import { EmployeeDashboard } from './dashboards/employee-dashboard/employee-dashboard';
import { CustomerDashboard } from './dashboards/customer-dashboard/customer-dashboard';
import { authGuard } from './auth/auth-guard';

export const routes: Routes = [
  // Rutas públicas (sin autenticación)
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'verify-email', component: VerifyEmail },
  
  // Rutas protegidas específicas por rol
  { 
    path: 'admin-dashboard', 
    component: AdminDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'employee-dashboard', 
    component: EmployeeDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'customer-dashboard', 
    component: CustomerDashboard,
    canActivate: [authGuard]
  },
  
  // Dashboard genérico (para compatibilidad)
  { 
    path: 'dashboard', 
    component: Dashboard,
    canActivate: [authGuard]
  },
  
  // Redirecciones basadas en roles
  { path: 'patient', redirectTo: '/patient-dashboard', pathMatch: 'full' },
  { path: 'doctor', redirectTo: '/doctor-dashboard', pathMatch: 'full' },
  { path: 'admin', redirectTo: '/admin-dashboard', pathMatch: 'full' },
  
  // Redirecciones
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
