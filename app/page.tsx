import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Root() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as { role?: string }).role ?? "";
    redirect(role === "DAP" ? "/fechamento-dap" : "/dashboard");
  }
  redirect("/login");
}
