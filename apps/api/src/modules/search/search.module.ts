import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { RETRIEVAL_ADAPTERS } from './application/ports/retrieval-adapter.port';
import { GENERATION_PORT } from './application/ports/generation.port';
import { SEARCH_REPOSITORY_PORT } from './application/ports/search-repository.port';
import { SEARCH_EVENT_BUS, SearchEventBus } from './application/search-event-bus';
import { ExecuteSearchUseCase } from './application/use-cases/execute-search.use-case';
import { GetSearchUseCase } from './application/use-cases/get-search.use-case';
import { ListSearchHistoryUseCase } from './application/use-cases/list-search-history.use-case';
import { WikipediaRetrievalAdapter } from './infrastructure/adapters/wikipedia.adapter';
import { OpenAlexRetrievalAdapter } from './infrastructure/adapters/openalex.adapter';
import { HackerNewsRetrievalAdapter } from './infrastructure/adapters/hackernews.adapter';
import { ExtractiveGenerationAdapter } from './infrastructure/llm/extractive-generation.adapter';
import { LlmRouterAdapter } from './infrastructure/llm/llm-router.adapter';
import { HybridSearchRepository } from './infrastructure/persistence/hybrid-search.repository';
import { SearchController } from './presentation/search.controller';

@Module({
  imports: [IdentityModule, EntitlementsModule],
  controllers: [SearchController],
  providers: [
    ExecuteSearchUseCase,
    GetSearchUseCase,
    ListSearchHistoryUseCase,
    WikipediaRetrievalAdapter,
    OpenAlexRetrievalAdapter,
    HackerNewsRetrievalAdapter,
    ExtractiveGenerationAdapter,
    LlmRouterAdapter,
    HybridSearchRepository,
    { provide: SEARCH_EVENT_BUS, useValue: new SearchEventBus() },
    { provide: SEARCH_REPOSITORY_PORT, useExisting: HybridSearchRepository },
    { provide: GENERATION_PORT, useExisting: LlmRouterAdapter },
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
  exports: [ExecuteSearchUseCase, SEARCH_REPOSITORY_PORT],
})
export class SearchModule {}
