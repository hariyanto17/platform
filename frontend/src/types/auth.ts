export interface UserAccess {
  id: string;
  applicationCode: string;
  role: {
    code: string;
    name: string;
  };
  permissions: string[];
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  status: string;
  organizationId: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
  };
  access: UserAccess[];
  applications: Array<{
    code: string;
    name?: string;
    role: string;
    permissions: string[];
    status?: string;
  }>;
}
