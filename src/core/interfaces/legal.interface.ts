export type AgreementStatus = "active" | "inactive" | "archived";

export interface DocumentInterface {
  id: number;
  orgId: number;
  region: string;
  title: string;
  code: string;
  text: string;
  version: number;
  locale?: string | null;
  metadata?: Record<string, unknown>;
  status: AgreementStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
  arn: string;
}

export interface AgreementInterface {
  id: number;
  orgId: number;
  region: string;
  documentId: number;
  accountId: number;
  userId: number;
  metadata?: Record<string, unknown>;
  status: AgreementStatus;
  date: string;
  createdAt: string;
  updatedAt: string;
  arn: string;
}

export interface CheckAgreementParamsInterface {
  accountId: number;
  documentCode: string;
}

export interface CheckAgreementResponseInterface {
  document: DocumentInterface;
  agreement: AgreementInterface | null;
}

export interface CreateAgreementRequestInterface {
  orgId: number;
  region: string;
  documentId: number;
  accountId: number;
  userId: number;
  status: AgreementStatus;
  date: string;
  metadata?: Record<string, unknown>;
}

export interface AcceptAgreementResponseInterface {
  agreement: AgreementInterface | null;
  alreadySigned: boolean;
  groupIds: number[];
}
