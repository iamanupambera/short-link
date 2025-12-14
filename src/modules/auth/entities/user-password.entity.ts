import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { compare, hash } from 'bcrypt';

@Entity({ name: 'user_password' })
export class UserPassword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  password: string;

  @OneToOne(() => User, (user) => user.password, {
    cascade: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    this.password = await hash(this.password, 8);
  }

  async validatePassword(password: string) {
    return compare(password, this.password);
  }
}
