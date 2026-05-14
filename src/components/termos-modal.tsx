"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermosModalProps {
  open: boolean;
  onClose: () => void;
  onAceitar?: () => void;
  tipo: "consulta_cpf" | "consulta_cnpj" | "limpeza_cpf" | "limpeza_cnpj" | "privacidade";
}

const conteudos: Record<TermosModalProps["tipo"], { titulo: string; conteudo: React.ReactNode }> = {
  consulta_cpf: {
    titulo: "Termos e Condições — Consulta CPF",
    conteudo: <ConteudoConsultaCPF />,
  },
  consulta_cnpj: {
    titulo: "Termos e Condições — Consulta CNPJ",
    conteudo: <ConteudoConsultaCNPJ />,
  },
  limpeza_cpf: {
    titulo: "Termos e Condições — Limpeza de Nome (CPF)",
    conteudo: <ConteudoLimpezaCPF />,
  },
  limpeza_cnpj: {
    titulo: "Termos e Condições — Limpeza de Nome (CNPJ)",
    conteudo: <ConteudoLimpezaCNPJ />,
  },
  privacidade: {
    titulo: "Política de Privacidade (LGPD)",
    conteudo: <ConteudoPrivacidade />,
  },
};

export function TermosModal({ open, onClose, onAceitar, tipo }: TermosModalProps) {
  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const { titulo, conteudo } = conteudos[tipo];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200">
          <h2 className="font-display text-xl text-forest-800">{titulo}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 hover:bg-gray-100 transition"
          >
            <X className="size-5 text-gray-500" />
          </button>
        </header>

        {/* Conteúdo scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-700 leading-relaxed">
          {conteudo}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {onAceitar && (
            <Button
              onClick={() => {
                onAceitar();
                onClose();
              }}
            >
              Li e aceito
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

// ─── CONTEÚDOS ───────────────────────────────────────────────

function ConteudoConsultaCPF() {
  return (
    <div className="space-y-4">
      <Section titulo="1. Do Objeto">
        <p>
          A <strong>Limpa Nome Brazil (LNB)</strong> oferece serviço digital de
          consulta de CPF nos principais órgãos oficiais de proteção ao crédito:
          Serasa Experian, Boa Vista SCPC e Receita Federal, com score multi-bureau.
          O valor da consulta é de <strong>R$ 29,99</strong>, pago via Pix, cartão ou boleto.
        </p>
      </Section>
      <Section titulo="2. Proteção de Dados (LGPD)">
        <p>
          Seus dados pessoais são tratados conforme a Lei 13.709/2018 (LGPD).
          São armazenados de forma criptografada (TLS em trânsito, AES-256 em
          repouso), utilizados exclusivamente pra prestação do serviço e
          mantidos pelo prazo legal mínimo.
        </p>
      </Section>
      <Section titulo="3. Não Discriminação">
        <p>
          A LNB respeita a diversidade. Reconhecemos nome social conforme
          Decreto 8.727/2016. Vedamos qualquer discriminação por orientação
          sexual, identidade de gênero, raça, religião ou condição social.
        </p>
      </Section>
      <Section titulo="4. Direito de Arrependimento (Art. 49 CDC)">
        <p>
          Você pode desistir da compra em até 7 dias corridos do pagamento,
          desde que a consulta ainda não tenha sido executada. Após a consulta,
          o serviço é considerado executado e o reembolso não se aplica.
        </p>
      </Section>
      <Section titulo="5. Responsabilidades">
        <p>
          O usuário declara ser o titular do CPF consultado ou ter autorização
          expressa do titular. Uso fraudulento implica rescisão e
          responsabilização civil/criminal.
        </p>
      </Section>
      <Section titulo="6. Foro">
        <p>São Paulo/SP — Comarca da Capital.</p>
      </Section>
    </div>
  );
}

function ConteudoConsultaCNPJ() {
  return (
    <div className="space-y-4">
      <Section titulo="1. Do Objeto">
        <p>
          Consulta digital de CNPJ na Receita Federal (dados cadastrais) + CPF
          do sócio responsável com Score Serasa Experian e Boa Vista SCPC.
          Valor: <strong>R$ 39,99</strong>.
        </p>
      </Section>
      <Section titulo="2. Dados do Responsável">
        <p>
          O CPF informado deve ser do <strong>sócio administrador</strong> ou
          de pessoa com autorização expressa pra consulta. O resultado inclui
          score e pendências do responsável, conforme normas dos órgãos
          consultados.
        </p>
      </Section>
      <Section titulo="3. Proteção de Dados (LGPD)">
        <p>
          Dados da empresa e do sócio são tratados conforme LGPD. Acesso restrito,
          retenção pelo prazo legal, e pleno direito de revisão pelo titular.
        </p>
      </Section>
      <Section titulo="4. Arrependimento">
        <p>Mesmas regras da consulta CPF (7 dias antes da execução).</p>
      </Section>
      <Section titulo="5. Foro">
        <p>São Paulo/SP — Comarca da Capital.</p>
      </Section>
    </div>
  );
}

function ConteudoLimpezaCPF() {
  return (
    <div className="space-y-4">
      <Section titulo="1. Do Objeto">
        <p>
          Serviço de limpeza de nome via negociação digital junto aos órgãos
          oficiais (SPC, Serasa, IEPTB, Boa Vista) e credores. Valor:{" "}
          <strong>R$ 500,00</strong>, inclui <strong>12 meses de monitoramento</strong>{" "}
          (Blindagem) gratuito.
        </p>
      </Section>
      <Section titulo="2. Prazo de Execução">
        <p>
          Análise dos credores: até 2 dias úteis.
          <br />
          Atuação junto aos órgãos: 5 a 20 dias úteis.
          <br />
          Conclusão: até 30 dias úteis após confirmação do pagamento.
        </p>
      </Section>
      <Section titulo="3. Resultado">
        <p>
          A LNB se compromete a executar todas as ações cabíveis junto aos
          órgãos de proteção ao crédito. O resultado final depende da resposta
          dos credores e órgãos consultados.
        </p>
      </Section>
      <Section titulo="4. Blindagem 12 Meses (incluída)">
        <p>
          Após a limpeza, monitoramos seu CPF mensalmente por 12 meses. Se
          alguma nova pendência aparecer, somos avisados e atuamos
          imediatamente.
        </p>
      </Section>
      <Section titulo="5. Arrependimento">
        <p>
          7 dias corridos do pagamento, antes do início da execução. Após
          iniciada, reembolso proporcional à etapa executada.
        </p>
      </Section>
      <Section titulo="6. Foro">
        <p>São Paulo/SP.</p>
      </Section>
    </div>
  );
}

function ConteudoLimpezaCNPJ() {
  return (
    <div className="space-y-4">
      <Section titulo="1. Do Objeto">
        <p>
          Limpeza de nome do <strong>CPF do sócio administrador</strong> +
          consulta de regularização do CNPJ. Valor: <strong>R$ 580,01</strong>,
          inclui 12 meses de monitoramento.
        </p>
      </Section>
      <Section titulo="2. Como funciona">
        <p>
          A maioria das restrições do CNPJ tem origem no CPF do sócio
          responsável. Nosso serviço atua na limpeza do CPF + regularização
          cadastral da empresa.
        </p>
      </Section>
      <Section titulo="3. Demais cláusulas">
        <p>
          Aplicam-se as mesmas regras da Limpeza CPF (prazo, blindagem,
          arrependimento, foro).
        </p>
      </Section>
    </div>
  );
}

function ConteudoPrivacidade() {
  return (
    <div className="space-y-4">
      <Section titulo="1. Quem somos">
        <p>
          A <strong>Limpa Nome Brazil (LNB)</strong> opera o site
          limpanomebrazil.com.br e oferece consulta de CPF/CNPJ e limpeza de
          nome 100% digital.
        </p>
      </Section>
      <Section titulo="2. Que dados coletamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Identificação: nome, CPF, data de nascimento</li>
          <li>Contato: email e WhatsApp</li>
          <li>Pagamento: processado por gateway certificado (Asaas)</li>
          <li>Resultado da consulta: score, pendências, credores</li>
          <li>Logs técnicos: IP, navegador, data/hora (90 dias)</li>
        </ul>
      </Section>
      <Section titulo="3. Pra que usamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Realizar a consulta nos órgãos oficiais</li>
          <li>Executar a limpeza de nome</li>
          <li>Manter a blindagem ativa</li>
          <li>Atendimento por WhatsApp e email</li>
        </ul>
      </Section>
      <Section titulo="4. Seus direitos (LGPD)">
        <ul className="list-disc pl-5 space-y-1">
          <li>Acessar, corrigir, exportar ou apagar seus dados</li>
          <li>Revogar consentimento</li>
          <li>Pedir relatório de uso</li>
        </ul>
        <p className="mt-2">
          Solicitações:{" "}
          <a
            href="mailto:contato@limpanomebrazil.com.br"
            className="text-brand-600 underline"
          >
            contato@limpanomebrazil.com.br
          </a>
        </p>
      </Section>
      <Section titulo="5. Segurança">
        <p>
          TLS em trânsito, AES-256 em repouso, RBAC, auditoria de operações
          sensíveis, bcrypt cost 12 pra senhas.
        </p>
      </Section>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-base text-forest-800 mb-2">{titulo}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
