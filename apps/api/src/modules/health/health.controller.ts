import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/auth';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Public() @Get() @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ description: 'API operativa y consulta real a SQLite completada', schema: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['status', 'database'], properties: { status: { type: 'string', enum: ['ok'] }, database: { type: 'string', enum: ['connected'] } } } } } })
  @ApiServiceUnavailableResponse({ description: 'No se pudo verificar la base de datos' })
  getHealth() { return this.health.check(); }
}
