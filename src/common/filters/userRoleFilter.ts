import { Filter, FilterModifier } from '../interfaces';

export class UserRoleFilter implements Filter<string, string> {
  createQueryModifier(value: string | null): FilterModifier | null {
    if (!value) return null;
    return {
      clause: 'user.role = :role',
      param: { role: value },
    };
  }

  matchKey(filterKey: string): boolean {
    return filterKey === 'role';
  }

  validateValue(value: string): string | null {
    if (!value) return null;
    return value;
  }
}
