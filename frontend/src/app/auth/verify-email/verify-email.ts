import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css'
})
export class VerifyEmail {
  isLoading = false;
  isSuccess = false;
  isError = false;
  message = '';
  
  verificationData = {
    email: '',
    code: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private auth: Auth
  ) {}

  onSubmit() {
    if (!this.verificationData.email || !this.verificationData.code) {
      this.showError('Por favor completa todos los campos');
      return;
    }

    this.isLoading = true;
    
    const apiUrl = 'http://localhost:3000/api';
    
    this.http.post<any>(`${apiUrl}/auth/verify-email`, this.verificationData)
      .subscribe({
        next: (response) => {
          console.log('Respuesta exitosa:', response);
          this.isLoading = false;
          this.isSuccess = true;
          this.message = '¡Cuenta verificada con éxito! Serás redirigido al login en unos segundos.';
          
          // Redireccionar al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          console.error('Error en verificación:', error);
          this.isLoading = false;
          this.showError(error.error?.message || 'Error al verificar el código');
        }
      });
  }

  private showError(message: string) {
    this.isLoading = false;
    this.isError = true;
    this.isSuccess = false;
    this.message = message;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}