import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { ADMIN_NAV_GROUPS, SidebarUser } from '../../models/nav';

@Component({
  selector: 'app-admin-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-slate-950">
      <app-sidebar [navGroups]="ADMIN_NAV_GROUPS" [user]="sidebarUser()" portalRole="ADMIN PORTAL">
      </app-sidebar>

      <main class="flex-1 overflow-y-auto p-6">
        <!-- Breadcrumb -->
        <div class="mb-1 text-xs text-slate-600">
          <span>Admin</span> / <span class="text-emerald-400">{{ title }}</span>
        </div>

        <div
          class="flex h-[70vh] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40"
        >
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <i class="fa-solid {{ icon }} text-xl text-slate-500"></i>
          </div>
          <h2 class="mb-2 text-lg font-semibold text-slate-300">{{ title }}</h2>
          <p class="mb-6 max-w-md text-center text-sm text-slate-500">
            This page is under development. The backend API is already set up — the frontend UI will
            be built here.
          </p>
          <a
            routerLink="/admin/dashboard"
            class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
          >
            <i class="fa-solid fa-arrow-left mr-2"></i> Back to Dashboard
          </a>
        </div>
      </main>
    </div>
  `,
})
export class AdminPlaceholderComponent {
  readonly ADMIN_NAV_GROUPS = ADMIN_NAV_GROUPS;

  @Input() title = 'Page';
  @Input() icon = 'fa-wrench';

  sidebarUser(): SidebarUser {
    return {
      initials: 'AD',
      name: 'Admin',
      roleLabel: 'Administrator',
    };
  }
}
