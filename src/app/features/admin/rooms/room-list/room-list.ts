import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SidebarComponent } from '../../../../shared/components/sidebar/sidebar';
import { RoomService } from '../../../../core/services/room';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast';
import { ADMIN_NAV_GROUPS } from '../../../../shared/models/nav';
import type { Room } from '../../../../core/models/room';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './room-list.html',
})
export class RoomListComponent implements OnInit {
  private roomService = inject(RoomService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly navGroups = ADMIN_NAV_GROUPS;

  readonly loading = this.roomService.loading;
  readonly error = this.roomService.error;
  readonly rooms = this.roomService.rooms;

  readonly roomTypes = ['Classroom', 'Lab', 'Exam', 'Meeting'];

  // Add modal
  readonly showAddModal = signal(false);
  readonly isSubmitting = signal(false);
  roomForm!: FormGroup;

  // Edit modal
  readonly showEditModal = signal(false);
  readonly isUpdating = signal(false);
  readonly editTarget = signal<Room | null>(null);
  editForm!: FormGroup;

  // Delete modal
  readonly showDeleteModal = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteTarget = signal<{ id: number; name: string } | null>(null);

  readonly sidebarUser = computed(() => {
    const u = this.auth.currentUser();
    return {
      initials: u?.initials ?? 'AD',
      name: u?.full_name ?? 'Admin',
      roleLabel: 'Administrator',
    };
  });

  ngOnInit(): void {
    this.roomService.fetchAll().subscribe();
    this.initForm();
    this.initEditForm();
  }

  // --- Add ---

  initForm(): void {
    this.roomForm = this.fb.group({
      room_name: ['', Validators.required],
      room_type: ['Classroom', Validators.required],
      capacity: [null],
      building: [''],
      floor: [null],
      description: [''],
    });
  }

  openAddModal(): void {
    this.roomForm.reset({ room_type: 'Classroom' });
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    if (this.isSubmitting()) return;
    this.showAddModal.set(false);
  }

  onSubmitRoom(): void {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    const payload = { ...this.roomForm.value };
    if (payload.capacity === null || payload.capacity === '') delete payload.capacity;
    if (payload.floor === null || payload.floor === '') delete payload.floor;

    this.isSubmitting.set(true);
    this.roomService.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.roomService.fetchAll().subscribe();
        this.toast.success('Room added successfully!');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.error('Failed to save room. Please try again.');
      },
    });
  }

  // --- Edit ---

  initEditForm(): void {
    this.editForm = this.fb.group({
      room_name: ['', Validators.required],
      room_type: ['Classroom', Validators.required],
      capacity: [null],
      building: [''],
      floor: [null],
      description: [''],
    });
  }

  openEditModal(room: Room): void {
    this.editTarget.set(room);
    this.editForm.patchValue({
      room_name: room.room_name,
      room_type: room.room_type,
      capacity: room.capacity,
      building: room.building,
      floor: room.floor,
      description: room.description,
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    if (this.isUpdating()) return;
    this.showEditModal.set(false);
    this.editTarget.set(null);
  }

  onSubmitEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const target = this.editTarget();
    if (!target) return;

    const payload = { ...this.editForm.value };
    if (payload.capacity === null || payload.capacity === '') delete payload.capacity;
    if (payload.floor === null || payload.floor === '') delete payload.floor;

    this.isUpdating.set(true);
    this.roomService.update(target.room_id, payload).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.roomService.fetchAll().subscribe();
        this.toast.success('Room updated successfully!');
      },
      error: () => {
        this.isUpdating.set(false);
        this.toast.error('Failed to update room. Please try again.');
      },
    });
  }

  // --- Delete ---

  openDeleteModal(id: number, name: string): void {
    this.deleteTarget.set({ id, name });
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isDeleting.set(true);
    this.roomService.delete(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.deleteTarget.set(null);
        this.roomService.fetchAll().subscribe();
        this.toast.success('Room deleted successfully!');
      },
      error: () => {
        this.isDeleting.set(false);
        this.toast.error('Could not delete room. Please try again.');
      },
    });
  }

  // Room type badge color helper
  roomTypeBadge(type: string): string {
    const map: Record<string, string> = {
      Classroom: 'bg-sky-500/15 text-sky-400',
      Lab: 'bg-emerald-500/15 text-emerald-400',
      Exam: 'bg-amber-500/15 text-amber-400',
      Meeting: 'bg-violet-500/15 text-violet-400',
    };
    return map[type] ?? 'bg-slate-500/15 text-slate-400';
  }

  roomTypeIcon(type: string): string {
    const map: Record<string, string> = {
      Classroom: 'fa-door-open',
      Lab: 'fa-flask',
      Exam: 'fa-file-pen',
      Meeting: 'fa-people-arrows',
    };
    return map[type] ?? 'fa-door-closed';
  }
}
