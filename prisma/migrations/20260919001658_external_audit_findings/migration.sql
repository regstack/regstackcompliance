-- CreateTable
CREATE TABLE "externe_pruefungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "pruefer" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "berichtsdatum" TIMESTAMP(3),
    "glKenntnisnahmeByUserId" TEXT,
    "glKenntnisnahmeAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "externe_pruefungen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "externe_pruefung_feststellungen" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "externePruefungId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "schweregrad" "Schweregrad",
    "frist" TIMESTAMP(3),
    "modul" "EvidenceModule",
    "fachbereich" TEXT,
    "verantwortlichUserId" TEXT,
    "status" "FeststellungStatus" NOT NULL DEFAULT 'offen',
    "verteiltAm" TIMESTAMP(3),
    "verteiltVon" TEXT,
    "fachbereichErledigtAm" TIMESTAMP(3),
    "fachbereichErledigtVon" TEXT,
    "wirksamkeitBestaetigtAm" TIMESTAMP(3),
    "wirksamkeitBestaetigtVon" TEXT,
    "geschlossenAm" TIMESTAMP(3),
    "geschlossenVon" TEXT,
    "akzeptiertesRisikoEntscheider" TEXT,
    "akzeptiertesRisikoUeberpruefung" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "externe_pruefung_feststellungen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "externe_pruefungen_institutionId_idx" ON "externe_pruefungen"("institutionId");

-- CreateIndex
CREATE INDEX "externe_pruefung_feststellungen_institutionId_idx" ON "externe_pruefung_feststellungen"("institutionId");

-- CreateIndex
CREATE INDEX "externe_pruefung_feststellungen_externePruefungId_idx" ON "externe_pruefung_feststellungen"("externePruefungId");

-- AddForeignKey
ALTER TABLE "externe_pruefungen" ADD CONSTRAINT "externe_pruefungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "externe_pruefung_feststellungen" ADD CONSTRAINT "externe_pruefung_feststellungen_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institution_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "externe_pruefung_feststellungen" ADD CONSTRAINT "externe_pruefung_feststellungen_externePruefungId_fkey" FOREIGN KEY ("externePruefungId") REFERENCES "externe_pruefungen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
