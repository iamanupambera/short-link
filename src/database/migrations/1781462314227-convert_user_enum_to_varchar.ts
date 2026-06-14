import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertUserEnumToVarchar1781462314227 implements MigrationInterface {
  name = 'ConvertUserEnumToVarchar1781462314227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`role\` varchar(50) NOT NULL DEFAULT 'USER'`,
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`status\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`status\` varchar(50) NOT NULL DEFAULT 'ACTIVE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`status\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`status\` enum ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`role\` enum ('USER', 'ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER'`,
    );
  }
}
