import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, User } from '../auth/auth';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  currentUser: User | null = null;

  constructor(private auth: Auth) {}

  ngOnInit() {
    this.currentUser = this.auth.getCurrentUser();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get isEmployee(): boolean {
    return this.auth.isEmployee();
  }

  get isCustomer(): boolean {
    return this.auth.isCustomer();
  }

  get currentUserName(): string {
    return this.currentUser ? this.currentUser.name || 'Usuario' : 'Usuario';
  }

  get userRole(): string {
    if (!this.currentUser?.role) return 'Sin rol';
    return typeof this.currentUser.role === 'string' 
      ? this.currentUser.role 
      : this.currentUser.role.name || 'Sin rol';
  }

  logout() {
    this.auth.logout();
  }
}
