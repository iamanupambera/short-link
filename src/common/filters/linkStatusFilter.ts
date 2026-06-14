import { Filter, FilterModifier } from '../interfaces';

export class LinkStatusFilter implements Filter<string, string> {
  createQueryModifier(value: string | null): FilterModifier | null {
    if (!value) return null;
    return {
      clause: 'link.status = :status',
      param: { status: value },
    };
  }

  matchKey(filterKey: string): boolean {
    return filterKey === 'status';
  }

  validateValue(value: string): string | null {
    if (!value) return null;
    return value;
  }
}
