export type CreateCustomerRequest = {
  mechanicId?: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
};

export type UpdateCustomerRequest = Partial<Omit<CreateCustomerRequest, "mechanicId">> & {
  isActive?: boolean;
};

export type CustomerResponse = {
  mechanicId: string;
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  documentNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
