/*
  Warnings:

  - You are about to drop the column `category` on the `PackageRule` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `PackageRule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PackageRule" DROP COLUMN "category",
DROP COLUMN "instructions";

-- CreateTable
CREATE TABLE "InstructionCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT[],
    "packageRuleId" INTEGER NOT NULL,

    CONSTRAINT "InstructionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstructionCategory_packageRuleId_idx" ON "InstructionCategory"("packageRuleId");

-- AddForeignKey
ALTER TABLE "InstructionCategory" ADD CONSTRAINT "InstructionCategory_packageRuleId_fkey" FOREIGN KEY ("packageRuleId") REFERENCES "PackageRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
