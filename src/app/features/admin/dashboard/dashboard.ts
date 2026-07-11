import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { ADMIN_NAV_GROUPS } from '../../../shared/models/nav';
import { QuickAction } from '../../../core/models/quick-action';
import { AdminDashboardService } from '../../../core/services/admin-dashboard';
import { AuthService } from '../../../core/services/auth';
import { ADMIN_STAT_CARDS } from '../../../core/models/admin-dashboard';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  private dashboardService = inject(AdminDashboardService);
  private auth = inject(AuthService);

  readonly loading = this.dashboardService.loading;
  readonly error = this.dashboardService.error;
  readonly data = this.dashboardService.data;

  /** Merge config (icon/color) with real values from API — key-by-key, not fabricated */
  readonly displayStats = computed(() => {
    const d = this.dashboardService.data();
    if (!d) return [];

    return ADMIN_STAT_CARDS.map((cfg) => {
      const raw = d[cfg.key];
      let value: string;
      if (raw === null || raw === undefined) {
        value = '—';
      } else if (cfg.isCurrency) {
        value = `$${Number(raw).toLocaleString()}`;
      } else {
        value = Number(raw).toLocaleString();
      }
      return { ...cfg, value };
    });
  });

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
      avatarColor: 'bg-emerald-600',
    };
  });

  readonly navGroups = ADMIN_NAV_GROUPS;

  /** Static UI — not from API, just plain navigation shortcuts */
  readonly quickActions: QuickAction[] = [
    {
      icon: 'fa-user-plus',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      label: 'Add Student',
      description: 'Enroll new student',
      route: '/admin/students',
    },
    {
      icon: 'fa-chalkboard-user',
      iconBg: 'bg-sky-500/15',
      iconColor: 'text-sky-400',
      label: 'Add Teacher',
      description: 'Create staff record',
      route: '/admin/teachers',
    },
    {
      icon: 'fa-file-pen',
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-400',
      label: 'Create Exam',
      description: 'Schedule new exam',
      route: '/admin/exams',
    },
    {
      icon: 'fa-calendar-days',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
      label: 'Schedules',
      description: 'Manage class schedules',
      route: '/admin/schedules',
    },
  ];

  ngOnInit(): void {
    this.dashboardService.fetch().subscribe();
  }
}
