import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, message?: string) {
  return NextResponse.json({ data, ...(message && { message }) }, { status: 200 });
}

export function created<T>(data: T, message?: string) {
  return NextResponse.json({ data, ...(message && { message }) }, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  const body: Record<string, unknown> = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function internalError(message = "Erro interno do servidor") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return badRequest("Dados inválidos", error.flatten());
  }

  if (error instanceof Error) {
    const notFoundErrors = ["NotFoundError", "UserNotFoundError", "DemandNotFoundError"];
    if (notFoundErrors.includes(error.name)) return notFound(error.message);

    const badRequestErrors = [
      "EmailAlreadyExistsError",
      "InvalidStatusTransitionError",
      "PermissionDeniedError",
      "SelfRoleChangeError",
      "AuthError",
    ];
    if (badRequestErrors.includes(error.name)) return badRequest(error.message);

    console.error("[API Error]", error);
    return internalError(error.message);
  }

  return internalError();
}
