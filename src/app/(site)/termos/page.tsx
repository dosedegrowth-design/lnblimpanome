import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">Legal</p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">Termos de Uso</h1>
        <p className="text-gray-500 text-sm mt-3">Atualizado em {new Date().toLocaleDateString("pt-BR")}</p>
      </header>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">1. Aceitação</h2>
          <p>
            Ao usar o site limpanomebrazil.com.br ou os serviços oferecidos pela
            <strong> Limpa Nome Brazil (LNB)</strong>, você concorda com estes Termos de Uso
            e nossa Política de Privacidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">2. Serviços oferecidos</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Consulta de CPF</strong> (R$ 19,99) — relatório de score, pendências e credores.</li>
            <li><strong>Limpeza de Nome + Blindagem</strong> (R$ 480,01 com desconto / R$ 499,90) — limpeza do nome em até 20 dias úteis + monitoramento contínuo.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">3. Pagamento e reembolso</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Pagamentos processados pelo Mercado Pago (Pix, cartão).</li>
            <li><strong>Consulta CPF</strong>: serviço executado imediatamente após confirmação do pagamento. Não há reembolso após a consulta ser realizada.</li>
            <li><strong>Limpeza + Blindagem</strong>: você tem 7 dias corridos pra solicitar reembolso integral, desde que o processo de limpeza ainda não tenha sido iniciado.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">4. Prazos</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Consulta CPF</strong>: resultado em minutos após pagamento confirmado.</li>
            <li><strong>Limpeza</strong>: até 20 dias úteis (em casos complexos pode estender, com comunicação prévia).</li>
            <li><strong>Blindagem</strong>: ativada em até 1 dia útil, com verificações automáticas a cada 7 dias.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">5. Responsabilidades do cliente</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Fornecer dados verídicos (CPF, nome, email, telefone).</li>
            <li>Não compartilhar a senha de acesso à área logada.</li>
            <li>Manter o WhatsApp e email atualizados pra receber comunicações.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">6. Responsabilidades da LNB</h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Prestar o serviço dentro dos prazos acordados.</li>
            <li>Manter sigilo total sobre seus dados (LGPD).</li>
            <li>Não compartilhar suas informações com terceiros não autorizados.</li>
            <li>Comunicar qualquer incidente ou alteração de prazo.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">7. Limitações</h2>
          <p>
            A LNB atua dentro da legalidade brasileira. Não garantimos retorno de crédito
            específico nem aprovação automática em bancos/lojas — isso depende exclusivamente
            das instituições financeiras consultarem o CPF após a limpeza.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">8. Cancelamento da blindagem</h2>
          <p>
            Você pode pausar ou cancelar a blindagem a qualquer momento pela área logada
            ou pelo WhatsApp. Não há multa de cancelamento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">9. Foro</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Eventuais litígios serão
            dirimidos no foro da comarca do domicílio do consumidor.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">10. Contato</h2>
          <p>
            Email:{" "}
            <a href="mailto:contato@limpanomebrazil.com.br" className="text-brand-600 hover:underline">
              contato@limpanomebrazil.com.br
            </a>
            <br />
            WhatsApp:{" "}
            <a href="https://wa.me/5541996171780" target="_blank" rel="noopener" className="text-brand-600 hover:underline">
              clique aqui
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
