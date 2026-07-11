import { redirect } from 'next/navigation';

// Plans management has been merged into the unified Tenants & Plans module.
export default function PlansRedirect() {
  redirect('/admin/tenants');
}
