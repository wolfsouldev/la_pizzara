import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/auth';
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Public() @Get() @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ description: 'Servicio disponible', schema: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } } } } })
  @ApiServiceUnavailableResponse({ description: 'Servicio temporalmente no disponible' })
  getHealth() { return this.health.check(); }
}
