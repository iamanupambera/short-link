import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Link } from '../../links/entities/link.entity';

@Entity({ name: 'click' })
export class Click {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Link, (link) => link.clicks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linkId' })
  link: Link;

  @Column()
  linkId: number;

  @Column()
  ipHash: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  browser: string;

  @Column({ nullable: true })
  device: string;

  @Column({ nullable: true })
  referrer: string;

  @CreateDateColumn()
  createdAt: Date;
}
