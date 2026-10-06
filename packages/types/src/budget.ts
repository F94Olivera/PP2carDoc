export type BudgetPdfTemplateId = "classic";

export type BudgetPdfItemRequest = {
  quantity: number;
  description: string;
  unitPrice: number;
};

export type CreateBudgetPdfRequest = {
  templateId: BudgetPdfTemplateId;
  customer: {
    fullName: string;
  };
  vehicle: {
    name: string;
    plate: string;
  };
  date: string;
  items: BudgetPdfItemRequest[];
};
