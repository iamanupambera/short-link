import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { FiltersGuard } from './filters.guard';
import { Filter, FilterModifier } from '../interfaces';

class MockFilter implements Filter<string, string> {
  matchKey(filterKey: string): boolean {
    return filterKey === 'status';
  }
  validateValue(value: string): string | null {
    return value || null;
  }
  createQueryModifier(value: string | null): FilterModifier | null {
    if (!value) return null;
    return { clause: 'entity.status = :status', param: { status: value } };
  }
}

describe('FiltersGuard', () => {
  it('should parse filters from query string and attach to request', () => {
    const guard = new FiltersGuard([new MockFilter()]);
    const request: any = {
      url: '/links?filters[status]=ACTIVE',
      filters: undefined,
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.filters).toEqual([
      { clause: 'entity.status = :status', param: { status: 'ACTIVE' } },
    ]);
  });

  it('should set empty filters when no filter query params', () => {
    const guard = new FiltersGuard([new MockFilter()]);
    const request: any = { url: '/links', filters: undefined };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.filters).toEqual([]);
  });

  it('should throw BadRequestException for unknown filter key', () => {
    const guard = new FiltersGuard([new MockFilter()]);
    const request: any = {
      url: '/links?filters[unknown]=value',
      filters: undefined,
    };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(ctx)).toThrow(BadRequestException);
  });
});
