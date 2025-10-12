import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth, User } from '../../auth/auth';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationComponent } from '../../shared/components/notification.component';

interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  completedAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  monthlyRevenue: number;
}

interface UserSummary {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_name: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  specialty_name?: string;
}

interface AppointmentSummary {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  doctor_name: string;
  specialty_name: string;
  status: string;
  reason: string;
}

interface NewUserForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  roleId: number;
  specialtyId?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, NotificationComponent],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
  currentUser: User | null = null;
  stats: AdminStats = {
    totalPatients: 0,
    totalDoctors: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    scheduledAppointments: 0,
    cancelledAppointments: 0,
    monthlyRevenue: 0
  };

  // Estados de vista
  activeView: 'dashboard' | 'users' | 'doctors' | 'patients' | 'appointments' = 'dashboard';
  
  // Datos
  users: UserSummary[] = [];
  doctors: UserSummary[] = [];
  patients: UserSummary[] = [];
  appointments: AppointmentSummary[] = [];
  specialties: any[] = [];
  
  // Estados de carga
  isLoadingStats = false;
  isLoadingUsers = false;
  isLoadingAppointments = false;
  
  // Modales
  showCreateUserModal = false;
  showEditUserModal = false;
  selectedUser: UserSummary | null = null;
  
  // Formularios
  newUserForm: NewUserForm = {
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    roleId: 1
  };

  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(
    private auth: Auth,
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🚀 Admin Dashboard inicializado');
    this.currentUser = this.auth.getCurrentUser();
    console.log('👤 Usuario actual:', this.currentUser);
    console.log('🎯 Iniciando carga de datos...');
    this.loadDashboardData();
  }

  get userName(): string {
    return this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Usuario';
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async loadDashboardData() {
    await Promise.all([
      this.loadStats(),
      this.loadSpecialties()
    ]);
  }

  // Cargar estadísticas principales
  async loadStats() {
    this.isLoadingStats = true;
    try {
      console.log('🔍 Cargando estadísticas de admin...');
      const token = this.auth.getToken();
      console.log('🎫 Token disponible:', token ? 'Sí' : 'No');
      
      const headers = this.getAuthHeaders();
      console.log('📋 Headers:', headers);
      
      const response = await this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`, { headers }).toPromise();
      console.log('📊 Respuesta del servidor:', response);
      
      if (response) {
        this.stats = response;
        console.log('✅ Estadísticas cargadas:', this.stats);
      }
    } catch (error: any) {
      console.error('❌ Error loading admin stats:', error);
      console.error('❌ Error details:', error.error);
      console.error('❌ Status:', error.status);
      this.notificationService.error('Error', 'No se pudieron cargar las estadísticas: ' + (error.error?.message || error.message));
    } finally {
      this.isLoadingStats = false;
    }
  }

  // Cargar especialidades
  async loadSpecialties() {
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<any[]>(`${this.apiUrl}/specialties`, { headers }).toPromise();
      if (response) {
        this.specialties = response;
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  }

  // Cargar usuarios
  async loadUsers() {
    this.isLoadingUsers = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<UserSummary[]>(`${this.apiUrl}/admin/users`, { headers }).toPromise();
      if (response) {
        this.users = response;
        this.doctors = response.filter(user => user.role_id === 2);
        this.patients = response.filter(user => user.role_id === 3);
        console.log('✅ Usuarios actualizados:', this.users.length);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.notificationService.error('Error', 'No se pudieron cargar los usuarios');
    } finally {
      this.isLoadingUsers = false;
    }
  }

  // Cargar citas
  async loadAppointments() {
    this.isLoadingAppointments = true;
    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.get<AppointmentSummary[]>(`${this.apiUrl}/admin/appointments`, { headers }).toPromise();
      if (response) {
        this.appointments = response;
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      this.notificationService.error('Error', 'No se pudieron cargar las citas');
    } finally {
      this.isLoadingAppointments = false;
    }
  }

  // Cambiar vista activa
  async setActiveView(view: 'dashboard' | 'users' | 'doctors' | 'patients' | 'appointments') {
    this.activeView = view;
    
    if (view === 'users' || view === 'doctors' || view === 'patients') {
      await this.loadUsers();
    } else if (view === 'appointments') {
      await this.loadAppointments();
    }
  }

  // Gestión de usuarios
  openCreateUserModal() {
    this.newUserForm = {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      roleId: 1
    };
    this.showCreateUserModal = true;
  }

  closeCreateUserModal() {
    this.showCreateUserModal = false;
  }

  async createUser() {
    if (!this.newUserForm.email || !this.newUserForm.firstName || !this.newUserForm.password) {
      this.notificationService.warning('Campos Requeridos', 'Por favor complete todos los campos obligatorios');
      return;
    }

    try {
      const headers = this.getAuthHeaders();
      const response = await this.http.post<any>(`${this.apiUrl}/admin/users`, this.newUserForm, { headers }).toPromise();
      
      if (response) {
        this.notificationService.success('Usuario Creado', 'El usuario ha sido creado exitosamente');
        this.closeCreateUserModal();
        this.users = []; // Forzar recarga
        await this.loadUsers();
        await this.loadStats(); // Actualizar estadísticas
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.error?.message || 'Error al crear el usuario';
      this.notificationService.error('Error al Crear', errorMessage);
    }
  }

  openEditUserModal(user: UserSummary) {
    this.selectedUser = { ...user };
    this.showEditUserModal = true;
  }

  closeEditUserModal() {
    this.showEditUserModal = false;
    this.selectedUser = null;
  }

  async updateUser() {
    if (!this.selectedUser) return;

    try {
      const headers = this.getAuthHeaders();
      
      // Preparar los datos en el formato que espera el backend
      const userData = {
        email: this.selectedUser.email,
        firstName: this.selectedUser.first_name,
        lastName: this.selectedUser.last_name,
        phone: this.selectedUser.phone,
        roleId: this.selectedUser.role_id
      };

      console.log('📝 Datos a enviar:', userData);
      console.log('🎯 URL:', `${this.apiUrl}/admin/users/${this.selectedUser.id}`);
      
      const response = await this.http.put<any>(`${this.apiUrl}/admin/users/${this.selectedUser.id}`, userData, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response) {
        this.notificationService.success('Usuario Actualizado', 'El usuario ha sido actualizado exitosamente');
        this.closeEditUserModal();
        this.users = []; // Forzar recarga
        await this.loadUsers();
      }
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      console.error('❌ Error details:', error.error);
      const errorMessage = error.error?.message || 'Error al actualizar el usuario';
      this.notificationService.error('Error al Actualizar', errorMessage);
    }
  }

  async toggleUserStatus(user: UserSummary) {
    console.log('🔄 INICIANDO toggleUserStatus');
    console.log('Usuario:', user);
    console.log('Estado actual:', user.is_active);
    
    try {
      const headers = this.getAuthHeaders();
      const newStatus = !user.is_active;
      
      console.log('Nuevo estado:', newStatus);
      console.log('URL:', `${this.apiUrl}/admin/users/${user.id}/status`);
      console.log('Headers:', headers);
      
      const response = await this.http.patch<any>(`${this.apiUrl}/admin/users/${user.id}/status`, 
        { is_active: newStatus }, { headers }).toPromise();
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response && response.success) {
        // Actualizar el estado localmente INMEDIATAMENTE
        user.is_active = newStatus;
        
        const action = newStatus ? 'activado' : 'desactivado';
        this.notificationService.success('Estado Actualizado', `El usuario ha sido ${action} exitosamente`);
        
        // Recargar la lista de usuarios para confirmar el cambio en el servidor
        await this.loadUsers();
        await this.loadStats();
      } else {
        throw new Error('El servidor no confirmó el cambio');
      }
    } catch (error: any) {
      console.error('❌ Error toggling user status:', error);
      
      let errorMessage = 'No se pudo cambiar el estado del usuario';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.notificationService.error('Error', errorMessage);
      await this.loadUsers();
    }
  }

  // Utilidades
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRoleBadgeClass(roleId: number): string {
    switch (roleId) {
      case 1: return 'badge-admin';
      case 2: return 'badge-doctor';
      case 3: return 'badge-patient';
      default: return 'badge-default';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'badge-danger';
      case 'completed': return 'badge-info';
      default: return 'badge-default';
    }
  }

  logout() {
    this.auth.logout();
  }
}