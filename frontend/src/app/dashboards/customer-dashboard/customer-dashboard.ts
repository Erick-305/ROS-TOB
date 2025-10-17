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
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RostobLogoComponent],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.css'
})
export class CustomerDashboard implements OnInit {
  books: Book[] = [];
  recentInvoices: Invoice[] = [];
  searchTerm = '';
  selectedCategory = '';
  categories: any[] = [];
  loading = false;
  currentPage = 1;
  totalPages = 1;
  cart: any[] = [];
  showCart = false;

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  ngOnInit() {
    this.loadBooks();
    this.loadCategories();
    this.loadRecentInvoices();
    this.loadCart();
  }

  loadBooks() {
    this.loading = true;
    const params = new URLSearchParams();
    
    if (this.searchTerm) params.set('search', this.searchTerm);
    if (this.selectedCategory) params.set('category', this.selectedCategory);
    params.set('page', this.currentPage.toString());
    params.set('limit', '12');

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

  loadCategories() {
    this.http.get<any>(`${this.apiUrl}/categories`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.categories = response.categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadRecentInvoices() {
    this.http.get<any>(`${this.apiUrl}/invoices/my-invoices?limit=5`, this.getAuthHeaders()).subscribe({
      next: (response) => {
        this.recentInvoices = response.invoices;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
      }
    });
  }

  loadCart() {
    const savedCart = localStorage.getItem('bookstore_cart');
    if (savedCart) {
      this.cart = JSON.parse(savedCart);
    }
  }

  saveCart() {
    localStorage.setItem('bookstore_cart', JSON.stringify(this.cart));
  }

  onSearch() {
    this.currentPage = 1;
    this.loadBooks();
  }

  onCategoryChange() {
    this.currentPage = 1;
    this.loadBooks();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.currentPage = 1;
    this.loadBooks();
  }

  addToCart(book: Book) {
    const existingItem = this.cart.find(item => item.id === book.id);
    
    if (existingItem) {
      if (existingItem.quantity < book.stock_quantity) {
        existingItem.quantity++;
      } else {
        alert('No hay suficiente stock disponible');
        return;
      }
    } else {
      this.cart.push({
        id: book.id,
        title: book.title,
        price: book.price,
        quantity: 1,
        max_quantity: book.stock_quantity
      });
    }
    
    this.saveCart();
    alert('Libro agregado al carrito');
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
    this.saveCart();
  }

  updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(index);
    } else if (quantity <= this.cart[index].max_quantity) {
      this.cart[index].quantity = quantity;
      this.saveCart();
    }
  }

  getCartTotal(): number {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getCartItemsCount(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  toggleCart() {
    this.showCart = !this.showCart;
  }

  checkout() {
    if (this.cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const invoiceData = {
      items: this.cart.map(item => ({
        book_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))
    };

    this.http.post<any>(`${this.apiUrl}/invoices`, invoiceData, this.getAuthHeaders()).subscribe({
      next: (response) => {
        alert('Compra realizada exitosamente. Número de factura: ' + response.invoice.invoice_number);
        this.cart = [];
        this.saveCart();
        this.showCart = false;
        this.loadBooks(); // Refrescar para actualizar stock
        this.loadRecentInvoices();
      },
      error: (error) => {
        console.error('Error al procesar compra:', error);
        alert('Error al procesar la compra: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadBooks();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadBooks();
    }
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