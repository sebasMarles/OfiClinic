/*
  Warnings:

  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DynamicRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Field` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `crack` on the `Professional` table. All the data in the column will be lost.
  - Made the column `birthDate` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `Patient` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Patient` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Collection_slug_key";

-- DropIndex
DROP INDEX "Field_collectionId_key_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Collection";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DynamicRecord";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Field";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT,
    "price" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Patient" ("active", "birthDate", "createdAt", "documentNumber", "documentType", "email", "firstName", "gender", "id", "lastName", "phone", "updatedAt") SELECT "active", "birthDate", "createdAt", "documentNumber", "documentType", "email", "firstName", "gender", "id", "lastName", "phone", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_documentNumber_key" ON "Patient"("documentNumber");
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");
CREATE TABLE "new_Professional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Professional" ("active", "createdAt", "email", "fullName", "id", "phone", "specialty", "updatedAt") SELECT "active", "createdAt", "email", "fullName", "id", "phone", "specialty", "updatedAt" FROM "Professional";
DROP TABLE "Professional";
ALTER TABLE "new_Professional" RENAME TO "Professional";
CREATE TABLE "new_Recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "firstName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Recipes" ("active", "createdAt", "description", "firstName", "id", "updatedAt") SELECT "active", "createdAt", "description", "firstName", "id", "updatedAt" FROM "Recipes";
DROP TABLE "Recipes";
ALTER TABLE "new_Recipes" RENAME TO "Recipes";
CREATE TABLE "new_Services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Services" ("active", "code", "createdAt", "description", "id", "updatedAt") SELECT "active", "code", "createdAt", "description", "id", "updatedAt" FROM "Services";
DROP TABLE "Services";
ALTER TABLE "new_Services" RENAME TO "Services";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
