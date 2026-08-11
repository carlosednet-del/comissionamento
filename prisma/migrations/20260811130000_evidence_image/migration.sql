-- Armazena imagens de evidencia no proprio banco (substitui o Supabase Storage).
-- Servidas por /api/evidence/[id]; DemandEvidence.url aponta para essa rota.
CREATE TABLE "evidence_images" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_images_pkey" PRIMARY KEY ("id")
);
