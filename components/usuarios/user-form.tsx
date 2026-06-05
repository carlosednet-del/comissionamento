"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { UserRole, WorkerProfile } from "@prisma/client";
import { WORKER_PROFILE_LABELS } from "@/lib/demand-pricing";
import { createUserSchema, updateUserSchema } from "@/validations/user";
import type { CreateUserInput, UpdateUserInput } from "@/validations/user";
import { createUserAction, updateUserAction } from "@/server/actions/userActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: UserRole.ADMIN,       label: "Administrador" },
  { value: UserRole.GESTOR,      label: "Gestor" },
  { value: UserRole.DEV,         label: "Desenvolvedor" },
  { value: UserRole.SUPORTE,     label: "Suporte" },
  { value: UserRole.ARQUITETO,   label: "Arquiteto" },
  { value: UserRole.APROVADOR,   label: "Aprovador" },
  { value: UserRole.FINANCEIRO,  label: "Financeiro" },
  { value: UserRole.SOLICITANTE, label: "Solicitante" },
];

const TECHNICAL_ROLES: UserRole[] = [UserRole.DEV, UserRole.SUPORTE, UserRole.ARQUITETO];


type CreateMode = { mode: "create" };
type EditMode = {
  mode: "edit";
  userId: string;
  defaultValues: {
    name:              string;
    role:              UserRole;
    workerProfile:     WorkerProfile | null;
    monthlyBaseSalary: number | null;
    monthlyCapValue:   number | null;
    isActive:          boolean;
  };
};

type Props = CreateMode | EditMode;

export function UserForm(props: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isCreate = props.mode === "create";

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isCreate ? createUserSchema : updateUserSchema),
    defaultValues: isCreate
      ? { name: "", email: "", password: "", role: UserRole.DEV, workerProfile: null, monthlyBaseSalary: null, monthlyCapValue: null, isActive: true }
      : (props as EditMode).defaultValues,
  });

  const selectedRole = form.watch("role");
  const requiresProfile = TECHNICAL_ROLES.includes(selectedRole as UserRole);

  async function onSubmit(values: CreateUserInput | UpdateUserInput) {
    setServerError(null);

    const result = isCreate
      ? await createUserAction(values as CreateUserInput)
      : await updateUserAction((props as EditMode).userId, values as UpdateUserInput);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    router.push("/usuarios");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isCreate && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha temporária</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Papel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o papel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workerProfile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Perfil técnico{requiresProfile && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  defaultValue={field.value ?? "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione ou deixe em branco" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sem perfil técnico</SelectItem>
                    {(Object.keys(WORKER_PROFILE_LABELS) as WorkerProfile[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {WORKER_PROFILE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Remuneração ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={"monthlyBaseSalary" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mínimo garantido mensal (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="Ex.: 5000"
                    value={
                      (field as { value: number | null }).value !== null &&
                      (field as { value: number | null }).value !== undefined
                        ? String((field as { value: number | null }).value)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"monthlyCapValue" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teto mensal individual (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    placeholder={`Padrão por perfil (ex.: 12.000)`}
                    value={
                      (field as { value: number | null }).value !== null &&
                      (field as { value: number | null }).value !== undefined
                        ? String((field as { value: number | null }).value)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Usuário ativo</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isCreate ? (
              "Criar usuário"
            ) : (
              "Salvar alterações"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
