import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth, LoginRequest } from '../auth';
import { RostobLogoComponent } from '../../shared/components/rostob-logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RostobLogoComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginData: LoginRequest = {
    email: '',
    password: ''
  };
  
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.loginData.email || !this.loginData.password) {
      this.error = 'Por favor, completa todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        this.loading = false;
        // Verificar que la respuesta tiene la estructura esperada
        if (response && response.user) {
          // El rol viene como string directamente desde el backend
          const roleName = typeof response.user.role === 'string' 
            ? response.user.role 
            : response.user.role?.name || 'customer';
          this.redirectBasedOnRole(roleName);
        } else {
          // Si no hay información de rol, redirigir al dashboard por defecto
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al iniciar sesión';
        console.error('Login error:', error);
      }
    });
  }

  private redirectBasedOnRole(roleName: string) {
    console.log('Redirigiendo usuario con rol:', roleName);
    switch (roleName.toLowerCase()) {
      case 'customer':
      case 'cliente':
        this.router.navigate(['/customer-dashboard']);
        break;
      case 'employee':
      case 'empleado':
        this.router.navigate(['/employee-dashboard']);
        break;
      case 'admin':
      case 'administrador':
        this.router.navigate(['/admin-dashboard']);
        break;
      default:
        console.log('Rol no reconocido, redirigiendo a dashboard genérico');
        this.router.navigate(['/dashboard']);
    }
  }
}
