import { AuthSplitLayout } from "@/components/visitor/AuthSplitLayout";
import { TeamLoginForm } from "@/components/visitor/TeamLoginForm";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminLoginPage() {
  const { t } = getI18n();
  return (
    <AuthSplitLayout eyebrow={t.auth.adminEyebrow} title="Green Wild Zoo" subtitle={t.auth.adminSubtitle}>
      <TeamLoginForm role="admin" />
    </AuthSplitLayout>
  );
}
