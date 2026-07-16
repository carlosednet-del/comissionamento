"use client";

import { useState, useTransition } from "react";
import { toggleEntraIdAction } from "@/server/actions/authProviderActions";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label }  from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Mail } from "lucide-react";

type Props = {
  initialValue: boolean;
};

export function AuthProviderToggle({ initialValue }: Props) {
  const [useEntraId, setUseEntraId] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      const result = await toggleEntraIdAction(checked);
      if (result.success) {
        setUseEntraId(checked);
        toast.success(
          checked
            ? "Login via Microsoft Entra ID ativado."
            : "Login via e-mail e senha reativado.",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            {useEntraId ? (
              <ShieldCheck className="h-5 w-5 text-primary" />
            ) : (
              <Mail className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium leading-none">
              Autenticação via Microsoft Entra ID
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {useEntraId
                ? "Login por e-mail e senha está desabilitado."
                : "Desabilitado — usuários entram com e-mail e senha."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="entra-id-toggle" className="text-xs text-muted-foreground">
            {useEntraId ? "Ativo" : "Inativo"}
          </Label>
          <Switch
            id="entra-id-toggle"
            checked={useEntraId}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
