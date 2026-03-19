import { Result } from '@application/result';
import { ResultExceptionFilter } from '@infra/filters/result-exception.filter';

describe('ResultExceptionFilter', () => {
  it('maps a failed result to an http response', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    };

    const filter = new ResultExceptionFilter();

    filter.catch(
      Result.fail({
        status: 404,
        message: 'not found',
      }),
      host as never,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.send).toHaveBeenCalledWith({
      status: 'error',
      message: 'not found',
    });
  });
});
