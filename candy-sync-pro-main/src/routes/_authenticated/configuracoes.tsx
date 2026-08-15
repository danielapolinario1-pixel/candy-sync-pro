import { useState } from "react";
import { useAuth } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, LogOut, Download, Upload, Building2, User } from "lucide-react";

export default function Configuracoes() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nome) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e-mail e senha para cadastrar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nome,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Usuário criado com sucesso!",
        description: `O cadastro de ${nome} foi realizado.`,
      });

      setEmail("");
      setPassword("");
      setNome("");
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro ao tentar cadastrar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Empresa */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <div>
            <CardTitle className="text-lg">SSD ATACADO DE DOCES E BEBIDAS LTDA</CardTitle>
            <p className="text-sm text-muted-foreground">12698891000180</p>
          </div>
        </CardHeader>
      </Card>

      {/* Vendedor Atual */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs font-semibold text-primary uppercase">Vendedor</p>
            <CardTitle className="text-base">{user?.user_metadata?.full_name || "Sandro"}</CardTitle>
            <p className="text-sm text-muted-foreground">{user?.email || "sandrosantos19741@hotmail.com"}</p>
          </div>
        </CardHeader>
      </Card>

      {/* CADASTRAR NOVO USUÁRIO */}
      <Card border-primary>
        <CardHeader className="flex flex-row items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Cadastrar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail do Novo Usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cadastrando..." : "Criar Novo Usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dados e Backup */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button variant="outline" className="w-full justify-center gap-2">
            <Download className="w-4 h-4" /> EXPORTAR BACKUP JSON
          </Button>
          <Button variant="outline" className="w-full justify-center gap-2">
            <Upload className="w-4 h-4" /> RESTAURAR BACKUP
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            A restauração atualiza clientes e produtos pelo identificador, sem apagar pedidos existentes.
          </p>
        </CardContent>
      </Card>

      {/* Sair */}
      <Button variant="destructive" className="w-full gap-2" onClick={() => signOut()}>
        <LogOut className="w-4 h-4" /> SAIR DA CONTA
      </Button>
    </div>
  );
}