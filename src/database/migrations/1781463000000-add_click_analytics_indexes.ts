import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClickAnalyticsIndexes1781463000000 implements MigrationInterface {
  name = 'AddClickAnalyticsIndexes1781463000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_click_linkId` ON `click` (`linkId`)');
    await queryRunner.query('CREATE INDEX `IDX_click_createdAt` ON `click` (`createdAt`)');
    await queryRunner.query(
      'CREATE INDEX `IDX_click_linkId_createdAt` ON `click` (`linkId`, `createdAt`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_link_userId_createdAt` ON `link` (`userId`, `createdAt`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_link_userId_createdAt` ON `link`');
    await queryRunner.query('DROP INDEX `IDX_click_linkId_createdAt` ON `click`');
    await queryRunner.query('DROP INDEX `IDX_click_createdAt` ON `click`');
    await queryRunner.query('DROP INDEX `IDX_click_linkId` ON `click`');
  }
}
