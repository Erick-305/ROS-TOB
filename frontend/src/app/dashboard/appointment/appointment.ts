import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '../../auth/auth';

interface Specialty {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  duration_minutes: number;
}

interface Doctor {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  specialties: Specialty[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

@Component({
  selector: 'app-appointment',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment.html',
  styleUrl: './appointment.css'
})
export class Appointment implements OnInit {
  appointmentForm!: FormGroup;
  specialties: Specialty[] = [];
  doctors: Doctor[] = [];
  availableSlots: TimeSlot[] = [];
  selectedDate: string = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  step = 1; // Control de pasos del wizard
  
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.createForm();
    this.loadSpecialties();
    this.setMinDate();
  }

  private createForm() {
    this.appointmentForm = this.fb.group({
      specialty_id: ['', [Validators.required]],
      doctor_id: ['', [Validators.required]],
      appointment_date: ['', [Validators.required]],
      appointment_time: ['', [Validators.required]],
      reason_for_visit: ['', [Validators.required, Validators.minLength(10)]]
    });

    // Escuchar cambios en la especialidad
    this.appointmentForm.get('specialty_id')?.valueChanges.subscribe(specialtyId => {
      if (specialtyId) {
        this.loadDoctorsBySpecialty(specialtyId);
        this.appointmentForm.patchValue({ doctor_id: '', appointment_time: '' });
        this.availableSlots = [];
      }
    });

    // Escuchar cambios en doctor y fecha
    this.appointmentForm.get('doctor_id')?.valueChanges.subscribe(() => {
      this.checkAvailableSlots();
    });

    this.appointmentForm.get('appointment_date')?.valueChanges.subscribe(() => {
      this.checkAvailableSlots();
    });
  }

  private setMinDate() {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    this.selectedDate = minDate;
  }

  private async loadSpecialties() {
    try {
      const response = await this.http.get<Specialty[]>(`${this.apiUrl}/appointments/specialties`).toPromise();
      this.specialties = response || [];
    } catch (error) {
      console.error('Error loading specialties:', error);
      this.errorMessage = 'Error al cargar especialidades';
    }
  }

  private async loadDoctorsBySpecialty(specialtyId: number) {
    try {
      const response = await this.http.get<Doctor[]>(`${this.apiUrl}/appointments/doctors/${specialtyId}`).toPromise();
      this.doctors = response || [];
    } catch (error) {
      console.error('Error loading doctors:', error);
      this.errorMessage = 'Error al cargar doctores';
    }
  }

  private async checkAvailableSlots() {
    const doctorId = this.appointmentForm.get('doctor_id')?.value;
    const date = this.appointmentForm.get('appointment_date')?.value;

    if (doctorId && date) {
      try {
        const response = await this.http.get<TimeSlot[]>(`${this.apiUrl}/appointments/availability/${doctorId}/${date}`).toPromise();
        this.availableSlots = response || [];
      } catch (error) {
        console.error('Error loading availability:', error);
        this.availableSlots = [];
      }
    }
  }

  getSelectedSpecialty(): Specialty | null {
    const specialtyId = this.appointmentForm.get('specialty_id')?.value;
    return this.specialties.find(s => s.id == specialtyId) || null;
  }

  getSelectedDoctor(): Doctor | null {
    const doctorId = this.appointmentForm.get('doctor_id')?.value;
    return this.doctors.find(d => d.id === doctorId) || null;
  }

  nextStep() {
    if (this.step < 4) {
      this.step++;
    }
  }

  prevStep() {
    if (this.step > 1) {
      this.step--;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async onSubmit() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const appointmentData = this.appointmentForm.value;
      const headers = this.getAuthHeaders();
      
      const response = await this.http.post<any>(`${this.apiUrl}/appointments/create`, appointmentData, { headers }).toPromise();

      if (response) {
        this.successMessage = '¡Cita agendada con éxito! Recibirás un correo de confirmación.';
        this.appointmentForm.reset();
        this.step = 1;
        this.availableSlots = [];
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      this.errorMessage = error.error?.message || 'Error al agendar la cita';
    } finally {
      this.isLoading = false;
    }
  }

  // Validaciones helper
  isFieldInvalid(fieldName: string): boolean {
    const field = this.appointmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.appointmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es obligatorio';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  // Función para cancelar el agendamiento y regresar al dashboard
  cancelAppointment() {
    this.router.navigate(['/patient-dashboard']);
  }
}