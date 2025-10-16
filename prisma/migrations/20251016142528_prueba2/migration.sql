-- CreateTable
CREATE TABLE "Prueba2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
