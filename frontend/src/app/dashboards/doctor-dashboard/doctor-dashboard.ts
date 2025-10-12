import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, User } from '../../auth/auth';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationComponent } from '../../shared/components/notification.component';

interface DoctorAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  reason: string;
  status: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  specialty_name: string;
}

interface DoctorStats {
  todayAppointments: number;
  totalPatients: number;
  weekAppointments: number;
  monthCompletedAppointments: number;
}

interface PatientSummary {
  patient_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone?: string;
  total_records: number;
  last_appointment?: string;
  last_medical_record?: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  date: string;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  notes?: string;
  follow_up_date?: string;
  created_at: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

interface MedicalRecordForm {
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes: string;
  followUpDate: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  imports: [CommonModule, FormsModule, NotificationComponent],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.css'
})
export class DoctorDashboard implements OnInit {
  currentUser: User | null = null;
  appointments: DoctorAppointment[] = [];
  patients: PatientSummary[] = [];
  selectedPatientRecords: MedicalRecord[] = [];
  stats: DoctorStats = {
    todayAppointments: 0,
    totalPatients: 0,
    weekAppointments: 0,
    monthCompletedAppointments: 0
  };
  
  selectedTab: string = 'today';
  isLoadingStats = false;
  isLoadingAppointments = false;
  isLoadingPatients = false;
  isLoadingMedicalRecords = false;
  
  // Modal states
  showCompletionModal = false;
  showPatientsList = false;
  showPatientDetails = false;
  showMedicalRecordForm = false;
  
  // Form and selection states
  completionAppointmentId = '';
  completionNotes = '';
  selectedPatient: PatientSummary | null = null;
  selectedPatientForRecord: string = '';
  medicalRecordPatient: PatientSummary | null = null;
  
  medicalRecordForm: MedicalRecordForm = {
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    followUpDate: ''
  };
  
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(
    private auth: Auth,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
    this.loadDoctorStats();
    this.loadDoctorAppointments();
    this.loadPatients();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async loadDoctorStats() {
    this.isLoadingStats = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<DoctorStats>(`${this.apiUrl}/appointments/doctor-stats`, { headers }).toPromise();
      this.stats = response || this.stats;
    } catch (error) {
      console.error('Error loading doctor stats:', error);
    } finally {
      this.isLoadingStats = false;
    }
  }

