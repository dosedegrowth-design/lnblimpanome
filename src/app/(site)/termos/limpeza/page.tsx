import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos da Limpeza de Nome · LNB",
  description: "Contrato e termos de uso do serviço de Limpeza de Nome + Blindagem da Limpa Nome Brazil",
};

export default function TermosLimpezaPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">
          Contrato · Limpeza de Nome + Blindagem
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">
          Termos e Condições — Limpeza + Blindagem (R$ 480,01)
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          Versão 1.0 · Atualizado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      <div className="rounded-2xl bg-sand-50 border border-sand-300/40 p-6 mb-10">
        <p className="text-sm text-forest-800 leading-relaxed">
          Este contrato regula a prestação do serviço de{" "}
          <strong>Auxílio na Regularização de Crédito</strong> entre a{" "}
          <strong>Limpa Nome Brazil (LNB)</strong> e o USUÁRIO. Ao efetuar o pagamento
          da taxa de <strong>R$ 480,01</strong>, você declara estar de acordo com as
          cláusulas abaixo.
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-8 mb-3">1. DO OBJETO</h2>
          <p>
            O serviço consiste em{" "}
            <strong>assessoria administrativa para identificação, contestação e
            auxílio na renegociação de apontamentos</strong> nos órgãos de proteção
            ao crédito (SPC, Serasa, IEPTB, Boa Vista SCPC).
          </p>
          <p>
            O pagamento de R$ 480,01 refere-se à <strong>taxa de serviço de
            assessoria</strong> e <strong>NÃO quita o valor principal das dívidas
            junto aos credores</strong>. O serviço atua exclusivamente sobre o
            registro/apontamento da dívida nos órgãos de proteção, não sobre a
            obrigação financeira em si.
          </p>
          <p>
            O serviço inclui ainda <strong>Blindagem de Nome por 12 meses</strong>,
            que consiste em monitoramento contínuo do CPF do USUÁRIO com verificações
            automáticas a cada 7 dias e alertas imediatos sobre novas pendências.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            2. DA PROTEÇÃO DE DADOS (LGPD — Lei nº 13.709/2018)
          </h2>
          <p>
            O USUÁRIO autoriza a LNB a coletar e tratar seus dados pessoais{" "}
            <strong>(CPF, RG, endereço, e-mail, telefone, histórico financeiro e
            documentos comprobatórios)</strong> exclusivamente para a execução do
            serviço.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              <strong>Segurança:</strong> os dados são criptografados em trânsito e
              em repouso, armazenados em servidores certificados (Supabase / Vercel,
              ambos com conformidade SOC 2 e ISO 27001) e não são compartilhados com
              terceiros para fins publicitários.
            </li>
            <li>
              <strong>Compartilhamento autorizado:</strong> para execução do serviço,
              dados podem ser compartilhados com credores, órgãos de proteção ao
              crédito e cartórios de protesto, exclusivamente para identificação e
              contestação das pendências.
            </li>
            <li>
              <strong>Direito do Titular:</strong> o USUÁRIO pode solicitar acesso,
              correção, portabilidade ou exclusão de seus dados a qualquer momento
              após o encerramento do serviço, enviando e-mail para{" "}
              <strong>contato@limpanomebrazil.com.br</strong>.
            </li>
            <li>
              <strong>Retenção:</strong> os dados ficam armazenados pelo tempo legal
              mínimo de 5 anos para fins de auditoria e cumprimento regulatório.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            3. DA NÃO DISCRIMINAÇÃO E DIVERSIDADE
          </h2>
          <p>
            A LNB rege-se pelos princípios da dignidade da pessoa humana, igualdade
            e respeito à diversidade.
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
              Qualquer denúncia de discriminação será apurada com prioridade pelo
              canal <strong>contato@limpanomebrazil.com.br</strong>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            4. DO PRAZO DE EXECUÇÃO
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              <strong>Limpeza de Nome:</strong> até <strong>20 dias úteis</strong> a
              contar da confirmação do pagamento e entrega da documentação solicitada.
            </li>
            <li>
              Em casos complexos (múltiplos credores, dívidas em cartório, valores
              elevados), o prazo pode estender-se por até 45 dias úteis, sempre com
              comunicação prévia ao USUÁRIO.
            </li>
            <li>
              <strong>Blindagem 12 meses:</strong> ativada em até 1 dia útil após a
              conclusão da limpeza, com verificações automáticas a cada 7 dias.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            5. DO DIREITO DE ARREPENDIMENTO (Código de Defesa do Consumidor)
          </h2>
          <p>
            Conforme o <strong>Art. 49 do CDC</strong>, o USUÁRIO tem o prazo de{" "}
            <strong>7 (sete) dias corridos</strong> a contar do pagamento para
            desistir do serviço e solicitar reembolso integral,{" "}
            <strong>caso o serviço ainda não tenha sido iniciado</strong>.
          </p>
          <p>
            Após o início efetivo do trabalho (envio das primeiras contestações aos
            órgãos / credores), o reembolso passa a ser proporcional ao percentual
            ainda não executado, conforme avaliação técnica.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            6. RESPONSABILIDADE DO USUÁRIO
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Declarar que todas as informações prestadas são{" "}
              <strong>verdadeiras, completas e atualizadas</strong>, e que o CPF
              pertence a si próprio.
            </li>
            <li>
              Fornecer documentação solicitada pela equipe LNB (RG, comprovante de
              residência, comprovantes financeiros, etc.) em até 5 dias úteis após a
              solicitação.
            </li>
            <li>
              Informar a LNB caso seja contatado por algum credor durante o processo
              de limpeza.
            </li>
            <li>
              A tentativa de fraude (uso de documentos falsos, CPF de terceiro,
              informações inverídicas) resultará na{" "}
              <strong>rescisão imediata do contrato sem devolução de valores</strong>{" "}
              e será comunicada às autoridades.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            7. RESPONSABILIDADE DA LNB
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Executar o serviço com diligência técnica e dentro dos prazos
              acordados.
            </li>
            <li>
              Manter o USUÁRIO atualizado sobre o andamento do processo via WhatsApp,
              e-mail e painel online de acompanhamento.
            </li>
            <li>
              Entregar comprovantes oficiais ao final da limpeza, atestando a
              regularização do nome do USUÁRIO.
            </li>
            <li>
              A LNB <strong>não garante</strong> a regularização em casos em que o
              registro da pendência esteja legalmente correto e atualizado, ou em
              que o USUÁRIO já tenha histórico de fraudes documentadas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            8. BLINDAGEM DE NOME (12 MESES INCLUSOS)
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Monitoramento automático do CPF a cada 7 dias.
            </li>
            <li>
              Alertas imediatos via WhatsApp e e-mail em caso de nova pendência
              detectada.
            </li>
            <li>
              Após o prazo de 12 meses, o USUÁRIO pode optar pela renovação da
              Blindagem por R$ 29,90/mês ou R$ 299,00/ano.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">9. FORO</h2>
          <p>
            As partes elegem o foro da comarca de <strong>São Paulo / SP</strong>{" "}
            para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia
            expressa a qualquer outro, por mais privilegiado que seja.
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
