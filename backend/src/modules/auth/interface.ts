export interface ILoginInput {
  email: string;
  password: string;
}

export interface IUserContext {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
  access: Array<{
    applicationCode: string;
    role: {
      code: string;
      name: string;
    };
    permissions: string[];
  }>;
}

export interface ILoginResult {
  user: IUserContext;
  sessionToken: string;
}
