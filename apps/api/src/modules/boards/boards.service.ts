import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type BoardCreate, type BoardPatch, type BoardList, type BoardPermission, type BoardDetail, type KanbanPage, type BoardCandidateQuery, type ColumnCreate, type ColumnPatch } from '@uni/shared';
import { BoardsRepository } from '../../database/repositories/boards.repository';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { DatabaseUnitOfWork } from '../../database/unit-of-work';
import { BoardAccessPolicy } from '../../common/policies/board-access.policy';
import { PaginatedResult } from '../../common/pagination';
import type { User } from '../../database/schema';
@Injectable()
export class BoardsService {
  constructor(private readonly boards: BoardsRepository, private readonly tasks: TasksRepository, private readonly audit: AuditRepository, private readonly unit: DatabaseUnitOfWork, private readonly policy: BoardAccessPolicy) {}
  list(user: User, q: BoardList) { this.policy.assertStaff(user); return new PaginatedResult(this.boards.list(user, q), q); }
  detail(user: User, id: string): BoardDetail { const { board, departmentName, permission } = this.policy.require(user, id); return { ...board, departmentName, permission, columns: this.boards.columns(id), canEdit: !board.isArchived && permission !== 'VIEW', canManage: !board.isArchived && permission === 'MANAGE' }; }
  create(user: User, input: BoardCreate) {
    this.policy.assertAdmin(user); return this.unit.run(() => {
      if (!this.boards.activeDepartment(input.departmentId)) throw new ConflictException('Selecciona un departamento activo');
      const now = Date.now(); const board = this.boards.create(user.id, input, now);
      ['Pendiente', 'En progreso', 'En revisión', 'Completado'].forEach((name, i) => this.boards.addColumn(board.id, { name, isDone: i === 3 }, (i + 1) * 1024, now));
      this.audit.record(user.id, 'BOARD_CREATED', 'board', board.id, { departmentId: input.departmentId, name: input.name }); return this.detail(user, board.id);
    });
  }
  update(user: User, id: string, patch: BoardPatch) { return this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); this.boards.update(id, patch, Date.now()); this.audit.record(user.id, 'BOARD_UPDATED', 'board', id, { fields: Object.keys(patch) }); return this.detail(user, id); }); }
  archive(user: User, id: string) { return this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); this.boards.update(id, { isArchived: true }, Date.now()); this.audit.record(user.id, 'BOARD_ARCHIVED', 'board', id); return this.detail(user, id); }); }
  members(user: User, id: string, q: KanbanPage) { const { board } = this.policy.require(user, id); return new PaginatedResult(this.boards.members(id, board.departmentId, q), q); }
  candidates(user: User, id: string, q: BoardCandidateQuery) { const { board } = this.policy.require(user, id, 'MANAGE'); return new PaginatedResult(this.boards.candidates(id, board.departmentId, user.role, q), q); }
  private memberResult(boardId: string, userId: string, departmentId: string) { const membership = this.boards.membership(boardId, userId)!; const person = this.tasks.author(userId); return { ...membership, userId, displayName: person.displayName, username: person.username, isActive: true, eligible: !!this.boards.eligibleUser(departmentId, userId) }; }
  addMember(user: User, id: string, userId: string, permission: BoardPermission) {
    return this.unit.run(() => { const { board } = this.policy.require(user, id, 'MANAGE'); const candidate = this.boards.eligibleUser(board.departmentId, userId); if (!candidate || (user.role === UserRole.TECHNICIAN && candidate.role === UserRole.ADMIN)) throw new ConflictException('Debe ser un técnico activo del departamento o un administrador incorporado por ADMIN/SUPER_ADMIN'); if (this.boards.membership(id, userId)) throw new ConflictException('El usuario ya es miembro');
      this.boards.addMember(id, userId, permission, Date.now()); this.audit.record(user.id, 'BOARD_MEMBER_ADDED', 'board', id, { userId, permission }); return this.memberResult(id, userId, board.departmentId); });
  }
  changeMember(user: User, id: string, userId: string, permission: BoardPermission) {
    return this.unit.run(() => { const { board } = this.policy.require(user, id, 'MANAGE'); const before = this.boards.membership(id, userId); if (!before) throw new NotFoundException('Miembro no encontrado'); if (!this.boards.eligibleUser(board.departmentId, userId)) throw new ConflictException('El miembro ya no es elegible; retíralo o reactívalo antes de modificar su permiso');
      this.boards.permission(id, userId, permission); this.audit.record(user.id, 'BOARD_PERMISSION_CHANGED', 'board', id, { userId, before: before.permission, after: permission }); return this.memberResult(id, userId, board.departmentId); });
  }
  removeMember(user: User, id: string, userId: string) {
    this.unit.run(() => { this.policy.require(user, id, 'MANAGE', true); if (!this.boards.membership(id, userId)) throw new NotFoundException('Miembro no encontrado');
      const now = Date.now(); const affected = this.boards.activeAssignments(id, userId);
      for (const row of affected) { this.boards.removeAssignment(row.taskId, userId); this.tasks.update(user, row.taskId, {}, now); this.tasks.event(row.taskId, user.id, 'ASSIGNEE_REMOVED', now, { userId, reason: 'BOARD_MEMBERSHIP_REMOVED' }); }
      this.boards.removeMember(id, userId); this.audit.record(user.id, 'BOARD_MEMBER_REMOVED', 'board', id, { userId, unassignedTasks: affected.length });
    });
  }
  addColumn(user: User, id: string, input: ColumnCreate) { return this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); const columns = this.boards.columns(id); if (columns.length >= 100) throw new ConflictException('El tablero admite hasta 100 columnas'); const now = Date.now(); const column = this.boards.addColumn(id, input, (columns.at(-1)?.position ?? 0) + 1024, now); this.boards.update(id, {}, now); this.audit.record(user.id, 'BOARD_COLUMN_CREATED', 'board', id, { columnId: column.id }); return column; }); }
  updateColumn(user: User, id: string, columnId: string, input: ColumnPatch) { return this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); if (!this.boards.column(id, columnId)) throw new NotFoundException('Columna no encontrada'); const now = Date.now(); const column = this.boards.updateColumn(id, columnId, input, now); this.boards.update(id, {}, now); this.audit.record(user.id, 'BOARD_COLUMN_UPDATED', 'board', id, { columnId, ...input }); return column; }); }
  reorder(user: User, id: string, columnIds: string[]) { return this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); const columns = this.boards.columns(id); if (columns.length !== columnIds.length || columns.some(c => !columnIds.includes(c.id))) throw new ConflictException('Envía todas y únicamente las columnas de este tablero'); const now = Date.now(); columnIds.forEach((columnId, i) => this.boards.updateColumn(id, columnId, { position: (i + 1) * 1024 }, now)); this.boards.update(id, {}, now); this.audit.record(user.id, 'BOARD_COLUMNS_REORDERED', 'board', id, { columnIds }); return this.detail(user, id); }); }
  removeColumn(user: User, id: string, columnId: string) { this.unit.run(() => { this.policy.require(user, id, 'MANAGE'); if (!this.boards.column(id, columnId)) throw new NotFoundException('Columna no encontrada'); if (this.boards.hasTasks(id, columnId)) throw new ConflictException('Mueve primero todas las tareas; las tareas archivadas también conservan su columna'); this.boards.deleteColumn(id, columnId); this.boards.update(id, {}, Date.now()); this.audit.record(user.id, 'BOARD_COLUMN_DELETED', 'board', id, { columnId }); }); }
}
