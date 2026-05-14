export interface AuthUserInterface {
  id: number;
  orgId: number;
  selectedOrgId?: number;
  primaryUserId: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  image?: string;
  region: string;
  tags: string[];
  arn: string;
}
