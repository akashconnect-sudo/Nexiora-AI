declare module '@nexiora/nest-runtime' {
  export function loadNexioraExpress(): Promise<
    (req: unknown, res: unknown, next?: (err?: unknown) => void) => void
  >;
  export function resolveCreateApp(): string;
}
