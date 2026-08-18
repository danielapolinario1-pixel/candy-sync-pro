import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  alterarCargo,
  criarUsuario,
  definirSenha,
  gerarLinkRedefinicao,
  listarEquipe,
  renomearUsuario,
  type MembroEquipe,
} from "@/lib/equipe.functions";

export type { MembroEquipe };

export const CHAVE_EQUIPE = ["equipe"] as const;

export function useEquipe() {
  const consulta = useQuery({
    queryKey: CHAVE_EQUIPE,
    queryFn: () => listarEquipe(),
    retry: false,
    staleTime: 30_000,
  });

  return {
    membros: consulta.data?.membros ?? [],
    promovidoAAdmin: consulta.data?.promovidoAAdmin ?? false,
    carregando: consulta.isLoading,
    erro: consulta.error ? mensagemDeErro(consulta.error) : null,
    recarregar: consulta.refetch,
  };
}

export function useAcoesEquipe() {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: CHAVE_EQUIPE });

  return {
    criar: useMutation({
      mutationFn: (dados: {
        nome: string;
        email: string;
        senha: string;
        cargo: "admin" | "vendedor";
      }) => criarUsuario({ data: dados }),
      onSuccess: invalidar,
    }),
    trocarCargo: useMutation({
      mutationFn: (dados: { userId: string; cargo: "admin" | "vendedor" }) =>
        alterarCargo({ data: dados }),
      onSuccess: invalidar,
    }),
    renomear: useMutation({
      mutationFn: (dados: { userId: string; nome: string }) => renomearUsuario({ data: dados }),
      onSuccess: invalidar,
    }),
    trocarSenha: useMutation({
      mutationFn: (dados: { userId: string; senha: string }) => definirSenha({ data: dados }),
    }),
    gerarLink: useMutation({
      mutationFn: (dados: { email: string }) => gerarLinkRedefinicao({ data: dados }),
    }),
  };
}

/** Server functions serializam o erro; extrai a mensagem legível. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error && erro.message) return erro.message;
  if (typeof erro === "string") return erro;
  return "Não foi possível concluir a operação.";
}
