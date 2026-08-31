export function crlvReadError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/password|encrypted/i.test(message)) {
    return "Este PDF está protegido por senha. Anexe uma cópia sem senha ou continue preenchendo os dados manualmente.";
  }
  if (/invalid pdf|invalidpdf|missing pdf/i.test(message)) {
    return "O arquivo não é um PDF válido ou está incompleto. Baixe o CRLV novamente e tente anexar a nova cópia.";
  }
  return "Não conseguimos ler este PDF neste navegador. Atualize a página e tente novamente. Se continuar, remova o anexo e preencha os dados manualmente; os outros campos não serão apagados.";
}
