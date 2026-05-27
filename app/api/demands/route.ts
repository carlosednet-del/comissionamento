import { NextRequest } from "next/server";
import { demandService } from "@/services/demandService";
import { ok, created, handleError } from "@/lib/apiResponse";
import type { DemandStatus, DemandPriority, DemandType } from "@prisma/client";

// GET /api/demands
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await demandService.listDemands({
      status: (searchParams.get("status") as DemandStatus) ?? undefined,
      priority: (searchParams.get("priority") as DemandPriority) ?? undefined,
      demandType: (searchParams.get("demandType") as DemandType) ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
      creatorId: searchParams.get("creatorId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.has("pageSize") ? Number(searchParams.get("pageSize")) : 20,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/demands
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorId = request.headers.get("x-actor-id") ?? body.creatorId;
    const demand = await demandService.createDemand(body, actorId);
    return created(demand, "Demanda criada com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
