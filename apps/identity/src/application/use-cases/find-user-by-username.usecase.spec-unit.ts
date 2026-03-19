import { Test, TestingModule } from '@nestjs/testing';

import { USER_REPOSITORY } from '@application/constants';
import { Result } from '@application/result';
import { FindUserByUsernameUseCase } from '@application/use-cases/find-user-by-username.usecase';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';

describe('FindUserByUsernameUseCase', () => {
  let userRepoMock: jest.Mocked<IUserRepository>;
  let findUserByUsernameUseCase: FindUserByUsernameUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByUsernameUseCase,
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

    userRepoMock = module.get(USER_REPOSITORY);
    findUserByUsernameUseCase = module.get(FindUserByUsernameUseCase);
  });

  it('returns the public user payload when the username exists', async () => {
    userRepoMock.findByUsername.mockResolvedValueOnce(
      new User('user-id', 'user@mail.com', 'hash', 'test-user', new Date(), new Date(), null),
    );

    await expect(findUserByUsernameUseCase.execute('Test-User')).resolves.toEqual(
      Result.ok({
        userId: 'user-id',
        username: 'test-user',
      }),
    );
  });

  it('returns a not found result when the username does not exist', async () => {
    userRepoMock.findByUsername.mockResolvedValueOnce(null);

    const result = await findUserByUsernameUseCase.execute('missing-user');

    expect(result.isSuccess).toBe(false);
    expect(result.error).toEqual({
      status: 404,
      message: 'User not found or inactive!',
    });
  });
});
