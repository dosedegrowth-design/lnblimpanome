/**
 * Constantes centralizadas de contato.
 * WHATSAPP_NUMBER é só dígitos no formato internacional.
 */
export const WHATSAPP_NUMBER = "5511997440101";
export const WHATSAPP_DISPLAY = "(11) 99744-0101";
export const EMAIL_CONTATO = "contato@limpanomebrazil.com.br";

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
