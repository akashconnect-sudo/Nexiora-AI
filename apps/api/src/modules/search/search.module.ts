import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { RETRIEVAL_ADAPTERS } from './application/ports/retrieval-adapter.port';
import { GENERATION_PORT } from './application/ports/generation.port';
import { SEARCH_REPOSITORY_PORT } from './application/ports/search-repository.port';
import { INDEXED_RETRIEVAL_ADAPTER } from './application/ports/indexed-retrieval.port';
import { SEARCH_EVENT_BUS } from './application/search-event-bus';
import { ExecuteSearchUseCase } from './application/use-cases/execute-search.use-case';
import { GetSearchUseCase } from './application/use-cases/get-search.use-case';
import { ListSearchHistoryUseCase } from './application/use-cases/list-search-history.use-case';
import { SearchPipelineService } from './application/search-pipeline.service';
import { WikipediaRetrievalAdapter } from './infrastructure/adapters/wikipedia.adapter';
import { OpenAlexRetrievalAdapter } from './infrastructure/adapters/openalex.adapter';
import { HackerNewsRetrievalAdapter } from './infrastructure/adapters/hackernews.adapter';
import { ExtractiveGenerationAdapter } from './infrastructure/llm/extractive-generation.adapter';
import { LlmRouterAdapter } from './infrastructure/llm/llm-router.adapter';
import { OpenAiEmbeddingAdapter } from './infrastructure/llm/openai-embedding.adapter';
import { HybridSearchRepository } from './infrastructure/persistence/hybrid-search.repository';
import { IndexedRetrievalAdapter } from './infrastructure/indexed/indexed-retrieval.adapter';
import { OpenSearchSearchClient } from './infrastructure/indexed/opensearch-search.client';
import { QdrantSearchClient } from './infrastructure/indexed/qdrant-search.client';
import { DocumentIndexingService } from './infrastructure/indexing/document-indexing.service';
import { RedisStreamSearchEventBus } from '../../infrastructure/queue/redis-stream-search-events';
import { SearchController } from './presentation/search.controller';

@Module({
  imports: [IdentityModule, EntitlementsModule],
  controllers: [SearchController],
  providers: [
    ExecuteSearchUseCase,
    GetSearchUseCase,
    ListSearchHistoryUseCase,
    SearchPipelineService,
    DocumentIndexingService,
    WikipediaRetrievalAdapter,
    OpenAlexRetrievalAdapter,
    HackerNewsRetrievalAdapter,
    ExtractiveGenerationAdapter,
    LlmRouterAdapter,
    OpenAiEmbeddingAdapter,
    HybridSearchRepository,
    OpenSearchSearchClient,
    QdrantSearchClient,
    IndexedRetrievalAdapter,
    RedisStreamSearchEventBus,
    { provide: SEARCH_EVENT_BUS, useExisting: RedisStreamSearchEventBus },
    { provide: SEARCH_REPOSITORY_PORT, useExisting: HybridSearchRepository },
    { provide: GENERATION_PORT, useExisting: LlmRouterAdapter },
    { provide: INDEXED_RETRIEVAL_ADAPTER, useExisting: IndexedRetrievalAdapter },
    {
      provide: RETRIEVAL_ADAPTERS,
      useFactory: (
        wiki: WikipediaRetrievalAdapter,
        openAlex: OpenAlexRetrievalAdapter,
        hn: HackerNewsRetrievalAdapter,
      ) => [wiki, openAlex, hn],
      inject: [WikipediaRetrievalAdapter, OpenAlexRetrievalAdapter, HackerNewsRetrievalAdapter],
    },
  ],
  exports: [
    ExecuteSearchUseCase,
    SEARCH_REPOSITORY_PORT,
    SearchPipelineService,
    DocumentIndexingService,
    OpenSearchSearchClient,
    QdrantSearchClient,
    OpenAiEmbeddingAdapter,
  ],
})
export class SearchModule {}
