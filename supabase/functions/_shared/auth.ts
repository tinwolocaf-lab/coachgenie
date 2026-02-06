import { createAuthClient, createUserClient } from './supabase.ts';

export interface AuthResult {
  userId: string;
  userClient: ReturnType<typeof createUserClient>;
}

export async function requireAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new Error('Invalid Authorization header');
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Unauthorized');
  }

  const userClient = createUserClient(authHeader);
  return { userId: data.user.id, userClient };
}
