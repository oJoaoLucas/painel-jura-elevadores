import "server-only";
import { exigirSessao } from "@/lib/authServer";
import { type Resultado, sucesso, falha, mensagemErro } from "@/lib/resultado";

// Executa uma escrita no Supabase com service_role, SEMPRE exigindo sessão
// antes. Centraliza o tratamento de erro pra nenhuma gravação falhar em
// silêncio. Loga só a mensagem do erro (sem tokens/dados sensíveis).
export async function gravarServidor(
  fn: () => PromiseLike<{ error: unknown }>
): Promise<Resultado> {
  try {
    await exigirSessao();
    const { error } = await fn();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "[jura] erro de escrita:",
        (error as { message?: string })?.message ?? "desconhecido"
      );
      return falha("Não deu pra salvar. Tente de novo.");
    }
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}
