import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1765736878982 implements MigrationInterface {
  name = 'Initial1765736878982';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`otp\` (\`otp\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`count\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`expiredAt\` datetime(6) NULL, PRIMARY KEY (\`otp\`, \`email\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`location\` varchar(255) NULL, \`profilePicture\` varchar(255) NULL, \`isEmailVerified\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_password\` (\`id\` int NOT NULL AUTO_INCREMENT, \`password\` varchar(255) NOT NULL, \`userId\` int NOT NULL, UNIQUE INDEX \`REL_3e755bee2cdcee50a9e742776d\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_password\` ADD CONSTRAINT \`FK_3e755bee2cdcee50a9e742776d8\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_password\` DROP FOREIGN KEY \`FK_3e755bee2cdcee50a9e742776d8\``,
    );
    await queryRunner.query(`DROP INDEX \`REL_3e755bee2cdcee50a9e742776d\` ON \`user_password\``);
    await queryRunner.query(`DROP TABLE \`user_password\``);
    await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
    await queryRunner.query(`DROP TABLE \`user\``);
    await queryRunner.query(`DROP TABLE \`otp\``);
  }
}
