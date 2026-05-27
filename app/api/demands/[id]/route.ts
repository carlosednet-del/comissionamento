import { NextRequest } from "next/server";
import { demandService } from "@/services/demandService";
import { ok, handleError } from "@/lib/apiResponse";

// GET /api/demands/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const demand = await demandService.getById(id);
    return ok(demand);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/demands/:id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const actorId = request.headers.get("x-actor-id") ?? body.actorId;
    const demand = await demandService.updateDemand(id, body, actorId);
    return ok(demand, "Demanda atualizada com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
