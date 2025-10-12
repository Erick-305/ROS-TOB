import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmail implements OnInit {
  isLoading = true;
  isSuccess = false;
  isError = false;
  message = '';
  token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      
      if (this.token) {
        this.verifyEmail();
      } else {
        this.showError('Token de verificación no encontrado en la URL');
      }
    });
  }

  private verifyEmail() {
    this.isLoading = true;
    
    const apiUrl = 'http://localhost:3000/api';
    
    this.http.post<any>(`${apiUrl}/auth/verify-email`, { token: this.token })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isSuccess = true;
          this.message = response.message;
          
          // Guardar token y usuario en localStorage
          if (response.token && response.user) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // Actualizar el servicio de autenticación
            this.auth['currentUserSubject'].next(response.user);
            
            // Redireccionar al dashboard después de 3 segundos
            setTimeout(() => {
              this.redirectBasedOnRole(response.user.role.name);
            }, 3000);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.showError(error.error?.message || 'Error al verificar el email');
        }
      });
  }

  private showError(message: string) {
    this.isLoading = false;
    this.isError = true;
    this.isSuccess = false;
    this.message = message;
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

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}