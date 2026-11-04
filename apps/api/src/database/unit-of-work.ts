import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
@Injectable()
export class DatabaseUnitOfWork {
  constructor(private readonly database: DatabaseService) {}
  run<T>(operation: () => T): T { return this.database.db.transaction(operation, { behavior: 'immediate' }); }
}
