import { ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { MfaSetup } from "@/components/admin/MfaSecurity";

export const dynamic = "force-dynamic";

/** Admin: sign-in security (two-step sign-in with a code app). */
export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <AdminPageHeader icon={ShieldCheck} title="សុវត្ថិភាពការចូល" subtitle="ការពារគណនី Admin ដោយប្រើលេខកូដពីទូរស័ព្ទ បន្ថែមលើពាក្យសម្ងាត់។" />
      <MfaSetup />
    </div>
  );
}
