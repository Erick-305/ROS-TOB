// Utilidades para manejo de imágenes en el sistema hospitalario

export class ImageUtils {
  
  // Rutas por defecto de imágenes
  static readonly DEFAULT_IMAGES = {
    doctor: 'assets/images/avatars/default-doctor.jpg',
    patient: 'assets/images/avatars/default-patient.jpg',
    admin: 'assets/images/avatars/default-admin.jpg',
    hospital: 'assets/images/icons/hospital-logo.svg',
    placeholder: 'assets/images/placeholder.jpg'
  };

  // Generar URL de avatar basado en el rol del usuario
  static getAvatarUrl(role: 'doctor' | 'patient' | 'admin', customImage?: string): string {
    if (customImage) {
      return customImage;
    }
    return this.DEFAULT_IMAGES[role];
  }

  // Crear URL de imagen con lazy loading
  static createLazyImageUrl(src: string, placeholder?: string): string {
    // Implementar lazy loading si es necesario
    return src;
  }

  // Optimizar imagen para diferentes tamaños
  static getResponsiveImageUrl(baseUrl: string, size: 'small' | 'medium' | 'large'): string {
    const sizeSuffixes = {
      small: '_300',
      medium: '_600', 
      large: '_1200'
    };
    
    const extension = baseUrl.split('.').pop();
    const baseName = baseUrl.replace(`.${extension}`, '');
    
    return `${baseName}${sizeSuffixes[size]}.${extension}`;
  }

  // Validar formato de imagen
  static isValidImageFormat(file: File): boolean {
    const validFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    return validFormats.includes(file.type);
  }

  // Redimensionar imagen en el cliente
  static resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx!.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Generar placeholder con iniciales
  static generateInitialsAvatar(firstName: string, lastName: string, size: number = 100): string {
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const colors = [
      '#667eea', '#764ba2', '#48bb78', '#ed8936', 
      '#f56565', '#4299e1', '#9f7aea', '#38b2ac'
    ];
    
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
    const backgroundColor = colors[colorIndex];

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" 
              fill="white" font-family="Arial, sans-serif" 
              font-size="${size * 0.4}" font-weight="bold">
          ${initials}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Detectar si el navegador soporta WebP
  static supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Cargar imagen con fallback
  static loadImageWithFallback(src: string, fallback: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => resolve(fallback);
      img.src = src;
    });
  }

  // Comprimir imagen para subida
  static compressImage(file: File, maxSizeKB: number = 500): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx!.drawImage(img, 0, 0);

        // Intentar diferentes calidades hasta alcanzar el tamaño deseado
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob && (blob.size / 1024 <= maxSizeKB || quality <= 0.1)) {
              resolve(blob);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };

        tryCompress();
      };

      img.src = URL.createObjectURL(file);
    });
  }
}