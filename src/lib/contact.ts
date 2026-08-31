// Public commercial contact confirmed by 01 Transportes.
export const WHATSAPP_NUMBER = "5551996015671";
export const WHATSAPP_LABEL = "(51) 99601-5671";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
