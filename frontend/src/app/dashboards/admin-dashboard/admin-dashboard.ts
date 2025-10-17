import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../auth/auth';
import { RostobLogoComponent } from '../../shared/components/rostob-logo.component';

interface Book {
  id: number;
  title: string;
  isbn: string;
  price: number;
  stock_quantity: number;
  publication_date: string;
  description?: string;
  authors: string;
  categories: string;
  publisher_name: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RostobLogoComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  activeTab = 'overview';
  loading = false;

  stats = {
    total_users: 150,
    total_books: 1200,
    total_revenue: 45000.50,
    total_invoices: 320,
    low_stock_count: 25,
    pending_invoices: 12
  };

  users: any[] = [];
  userSearchTerm = '';
  books: any[] = [];
  bookSearchTerm = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    
    if (tab === 'users' && this.users.length === 0) {
      this.loadUsers();
    }
    if (tab === 'books' && this.books.length === 0) {
      this.loadBooks();
    }
  }

  loadStats() {
    console.log('📊 Stats loaded:', this.stats);
  }

  loadUsers() {
    this.loading = true;
    
    setTimeout(() => {
      this.users = [
        { id: 1, name: 'Juan Pérez', email: 'juan@libreria.com', role: 'customer', is_verified: true, created_at: '2024-01-15' },
        { id: 2, name: 'Ana García', email: 'ana@libreria.com', role: 'employee', is_verified: true, created_at: '2024-02-20' },
        { id: 3, name: 'Carlos Admin', email: 'admin@libreria.com', role: 'admin', is_verified: true, created_at: '2024-01-01' }
      ];
      this.loading = false;
    }, 1000);
  }

  loadBooks() {
    this.loading = true;
    
    this.http.get<any>(`${this.apiUrl}/books?limit=20`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.books = response.books || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading books:', error);
        this.books = [];
        this.loading = false;
      }
    });
  }

  searchUsers() {
    console.log('Searching users:', this.userSearchTerm);
    this.loadUsers();
  }

  searchBooks() {
    console.log('Searching books:', this.bookSearchTerm);
    this.loadBooks();
  }

  toggleUserStatus(userId: number, currentStatus: boolean) {
    const newStatus = !currentStatus;
    alert(`Usuario ${newStatus ? 'activado' : 'desactivado'} (simulado)`);
  }

  deleteUser(userId: number, userName: string) {
    if (confirm(`¿Eliminar usuario "${userName}"?`)) {
      alert('Usuario eliminado (simulado)');
    }
  }

  deleteBook(bookId: number, bookTitle: string) {
    if (confirm(`¿Eliminar libro "${bookTitle}"?`)) {
      this.http.delete(`${this.apiUrl}/books/${bookId}`, this.getAuthHeaders()).subscribe({
        next: () => {
          alert('Libro eliminado exitosamente');
          this.loadBooks();
        },
        error: (error) => {
          console.error('Error:', error);
          alert('Error al eliminar libro');
        }
      });
    }
  }

  getRoleBadge(role: string): string {
    const badges: { [key: string]: string } = {
      'admin': 'badge-danger',
      'employee': 'badge-primary', 
      'customer': 'badge-success'
    };
    return badges[role] || 'badge-secondary';
  }

  getRoleText(role: string): string {
    const roles: { [key: string]: string } = {
      'admin': 'Administrador',
      'employee': 'Empleado',
      'customer': 'Cliente'
    };
    return roles[role] || role;
  }

  logout() {
    this.auth.logout();
  }

  refreshData() {
    this.loadStats();
    if (this.activeTab === 'users') {
      this.loadUsers();
    } else if (this.activeTab === 'books') {
      this.loadBooks();
    }
  }

  get currentUser() {
    return this.auth.getCurrentUser();
  }

  private getAuthHeaders() {
    const token = this.auth.getToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }
}