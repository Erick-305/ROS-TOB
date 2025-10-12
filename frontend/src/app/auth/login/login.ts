import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth, LoginRequest } from '../auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
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
        // Redirigir según el rol del usuario
        this.redirectBasedOnRole(response.user.role.name);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al iniciar sesión';
        console.error('Login error:', error);
      }
    });
  }

  private redirectBasedOnRole(roleName: string) {
    switch (roleName.toLowerCase()) {
      case 'patient':
      case 'paciente':
        this.router.navigate(['/patient-dashboard']);
        break;
      case 'doctor':
      case 'médico':
        this.router.navigate(['/doctor-dashboard']);
        break;
      case 'admin':
      case 'administrador':
        this.router.navigate(['/admin-dashboard']);
        break;
      default:
        this.router.navigate(['/dashboard']);
    }
  }
}
