import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, User } from '../../auth/auth';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationComponent } from '../../shared/components/notification.component';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  reason: string;
  status: string;
  doctor_name: string;
  specialty_name: string;
  specialty_icon: string;
  specialty_color: string;
}

interface NewAppointment {
  specialtyId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}

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
  specialty_id: number | null;
}

@Component({
  selector: 'app-patient-dashboard',
  imports: [CommonModule, FormsModule, NotificationComponent],
  templateUrl: './patient-dashboard.html',
  styleUrl: './patient-dashboard.css'
})
export class PatientDashboard implements OnInit {
  currentUser: User | null = null;
  appointments: Appointment[] = [];
  specialties: Specialty[] = [];
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  isLoadingAppointments = false;
  isLoadingSpecialties = false;
  isLoadingDoctors = false;
  showRescheduleModal = false;
  rescheduleAppointmentId = '';
  rescheduleDate = '';
  rescheduleTime = '';
  
  // Nuevo objeto para el formulario de citas
  newAppointment: NewAppointment = {
    specialtyId: '',
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  };
  
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(
    private auth: Auth,
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Verificar que el usuario sea paciente
    this.currentUser = this.auth.getCurrentUser();
    
    if (!this.currentUser) {
      this.notificationService.error('Acceso Denegado', 'Debes iniciar sesión para acceder');
      this.router.navigate(['/login']);
      return;
    }

    // Verificar rol de paciente (role.name = 'patient' o role.id = 3)
    if (this.currentUser.role.name !== 'patient' && this.currentUser.role.id !== 3) {
      this.notificationService.error('Acceso Denegado', 'Solo los pacientes pueden acceder a este dashboard');
      this.redirectToDashboard();
      return;
    }

    // Si es paciente, cargar datos
    this.loadInitialData();
  }

