import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, type AuthenticatedRequest } from '../../identity/presentation/auth.guard';
import { BookmarksService } from '../application/bookmarks.service';

@ApiTags('library')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.bookmarks.list(req.userId!);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { url: string; title: string; searchId?: string },
  ) {
    return this.bookmarks.create(req.userId!, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.bookmarks.remove(req.userId!, id);
  }
}
