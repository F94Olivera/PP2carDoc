export type CreateCustomerRequest = {
  mechanicId?: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
};

export type UpdateCustomerRequest = Partial<
  Omit<CreateCustomerRequest, "mechanicId" | "email" | "password">
> & {
  isActive?: boolean;
};

export type CustomerResponse = {
  mechanicId: string;
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  documentNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResetCustomerPasswordRequest = { password: string };
