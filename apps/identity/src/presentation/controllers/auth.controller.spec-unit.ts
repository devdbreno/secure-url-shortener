import { AuthController } from '@presentation/controllers/auth.controller';

describe('AuthController', () => {
  const findUserByUsername = { execute: jest.fn() };
  const loginUser = { execute: jest.fn() };
  const registerUser = { execute: jest.fn() };
  const validateUserToken = { execute: jest.fn() };

  const controller = new AuthController(
    loginUser as never,
    registerUser as never,
    validateUserToken as never,
    findUserByUsername as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates token validation', async () => {
    validateUserToken.execute.mockResolvedValueOnce({ isSuccess: true });

    await expect(controller.validateToken({ token: 'jwt' })).resolves.toEqual({ isSuccess: true });
    expect(validateUserToken.execute).toHaveBeenCalledWith('jwt');
  });

  it('returns the authenticated user profile', () => {
    const user = { userId: '1', email: 'user@mail.com', username: 'test-user' };

    expect(controller.profile({ user } as never)).toEqual(user);
  });

  it('returns only id, email and username when registering', async () => {
    registerUser.execute.mockResolvedValueOnce({
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
      passwordHash: 'hash',
    });

    await expect(
      controller.register({ email: 'user@mail.com', password: 'secret', username: 'test-user' } as never),
    ).resolves.toEqual({
      id: '1',
      email: 'user@mail.com',
      username: 'test-user',
    });
  });

  it('delegates username lookup', async () => {
    findUserByUsername.execute.mockResolvedValueOnce({ isSuccess: true });

    await expect(controller.findByUsername({ username: 'test-user' })).resolves.toEqual({ isSuccess: true });
    expect(findUserByUsername.execute).toHaveBeenCalledWith('test-user');
  });

  it('delegates login and returns the token payload', async () => {
    loginUser.execute.mockResolvedValueOnce({ token: 'jwt-token' });

    await expect(controller.login({ email: 'user@mail.com', password: 'secret' } as never)).resolves.toEqual({
      token: 'jwt-token',
    });
  });
});
