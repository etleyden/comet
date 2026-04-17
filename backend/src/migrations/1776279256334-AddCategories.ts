import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategories1776279256334 implements MigrationInterface {
    name = 'AddCategories1776279256334'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // drop foreign key constraint on category.userId before modifying the category table
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_32b856438dffdc269fa84434d9f"`);
        // create category override table
        await queryRunner.query(`CREATE TABLE "user_category_override" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customDescription" character varying, "userId" uuid NOT NULL, "categoryId" uuid NOT NULL, CONSTRAINT "UQ_6928272068f36ea61702ff12606" UNIQUE ("userId", "categoryId"), CONSTRAINT "PK_3399049a14847523d59e84080c0" PRIMARY KEY ("id"))`);
        // drop columns from category and add new ones for the new structure
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "category" ADD "defaultDescription" character varying`);
        await queryRunner.query(`ALTER TABLE "category" ADD "isDeprecated" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "category" ADD "parentId" uuid`);
        await queryRunner.query(`ALTER TABLE "category" ADD "createdById" uuid`);
        await queryRunner.query(`ALTER TABLE "category" ADD "updatedById" uuid`);
        // add constraints
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "UQ_category_name_parent" UNIQUE ("name", "parentId")`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "FK_50c69cdc9b3e7494784a2fa2db4" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "FK_a5d7b5b0fc1f7358541b14b242d" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_category_override" ADD CONSTRAINT "FK_5fc27e416df7701df3dd71b456c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_category_override" ADD CONSTRAINT "FK_1057371d415569f0360ce607b6a" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // remove constraints before dropping columns and tables
        await queryRunner.query(`ALTER TABLE "user_category_override" DROP CONSTRAINT "FK_1057371d415569f0360ce607b6a"`);
        await queryRunner.query(`ALTER TABLE "user_category_override" DROP CONSTRAINT "FK_5fc27e416df7701df3dd71b456c"`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_a5d7b5b0fc1f7358541b14b242d"`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_50c69cdc9b3e7494784a2fa2db4"`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10"`);
        await queryRunner.query(`ALTER TABLE "category" DROP CONSTRAINT "UQ_category_name_parent"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "updatedById"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "isDeprecated"`);
        await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "defaultDescription"`);
        await queryRunner.query(`ALTER TABLE "category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "category" ADD "userId" uuid`);
        await queryRunner.query(`DROP TABLE "user_category_override"`);
        await queryRunner.query(`ALTER TABLE "category" ADD CONSTRAINT "FK_32b856438dffdc269fa84434d9f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
