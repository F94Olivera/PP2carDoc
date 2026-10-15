import { PDFDocument, PageSizes, StandardFonts } from "pdf-lib";

export const createBudgetPdf = async () => {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage(PageSizes.A4);
  page.drawText("hola mundo", {
    x: 40,
    y: page.getHeight() - 60,
    size: 12,
    font,
  });
  return document.save();
};
