import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AuthUserInterface } from '../interfaces';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUserInterface>(
    err: any,
    user: TUser,
    info: Error | TokenExpiredError | JsonWebTokenError,
  ): TUser {
    if (info?.name === 'TokenExpiredError' || info?.name === 'JsonWebTokenError') {
      throw new ForbiddenException(' Token is invalid or expired');
    }

    if (err || !user) {
      throw new ForbiddenException('Access Denied');
    }

    return user;
  }
}
