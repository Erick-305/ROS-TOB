import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { VerifyEmail } from './auth/verify-email/verify-email';
import { Dashboard } from './dashboard/dashboard';
import { AdminDashboard } from './dashboards/admin-dashboard/admin-dashboard';
import { DoctorDashboard } from './dashboards/doctor-dashboard/doctor-dashboard';
import { PatientDashboard } from './dashboards/patient-dashboard/patient-dashboard';
import { Appointment } from './dashboard/appointment/appointment';
import { authGuard } from './auth/auth-guard';
import { patientGuard } from './auth/patient-guard';

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
    path: 'doctor-dashboard', 
    component: DoctorDashboard,
    canActivate: [authGuard]
  },
  { 
    path: 'patient-dashboard', 
    component: PatientDashboard,
    canActivate: [patientGuard]
  },
  
  // Ruta de agendamiento de citas
  { 
    path: 'appointment', 
    component: Appointment,
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
