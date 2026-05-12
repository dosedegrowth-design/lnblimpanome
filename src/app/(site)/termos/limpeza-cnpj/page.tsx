import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos da Limpeza CNPJ · LNB",
  description: "Contrato e termos de uso do serviço de Limpeza CNPJ + Sócio + Monitoramento da Limpa Nome Brazil",
};

export default function TermosLimpezaCNPJPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <header className="mb-10">
        <p className="text-sm text-brand-600 font-semibold uppercase tracking-widest">
          Contrato · Limpeza CNPJ + Sócio
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-forest-800 mt-2">
          Termos e Condições — Limpeza CNPJ (R$ 580,01)
        </h1>
        <p className="text-gray-500 text-sm mt-3">
          Versão 1.0 · Atualizado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      <div className="rounded-2xl bg-sand-50 border border-sand-300/40 p-6 mb-10">
        <p className="text-sm text-forest-800 leading-relaxed">
          Este contrato regula a prestação do serviço de{" "}
          <strong>Auxílio na Regularização de Crédito Empresarial</strong> entre a{" "}
          <strong>Limpa Nome Brazil (LNB)</strong> e o USUÁRIO (representante legal da
          empresa). Ao efetuar o pagamento de <strong>R$ 580,01</strong>, você declara
          estar de acordo com as cláusulas abaixo e ter poderes pra contratar em nome
          da empresa.
        </p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-8 mb-3">1. DO OBJETO</h2>
          <p>
            O serviço consiste em{" "}
            <strong>assessoria administrativa para identificação, contestação e
            auxílio na renegociação de apontamentos</strong> nos órgãos de proteção
            ao crédito (SPC, Serasa Experian, IEPTB, Boa Vista SCPC), atuando sobre o{" "}
            <strong>CPF do sócio administrador/responsável</strong> da empresa
            consultada, uma vez que o crédito empresarial brasileiro para micro e
            pequenas empresas é tipicamente avaliado com base no CPF do responsável.
          </p>
          <p>
            O pagamento de R$ 580,01 refere-se à <strong>taxa de serviço de
            assessoria</strong> e <strong>NÃO quita o valor principal das dívidas
            junto aos credores</strong>. O serviço atua exclusivamente sobre o
            registro/apontamento da dívida nos órgãos de proteção, não sobre a
            obrigação financeira em si.
          </p>
          <p>
            O serviço inclui ainda <strong>Monitoramento de Nome por 12 meses como
            bônus</strong> — verificação automática do CPF do responsável e alertas
            imediatos sobre novas pendências, sem custo adicional durante esse período.
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
              É <strong>sócio administrador ou representante legalmente constituído</strong>{" "}
              da empresa contratante.
            </li>
            <li>
              É o próprio titular do CPF que será objeto da limpeza (o sócio
              responsável informado).
            </li>
            <li>
              Autoriza expressamente a LNB a atuar em seu nome junto aos órgãos de
              proteção ao crédito e credores listados na consulta.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            3. DA PROTEÇÃO DE DADOS (LGPD — Lei nº 13.709/2018)
          </h2>
          <p>
            O USUÁRIO autoriza a LNB a coletar e tratar dados (CNPJ, razão social,
            CPF/RG do sócio, endereço, e-mail, telefone, histórico financeiro e
            documentos comprobatórios) exclusivamente para execução do serviço.
          </p>
          <ul className="list-disc pl-6 space-y-1.5 mt-3">
            <li>
              <strong>Segurança:</strong> dados criptografados em trânsito e em
              repouso, armazenados em servidores certificados (Supabase / Vercel).
            </li>
            <li>
              <strong>Compartilhamento autorizado:</strong> credores, órgãos de
              proteção ao crédito e cartórios de protesto, exclusivamente para
              identificação e contestação das pendências.
            </li>
            <li>
              <strong>Direito do Titular:</strong> exclusão a qualquer momento via{" "}
              <strong>contato@limpanomebrazil.com.br</strong>.
            </li>
            <li>
              <strong>Retenção:</strong> 5 anos para cumprimento legal/regulatório.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            4. DA NÃO DISCRIMINAÇÃO E DIVERSIDADE
          </h2>
          <p>
            A LNB rege-se pelos princípios da dignidade da pessoa humana, igualdade
            e respeito à diversidade. É terminantemente proibida qualquer forma de
            discriminação baseada em orientação sexual, identidade de gênero, raça,
            religião, deficiência ou origem por parte dos prepostos da LNB.
          </p>
          <p>
            O atendimento respeitará o <strong>nome social</strong> do responsável,
            conforme Decreto nº 8.727/2016.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            5. DO PRAZO DE EXECUÇÃO
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              <strong>Limpeza:</strong> até <strong>20 dias úteis</strong> a contar da
              confirmação do pagamento e entrega da documentação solicitada.
            </li>
            <li>
              Em casos complexos (múltiplos credores, alto valor, dívidas em cartório),
              o prazo pode estender-se por até 45 dias úteis, com comunicação prévia.
            </li>
            <li>
              <strong>Monitoramento 12 meses:</strong> ativado imediatamente após a
              conclusão da limpeza, sem cobrança adicional.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            6. DO DIREITO DE ARREPENDIMENTO (Código de Defesa do Consumidor)
          </h2>
          <p>
            Conforme o <strong>Art. 49 do CDC</strong>, prazo de{" "}
            <strong>7 (sete) dias corridos</strong> a contar do pagamento para
            desistir e solicitar reembolso integral,{" "}
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
            7. RESPONSABILIDADE DO USUÁRIO
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Declarar que todas as informações prestadas são verdadeiras.
            </li>
            <li>
              Fornecer documentação solicitada pela equipe LNB (cartão CNPJ, contrato
              social, RG/CNH do sócio, comprovante de residência, comprovantes
              financeiros) em até 5 dias úteis após a solicitação.
            </li>
            <li>
              Informar a LNB caso algum credor entre em contato com o sócio ou com a
              empresa durante o processo.
            </li>
            <li>
              A tentativa de fraude resultará na{" "}
              <strong>rescisão imediata sem devolução de valores</strong> e comunicação
              às autoridades.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            8. RESPONSABILIDADE DA LNB
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Executar o serviço com diligência técnica e dentro dos prazos acordados.
            </li>
            <li>
              Manter o USUÁRIO atualizado via WhatsApp, e-mail e painel online.
            </li>
            <li>
              Entregar comprovantes oficiais ao final da limpeza.
            </li>
            <li>
              A LNB <strong>não garante</strong> a regularização em casos em que o
              registro da pendência esteja legalmente correto e atualizado, ou histórico
              de fraudes documentadas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">
            9. MONITORAMENTO 12 MESES (BÔNUS)
          </h2>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>
              Verificação automática do CPF do responsável a cada 7 dias.
            </li>
            <li>
              Alertas imediatos via WhatsApp e email em caso de nova pendência
              detectada.
            </li>
            <li>
              Sem custo adicional durante 12 meses após a conclusão da limpeza.
            </li>
            <li>
              Após o período, a LNB pode oferecer renovação opcional do serviço.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl text-forest-800 mt-10 mb-3">10. FORO</h2>
          <p>
            As partes elegem o foro da comarca de <strong>São Paulo / SP</strong>{" "}
            para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia
            expressa a qualquer outro.
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
