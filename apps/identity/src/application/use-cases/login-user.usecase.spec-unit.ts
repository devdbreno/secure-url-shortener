import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { USER_REPOSITORY } from '@application/constants';
import { LoginUserUseCase } from '@application/use-cases/login-user.usecase';
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository';
import { LoginDTO } from '@presentation/dto/login.dto';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

import { compare } from 'bcryptjs';

describe('LoginUserUseCase', () => {
  let userRepoMock: jest.Mocked<IUserRepository>;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let loginUserUseCase: LoginUserUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserUseCase,
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
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    userRepoMock = module.get(USER_REPOSITORY);
    jwtServiceMock = module.get(JwtService);
    loginUserUseCase = module.get(LoginUserUseCase);
  });

  it('returns a token for a valid user', async () => {
    const dto = { email: 'user@mail.com', password: 'secret' } as LoginDTO;
    const user = new User('1', dto.email, 'hash', 'test-user', new Date(), new Date(), null);

    userRepoMock.findByEmail.mockResolvedValueOnce(user);
    (compare as jest.Mock).mockResolvedValueOnce(true);
    jwtServiceMock.signAsync.mockResolvedValueOnce('jwt-token');

    const result = await loginUserUseCase.execute(dto);

    expect(compare).toHaveBeenCalledWith(dto.password, user.passwordHash);
    expect(jwtServiceMock.signAsync.mock.calls).toEqual([
      [{ email: user.email, sub: user.id, username: user.username }],
    ]);
    expect(result).toEqual({ token: 'jwt-token' });
  });

  it('throws when the user does not exist or is deleted', async () => {
    const dto = { email: 'user@mail.com', password: 'secret' } as LoginDTO;

    userRepoMock.findByEmail.mockResolvedValueOnce(null);

    await expect(loginUserUseCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('throws when the password does not match', async () => {
    const dto = { email: 'user@mail.com', password: 'secret' } as LoginDTO;
    const user = new User('1', dto.email, 'hash', 'test-user', new Date(), new Date(), null);

    userRepoMock.findByEmail.mockResolvedValueOnce(user);
    (compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(loginUserUseCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });
});
