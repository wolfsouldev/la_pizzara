import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../../database/schema';
import { TasksRepository } from '../../database/repositories/tasks.repository';
import { BoardAccessPolicy } from './board-access.policy';
@Injectable()
export class TaskAccessPolicy {
  constructor(private readonly tasks: TasksRepository, private readonly boards: BoardAccessPolicy) {}
  require(user: User, id: string, edit = false) { this.boards.assertStaff(user); const task = this.tasks.get(user, id); if (!task) throw new NotFoundException('Tarea no encontrada'); const board = this.boards.require(user, task.boardId, edit ? 'EDIT' : 'VIEW'); if (edit && task.archivedAt !== null) throw new ConflictException('La tarea archivada es de solo lectura'); return { task, board }; }
}
