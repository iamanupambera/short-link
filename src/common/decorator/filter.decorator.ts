import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { FilterModifier } from '../interfaces';

export const Filter = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FilterModifier[] => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.filters || [];
  },
);
