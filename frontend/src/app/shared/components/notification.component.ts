import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of notifications" 
           class="notification notification-{{notification.type}}"
           [attr.data-id]="notification.id">
        <div class="notification-content">
          <div class="notification-icon">
            <i [class]="getIconClass(notification.type)"></i>
          </div>
          <div class="notification-text">
            <h4 class="notification-title">{{notification.title}}</h4>
            <p class="notification-message">{{notification.message}}</p>
          </div>
          <button class="notification-close" 
                  (click)="closeNotification(notification.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      width: 100%;
    }

    .notification {
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      margin-bottom: 12px;
      border-left: 4px solid;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
      transition: all 0.3s ease;
    }

    .notification:hover {
      transform: translateX(-5px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }

    .notification-success {
      border-left-color: #10b981;
    }

    .notification-error {
      border-left-color: #ef4444;
    }

    .notification-warning {
      border-left-color: #f59e0b;
    }

    .notification-info {
      border-left-color: #3b82f6;
    }

    .notification-content {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      gap: 12px;
    }

    .notification-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
    }

    .notification-success .notification-icon {
      background: #10b981;
    }

    .notification-error .notification-icon {
      background: #ef4444;
    }

    .notification-warning .notification-icon {
      background: #f59e0b;
    }

    .notification-info .notification-icon {
      background: #3b82f6;
    }

    .notification-text {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      line-height: 1.2;
    }

    .notification-message {
      margin: 0;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.4;
    }

    .notification-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .notification.removing {
      animation: slideOut 0.3s ease-in forwards;
    }

    @media (max-width: 480px) {
      .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .notification-content {
        padding: 12px;
        gap: 8px;
      }

      .notification-title {
        font-size: 13px;
      }

      .notification-message {
        font-size: 12px;
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.subscription = this.notificationService.notifications.subscribe(
      notifications => this.notifications = notifications
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  closeNotification(id: string) {
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('removing');
      setTimeout(() => {
        this.notificationService.removeNotification(id);
      }, 300);
    } else {
      this.notificationService.removeNotification(id);
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'fas fa-check';
      case 'error':
        return 'fas fa-exclamation-triangle';
      case 'warning':
        return 'fas fa-exclamation-circle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-bell';
    }
  }
}