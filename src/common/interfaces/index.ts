import { UserRole } from 'src/modules/auth/entities/user.entity';

export interface IResponse<ResponseType = Array<object> | object | undefined> {
  statusCode: number;
  response?: ResponseType;
  message: string;
}

export interface PaginationResponse<listType> {
  data: listType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface Relation {
  select: boolean;
  property: string;
  alias: string;
  condition?: string;
  parameters?: unknown;
}

export interface FilterModifier {
  clause: string;
  param: object;
}

export interface Filter<RawInputType, ParseInputType> {
  matchKey(filterKey: string): boolean;
  validateValue(value: RawInputType): ParseInputType | null;
  createQueryModifier(value: ParseInputType | null): FilterModifier | null;
}

export interface Order<RawInputType> {
  matchKey(filterKey: string): boolean;
  validateValue(value: RawInputType): 'ASC' | 'DESC';
  createOrderModifier(value: 'ASC' | 'DESC'): OrderModifier | null;
}

export interface OrderModifier {
  column: string;
  order: 'ASC' | 'DESC';
}

export interface AuthUserInterface {
  email: string;
  userId: number;
  role: UserRole;
  sessionKey: string;
}
