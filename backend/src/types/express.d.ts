declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        status: string;
        organizationId: string;
        organization: { id: string; name: string };
        access: Array<{
          applicationCode: string;
          role: { code: string; name: string };
          permissions: string[];
        }>;
      };
    }
  }
}

export {};
