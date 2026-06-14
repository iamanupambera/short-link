/* eslint-disable no-console */
import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../modules/auth/entities/user.entity';
import { UserPassword } from '../../modules/auth/entities/user-password.entity';

export default class SuperAdminSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const userPasswordRepository = dataSource.getRepository(UserPassword);

    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@shortlink.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecurePassword123!';

    const existingUser = await userRepository.findOne({ where: { email } });
    if (!existingUser) {
      const user = userRepository.create({
        name: 'Super Admin',
        email,
        role: UserRole.SUPER_ADMIN,
        isEmailVerified: true,
      });
      const savedUser = await userRepository.save(user);

      const userPassword = userPasswordRepository.create({
        password,
        user: savedUser,
      });
      await userPasswordRepository.save(userPassword);
      console.log(`Seeded default super admin user with email: ${email}`);
    } else {
      console.log(`Super admin user with email ${email} already exists.`);
    }
  }
}
