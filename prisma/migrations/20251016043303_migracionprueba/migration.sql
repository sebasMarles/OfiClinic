/*
  Warnings:

  - Made the column `phone` on table `Professional` required. This step will fail if there are existing NULL values in that column.
  - Made the column `specialty` on table `Professional` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Professional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "crack" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Professional" ("active", "createdAt", "email", "fullName", "id", "phone", "specialty", "updatedAt") SELECT "active", "createdAt", "email", "fullName", "id", "phone", "specialty", "updatedAt" FROM "Professional";
DROP TABLE "Professional";
ALTER TABLE "new_Professional" RENAME TO "Professional";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
