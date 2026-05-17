declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(dataBuffer: Buffer | Uint8Array): Promise<{ text: string; numpages: number; info: unknown }>;
  export default pdfParse;
}
