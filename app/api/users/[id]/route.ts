import { NextRequest } from "next/server";
import { userService } from "@/services/userService";
import { ok, handleError } from "@/lib/apiResponse";
import { getCurrentUser, toPermissionUser } from "@/server/auth/helpers";

// GET /api/users/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await userService.getById(id);
    return ok(user);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/users/:id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getCurrentUser();
    if (!actor) return handleError(new Error("Não autenticado"));
    const body = await request.json();
    const user = await userService.updateUser(id, body, toPermissionUser(actor));
    return ok(user, "Usuário atualizado com sucesso");
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/users/:id (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await getCurrentUser();
    if (!actor) return handleError(new Error("Não autenticado"));
    const user = await userService.deactivateUser(id, toPermissionUser(actor));
    return ok(user, "Usuário desativado com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
