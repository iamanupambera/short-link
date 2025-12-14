import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'otp' })
export class Otp {
  @PrimaryColumn()
  otp: string;

  @PrimaryColumn()
  email: string;

  @Column({ default: 0 })
  count: number;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @DeleteDateColumn({ select: false })
  expiredAt: Date;
}
