import pino from 'pino';

/**
 * Worker process entrypoint.
 * Phase 0: process boots and reports readiness for queue consumers.
 * Phase 1+: registers BullMQ processors for retrieval fan-out.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  name: 'nexiora-worker',
});

async function main(): Promise<void> {
  logger.info(
    {
      redisUrl: process.env.REDIS_URL ? '[configured]' : '[missing]',
      role: 'worker-bootstrap',
    },
    'Nexiora worker started (Phase 0 — no queues registered yet)',
  );

  const shutdown = (): void => {
    logger.info('Worker shutting down');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive for orchestrators / docker compose.
  await new Promise(() => undefined);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
