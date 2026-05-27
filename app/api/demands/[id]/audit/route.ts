import { NextRequest } from "next/server";
import { demandService } from "@/services/demandService";
import { ok, handleError } from "@/lib/apiResponse";

// GET /api/demands/:id/audit
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const logs = await demandService.getAuditLogs(id);
    return ok(logs);
  } catch (error) {
    return handleError(error);
  }
}
