import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Gerenciamento de equipe (usuários + cargos).
 *
 * Tudo aqui roda NO SERVIDOR com a service_role key, porque:
 *  - listar e-mails exige acesso a `auth.users` (não é exposto via RLS);
 *  - criar usuário / trocar senha exige a Admin API do Supabase;
 *  - a tabela `user_roles` só tem policy de SELECT do próprio registro,
 *    ou seja, nenhum cliente consegue escrever cargo direto (proposital).
 *
 * A service_role key NUNCA chega ao navegador: o client.server é importado
 * dinamicamente dentro do handler.
 */

export type Cargo = "admin" | "vendedor";

export interface MembroEquipe {
  id: string;
  email: string;
  nome: string;
  cargo: Cargo;
  criadoEm: string;
  ultimoLogin: string | null;
  souEu: boolean;
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .email("E-mail inválido.");

const senhaSchema = z
  .string()
  .min(6, "A senha deve ter no mínimo 6 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

const cargoSchema = z.enum(["admin", "vendedor"]);

const nomeSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome completo.")
  .max(80, "Nome muito longo.");

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/**
 * Garante que quem chamou é admin.
 *
 * Bootstrap: se o banco ainda não tem NENHUM admin (projeto recém-criado),
 * o primeiro usuário autenticado que abrir o painel vira admin. Sem isso o
 * sistema fica inacessível, já que a seleção de cargo saiu da tela de login.
 */
async function exigirAdmin(userId: string): Promise<{
  admin: AdminClient;
  promovido: boolean;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: papeis, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role");

  if (error) throw new Error(`Falha ao verificar permissões: ${error.message}`);

  const admins = (papeis ?? []).filter((p) => p.role === "admin");
  const souAdmin = admins.some((p) => p.user_id === userId);

  if (souAdmin) return { admin: supabaseAdmin, promovido: false };

  if (admins.length === 0) {
    const { error: erroPromocao } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (erroPromocao) {
      throw new Error(`Falha ao definir o primeiro admin: ${erroPromocao.message}`);
    }
    return { admin: supabaseAdmin, promovido: true };
  }

  throw new Error("Acesso restrito: apenas administradores gerenciam a equipe.");
}

/** Deixa o usuário com exatamente um cargo. */
async function definirCargo(admin: AdminClient, userId: string, cargo: Cargo) {
  const { error: erroLimpeza } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .neq("role", cargo);
  if (erroLimpeza) throw new Error(`Falha ao limpar cargo anterior: ${erroLimpeza.message}`);

  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: cargo }, { onConflict: "user_id,role" });
  if (error) throw new Error(`Falha ao gravar cargo: ${error.message}`);
}

async function montarEquipe(admin: AdminClient, userId: string): Promise<MembroEquipe[]> {
  const { data: usuarios, error: erroUsuarios } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (erroUsuarios) throw new Error(`Falha ao listar usuários: ${erroUsuarios.message}`);

  let [{ data: perfis }, { data: papeis }] = await Promise.all([
    admin.from("profiles").select("id, nome"),
    admin.from("user_roles").select("user_id, role"),
  ]);

  // Auto-correção: usuário sem NENHUMA linha em user_roles é invisível para as
  // policies de RLS (todas exigem EXISTS em user_roles) e não consegue ver
  // produtos/clientes. Garante o cargo mínimo 'vendedor'.
  const comCargo = new Set((papeis ?? []).map((p) => p.user_id));
  const semCargo = usuarios.users.filter((u) => !comCargo.has(u.id));
  if (semCargo.length > 0) {
    const { error } = await admin
      .from("user_roles")
      .upsert(
        semCargo.map((u) => ({ user_id: u.id, role: "vendedor" as const })),
        { onConflict: "user_id,role" },
      );
    if (!error) {
      papeis = [
        ...(papeis ?? []),
        ...semCargo.map((u) => ({ user_id: u.id, role: "vendedor" as const })),
      ];
    }
  }

  // Auto-correção: perfil ausente deixa o nome vazio na lista e no pedido.
  const comPerfil = new Set((perfis ?? []).map((p) => p.id));
  const semPerfil = usuarios.users.filter((u) => !comPerfil.has(u.id));
  if (semPerfil.length > 0) {
    const novos = semPerfil.map((u) => ({
      id: u.id,
      nome:
        (typeof u.user_metadata?.["nome"] === "string" ? (u.user_metadata["nome"] as string) : "") ||
        u.email?.split("@")[0] ||
        "Vendedor",
    }));
    const { error } = await admin.from("profiles").upsert(novos, { onConflict: "id" });
    if (!error) perfis = [...(perfis ?? []), ...novos];
  }

  const nomePorId = new Map((perfis ?? []).map((p) => [p.id, p.nome]));
  const cargoPorId = new Map<string, Cargo>();
  for (const p of papeis ?? []) {
    // admin vence, caso o usuário tenha os dois registros por algum motivo
    if (p.role === "admin" || !cargoPorId.has(p.user_id)) {
      cargoPorId.set(p.user_id, p.role as Cargo);
    }
  }

  return usuarios.users
    .map((u) => {
      const metaNome = typeof u.user_metadata?.["nome"] === "string" ? (u.user_metadata["nome"] as string) : "";
      const email = u.email ?? "";
      return {
        id: u.id,
        email,
        nome: nomePorId.get(u.id) || metaNome || email.split("@")[0] || "Vendedor",
        cargo: cargoPorId.get(u.id) ?? "vendedor",
        criadoEm: u.created_at,
        ultimoLogin: u.last_sign_in_at ?? null,
        souEu: u.id === userId,
      } satisfies MembroEquipe;
    })
    .sort((a, b) => {
      if (a.cargo !== b.cargo) return a.cargo === "admin" ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

/** Lista a equipe inteira. */
export const listarEquipe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, promovido } = await exigirAdmin(context.userId);
    const membros = await montarEquipe(admin, context.userId);
    return { membros, promovidoAAdmin: promovido };
  });

