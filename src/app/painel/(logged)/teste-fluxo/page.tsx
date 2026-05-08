import { TesteFluxoForm } from "./teste-fluxo-form";

export const metadata = { title: "Teste de fluxo — LNB" };

export default function TesteFluxoPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl text-forest-800">Teste de fluxo</h1>
        <p className="text-sm text-gray-700 font-medium mt-1">
          Dry-run completo do backend: API Full · Email Resend · WhatsApp Chatwoot · PDF n8n.
          Não grava em LNB_Consultas/CRM, só executa e mostra o resultado.
        </p>
      </div>
      <TesteFluxoForm />
    </div>
  );
}
