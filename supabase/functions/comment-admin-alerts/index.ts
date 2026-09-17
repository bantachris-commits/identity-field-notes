import { createHandler } from './worker.mjs';

// Custom authentication is checked before queue access or any email request.
// The random key lives only in Supabase Vault; the database stores its hash.
Deno.serve(createHandler({ env: (name: string) => Deno.env.get(name) }));
