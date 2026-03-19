import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Returns the service health status.' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy.',
  })
  public check() {
    return {
      service: 'identity',
      status: 'ok',
      transports: ['http', 'tcp'],
    };
  }
}
