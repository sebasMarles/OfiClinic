-- CreateTable
CREATE TABLE "ConfigCrud" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enable_selection" BOOLEAN DEFAULT true,
    "enable_multi_selection" BOOLEAN DEFAULT true,
    "enable_pagination" BOOLEAN DEFAULT true,
    "page_size" INTEGER NOT NULL DEFAULT 10,
    "enableSearch" BOOLEAN DEFAULT true,
    "search_place_holder" TEXT DEFAULT 'Search...',
    "enable_filters" BOOLEAN DEFAULT true,
    "enable_export" BOOLEAN DEFAULT true,
    "relations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bulk_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "row_actions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigCrud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigCrudDetail" (
    "id" TEXT NOT NULL,
    "config_crud_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortable" BOOLEAN DEFAULT true,
    "filterable" BOOLEAN DEFAULT true,
    "frozen" BOOLEAN DEFAULT false,
    "required" BOOLEAN DEFAULT false,
    "hidden" BOOLEAN DEFAULT false,
    "hideable" BOOLEAN DEFAULT false,
    "render" TEXT,
    "list_options" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigCrudDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigCrud_model_key" ON "ConfigCrud"("model");

-- CreateIndex
CREATE INDEX "ConfigCrudDetail_config_crud_id_idx" ON "ConfigCrudDetail"("config_crud_id");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigCrudDetail_config_crud_id_key_key" ON "ConfigCrudDetail"("config_crud_id", "key");

-- AddForeignKey
ALTER TABLE "ConfigCrudDetail" ADD CONSTRAINT "ConfigCrudDetail_config_crud_id_fkey" FOREIGN KEY ("config_crud_id") REFERENCES "ConfigCrud"("id") ON DELETE CASCADE ON UPDATE CASCADE;
