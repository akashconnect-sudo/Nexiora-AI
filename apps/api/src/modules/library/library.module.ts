import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  BOOKMARK_STORE,
  BookmarksService,
  HybridBookmarkStore,
} from './application/bookmarks.service';
import { BookmarksController } from './presentation/bookmarks.controller';

@Module({
  imports: [IdentityModule],
  controllers: [BookmarksController],
  providers: [
    BookmarksService,
    HybridBookmarkStore,
    { provide: BOOKMARK_STORE, useExisting: HybridBookmarkStore },
  ],
})
export class LibraryModule {}
