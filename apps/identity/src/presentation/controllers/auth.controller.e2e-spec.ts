import request from 'supertest';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { ExecutionContext } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { JwtAuthGuard } from '@infra/guards/jwt-auth.guard';
import { AuthController } from '@presentation/controllers/auth.controller';
import { HealthController } from '@presentation/controllers/health.controller';
import { LoginUserUseCase } from '@application/use-cases/login-user.usecase';
import { RegisterUserUseCase } from '@application/use-cases/register-user.usecase';
import { ValidateUserTokenUseCase } from '@application/use-cases/validate-user-token.usecase';
import { FindUserByUsernameUseCase } from '@application/use-cases/find-user-by-username.usecase';

type AuthenticatedRequest = FastifyRequest & {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
};

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  let jwtGuardSpy: jest.SpyInstance;

  const loginUserUseCase = { execute: jest.fn() };
  const registerUserUseCase = { execute: jest.fn() };
  const validateUserTokenUseCase = { execute: jest.fn() };
  const findUserByUsernameUseCase = { execute: jest.fn() };

  beforeAll(async () => {
    jwtGuardSpy = jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockImplementation((context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

      request.user = {
        email: 'user@mail.com',
        userId: 'user-id',
        username: 'test-user',
      };

      return true;
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, HealthController],
      providers: [
        { provide: LoginUserUseCase, useValue: loginUserUseCase },
        { provide: RegisterUserUseCase, useValue: registerUserUseCase },
        { provide: FindUserByUsernameUseCase, useValue: findUserByUsernameUseCase },
        { provide: ValidateUserTokenUseCase, useValue: validateUserTokenUseCase },
        JwtAuthGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    jwtGuardSpy.mockRestore();

    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /auth/register returns the created user payload', async () => {
    registerUserUseCase.execute.mockResolvedValueOnce({
      id: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });

    const response = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'user@mail.com',
      password: 'secret123',
      username: 'test-user',
      ignored: 'field',
    });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({
      id: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
    expect(registerUserUseCase.execute.mock.calls).toHaveLength(1);
    expect(registerUserUseCase.execute.mock.calls[0][0]).toMatchObject({
      email: 'user@mail.com',
      password: 'secret123',
      username: 'test-user',
    });
    expect(registerUserUseCase.execute.mock.calls[0][0]).not.toHaveProperty('ignored');
  });

  it('POST /auth/register rejects invalid payloads before reaching the use case', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'not-an-email',
      password: '123',
      username: 'A!',
    });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'password must be longer than or equal to 6 characters',
        'username must be longer than or equal to 3 characters',
        'username must contain only lowercase letters, numbers, hyphens, or underscores',
      ]),
    );
    expect(registerUserUseCase.execute).not.toHaveBeenCalled();
  });

  it('POST /auth/login returns the generated token', async () => {
    loginUserUseCase.execute.mockResolvedValueOnce({
      token: 'jwt-token',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@mail.com',
      password: 'secret123',
    });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ token: 'jwt-token' });
    expect(loginUserUseCase.execute.mock.calls).toHaveLength(1);
    expect(loginUserUseCase.execute.mock.calls[0][0]).toMatchObject({
      email: 'user@mail.com',
      password: 'secret123',
    });
  });

  it('GET /auth/profile returns the authenticated user injected by the guard', async () => {
    const response = await request(app.getHttpServer()).get('/auth/profile').set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      userId: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
    expect(jwtGuardSpy).toHaveBeenCalledTimes(1);
  });

  it('GET /health returns the service health payload', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      service: 'identity',
      status: 'ok',
      transports: ['http', 'tcp'],
    });
  });
});
