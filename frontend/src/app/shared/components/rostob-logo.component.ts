import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rostob-logo',
  imports: [CommonModule],
  template: `
    <div class="rostob-logo-container" [ngClass]="containerClass">
      <!-- Logo ROSTOB PUBLICACIONES - rostob-logo2.jpeg optimizado -->
      <img 
        [src]="svgPath" 
        [alt]="altText"
        [class]="logoClass"
        [title]="altText"
        loading="eager"
        decoding="sync">
    </div>
  `,
  styles: [`
    .rostob-logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
      /* Optimización para rostob-logo2.jpeg */
      contain: layout style;
      overflow: hidden;
    }
    
    /* Estilos ultra-optimizados para rostob-logo2.jpeg (232KB) */
    .rostob-logo {
      /* Dimensiones fijas para evitar reflow */
      width: 120px !important;
      height: 80px !important;
      min-width: 120px;
      min-height: 80px;
      /* Optimización de renderizado */
      object-fit: cover;
      object-position: center;
      /* Efectos visuales */
      opacity: 0.95;
      border-radius: 8px;
      transition: all 0.3s ease;
      /* Optimización de rendimiento para imagen grande */
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      transform: translateZ(0) scale(1);
      will-change: transform;
      backface-visibility: hidden;
      /* Evitar problemas de memoria */
      contain: strict;
      /* Sombra suave */
      filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.15));
      /* Animación suave */
      animation: pulse 2s infinite;
    }
    
    .rostob-logo:hover {
      transform: scale(1.02);
      filter: drop-shadow(3px 3px 8px rgba(0, 0, 0, 0.2));
    }
    
    /* Animación pulse igual al original */
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    /* Variantes optimizadas para rostob-logo2.jpeg */
    .logo-small {
      width: 60px !important;
      height: 40px !important;
      min-width: 60px !important;
      min-height: 40px !important;
      animation: none;
      object-fit: cover;
    }
    
    .logo-medium {
      width: 120px !important;
      height: 80px !important;
      min-width: 120px !important;
      min-height: 80px !important;
      object-fit: cover;
    }
    
    .logo-large {
      width: 160px !important;
      height: 100px !important;
      min-width: 160px !important;
      min-height: 100px !important;
      object-fit: cover;
    }
    
    /* Variantes de color para fondos diferentes */
    .logo-white {
      filter: brightness(0) invert(1) drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
    }
    
    .header-logo {
      width: 60px;
      max-height: 40px;
      animation: none;
    }
    
    /* Para dashboards con fondo oscuro */
    .dashboard-logo {
      filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.3));
    }
  `],
  standalone: true
})
export class RostobLogoComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'normal' | 'white' | 'header' | 'dashboard' = 'normal';
  @Input() containerClass: string = '';
  
  get svgPath(): string {
    return '/assets/images/branding/rostob-logo2.jpeg';
  }
  
  get altText(): string {
    return 'ROSTOB PUBLICACIONES';
  }
  
  get logoClass(): string {
    let classes = ['rostob-logo'];
    
    // Size classes
    switch(this.size) {
      case 'small':
        classes.push('logo-small');
        break;
      case 'large':
        classes.push('logo-large');
        break;
      default:
        classes.push('logo-medium');
    }
    
    // Variant classes
    switch(this.variant) {
      case 'white':
        classes.push('logo-white');
        break;
      case 'header':
        classes.push('header-logo');
        break;
      case 'dashboard':
        classes.push('dashboard-logo');
        break;
    }
    
    return classes.join(' ');
  }
  
  // Logo optimizado para rostob-logo2.jpeg
}