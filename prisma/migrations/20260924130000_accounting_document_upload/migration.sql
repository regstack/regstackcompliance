-- CreateTable
CREATE TABLE "accounting_document_files" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "documentType" "AccountingDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileObjectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileMime" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT NOT NULL,

    CONSTRAINT "accounting_document_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_document_files_institutionId_idx" ON "accounting_document_files"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_document_files_documentType_documentId_key" ON "accounting_document_files"("documentType", "documentId");

-- AddForeignKey
ALTER TABLE "accounting_document_files" ADD CONSTRAINT "accounting_document_files_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity (backend-only, no policies — see 20260919200000_enable_rls_new_module_tables_backend_only)
ALTER TABLE "public"."accounting_document_files" ENABLE ROW LEVEL SECURITY;
