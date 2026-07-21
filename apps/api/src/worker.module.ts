import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { WorkerBootstrapService } from './infrastructure/queue/worker-bootstrap.service';

/**
 * Nest application context used by the always-on VPS worker process.
 */
@Module({
  imports: [AppModule],
  providers: [WorkerBootstrapService],
})
export class WorkerModule {}
