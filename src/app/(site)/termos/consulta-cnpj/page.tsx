import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos da Consulta CNPJ · LNB",
  description: "Contrato e termos de uso da Consulta CNPJ da Limpa Nome Brazil",
};

export default function TermosConsultaCNPJPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">
          Contrato · Consulta CNPJ
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">
          Termos e Condições — Consulta CNPJ (R$ 39,99)
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          Versão 1.0 · Atualizado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      <div className="rounded-2xl bg-sand-50 border border-sand-300/40 p-6 mb-10">
        <p className="text-sm text-forest-800 leading-relaxed">
          Este contrato regula a prestação do serviço de <strong>Consulta de CNPJ</strong>{" "}
          entre a <strong>Limpa Nome Brazil (LNB)</strong> e o USUÁRIO (representante legal
          da empresa consultada). Ao efetuar o pagamento de <strong>R$ 39,99</strong>,
          você declara estar de acordo com as cláusulas abaixo e ter poderes pra autorizar
          a consulta em nome da empresa.
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-8 mb-3">1. DO OBJETO</h2>
          <p>
            O serviço consiste em duas consultas combinadas:
          </p>
          <ol className="list-decimal pl-6 space-y-1.5 mt-2">
            <li>
              <strong>Cadastro Receita Federal</strong> do CNPJ informado: razão social,
              nome fantasia, situação cadastral, data de abertura, capital social, CNAE
              principal, endereço e quadro societário (sócios e qualificações).
            </li>
            <li>
              <strong>Análise de crédito do sócio administrador/responsável</strong>:
              score Serasa Experian, pendências financeiras (SPC, Boa Vista), protestos
              em cartório e valores consolidados.
            </li>
          </ol>
          <p className="mt-3">
            O resultado é entregue em formato de relatório PDF profissional combinando as
            duas análises, enviado por email do USUÁRIO e disponível na área online.
          </p>
          <p>
            O pagamento de R$ 39,99 refere-se exclusivamente à <strong>execução das
            consultas e emissão do relatório</strong>, e não implica em qualquer ação
            sobre eventuais pendências encontradas.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            2. AUTORIZAÇÃO E REPRESENTAÇÃO LEGAL
          </h2>
          <p>
            Ao contratar este serviço, o USUÁRIO declara, sob sua exclusiva
            responsabilidade legal, que:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>
              É <strong>sócio, administrador, procurador legalmente constituído ou
              representante autorizado</strong> da empresa cujo CNPJ está sendo
              consultado.
            </li>
            <li>
              <strong>Autoriza expressamente</strong> a Limpa Nome Brazil a consultar o
              CNPJ da empresa nos órgãos públicos competentes (Receita Federal).
            </li>
            <li>
              <strong>Autoriza expressamente</strong> a consulta do seu próprio CPF (como
              responsável legal informado) nos órgãos de proteção ao crédito (SPC,
              Serasa Experian, Boa Vista SCPC) pra avaliação do risco creditício da
              empresa, conforme prática usual de análise de crédito empresarial no
              Brasil.
            </li>
            <li>
              Reconhece que a LNB não tem como verificar a autenticidade da relação
              jurídica entre o USUÁRIO e a empresa, e responsabiliza-se integral e
              exclusivamente pelas informações fornecidas, inclusive cível e
              criminalmente em caso de uso indevido de CNPJ de terceiro.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            3. DA PROTEÇÃO DE DADOS (LGPD — Lei nº 13.709/2018)
          </h2>
          <p>
            O USUÁRIO autoriza a LNB a coletar e tratar os seguintes dados,
            exclusivamente para execução do serviço:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>
              <strong>Dados da empresa:</strong> CNPJ, razão social, nome fantasia,
              dados cadastrais públicos da Receita Federal.
            </li>
            <li>
              <strong>Dados do responsável:</strong> nome completo, CPF, telefone, email.
            </li>
            <li>
              <strong>Resultado das consultas:</strong> score, pendências financeiras,
              protestos.
            </li>
          </ul>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              <strong>Segurança:</strong> dados criptografados em trânsito (TLS) e em
              repouso. Não são compartilhados com terceiros para fins publicitários ou
              comerciais.
            </li>
            <li>
              <strong>Compartilhamento autorizado:</strong> apenas com os órgãos
              consultados (Receita Federal, Boa Vista, SPC, Serasa Experian) e
              exclusivamente para execução desse serviço.
            </li>
            <li>
              <strong>Direito do Titular:</strong> tanto o USUÁRIO (PF responsável)
              quanto a empresa podem solicitar acesso, correção ou exclusão dos dados
              por <strong>contato@limpanomebrazil.com.br</strong>.
            </li>
            <li>
              <strong>Retenção:</strong> 5 anos para cumprimento legal e regulatório.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            4. DA NÃO DISCRIMINAÇÃO E DIVERSIDADE
          </h2>
          <p>
            A LNB rege-se pelos princípios da dignidade da pessoa humana, igualdade e
            respeito à diversidade.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              É <strong>terminantemente proibida</strong> qualquer forma de
              discriminação baseada em orientação sexual, identidade de gênero, raça,
              religião, deficiência ou origem por parte dos prepostos da LNB.
            </li>
            <li>
              O atendimento respeitará o <strong>nome social</strong> do USUÁRIO,
              conforme Decreto nº 8.727/2016.
            </li>
            <li>
              Denúncias: <strong>contato@limpanomebrazil.com.br</strong> (apuradas com
              prioridade).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            5. DO DIREITO DE ARREPENDIMENTO (Código de Defesa do Consumidor)
          </h2>
          <p>
            Conforme o <strong>Art. 49 do CDC</strong>, o USUÁRIO tem o prazo de{" "}
            <strong>7 (sete) dias corridos</strong> a contar do pagamento para desistir
            do serviço e solicitar reembolso integral, <strong>caso as consultas ainda
            não tenham sido executadas</strong>.
          </p>
          <p>
            <strong>Importante:</strong> as consultas são executadas automaticamente em
            até 5 minutos após a confirmação do pagamento. Uma vez emitido o relatório
            PDF, considera-se o serviço integralmente executado e não há possibilidade
            de reembolso, pois a LNB já incorreu nos custos das consultas junto aos
            órgãos parceiros (Receita Federal + birôs de crédito).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            6. RESPONSABILIDADE DO USUÁRIO
          </h2>
          <p>
            O USUÁRIO declara que todas as informações prestadas são{" "}
            <strong>verdadeiras, completas e atualizadas</strong>, e que possui
            autoridade legal para autorizar as consultas em nome da empresa.
          </p>
          <p>
            A tentativa de fraude (uso de CNPJ de terceiro sem autorização, dados
            falsos do responsável, CPF de terceiro como responsável) resultará na{" "}
            <strong>rescisão imediata do contrato sem devolução de valores</strong> e
            poderá ser comunicada às autoridades competentes (Receita Federal,
            Ministério Público, Polícia Federal).
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            7. DESCONTO PARA LIMPEZA CNPJ
          </h2>
          <p>
            O valor de R$ 39,99 pago pela consulta gera{" "}
            <strong>desconto integral</strong> caso a empresa contrate o serviço de
            Limpeza CNPJ + Sócio + Monitoramento da LNB nos próximos 30 dias. Nesse
            caso, o valor da Limpeza passa de R$ 605,00 para <strong>R$ 580,01</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">8. FORO</h2>
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
            Site:{" "}
            <a href="https://limpanomebrazil.com.br" className="text-brand-600">
              limpanomebrazil.com.br
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}
