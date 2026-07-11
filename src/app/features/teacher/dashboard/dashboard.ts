import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';
import { TeacherDashboardService } from '../../../core/services/teacher-dashboard';
import { TEACHER_NAV_GROUPS } from '../../../shared/models/nav';
import { environment } from '../../../../environments/environment';

export type AttendanceLabel = 'Present' | 'Absent' | 'Late' | 'Permission';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterLink],
  templateUrl: './dashboard.html',
})
export class TeacherDashboardComponent implements OnInit {
  private dashboardService = inject(TeacherDashboardService);
  private auth = inject(AuthService);

  readonly TEACHER_NAV_GROUPS = TEACHER_NAV_GROUPS;

  readonly loading = this.dashboardService.loading;
  readonly error = this.dashboardService.error;
  readonly data = this.dashboardService.data;

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'TC',
      name: u?.full_name ?? 'Teacher',
      roleLabel: 'Teacher',
    };
  });

  /** Attendance stats for the progress bar section */
  readonly attendanceSummary = computed(() => {
    const a = this.data()?.attendanceStats;
    if (!a || a.total === 0) return null;
    return {
      total: a.total,
      present: a.present_count,
      absent: a.absent_count,
      late: a.late_count,
      permission: a.permission_count,
      presentPercent: Math.round((a.present_count / a.total) * 100),
      absentPercent: Math.round((a.absent_count / a.total) * 100),
      latePercent: Math.round((a.late_count / a.total) * 100),
      permissionPercent: Math.round((a.permission_count / a.total) * 100),
    };
  });

  /** Helper: format time HH:MM:SS → HH:MM */
  formatTime(t: string | undefined | null): string {
    if (!t) return '—';
    const parts = t.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  /** Helper: status class */
  statusClass(status: AttendanceLabel): string {
    const map: Record<AttendanceLabel, string> = {
      Present: 'text-emerald-400 bg-emerald-500/15',
      Absent: 'text-red-400 bg-red-500/15',
      Late: 'text-amber-400 bg-amber-500/15',
      Permission: 'text-sky-400 bg-sky-500/15',
    };
    return map[status] || 'text-slate-400 bg-slate-500/15';
  }

  ngOnInit(): void {
    this.dashboardService.fetch().subscribe();
  }
}
