import type { budgetPdfSchema } from "@cardoc/types";
import type { messages } from "../../i18n/messages";

type BudgetMessages = (typeof messages)["es"]["budget"];
type BudgetIssue = Extract<
  ReturnType<typeof budgetPdfSchema.safeParse>,
  { success: false }
>["error"]["issues"][number];

export const budgetValidationMessages = (issues: BudgetIssue[], t: BudgetMessages) => {
  const errors = new Map<string, string>();
  const copy = t.validation;

  const textMessage = (field: string, issue: BudgetIssue) => {
    if (issue.code === "too_big") return copy.textLength(field, Number(issue.maximum));
    if (issue.code === "invalid_format") return copy.textCharacters(field);
    return copy.textRequired(field);
  };

  for (const issue of issues) {
    const path = issue.path.join(".");
    if (errors.has(path)) continue;

    const [section, index, itemField] = issue.path;
    let message: string;
    if (path === "customer.fullName") message = textMessage(t.customerLabel, issue);
    else if (path === "vehicle.name") message = textMessage(t.vehicleLabel, issue);
    else if (path === "vehicle.plate") message = textMessage(t.domainLabel, issue);
    else if (path === "date") message = copy.date;
    else if (path === "templateId") message = copy.template;
    else if (path === "items") message = copy.items;
    else if (section === "items" && typeof index === "number") {
      const row = t.itemLabel(index + 1);
      if (itemField === "description") {
        message = textMessage(`${row} · ${t.descriptionColumn}`, issue);
      } else if (itemField === "quantity") {
        message = issue.code === "custom" ? copy.quantityPrecision(row) : copy.quantity(row);
      } else if (itemField === "unitPrice") {
        message = issue.code === "custom" ? copy.pricePrecision(row) : copy.price(row);
      } else {
        message = copy.items;
      }
    } else {
      message = issue.code === "custom" ? copy.total : t.pdfDefaultError;
    }
    errors.set(path, message);
  }

  return errors;
};
