import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">Legal</p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">Política de Privacidade</h1>
        <p className="text-gray-500 text-sm mt-3">Atualizado em {new Date().toLocaleDateString("pt-BR")}</p>
      </header>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">1. Quem somos</h2>
          <p>
            A <strong>Limpa Nome Brazil (LNB)</strong> opera o site limpanomebrazil.com.br
            e oferece serviços de consulta de CPF, limpeza de nome e blindagem de crédito,
            tudo digitalmente.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">2. Que dados coletamos</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Identificação: nome completo, CPF, data de nascimento.</li>
            <li>Contato: email e número de telefone (WhatsApp).</li>
            <li>Financeiro: dados de pagamento processados pelo Asaas (gateway certificado PCI; não armazenamos cartão).</li>
            <li>Resultado de consulta: score, lista de pendências e credores (mantidos em Supabase, criptografado em trânsito e em repouso).</li>
            <li>Logs técnicos: data/hora de acesso, IP, navegador (uso operacional, retenção 90 dias).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">3. Pra que usamos</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Realizar a consulta de CPF junto à API Full e gerar seu relatório.</li>
            <li>Executar o processo de limpeza de nome (envio aos órgãos competentes).</li>
            <li>Manter a blindagem ativa (verificação periódica do CPF).</li>
            <li>Enviar atualizações pelo WhatsApp (via Chatwoot) e por email.</li>
            <li>Cumprir obrigações legais e fiscais.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">4. Compartilhamento</h2>
          <p>Compartilhamos dados estritamente necessários com:</p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li><strong>API Full</strong> — provedora de consulta de crédito (Boa Vista/Serasa).</li>
            <li><strong>Asaas</strong> — gateway de pagamento (Pix, cartão, boleto).</li>
            <li><strong>Chatwoot</strong> — plataforma de atendimento por WhatsApp.</li>
            <li><strong>Supabase</strong> — armazenamento e infraestrutura de banco de dados.</li>
            <li><strong>Vercel</strong> — hospedagem do site/painel.</li>
          </ul>
          <p className="mt-3">Não vendemos seus dados a terceiros.</p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">5. Seus direitos (LGPD)</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Acessar, corrigir ou pedir a portabilidade dos seus dados.</li>
            <li>Solicitar a exclusão dos seus dados (após cumprimento de obrigações legais).</li>
            <li>Revogar consentimento de uso para fins de marketing.</li>
          </ul>
          <p className="mt-3">
            Pra exercer qualquer direito, envie um email pra{" "}
            <a href="mailto:contato@limpanomebrazil.com.br" className="text-brand-600 hover:underline">
              contato@limpanomebrazil.com.br
            </a>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">6. Segurança</h2>
          <p>
            Seus dados são protegidos com criptografia (TLS em trânsito, AES-256 em repouso),
            controle de acesso baseado em papéis (RBAC) e auditoria de operações sensíveis.
            Senhas armazenadas via bcrypt cost 12.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">7. Cookies</h2>
          <p>
            Utilizamos cookies estritamente necessários pra autenticação e funcionamento do
            painel. Não usamos cookies de tracking ou publicidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">8. Contato do encarregado (DPO)</h2>
          <p>
            Email:{" "}
            <a href="mailto:contato@limpanomebrazil.com.br" className="text-brand-600 hover:underline">
              contato@limpanomebrazil.com.br
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
