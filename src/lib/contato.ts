/**
 * Constantes centralizadas de contato.
 * WHATSAPP_NUMBER é só dígitos no formato internacional.
 */
export const WHATSAPP_NUMBER = "5541996171780";
export const WHATSAPP_DISPLAY = "(41) 99617-1780";
export const EMAIL_CONTATO = "contato@limpanomebrazil.com.br";

export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
