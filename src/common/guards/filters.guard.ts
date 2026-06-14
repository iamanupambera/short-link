import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import * as qs from 'qs';
import { Filter, FilterModifier } from '../interfaces';

@Injectable()
export class FiltersGuard implements CanActivate {
  constructor(private readonly filters: Filter<unknown, unknown>[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const rawQuery = request.url.split('?')[1] ?? '';
    const parsedQuery = qs.parse(rawQuery);

    // Safely extract request filters
    const requestFilters = (parsedQuery.filters ?? {}) as Record<string, unknown>;

    const parsedFilters = this.parseFilters(requestFilters);
    request.filters = parsedFilters;

    return true;
  }

  private parseFilters(requestFilters: Record<string, unknown>): FilterModifier[] {
    const filterEntries = requestFilters ? Object.entries(requestFilters) : [];
    const modifiers: FilterModifier[] = [];

    for (const [key, value] of filterEntries) {
      const filter = this.filters.find((f) => f.matchKey(key));
      if (!filter) {
        throw new BadRequestException(`Unknown filter key: ${key}`);
      }
      const parsedValue = filter.validateValue(value);
      const filterModifier = filter.createQueryModifier(parsedValue);
      if (filterModifier) {
        modifiers.push(filterModifier);
      }
    }
    return modifiers;
  }
}
