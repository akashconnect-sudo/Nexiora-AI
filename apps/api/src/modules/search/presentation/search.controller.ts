import {
  Controller,
  Get,
  Headers,
  Inject,
  MessageEvent,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { AuthGuard, type AuthenticatedRequest } from '../../identity/presentation/auth.guard';
import { ExecuteSearchUseCase } from '../application/use-cases/execute-search.use-case';
import { GetSearchUseCase } from '../application/use-cases/get-search.use-case';
import { ListSearchHistoryUseCase } from '../application/use-cases/list-search-history.use-case';
import { SEARCH_EVENT_BUS, SearchEventBus } from '../application/search-event-bus';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly executeSearch: ExecuteSearchUseCase,
    private readonly getSearch: GetSearchUseCase,
    private readonly listHistory: ListSearchHistoryUseCase,
    @Inject(SEARCH_EVENT_BUS) private readonly events: SearchEventBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a Nova Search session (async pipeline)' })
  async create(@Req() req: AuthenticatedRequest, @Headers('user-agent') userAgent?: string) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '0.0.0.0';

    const record = await this.executeSearch.execute({
      body: req.body,
      userId: req.userId!,
      ip,
      userAgent: userAgent ?? null,
      client: 'web',
    });

    return {
      id: record.id,
      status: record.status,
      streamUrl: `/v1/search/${record.id}/stream`,
      query: record.query,
      createdAt: record.createdAt,
      quota: record.quota,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Authenticated search history' })
  async history(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.listHistory.execute(req.userId!, Number(limit ?? 20), cursor);
  }

  @Sse(':id/stream')
  @ApiOperation({ summary: 'SSE stream for search tokens and status' })
  stream(@Param('id') id: string, @Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = req.userId!;
    return new Observable<MessageEvent>((subscriber) => {
      const unsubscribe = this.events.subscribe(id, (event) => {
        subscriber.next({ data: event } as MessageEvent);
        if (event.type === 'search.done' || event.type === 'search.error') {
          subscriber.complete();
        }
      });

      void this.getSearch
        .execute(id, userId)
        .then((record) => {
          subscriber.next({
            data: { type: 'search.status', status: record.status },
          } as MessageEvent);
          if (record.citations.length) {
            subscriber.next({
              data: { type: 'search.citations', citations: record.citations },
            } as MessageEvent);
          }
          if (record.answer) {
            subscriber.next({
              data: { type: 'search.token', field: 'summary', text: record.answer.summary },
            } as MessageEvent);
            subscriber.next({
              data: {
                type: 'search.token',
                field: 'detailed',
                text: record.answer.detailedMarkdown,
              },
            } as MessageEvent);
          }
          if (
            record.status === 'completed' ||
            record.status === 'failed' ||
            record.status === 'partial'
          ) {
            subscriber.next({
              data:
                record.status === 'failed'
                  ? {
                      type: 'search.error',
                      code: 'SEARCH_FAILED',
                      message: record.errorMessage ?? 'Search failed',
                    }
                  : { type: 'search.done', searchId: id },
            } as MessageEvent);
            subscriber.complete();
          }
        })
        .catch(() => undefined);

      return () => unsubscribe();
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get search session + answer' })
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.getSearch.execute(id, req.userId!);
  }
}