  async loadDoctorAppointments() {
    this.isLoadingAppointments = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<DoctorAppointment[]>(`${this.apiUrl}/appointments/doctor-appointments`, { headers }).toPromise();
      this.appointments = response || [];
    } catch (error) {
      console.error('Error loading doctor appointments:', error);
      this.appointments = [];
    } finally {
      this.isLoadingAppointments = false;
    }
  }

  get userName(): string {
    return this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Usuario';
  }

  get filteredAppointments(): DoctorAppointment[] {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    switch (this.selectedTab) {
      case 'today':
        return this.appointments.filter(apt => apt.appointment_date === today);
      case 'week':
        return this.appointments.filter(apt => apt.appointment_date >= weekStartStr);
      default:
        return this.appointments;
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'scheduled': 'Programada',
      'confirmed': 'Confirmada',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'scheduled': 'status-scheduled',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-default';
  }

  openCompletionModal(appointmentId: string) {
    this.completionAppointmentId = appointmentId;
    this.completionNotes = '';
    this.showCompletionModal = true;
  }

  closeCompletionModal() {
    this.showCompletionModal = false;
    this.completionAppointmentId = '';
    this.completionNotes = '';
  }

  async completeAppointment() {
    try {
      const headers = this.getAuthHeaders();
      const requestBody = {
        notes: this.completionNotes
      };

      const response = await this.http.put<any>(`${this.apiUrl}/appointments/${this.completionAppointmentId}/complete`, requestBody, { headers }).toPromise();
      
      if (response) {
        this.notificationService.success('Cita Completada', 'La cita ha sido marcada como completada exitosamente');
        this.closeCompletionModal();
        // Actualizar las listas
        this.loadDoctorAppointments();
        this.loadDoctorStats();
      }
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      const errorMessage = error.error?.message || 'Error al completar la cita. Por favor, intenta nuevamente.';
      this.notificationService.error('Error al Completar', errorMessage);
    }
  }

  logout() {
    this.auth.logout();
  }

  // Métodos para gestión de pacientes
  async loadPatients() {
    this.isLoadingPatients = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<any>(`${this.apiUrl}/medical-records/doctor`, { headers }).toPromise();
      
      if (response?.success && response?.data) {
        this.patients = response.data;
      } else {
        this.patients = [];
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      this.patients = [];
    } finally {
      this.isLoadingPatients = false;
    }
  }

  closePatientsList() {
    this.showPatientsList = false;
  }

  async viewPatientDetails(patient: PatientSummary) {
    this.selectedPatient = patient;
    this.showPatientDetails = true;
    this.loadPatientMedicalRecords(patient.patient_id);
  }

  closePatientDetails() {
    this.showPatientDetails = false;
    this.selectedPatient = null;
    this.selectedPatientRecords = [];
  }

  async loadPatientMedicalRecords(patientId: string) {
    console.log('Loading medical records for patient:', patientId);
    this.isLoadingMedicalRecords = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<any>(`${this.apiUrl}/medical-records/patient/${patientId}`, { headers }).toPromise();
      
      console.log('Medical records response:', response);
      
      if (response?.success && response?.data) {
        this.selectedPatientRecords = response.data;
        console.log('Selected patient records:', this.selectedPatientRecords);
      } else {
        console.log('No medical records found or invalid response');
        this.selectedPatientRecords = [];
      }
    } catch (error) {
      console.error('Error loading medical records:', error);
      this.selectedPatientRecords = [];
    } finally {
      this.isLoadingMedicalRecords = false;
    }
  }

  editPatientRecord(patient: PatientSummary) {
    // Si el paciente tiene historiales, editar el más reciente
    // Si no tiene historiales, crear uno nuevo
    this.medicalRecordPatient = patient;
    this.selectedPatientForRecord = patient.patient_id;
    
    // Cargar el historial más reciente si existe
    if (patient.total_records > 0) {
      this.loadPatientMedicalRecords(patient.patient_id).then(() => {
        if (this.selectedPatientRecords.length > 0) {
          const latestRecord = this.selectedPatientRecords[0]; // El más reciente
          this.medicalRecordForm = {
            diagnosis: latestRecord.diagnosis || '',
            treatment: latestRecord.treatment || '',
            prescription: latestRecord.prescription || '',
            notes: latestRecord.notes || '',
            followUpDate: latestRecord.follow_up_date || ''
          };
        }
      });
    } else {
      // Si no hay historiales, iniciar con formulario vacío
      this.medicalRecordForm = {
        diagnosis: '',
        treatment: '',
        prescription: '',
        notes: '',
        followUpDate: ''
      };
    }
    
    this.showMedicalRecordForm = true;
  }

  // Métodos para historial médico
  createMedicalRecordForPatient(patient: PatientSummary) {
    this.medicalRecordPatient = patient;
    this.resetMedicalRecordForm();
    this.showPatientDetails = false;
    this.showMedicalRecordForm = true;
  }

  closeMedicalRecordForm() {
    this.showMedicalRecordForm = false;
    this.medicalRecordPatient = null;
    this.selectedPatientForRecord = '';
    this.resetMedicalRecordForm();
  }

  resetMedicalRecordForm() {
    this.medicalRecordForm = {
      diagnosis: '',
      treatment: '',
      prescription: '',
      notes: '',
      followUpDate: ''
    };
  }

  async saveMedicalRecord() {
    try {
      const headers = this.getAuthHeaders();
      
      let patientId = '';
      if (this.medicalRecordPatient) {
        patientId = this.medicalRecordPatient.patient_id;
      } else if (this.selectedPatientForRecord) {
        patientId = this.selectedPatientForRecord;
      } else {
        this.notificationService.warning('Paciente Requerido', 'Por favor seleccione un paciente');
        return;
      }

      if (!this.medicalRecordForm.diagnosis || !this.medicalRecordForm.treatment) {
        this.notificationService.warning('Campos Obligatorios', 'Por favor complete los campos obligatorios (Diagnóstico y Tratamiento)');
        return;
      }

      const requestBody = {
        patient_id: patientId,
        diagnosis: this.medicalRecordForm.diagnosis,
        treatment: this.medicalRecordForm.treatment,
        prescription: this.medicalRecordForm.prescription || null,
        notes: this.medicalRecordForm.notes || null,
        follow_up_date: this.medicalRecordForm.followUpDate || null
      };

      const response = await this.http.post<any>(`${this.apiUrl}/medical-records`, requestBody, { headers }).toPromise();
      
      if (response) {
        this.notificationService.success('Historial Guardado', 'El historial médico ha sido guardado exitosamente');
        this.closeMedicalRecordForm();
        // Actualizar datos
        this.loadPatients();
        this.loadDoctorStats();
        
        // Si estamos viendo detalles del paciente, actualizarlos
        if (this.selectedPatient && this.selectedPatient.patient_id === patientId) {
          this.loadPatientMedicalRecords(patientId);
          this.showPatientDetails = true;
        }
      }
    } catch (error: any) {
      console.error('Error saving medical record:', error);
      const errorMessage = error.error?.message || 'Error al guardar el historial médico. Por favor, intenta nuevamente.';
      this.notificationService.error('Error al Guardar', errorMessage);
    }
  }

  // Métodos de utilidad
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}