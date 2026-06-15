import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should return user when valid', () => {
    const user = { userId: 1, email: 'test@test.com' };
    const result = guard.handleRequest(null, user, null as any);
    expect(result).toBe(user);
  });

  it('should throw ForbiddenException when info is TokenExpiredError', () => {
    const info = { name: 'TokenExpiredError', message: '' };
    expect(() => guard.handleRequest(null, null, info)).toThrow(ForbiddenException);
    expect(() => guard.handleRequest(null, null, info)).toThrow('Token is invalid or expired');
  });

  it('should throw ForbiddenException when info is JsonWebTokenError', () => {
    const info = { name: 'JsonWebTokenError', message: '' };
    expect(() => guard.handleRequest(null, null, info)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when err is present', () => {
    expect(() => guard.handleRequest(new Error('err'), null, null as any)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.handleRequest(new Error('err'), null, null as any)).toThrow('Access Denied');
  });

  it('should throw ForbiddenException when user is falsy', () => {
    expect(() => guard.handleRequest(null, null, null as any)).toThrow(ForbiddenException);
  });
});
