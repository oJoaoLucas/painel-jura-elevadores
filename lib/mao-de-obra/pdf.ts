// PDF → texto. `unpdf` é o pdf.js empacotado para servidor/serverless.
// Import DINÂMICO: biblioteca pesada só carrega quando chega um PDF (um import
// no topo pode derrubar a rota inteira se falhar ao carregar na nuvem).

export async function extrairTextoPdf(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).join("\n");
}
