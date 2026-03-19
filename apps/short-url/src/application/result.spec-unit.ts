import { AppError } from './error-types';
import { Result } from './result';

describe('Result', () => {
  it('creates a successful result with a value', () => {
    const result = Result.ok({ id: '1' });

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ id: '1' });
    expect(result.error).toBeUndefined();
  });

  it('creates a failed result with an error', () => {
    const error: AppError = { status: 400, message: 'failure' };
    const result = Result.fail(error);

    expect(result.isSuccess).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.error).toEqual(error);
  });
});
