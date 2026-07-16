-- Adiciona flag de Entra ID por usuário
ALTER TABLE "users" ADD COLUMN "useEntraId" BOOLEAN NOT NULL DEFAULT false;

-- Remove a tabela global de configuração (substituída pelo campo por usuário)
DROP TABLE IF EXISTS "auth_provider_config";
