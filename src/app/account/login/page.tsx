import { Suspense } from "react";
import { AuthSplitLayout } from "@/components/visitor/AuthSplitLayout";
import { AccountLoginForm } from "./AccountLoginForm";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountLoginPage() {
  const { t } = getI18n();
  return (
    <AuthSplitLayout
      eyebrow={t.auth.visitorEyebrow}
      title="Green Wild Zoo"
      subtitle={t.auth.visitorSubtitle}
    >
      <Suspense>
        <AccountLoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
