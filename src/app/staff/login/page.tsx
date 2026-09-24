import { AuthSplitLayout } from "@/components/visitor/AuthSplitLayout";
import { TeamLoginForm } from "@/components/visitor/TeamLoginForm";
import { getI18n } from "@/lib/i18n/server";

export default async function StaffLoginPage() {
  const { t } = getI18n();
  return (
    <AuthSplitLayout eyebrow={t.auth.staffEyebrow} title="Green Wild Zoo" subtitle={t.auth.staffSubtitle}>
      <TeamLoginForm role="staff" />
    </AuthSplitLayout>
  );
}
