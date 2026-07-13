import { Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@nexiora/shared';
import { DomainError } from '../../../../common/errors/domain-error';
import {
  SEARCH_REPOSITORY_PORT,
  type SearchRepositoryPort,
} from '../ports/search-repository.port';

@Injectable()
export class GetSearchUseCase {
  constructor(
    @Inject(SEARCH_REPOSITORY_PORT) private readonly repo: SearchRepositoryPort,
  ) {}

  async execute(id: string) {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new DomainError(ERROR_CODES.NOT_FOUND, 'Search session not found', 404);
    }
    return record;
  }
}
