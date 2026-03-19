import { HealthController } from '@presentation/controllers/health.controller';

describe('HealthController', () => {
  it('returns the service health payload', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      service: 'short-url',
      status: 'ok',
      dependencies: ['postgres', 'redis', 'identity-tcp'],
    });
  });
});
