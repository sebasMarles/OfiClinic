-- CreateTable
CREATE TABLE "newModel" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "price" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newModel_pkey" PRIMARY KEY ("id")
);
