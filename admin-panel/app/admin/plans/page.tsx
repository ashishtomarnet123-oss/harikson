import { redirect } from 'next/navigation';

// Plans management connects directly into the established Tenants & Plans module on the 'plans' tab.
export default function PlansRedirect() {
  redirect('/admin/tenants?tab=plans');
}
