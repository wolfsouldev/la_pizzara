import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { HealthStatus } from '@uni/shared';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}
  check(): HealthStatus {
    try { if (this.database.checkConnection()) return { status: 'ok' }; }
    catch { throw new ServiceUnavailableException('Servicio temporalmente no disponible'); }
    throw new ServiceUnavailableException('Servicio temporalmente no disponible');
  }
}
