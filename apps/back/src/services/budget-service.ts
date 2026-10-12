import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { budgetItemAmount, type CreateBudgetPdfRequest } from "@cardoc/types";

export const createBudgetPdf = async (input: CreateBudgetPdfRequest) => {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const money = (value: number) =>
    `$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let page = document.addPage([595.28, 841.89]);
  let y = 0;
  const draw = (value: string, x: number, at: number, size = 10, strong = false) =>
    page.drawText(value, {
      x,
      y: at,
      size,
      font: strong ? bold : regular,
      color: rgb(0.12, 0.18, 0.25),
    });
  const wrap = (value: string, width: number, size = 10) => {
    const lines: string[] = [];
    let line = "";
    for (const word of value.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (regular.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (regular.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const header = () => {
    draw("carDoc | PRESUPUESTO", 40, 790, 20, true);
    draw(`Fecha: ${input.date.split("-").reverse().join("/")}`, 40, 764);
    y = 742;
    for (const line of wrap(`Cliente: ${input.customer.fullName}`, 510)) {
      draw(line, 40, y);
      y -= 14;
    }
    for (const line of wrap(
      `Vehículo: ${input.vehicle.name} | Patente: ${input.vehicle.plate}`,
      510,
    )) {
      draw(line, 40, y);
      y -= 14;
    }
    y -= 16;
    draw("Descripción", 40, y, 10, true);
    draw("Cant.", 302, y, 10, true);
    draw("P. unitario", 360, y, 10, true);
    draw("Importe", 470, y, 10, true);
    y -= 22;
  };
  const ensureSpace = (height: number) => {
    if (y - height < 70) {
      page = document.addPage([595.28, 841.89]);
      header();
    }
  };
  header();
  let totalCents = 0;
  for (const item of input.items) {
    const lines = wrap(item.description, 245);
    const amount = budgetItemAmount(item);
    totalCents += Math.round(amount * 100);
    ensureSpace(lines.length * 14 + 16);
    lines.forEach((line, index) => draw(line, 40, y - index * 14));
    draw(String(item.quantity), 302, y, 9);
    const price = money(item.unitPrice),
      subtotal = money(amount);
    const numeric = (value: string, right: number) => {
      const size = Math.min(9, (94 / regular.widthOfTextAtSize(value, 9)) * 9);
      draw(value, right - regular.widthOfTextAtSize(value, size), y, size);
    };
    numeric(price, 459);
    numeric(subtotal, 555);
    y -= lines.length * 14 + 16;
  }
  ensureSpace(55);
  draw(`TOTAL: ${money(totalCents / 100)}`, 40, y - 20, 16, true);
  document.getPages().forEach((sheet, index, pages) =>
    sheet.drawText(`Presupuesto | ${index + 1} / ${pages.length}`, {
      x: 40,
      y: 35,
      size: 9,
      font: regular,
    }),
  );
  return document.save();
};
