import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, Input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NavGroup, SidebarUser } from '../../../shared/models/nav';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Input() portalName = 'EduTrack SMS';
  @Input() portalRole = 'ADMIN PORTAL';
  @Input() logoIcon = 'fa-graduation-cap';
  @Input({ required: true }) navGroups: NavGroup[] = [];
  @Input({ required: true }) user!: SidebarUser;

  readonly isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isOpen() && !target.closest('app-sidebar') && !target.closest('.mobile-menu-btn')) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
