import type { FastifyRequest } from 'fastify';

export type IdentityUser = {
  id: string;
  email: string;
  username: string;
};

export type OptionalUserRequest = FastifyRequest & {
  user?: IdentityUser;
};

export type AuthenticatedRequest = FastifyRequest & {
  user: IdentityUser;
};
