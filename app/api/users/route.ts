import { NextRequest } from "next/server";
import { userService } from "@/services/userService";
import { ok, created, handleError } from "@/lib/apiResponse";
import { getCurrentUser, toPermissionUser } from "@/server/auth/helpers";

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const users = await userService.listUsers({
      search: searchParams.get("search") ?? undefined,
      isActive: searchParams.has("isActive")
        ? searchParams.get("isActive") === "true"
        : undefined,
    });
    return ok(users);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const actor = await getCurrentUser();
    if (!actor) return handleError(new Error("Não autenticado"));
    const body = await request.json();
    const user = await userService.createUser(body, toPermissionUser(actor));
    return created(user, "Usuário criado com sucesso");
  } catch (error) {
    return handleError(error);
  }
}
