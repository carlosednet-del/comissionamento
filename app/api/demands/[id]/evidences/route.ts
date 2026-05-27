import { NextRequest } from "next/server";
import { demandService } from "@/services/demandService";
import { ok, created, handleError } from "@/lib/apiResponse";

// GET /api/demands/:id/evidences
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const evidences = await demandService.getEvidences(id);
    return ok(evidences);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/demands/:id/evidences
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const actorId = request.headers.get("x-actor-id") ?? body.actorId;
    const evidence = await demandService.addEvidence({ ...body, demandId: id }, actorId);
    return created(evidence, "Evidência adicionada com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
