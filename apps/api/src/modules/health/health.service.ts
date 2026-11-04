import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { HealthStatus } from '@uni/shared';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}
  check(): HealthStatus {
    try { if (this.database.checkConnection()) return { status: 'ok', database: 'connected' }; }
    catch { throw new ServiceUnavailableException('La base de datos no está disponible'); }
    throw new ServiceUnavailableException('No se pudo verificar la base de datos');
  }
}
