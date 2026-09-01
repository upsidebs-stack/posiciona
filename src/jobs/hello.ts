import { inngest } from '@/services/inngest';

/**
 * Fase 0 smoke test: proves the Inngest dev server, the /api/inngest route,
 * and step durability wiring all work before Fase 1 adds run-diagnosis.
 */
export const hello = inngest.createFunction(
  { id: 'hello', triggers: [{ event: 'posiciona/hello' }] },
  async ({ event, step }) => {
    return step.run('greet', () => `Hello, ${event.data.name ?? 'world'}`);
  },
);
