import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { USER_REPOSITORY } from '@application/constants';
import { RegisterUserUseCase } from '@application/use-cases/register-user.usecase';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';
import { RegisterUserDTO } from '@presentation/dto/register.dto';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

import { hash } from 'bcryptjs';
import { plainToInstance } from 'class-transformer';

describe('RegisterUserUseCase', () => {
  let userRepoMock: jest.Mocked<IUserRepository>;
  let registerUserUseCase: RegisterUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserUseCase,
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
    registerUserUseCase = module.get(RegisterUserUseCase);
  });

  it('registers a user with a hashed password', async () => {
    const dto = plainToInstance(RegisterUserDTO, {
      email: 'test@mail.com',
      password: 'test-pass',
      username: ' TEST-USERNAME ',
    });

    const createdUser = new User('1', dto.email, 'hashed-password', dto.username, new Date(), new Date(), null);

    userRepoMock.findByEmail.mockResolvedValueOnce(null);
    userRepoMock.findByUsername.mockResolvedValueOnce(null);
    (hash as jest.Mock).mockResolvedValueOnce('hashed-password');
    userRepoMock.create.mockResolvedValueOnce(createdUser);

    const result = await registerUserUseCase.execute(dto);

    expect(hash).toHaveBeenCalledWith(dto.password, 10);
    expect(userRepoMock.create.mock.calls).toEqual([
      [
        {
          email: dto.email,
          username: dto.username,
          passwordHash: 'hashed-password',
        },
      ],
    ]);
    expect(result).toBe(createdUser);
  });

  it('throws when the email is already registered', async () => {
    const dto = new RegisterUserDTO('test@mail.com', 'testpass', 'test-user');

    userRepoMock.findByEmail.mockResolvedValueOnce(
      new User('1', dto.email, 'hashed-password', dto.username, new Date(), new Date(), null),
    );

    await expect(registerUserUseCase.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('throws when the username is already registered', async () => {
    const dto = new RegisterUserDTO('test@mail.com', 'testpass', 'test-user');

    userRepoMock.findByEmail.mockResolvedValueOnce(null);
    userRepoMock.findByUsername.mockResolvedValueOnce(
      new User('1', 'other@mail.com', 'hashed-password', dto.username, new Date(), new Date(), null),
    );

    await expect(registerUserUseCase.execute(dto)).rejects.toThrow(BadRequestException);
  });
});
