-- CreateTable
CREATE TABLE "PackageRule" (
    "id" SERIAL NOT NULL,
    "packageName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instructions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageRule_packageName_key" ON "PackageRule"("packageName");
