import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos da Consulta CPF · LNB",
  description: "Contrato e termos de uso da Consulta CPF da Limpa Nome Brazil",
};

export default function TermosConsultaPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">
          Contrato · Consulta CPF
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">
          Termos e Condições — Consulta CPF (R$ 29,99)
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          Versão 1.0 · Atualizado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      <div className="rounded-2xl bg-sand-50 border border-sand-300/40 p-6 mb-10">
        <p className="text-sm text-forest-800 leading-relaxed">
          Este contrato regula a prestação do serviço de <strong>Consulta de CPF</strong>{" "}
          entre a <strong>Limpa Nome Brazil (LNB)</strong> e o USUÁRIO. Ao efetuar o
          pagamento de <strong>R$ 29,99</strong>, você declara estar de acordo com as
          cláusulas abaixo.
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-8 mb-3">1. DO OBJETO</h2>
          <p>
            O serviço consiste em consulta cadastral do CPF do USUÁRIO nos órgãos
            oficiais de proteção ao crédito do Brasil:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>SPC Brasil</li>
            <li>Serasa Experian</li>
            <li>IEPTB São Paulo</li>
            <li>IEPTB BR (Cartórios de Protesto)</li>
            <li>Boa Vista SCPC</li>
          </ul>
          <p className="mt-3">
            O resultado é entregue em formato de relatório PDF profissional contendo:
            score de crédito (0–1000), lista de pendências registradas (credor, valor,
            data), protestos em cartório e status geral do CPF.
          </p>
          <p>
            O pagamento de R$ 29,99 refere-se exclusivamente à <strong>execução da
            consulta e emissão do relatório</strong>, e não implica em qualquer ação
            sobre as pendências encontradas.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            2. DA PROTEÇÃO DE DADOS (LGPD — Lei nº 13.709/2018)
          </h2>
          <p>
            O USUÁRIO autoriza expressamente a LNB a coletar e tratar seus dados
            pessoais (nome completo, CPF, data de nascimento, e-mail, telefone) <strong>
            exclusivamente para execução do serviço</strong>.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              <strong>Segurança:</strong> os dados são criptografados em trânsito (TLS)
              e em repouso, e não são compartilhados com terceiros para fins
              publicitários ou comerciais.
            </li>
            <li>
              <strong>Acesso restrito:</strong> apenas a equipe autorizada da LNB e os
              órgãos consultados (Boa Vista, SPC, Serasa) têm acesso aos dados, e
              apenas para fins de execução deste serviço.
            </li>
            <li>
              <strong>Direito do Titular:</strong> o USUÁRIO pode solicitar acesso,
              correção ou exclusão de seus dados a qualquer momento, enviando e-mail
              para <strong>contato@limpanomebrazil.com.br</strong>.
            </li>
            <li>
              <strong>Retenção:</strong> os dados ficam armazenados pelo tempo
              necessário ao cumprimento legal e regulatório (mínimo de 5 anos para
              auditoria), e são excluídos após esse período mediante solicitação.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            3. DA NÃO DISCRIMINAÇÃO E DIVERSIDADE
          </h2>
          <p>
            A LNB rege-se pelos princípios da dignidade da pessoa humana, igualdade e
            respeito à diversidade.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              É <strong>terminantemente proibida</strong> qualquer forma de discriminação
              baseada em orientação sexual, identidade de gênero, raça, religião,
              deficiência ou origem por parte dos prepostos da LNB.
            </li>
            <li>
              O atendimento respeitará o <strong>nome social</strong> do USUÁRIO,
              conforme Decreto nº 8.727/2016, bastando a indicação no cadastro ou no
              atendimento via WhatsApp.
            </li>
            <li>
              Qualquer denúncia de discriminação pode ser feita pelo e-mail{" "}
              <strong>contato@limpanomebrazil.com.br</strong> e será apurada com
              prioridade.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            4. DO DIREITO DE ARREPENDIMENTO (Código de Defesa do Consumidor)
          </h2>
          <p>
            Conforme o <strong>Art. 49 do CDC</strong>, o USUÁRIO tem o prazo de{" "}
            <strong>7 (sete) dias corridos</strong> a contar do pagamento para desistir
            do serviço e solicitar reembolso integral, <strong>caso a consulta ainda
            não tenha sido executada</strong>.
          </p>
          <p>
            <strong>Importante:</strong> a consulta CPF é executada automaticamente em
            até 5 minutos após a confirmação do pagamento. Uma vez emitido o relatório
            PDF, considera-se o serviço integralmente executado e não há possibilidade
            de reembolso, pois a LNB já incorreu nos custos da consulta junto aos
            órgãos parceiros.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            5. RESPONSABILIDADE DO USUÁRIO
          </h2>
          <p>
            O USUÁRIO declara que todas as informações prestadas são{" "}
            <strong>verdadeiras, completas e atualizadas</strong>, e que o CPF
            informado pertence a si próprio.
          </p>
          <p>
            A tentativa de fraude (uso de CPF de terceiro sem autorização, documentos
            falsos, dados incorretos para obter benefícios) resultará na{" "}
            <strong>rescisão imediata do contrato sem devolução de valores</strong> e
            poderá ser comunicada às autoridades competentes (Polícia Federal,
            Ministério Público).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            6. DESCONTO PARA LIMPEZA DE NOME
          </h2>
          <p>
            O valor de R$ 29,99 pago pela consulta gera{" "}
            <strong>desconto integral</strong> caso o USUÁRIO contrate o serviço de
            Limpeza de Nome + Blindagem da LNB nos próximos 30 dias. Nesse caso, o
            valor da Limpeza passa de R$ 499,90 para <strong>R$ 500,00</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">7. FORO</h2>
          <p>
            As partes elegem o foro da comarca de <strong>São Paulo / SP</strong> para
            dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a
            qualquer outro, por mais privilegiado que seja.
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>
            <strong>Limpa Nome Brazil</strong>
            <br />
            Contato: contato@limpanomebrazil.com.br · WhatsApp (11) 99744-0101
            <br />
            Site: <a href="https://limpanomebrazil.com.br" className="text-brand-600">
              limpanomebrazil.com.br
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
