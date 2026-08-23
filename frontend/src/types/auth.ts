export interface UserAccess {
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
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
  access: UserAccess[];
}
