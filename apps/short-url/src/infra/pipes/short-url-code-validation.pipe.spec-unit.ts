import { BadRequestException } from '@nestjs/common';

import { ShortUrlCodeValidationPipe } from '@infra/pipes/short-url-code-validation.pipe';

describe('ShortUrlCodeValidationPipe', () => {
  const pipe = new ShortUrlCodeValidationPipe();

  it('returns valid short url codes', () => {
    expect(pipe.transform('abc12345')).toBe('abc12345');
    expect(pipe.transform('ab_12-3x')).toBe('ab_12-3x');
  });

  it('throws for invalid short url codes', () => {
    expect(() => pipe.transform('invalid-code')).toThrow(BadRequestException);
    expect(() => pipe.transform('abc123')).toThrow(BadRequestException);
    expect(() => pipe.transform('abc12.45')).toThrow(BadRequestException);
  });
});
