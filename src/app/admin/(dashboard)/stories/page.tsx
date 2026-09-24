import { redirect } from "next/navigation";

// Editing now lives in the generic Manage editor.
export default function Page() {
  redirect("/admin/manage/stories");
}
