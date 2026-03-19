import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { USER_REPOSITORY } from '@application/constants';
import { Result } from '@application/result';
import { ValidateUserTokenUseCase } from '@application/use-cases/validate-user-token.usecase';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

describe('ValidateUserTokenUseCase', () => {
  let jwtServiceMock: jest.Mocked<JwtService>;
  let userRepoMock: jest.Mocked<IUserRepository>;
  let validateUserTokenUseCase: ValidateUserTokenUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserTokenUseCase,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: USER_REPOSITORY,
          useValue: {
            create: jest.fn(),
            delete: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            findByUsername: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtServiceMock = module.get(JwtService);
    userRepoMock = module.get(USER_REPOSITORY);
    validateUserTokenUseCase = module.get(ValidateUserTokenUseCase);
  });

  it('returns a successful result when the token is valid and the user exists', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValueOnce({
      sub: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
    userRepoMock.findById.mockResolvedValueOnce(
      new User('user-id', 'user@mail.com', 'hash', 'test-user', new Date(), new Date(), null),
    );

    const result = await validateUserTokenUseCase.execute('token');

    expect(result).toEqual(
      Result.ok({
        email: 'user@mail.com',
        userId: 'user-id',
        username: 'test-user',
      }),
    );
  });

  it('returns a failed result when the user is missing or inactive', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValueOnce({
      sub: 'user-id',
      email: 'user@mail.com',
      username: 'test-user',
    });
    userRepoMock.findById.mockResolvedValueOnce(null);

    const result = await validateUserTokenUseCase.execute('token');

    expect(result.isSuccess).toBe(false);
    expect(result.error).toEqual({
      status: 401,
      message: 'User not found or inactive!',
    });
  });

  it('returns a failed result when token verification throws', async () => {
    jwtServiceMock.verifyAsync.mockRejectedValueOnce(new Error('invalid token'));

    const result = await validateUserTokenUseCase.execute('token');

    expect(result.isSuccess).toBe(false);
    expect(result.error).toEqual({
      status: 401,
      message: 'User not found or inactive!',
    });
  });
});
