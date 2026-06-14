import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1781461740154 implements MigrationInterface {
  name = 'AddUserRole1781461740154';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`role\` enum ('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
  }
}
