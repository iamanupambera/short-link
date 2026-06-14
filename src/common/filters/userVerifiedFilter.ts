import { Filter, FilterModifier } from '../interfaces';

export class UserVerifiedFilter implements Filter<string, boolean> {
  createQueryModifier(value: boolean | null): FilterModifier | null {
    if (value === null) return null;
    return {
      clause: 'user.isEmailVerified = :isEmailVerified',
      param: { isEmailVerified: value },
    };
  }

  matchKey(filterKey: string): boolean {
    return filterKey === 'isEmailVerified';
  }

  validateValue(value: string): boolean | null {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  }
}
