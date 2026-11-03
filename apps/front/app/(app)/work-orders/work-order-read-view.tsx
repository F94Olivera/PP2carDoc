"use client";
import type { VehicleResponse, WorkOrderResponse } from "@cardoc/types";
import { useI18n } from "../../i18n/use-i18n";
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  );
function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value ?? "-"}</dd>
    </div>
  );
}
export function WorkOrderReadView({
  customerName,
  vehicle,
  workOrder,
}: {
  customerName: string;
  vehicle: VehicleResponse;
  workOrder: WorkOrderResponse;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-8 space-y-8">
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DetailField label={t.workOrders.customerInfoLabel} value={customerName} />
        <DetailField label={t.vehicles.licensePlateLabel} value={vehicle.licensePlate} />
        <DetailField label={t.workOrders.entryDateLabel} value={formatDate(workOrder.entryDate)} />
        <DetailField
          label={t.workOrders.exitDateLabel}
          value={workOrder.exitDate ? formatDate(workOrder.exitDate) : null}
        />
        <DetailField label={t.workOrders.reportedProblemLabel} value={workOrder.reportedProblem} />
        <DetailField
          label={t.vehicles.odometerLabel}
          value={
            workOrder.intakeOdometer === null
              ? null
              : `${workOrder.intakeOdometer} ${vehicle.odometerUnit}`
          }
        />
        <DetailField label={t.workOrders.notesLabel} value={workOrder.notes} />
        <DetailField label={t.workOrders.diagnosisLabel} value={workOrder.diagnosis} />
      </section>

      <section>
        <h3 className="text-base font-semibold">{t.workOrders.itemsTitle}</h3>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[600px] table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t.workOrders.descriptionLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.categoryLabel}</th>
                <th className="w-24 px-4 py-3">{t.workOrders.quantityLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.unitPriceLabel}</th>
                <th className="w-32 px-4 py-3">{t.workOrders.totalColumn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {workOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.description}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{formatMoney(item.unitPrice)}</td>
                  <td className="px-4 py-3">{formatMoney(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold">{t.workOrders.recommendationsTitle}</h3>
        {workOrder.recommendations.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {workOrder.recommendations.map((recommendation) => (
              <article
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                key={recommendation.id}
              >
                <p className="text-sm font-semibold">{recommendation.description}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {recommendation.status ?? "-"} · {recommendation.priority ?? "-"}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {recommendation.reason ?? "-"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.workOrders.noRecommendations}
          </p>
        )}
      </section>
    </div>
  );
}
