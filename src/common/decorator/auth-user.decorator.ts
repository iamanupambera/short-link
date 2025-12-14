import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const AuthUser = createParamDecorator((data: 'userId' | 'email', ctx: ExecutionContext) => {
  const request: Request = ctx.switchToHttp().getRequest();
  const user = request.user;

  return data ? user[data] : user;
});
