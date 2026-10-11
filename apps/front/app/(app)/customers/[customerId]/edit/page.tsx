"use client";

import type { CustomerResponse } from "@cardoc/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "../../../../i18n/use-i18n";
import CustomerForm from "../../customer-form";
import { getCustomer } from "../../customer-api";

export default function EditCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { t } = useI18n();
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getCustomer(customerId, t.customers.loadDetailError).then(
      (value) => {
        if (active) setCustomer(value);
      },
      (reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : t.customers.loadDetailError);
      },
    );
    return () => {
      active = false;
    };
  }, [customerId, t.customers.loadDetailError]);
  if (error)
    return (
      <div role="alert">
        {error} <Link href="/customers">{t.customers.back}</Link>
      </div>
    );
  if (!customer) return <p>{t.customers.loadingDetail}</p>;
  return <CustomerForm key={customer.id} customer={customer} />;
}
