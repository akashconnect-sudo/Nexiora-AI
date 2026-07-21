import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../bootstrap/app-config.service';

@Injectable()
export class OpenAiEmbeddingAdapter {
  private readonly logger = new Logger(OpenAiEmbeddingAdapter.name);

  constructor(private readonly config: AppConfigService) {}

  async embed(text: string): Promise<number[] | null> {
    const apiKey = this.config.openaiApiKey;
    if (!apiKey) return null;

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.openaiEmbeddingModel,
          input: text.slice(0, 8000),
          dimensions: this.config.openaiEmbeddingDims,
        }),
      });
      if (!response.ok) {
        this.logger.warn(`Embedding request failed with ${response.status}`);
        return null;
      }
      const body = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      return body.data?.[0]?.embedding ?? null;
    } catch (error) {
      this.logger.warn(`Embedding request error: ${(error as Error).message}`);
      return null;
    }
  }
}
