import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../auth';

// Validador personalizado para confirmar contraseña
function passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { 'passwordMismatch': true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  emailExists = false;
  emailChecking = false;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private router: Router,
    private http: HttpClient
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  ngOnInit() {
    this.createForm();
  }

  private createForm() {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: passwordMatchValidator });

    // Validación de email en tiempo real
    this.registerForm.get('email')?.valueChanges.subscribe(email => {
      if (email && this.registerForm.get('email')?.valid) {
        this.checkEmailAvailability(email);
      }
    });
  }

  private checkEmailAvailability(email: string) {
    this.emailChecking = true;
    this.emailExists = false;

    const apiUrl = 'http://localhost:3000/api';
    
    this.http.post<any>(`${apiUrl}/auth/check-email`, { email })
      .subscribe({
        next: (response) => {
          this.emailChecking = false;
          this.emailExists = response.exists;
        },
        error: (error) => {
          this.emailChecking = false;
          console.error('Error verificando email:', error);
        }
      });
  }

  async onSubmit() {
    if (this.registerForm.invalid || this.emailExists) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const formData = this.registerForm.value;
      delete formData.confirmPassword; // No enviamos la confirmación al backend
      
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        this.successMessage = 'Te hemos enviado un correo de verificación. Revisa tu bandeja de entrada y sigue las instrucciones.';
        this.registerForm.reset();
        
        // Redirigir a la página de verificación después de 3 segundos
        setTimeout(() => {
          this.router.navigate(['/verify-email']);
        }, 3000);
      } else {
        this.errorMessage = data.message || 'Error al registrar usuario';
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      this.errorMessage = 'Error de conexión. Por favor, intenta nuevamente.';
    } finally {
      this.isLoading = false;
    }
  }

  // Métodos helper para la validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `Este campo es obligatorio`;
      if (field.errors['email']) return `Email inválido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }
}
