import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const heliconeKey = process.env.HELICONE_API_KEY;
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(heliconeKey && {
        baseURL: "https://oai.helicone.ai/v1",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${heliconeKey}`,
          "Helicone-Property-App": "careeros",
        },
      }),
    });
  }
  return _client;
}

export const MODEL = {
  GPT4O: "gpt-4o" as const,
  GPT4O_MINI: "gpt-4o-mini" as const,
  EMBEDDING_LARGE: "text-embedding-3-large" as const,
  EMBEDDING_SMALL: "text-embedding-3-small" as const,
} as const;

export type OpenAIModel = (typeof MODEL)[keyof typeof MODEL];

/**
 * Generate embeddings for an array of texts.
 * Returns array of float32 embedding vectors.
 */
export async function generateEmbeddings(
  texts: string[],
  model: "text-embedding-3-large" | "text-embedding-3-small" = "text-embedding-3-large"
): Promise<number[][]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model,
    input: texts,
    encoding_format: "float",
  });
  return response.data.map((d) => d.embedding);
}

/**
 * Generate a single embedding.
 */
export async function generateEmbedding(
  text: string,
  model: "text-embedding-3-large" | "text-embedding-3-small" = "text-embedding-3-large"
): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text], model);
  if (!embedding) throw new Error("Embedding generation returned empty result");
  return embedding;
}
