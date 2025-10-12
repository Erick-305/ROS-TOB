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

  get isDoctor(): boolean {
    return this.auth.isDoctor();
  }

  get isPatient(): boolean {
    return this.auth.isPatient();
  }

  get userName(): string {
    return this.currentUser ? `${this.currentUser.firstName} ${this.currentUser.lastName}` : 'Usuario';
  }

  get userRole(): string {
    return this.currentUser?.role.name || 'Sin rol';
  }

  logout() {
    this.auth.logout();
  }
}