/** Cria uma conta nova já com o cargo escolhido. */
export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      nome: nomeSchema,
      email: emailSchema,
      senha: senhaSchema,
      cargo: cargoSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const { admin } = await exigirAdmin(context.userId);

    const { data: criado, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      if (msg.includes("weak") || msg.includes("pwned")) {
        throw new Error("Senha muito fraca. Use letras, números e ao menos 8 caracteres.");
      }
      throw new Error(error.message);
    }

    const novoId = criado.user.id;

    // O trigger handle_new_user já cria profile + cargo 'vendedor'.
    // Garantimos o nome e ajustamos o cargo caso tenha sido escolhido 'admin'.
    await admin.from("profiles").upsert({ id: novoId, nome: data.nome }, { onConflict: "id" });
    await definirCargo(admin, novoId, data.cargo);

    return { id: novoId, email: data.email, nome: data.nome, cargo: data.cargo };
  });

/** Troca o cargo entre admin e vendedor. */
export const alterarCargo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid(), cargo: cargoSchema }))
  .handler(async ({ data, context }) => {
    const { admin } = await exigirAdmin(context.userId);

    if (data.cargo === "vendedor") {
      const { data: admins, error } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw new Error(`Falha ao verificar administradores: ${error.message}`);

      const outrosAdmins = (admins ?? []).filter((a) => a.user_id !== data.userId);
      if (outrosAdmins.length === 0) {
        throw new Error(
          "Este é o último administrador. Promova outra pessoa antes de rebaixá-lo.",
        );
      }
    }

    await definirCargo(admin, data.userId, data.cargo);
    return { ok: true, cargo: data.cargo };
  });

/** Renomeia um membro (profiles + metadados do auth). */
export const renomearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid(), nome: nomeSchema }))
  .handler(async ({ data, context }) => {
    const { admin } = await exigirAdmin(context.userId);

    const { error } = await admin
      .from("profiles")
      .upsert({ id: data.userId, nome: data.nome }, { onConflict: "id" });
    if (error) throw new Error(`Falha ao salvar o nome: ${error.message}`);

    await admin.auth.admin.updateUserById(data.userId, { user_metadata: { nome: data.nome } });
    return { ok: true, nome: data.nome };
  });

/** Define uma senha nova diretamente (o admin informa ao vendedor). */
export const definirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string().uuid(), senha: senhaSchema }))
  .handler(async ({ data, context }) => {
    const { admin } = await exigirAdmin(context.userId);

    const { error } = await admin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("weak") || msg.includes("pwned")) {
        throw new Error("Senha muito fraca. Use letras, números e ao menos 8 caracteres.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

/**
 * Gera um link de redefinição para o próprio usuário criar a senha dele.
 * Usa generateLink (não depende de SMTP configurado no projeto) — o admin
 * copia o link e envia por WhatsApp.
 */
export const gerarLinkRedefinicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ email: emailSchema }))
  .handler(async ({ data, context }) => {
    const { admin } = await exigirAdmin(context.userId);

    const { data: link, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(`Falha ao gerar o link: ${error.message}`);

    const url = link.properties?.action_link;
    if (!url) throw new Error("O Supabase não retornou o link de redefinição.");
    return { url };
  });
