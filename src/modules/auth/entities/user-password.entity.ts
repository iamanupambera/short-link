import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
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
  @BeforeUpdate()
  async hashPasswordBeforeSave() {
    if (this.password && !this.password.startsWith('$2b$') && !this.password.startsWith('$2a$')) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
      this.password = await hash(this.password, saltRounds);
    }
  }

  async validatePassword(password: string) {
    return compare(password, this.password);
  }
}
