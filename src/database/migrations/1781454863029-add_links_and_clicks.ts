import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinksAndClicks1781454863029 implements MigrationInterface {
  name = 'AddLinksAndClicks1781454863029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`click\` (\`id\` int NOT NULL AUTO_INCREMENT, \`linkId\` int NOT NULL, \`ipHash\` varchar(255) NOT NULL, \`country\` varchar(255) NULL, \`browser\` varchar(255) NULL, \`device\` varchar(255) NULL, \`referrer\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`link\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NULL, \`shortCode\` varchar(255) NOT NULL, \`originalUrl\` text NOT NULL, \`customAlias\` varchar(255) NULL, \`passwordHash\` varchar(255) NULL, \`expiresAt\` datetime NULL, \`status\` enum ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2206f315a07973a6b30317dafa\` (\`shortCode\`), UNIQUE INDEX \`IDX_b06e18bf47b465d5cbb64bd6f7\` (\`customAlias\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`click\` ADD CONSTRAINT \`FK_13f4beaa9faba6df2eb290243d5\` FOREIGN KEY (\`linkId\`) REFERENCES \`link\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`link\` ADD CONSTRAINT \`FK_14a562b14bb83fc8ba73d30d3e0\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`link\` DROP FOREIGN KEY \`FK_14a562b14bb83fc8ba73d30d3e0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`click\` DROP FOREIGN KEY \`FK_13f4beaa9faba6df2eb290243d5\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_b06e18bf47b465d5cbb64bd6f7\` ON \`link\``);
    await queryRunner.query(`DROP INDEX \`IDX_2206f315a07973a6b30317dafa\` ON \`link\``);
    await queryRunner.query(`DROP TABLE \`link\``);
    await queryRunner.query(`DROP TABLE \`click\``);
  }
}
