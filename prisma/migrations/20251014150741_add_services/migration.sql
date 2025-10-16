/*
  Warnings:

  - You are about to drop the column `codigo` on the `Services` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `Services` table. All the data in the column will be lost.
  - Added the required column `code` to the `Services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Services` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Services" ("active", "createdAt", "id", "updatedAt") SELECT "active", "createdAt", "id", "updatedAt" FROM "Services";
DROP TABLE "Services";
ALTER TABLE "new_Services" RENAME TO "Services";
CREATE UNIQUE INDEX "Services_description_key" ON "Services"("description");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
