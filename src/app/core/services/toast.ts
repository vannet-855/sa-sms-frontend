import { Injectable, signal } from '@angular/core';
import type { Toast } from '../../shared/models/toast';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 1;

  private add(type: Toast['type'], message: string, duration = 5000): void {
    const id = this.nextId++;
    const toast: Toast = { id, type, message, duration };
    this._toasts.update((list) => [...list, toast]);
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration?: number): void {
    this.add('success', message, duration);
  }

  error(message: string, duration?: number): void {
    this.add('error', message, duration);
  }

  warning(message: string, duration?: number): void {
    this.add('warning', message, duration);
  }

  info(message: string, duration?: number): void {
    this.add('info', message, duration);
  }

  remove(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
