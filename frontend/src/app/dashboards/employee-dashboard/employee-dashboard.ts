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
  authors: string;
  categories: string;
  publisher_name: string;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  total_invoices: number;
  total_purchased: number;
  company_name?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  invoice_date: string;
}

interface SalesStats {
  total_revenue: number;
  total_invoices: number;
  total_books_sold: number;
  average_order_value: number;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RostobLogoComponent],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboard implements OnInit {
  activeTab = 'sales';
  loading = false;
  
  // Sales data
  salesStats: SalesStats = {
    total_revenue: 0,
    total_invoices: 0,
    total_books_sold: 0,
    average_order_value: 0
  };
  
  recentInvoices: Invoice[] = [];
  
  // Books data
  books: Book[] = [];
  lowStockBooks: Book[] = [];
  bookSearchTerm = '';
  
  // Customers data
  customers: Customer[] = [];
  customerSearchTerm = '';
  
  // New sale
  newSale = {
    customer_id: '',
    items: [] as any[]
  };
  
  selectedBooks: any[] = [];
  searchResults: Book[] = [];
  bookSearchQuery = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.loadSalesStats();
    this.loadRecentInvoices();
    this.loadBooks();
    this.loadLowStockBooks();
    this.loadCustomers();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    
    if (tab === 'books' && this.books.length === 0) {
      this.loadBooks();
    } else if (tab === 'customers' && this.customers.length === 0) {
      this.loadCustomers();
    }
  }

  // Sales Methods
  loadSalesStats() {
    this.http.get<any>(`${this.apiUrl}/invoices/stats`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.salesStats = response;
      },
      error: (error) => {
        console.error('Error loading sales stats:', error);
      }
    });
  }

  loadRecentInvoices() {
    this.http.get<any>(`${this.apiUrl}/invoices?limit=10&sort=recent`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.recentInvoices = response.invoices;
      },
      error: (error) => {
        console.error('Error loading recent invoices:', error);
      }
    });
  }

  // Books Methods
  loadBooks() {
    this.loading = true;
    const params = new URLSearchParams();
    
    if (this.bookSearchTerm) params.set('search', this.bookSearchTerm);
    params.set('page', this.currentPage.toString());
    params.set('limit', '20');

    this.http.get<any>(`${this.apiUrl}/books?${params}`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.books = response.books;
        this.totalPages = response.pagination.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading books:', error);
        this.loading = false;
      }
    });
  }

  loadLowStockBooks() {
    this.http.get<any>(`${this.apiUrl}/books?low_stock=true&limit=10`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.lowStockBooks = response.books;
      },
      error: (error) => {
        console.error('Error loading low stock books:', error);
      }
    });
  }

  searchBooks() {
    this.currentPage = 1;
    this.loadBooks();
  }

  // Customer Methods
  loadCustomers() {
    this.loading = true;
    const params = new URLSearchParams();
    
    if (this.customerSearchTerm) params.set('search', this.customerSearchTerm);
    params.set('page', this.currentPage.toString());
    params.set('limit', '20');

    this.http.get<any>(`${this.apiUrl}/customers?${params}`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.customers = response.customers;
        this.totalPages = response.pagination.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.loading = false;
      }
    });
  }

  searchCustomers() {
    this.currentPage = 1;
    this.loadCustomers();
  }

  // New Sale Methods
  searchBooksForSale() {
    if (this.bookSearchQuery.length < 2) {
      this.searchResults = [];
      return;
    }

    const params = new URLSearchParams();
    params.set('search', this.bookSearchQuery);
    params.set('limit', '10');

    this.http.get<any>(`${this.apiUrl}/books?${params}`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.searchResults = response.books.filter((book: Book) => 
          !this.selectedBooks.find(selected => selected.id === book.id)
        );
      },
      error: (error) => {
        console.error('Error searching books:', error);
      }
    });
  }

  addBookToSale(book: Book) {
    const existingBook = this.selectedBooks.find(item => item.id === book.id);
    
    if (existingBook) {
      if (existingBook.quantity < book.stock_quantity) {
        existingBook.quantity++;
      } else {
        alert('No hay suficiente stock disponible');
      }
    } else {
      this.selectedBooks.push({
        id: book.id,
        title: book.title,
        price: book.price,
        quantity: 1,
        max_quantity: book.stock_quantity
      });
    }
    
    this.searchResults = [];
    this.bookSearchQuery = '';
  }

  removeBookFromSale(index: number) {
    this.selectedBooks.splice(index, 1);
  }

  updateBookQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      this.removeBookFromSale(index);
    } else if (quantity <= this.selectedBooks[index].max_quantity) {
      this.selectedBooks[index].quantity = quantity;
    }
  }

  getSaleTotal(): number {
    return this.selectedBooks.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  processSale() {
    if (!this.newSale.customer_id) {
      alert('Selecciona un cliente');
      return;
    }

    if (this.selectedBooks.length === 0) {
      alert('Agrega al menos un libro a la venta');
      return;
    }

    const invoiceData = {
      customer_id: parseInt(this.newSale.customer_id),
      items: this.selectedBooks.map(item => ({
        book_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))
    };

    this.http.post<any>(`${this.apiUrl}/invoices`, invoiceData, this.getAuthHeaders()).subscribe({
      next: (response) => {
        alert(`Venta procesada exitosamente. Factura: ${response.invoice.invoice_number}`);
        this.resetSale();
        this.loadSalesStats();
        this.loadRecentInvoices();
        this.loadBooks(); // Refresh to update stock
      },
      error: (error) => {
        console.error('Error processing sale:', error);
        alert('Error al procesar la venta: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  resetSale() {
    this.newSale.customer_id = '';
    this.selectedBooks = [];
    this.searchResults = [];
    this.bookSearchQuery = '';
  }

  // Utility Methods
  updateBookStock(bookId: number, newStock: number) {
    this.http.put<any>(`${this.apiUrl}/books/${bookId}`, { stock_quantity: newStock }, this.getAuthHeaders()).subscribe({
      next: (response) => {
        alert('Stock actualizado exitosamente');
        this.loadBooks();
        this.loadLowStockBooks();
      },
      error: (error) => {
        console.error('Error updating stock:', error);
        alert('Error al actualizar el stock');
      }
    });
  }

  getStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'badge-warning',
      'paid': 'badge-success',
      'overdue': 'badge-danger',
      'cancelled': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'paid': 'Pagado',
      'overdue': 'Vencido',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      if (this.activeTab === 'books') {
        this.loadBooks();
      } else if (this.activeTab === 'customers') {
        this.loadCustomers();
      }
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.activeTab === 'books') {
        this.loadBooks();
      } else if (this.activeTab === 'customers') {
        this.loadCustomers();
      }
    }
  }

  logout() {
    this.auth.logout();
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