  private redirectToDashboard() {
    // Redirigir según el rol del usuario
    if (this.currentUser?.role.name === 'admin' || this.currentUser?.role.id === 1) {
      this.router.navigate(['/admin-dashboard']);
    } else if (this.currentUser?.role.name === 'doctor' || this.currentUser?.role.id === 2) {
      this.router.navigate(['/doctor-dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  private async loadInitialData() {
    await Promise.all([
      this.loadMyAppointments(),
      this.loadSpecialties(),
      this.loadDoctors()
    ]);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async loadMyAppointments() {
    console.log('📋 === FRONTEND: CARGAR CITAS ===');
    this.isLoadingAppointments = true;
    
    try {
      const headers = this.getAuthHeaders();
      console.log('📊 Headers de autorización:', headers);
      console.log('🔗 URL del endpoint:', `${this.apiUrl}/appointments/my-appointments`);
      
      const response = await this.http.get<Appointment[]>(`${this.apiUrl}/appointments/my-appointments`, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      console.log('📋 Número de citas cargadas:', response?.length || 0);
      
      this.appointments = response || [];
    } catch (error) {
      console.log('❌ === FRONTEND: ERROR AL CARGAR CITAS ===');
      console.error('📋 Error completo:', error);
      console.error('🔍 Error status:', (error as any).status);
      console.error('📊 Error message:', (error as any).error?.message);
      
      this.appointments = [];
      this.notificationService.error('Error', 'No se pudieron cargar las citas');
    } finally {
      this.isLoadingAppointments = false;
    }
  }

  async loadSpecialties() {
    this.isLoadingSpecialties = true;
    try {
      // Las especialidades no requieren autenticación
      const response = await this.http.get<Specialty[]>(`${this.apiUrl}/appointments/specialties`).toPromise();
      this.specialties = response || [];
      console.log('Especialidades cargadas:', this.specialties);
    } catch (error) {
      console.error('Error loading specialties:', error);
      this.specialties = [];
    } finally {
      this.isLoadingSpecialties = false;
    }
  }

  async loadDoctors() {
    this.isLoadingDoctors = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<Doctor[]>(`${this.apiUrl}/appointments/doctors`, { headers }).toPromise();
      this.doctors = response || [];
      this.filteredDoctors = this.doctors;
      console.log('Doctores cargados:', this.doctors);
    } catch (error) {
      console.error('Error loading doctors:', error);
      this.doctors = [];
      this.filteredDoctors = [];
    } finally {
      this.isLoadingDoctors = false;
    }
  }

  onSpecialtyChange() {
    console.log('Especialidad seleccionada:', this.newAppointment.specialtyId, 'tipo:', typeof this.newAppointment.specialtyId);
    console.log('Doctores disponibles:', this.doctors);
    
    // Filtrar doctores por especialidad seleccionada
    if (this.newAppointment.specialtyId) {
      // Convertir a número para asegurar comparación correcta
      const selectedSpecialtyId = parseInt(this.newAppointment.specialtyId);
      
      this.filteredDoctors = this.doctors.filter(doctor => {
        const doctorSpecialtyId = doctor.specialty_id;
        console.log(`Doctor ${doctor.first_name} ${doctor.last_name} - specialty_id: ${doctorSpecialtyId} (tipo: ${typeof doctorSpecialtyId})`);
        return doctorSpecialtyId === selectedSpecialtyId;
      });
      
      console.log('Doctores filtrados por especialidad:', this.filteredDoctors);
    } else {
      this.filteredDoctors = this.doctors;
    }
    
    // Limpiar selección de doctor si no está en la nueva lista
    if (this.newAppointment.doctorId && 
        !this.filteredDoctors.find(d => d.id === this.newAppointment.doctorId)) {
      this.newAppointment.doctorId = '';
    }
  }

  get userName(): string {
    return this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Usuario';
  }

  // Formatear fecha para mostrar
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formatear estado de la cita
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'Programada',
      'confirmed': 'Confirmada',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  }

  // Obtener clase CSS para el estado
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'scheduled': 'status-scheduled',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-default';
  }

  // Agendar nueva cita
  async scheduleAppointment() {
    console.log('🏥 === FRONTEND: AGENDAR CITA ===');
    
    if (!this.isFormValid()) {
      console.log('❌ Formulario no válido');
      this.notificationService.warning('Formulario Incompleto', 'Por favor, completa todos los campos requeridos');
      return;
    }

    try {
      const headers = this.getAuthHeaders();
      
      console.log('📋 Headers de autorización:', headers);
      
      const appointmentData = {
        doctorId: this.newAppointment.doctorId,
        appointmentDate: `${this.newAppointment.date}T${this.newAppointment.time}:00`,
        reason: this.newAppointment.reason
      };

      console.log('📊 Datos de la cita a enviar:', appointmentData);
      console.log('🔗 URL del endpoint:', `${this.apiUrl}/appointments/create`);

      const response = await this.http.post<any>(`${this.apiUrl}/appointments/create`, appointmentData, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response) {
        this.notificationService.success('Cita Agendada', 'Tu cita ha sido programada exitosamente');
        this.clearForm();
        this.loadMyAppointments(); // Recargar las citas
      }
    } catch (error: any) {
      console.log('❌ === FRONTEND: ERROR AL AGENDAR CITA ===');
      console.error('📋 Error completo:', error);
      console.error('🔍 Error status:', error.status);
      console.error('📊 Error message:', error.error?.message);
      console.error('🚨 Error object:', error.error);
      
      const errorMessage = error.error?.message || 'Error al agendar la cita. Por favor, intenta nuevamente.';
      this.notificationService.error('Error al Agendar', errorMessage);
    }
  }

  isFormValid(): boolean {
    return !!(
      this.newAppointment.specialtyId &&
      this.newAppointment.doctorId &&
      this.newAppointment.date &&
      this.newAppointment.time &&
      this.newAppointment.reason.trim()
    );
  }

  clearForm() {
    this.newAppointment = {
      specialtyId: '',
      doctorId: '',
      date: '',
      time: '',
      reason: ''
    };
    this.filteredDoctors = this.doctors;
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Cancelar cita
  async cancelAppointment(appointmentId: string) {
    console.log('❌ === FRONTEND: CANCELAR CITA ===');
    console.log('🆔 AppointmentId:', appointmentId);
    
    if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
      console.log('❌ Usuario canceló la confirmación');
      return;
    }

    try {
      const headers = this.getAuthHeaders();
      
      console.log('📋 Headers:', headers);
      console.log('🔗 URL:', `${this.apiUrl}/appointments/${appointmentId}/cancel`);
      
      const response = await this.http.put<any>(`${this.apiUrl}/appointments/${appointmentId}/cancel`, {}, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response) {
        // Actualizar la cita en la lista
        const appointmentIndex = this.appointments.findIndex(a => a.id === appointmentId);
        if (appointmentIndex !== -1) {
          this.appointments[appointmentIndex].status = 'cancelled';
          console.log('✅ Estado actualizado en el frontend');
        }
        this.notificationService.success('Cita Cancelada', 'La cita ha sido cancelada exitosamente');
      }
    } catch (error) {
      console.log('❌ === FRONTEND: ERROR AL CANCELAR ===');
      console.error('📋 Error completo:', error);
      console.error('🔍 Error status:', (error as any).status);
      console.error('📊 Error message:', (error as any).error?.message);
      
      this.notificationService.error('Error al Cancelar', 'Error al cancelar la cita. Por favor, intenta nuevamente.');
    }
  }

  // Reprogramar cita
  openRescheduleModal(appointmentId: string) {
    this.rescheduleAppointmentId = appointmentId;
    this.rescheduleDate = '';
    this.rescheduleTime = '';
    this.showRescheduleModal = true;
    
    // Establecer fecha mínima (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.rescheduleDate = tomorrow.toISOString().split('T')[0];
  }

  closeRescheduleModal() {
    this.showRescheduleModal = false;
    this.rescheduleAppointmentId = '';
    this.rescheduleDate = '';
    this.rescheduleTime = '';
  }

  async confirmReschedule() {
    console.log('🔄 === FRONTEND: REPROGRAMAR CITA ===');
    
    if (!this.rescheduleDate || !this.rescheduleTime) {
      console.log('❌ Faltan fecha o hora');
      this.notificationService.warning('Campos Requeridos', 'Por favor, selecciona fecha y hora');
      return;
    }

    try {
      const headers = this.getAuthHeaders();
      
      console.log('📋 Headers:', headers);
      console.log('🆔 AppointmentId:', this.rescheduleAppointmentId);
      
      const requestBody = {
        appointmentDate: `${this.rescheduleDate}T${this.rescheduleTime}:00`
      };

      console.log('📊 Datos a enviar:', requestBody);
      console.log('🔗 URL:', `${this.apiUrl}/appointments/${this.rescheduleAppointmentId}/reschedule`);

      const response = await this.http.put<any>(`${this.apiUrl}/appointments/${this.rescheduleAppointmentId}/reschedule`, requestBody, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response) {
        this.notificationService.success('Cita Reprogramada', 'La cita ha sido reprogramada exitosamente');
        this.closeRescheduleModal();
        this.loadMyAppointments(); // Recargar las citas
      }
    } catch (error: any) {
      console.log('❌ === FRONTEND: ERROR AL REPROGRAMAR ===');
      console.error('📋 Error completo:', error);
      console.error('🔍 Error status:', error.status);
      console.error('📊 Error message:', error.error?.message);
      
      const errorMessage = error.error?.message || 'Error al reprogramar la cita. Por favor, intenta nuevamente.';
      this.notificationService.error('Error al Reprogramar', errorMessage);
    }
  }

  logout() {
    this.auth.logout();
  }
}