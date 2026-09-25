import { AuthSplitLayout } from "@/components/visitor/AuthSplitLayout";
import { getI18n } from "@/lib/i18n/server";
import { StaffIdLoginForm } from "./StaffIdLoginForm";
import { staffTitle } from "@/lib/server/staff";

export const generateMetadata = () => staffTitle("Sign in", "ចូលប្រើ");

// Staff sign in with a Staff ID made by the admin, not an email like visitors.
export default async function StaffLoginPage() {
  const { t, locale } = getI18n();
  return (
    <AuthSplitLayout eyebrow={t.auth.staffEyebrow} title="Green Wild Zoo" subtitle={t.auth.staffSubtitle}>
      <StaffIdLoginForm km={locale === "km"} />
    </AuthSplitLayout>
  );
}
