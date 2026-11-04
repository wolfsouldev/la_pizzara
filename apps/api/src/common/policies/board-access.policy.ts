import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, type BoardPermission } from '@uni/shared';
import type { User } from '../../database/schema';
import { BoardsRepository } from '../../database/repositories/boards.repository';
const rank: Record<BoardPermission, number> = { VIEW: 1, EDIT: 2, MANAGE: 3 };
@Injectable()
export class BoardAccessPolicy {
  constructor(private readonly boards: BoardsRepository) {}
  assertStaff(user: User) { if (user.role !== UserRole.ADMIN && user.role !== UserRole.TECHNICIAN) throw new ForbiddenException('Los tableros son exclusivos del personal'); }
  assertAdmin(user: User) { if (user.role !== UserRole.ADMIN) throw new ForbiddenException('Solo administradores pueden crear tableros'); }
  require(user: User, id: string, permission: BoardPermission = 'VIEW', allowArchived = false) {
    this.assertStaff(user); const row = this.boards.get(user, id); if (!row) throw new NotFoundException('Tablero no encontrado');
    const actual: BoardPermission = user.role === UserRole.ADMIN ? 'MANAGE' : row.permission!;
    if (rank[actual] < rank[permission]) throw new ForbiddenException('No tienes el permiso requerido en este tablero');
    if (permission !== 'VIEW' && row.board.isArchived && !allowArchived) throw new ConflictException('El tablero archivado es de solo lectura');
    return { ...row, permission: actual };
  }
}
