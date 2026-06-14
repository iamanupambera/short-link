import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatus1781462113495 implements MigrationInterface {
  name = 'AddUserStatus1781462113495';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`status\` enum ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`status\``);
  }
}
