import { NextRequest } from "next/server";
import { demandService } from "@/services/demandService";
import { ok, handleError } from "@/lib/apiResponse";

// PATCH /api/demands/:id/status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const actorId = request.headers.get("x-actor-id") ?? body.actorId;
    const demand = await demandService.changeStatus(id, body, actorId);
    return ok(demand, "Status atualizado com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
