import { serve } from 'inngest/next';

import { hello } from '@/jobs/hello';
import { inngest } from '@/services/inngest';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [hello],
});
