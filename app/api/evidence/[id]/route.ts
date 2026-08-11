import { requireAuth } from "@/server/auth/helpers";
import { prisma } from "@/lib/prisma";

/**
 * Serve a imagem de evidência armazenada no banco (tabela evidence_images).
 * Exige sessão — as imagens são internas, diferente do antigo bucket público.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAuth();

  const { id } = await params;
  const image = await prisma.evidenceImage.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  if (!image) {
    return new Response("Evidência não encontrada", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      // Conteúdo imutável (id único por upload) — cache agressivo, privado.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
