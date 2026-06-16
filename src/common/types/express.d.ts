declare namespace Express {
  export interface Request {
    user: {
      userId: number;
      email: string;
      role: UserRole;
      sessionKey: string;
    };
    filters: { clause: string; param: object }[];
    order: { column: string; order: 'ASC' | 'DESC' };
  }
}
