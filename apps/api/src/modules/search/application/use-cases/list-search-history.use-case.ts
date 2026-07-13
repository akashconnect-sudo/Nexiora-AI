import { Inject, Injectable } from '@nestjs/common';
import {
  SEARCH_REPOSITORY_PORT,
  type SearchRepositoryPort,
} from '../ports/search-repository.port';

@Injectable()
export class ListSearchHistoryUseCase {
  constructor(
    @Inject(SEARCH_REPOSITORY_PORT) private readonly repo: SearchRepositoryPort,
  ) {}

  async execute(userId: string, limit = 20, cursor?: string) {
    return this.repo.listHistory(userId, Math.min(limit, 100), cursor);
  }
}
