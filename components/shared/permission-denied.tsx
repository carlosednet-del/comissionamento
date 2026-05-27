import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldX } from "lucide-react";

export function PermissionDenied({ message }: { message?: string }) {
  return (
    <Alert variant="destructive" className="max-w-lg">
      <ShieldX className="h-4 w-4" />
      <AlertTitle>Acesso negado</AlertTitle>
      <AlertDescription>
        {message ?? "Você não tem permissão para acessar este recurso."}
      </AlertDescription>
    </Alert>
  );
}
