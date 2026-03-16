import { getParsingResponseSchema } from "../../lib/parsing/index.js"
import type { TLlmProvider, TLlmProviderOptions } from "./types.js"

const DEFAULT_MODEL = "gpt-5.4"

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY"

export function createOpenAiProvider(
    options: TLlmProviderOptions
): TLlmProvider {
    const model = options.model ?? DEFAULT_MODEL

    return {
        async complete(request) {
            const schema = getParsingResponseSchema(request.responseSchema)

            const response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${options.apiKey}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: "system", content: request.systemPrompt },
                            { role: "user", content: request.userMessage },
                        ],
                        response_format: {
                            type: "json_schema",
                            json_schema: {
                                name: "parsed_argument",
                                strict: false,
                                schema,
                            },
                        },
                    }),
                }
            )

            if (!response.ok) {
                const text = await response.text()
                throw new Error(
                    `OpenAI API error (${response.status}): ${text}`
                )
            }

            const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[]
            }
            const content = data.choices?.[0]?.message?.content
            if (!content) {
                throw new Error("No content in OpenAI response.")
            }

            return JSON.parse(content) as Record<string, unknown>
        },
    }
}
