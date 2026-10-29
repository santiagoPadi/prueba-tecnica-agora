/** Enlace a WhatsApp con el borrador listo; sin teléfono abre el selector de contacto. */
export function buildWhatsAppLink(phone: string | null, text: string): string {
  const digits = phone ? phone.replace(/\D/g, '') : '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
