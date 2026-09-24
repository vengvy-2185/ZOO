import { Grid3x3 } from "lucide-react";
import { KidsShell } from "@/components/visitor/kids/KidsShell";
import { ZooBingo } from "@/components/visitor/kids/ZooBingo";

export default function BingoPage() {
  return (
    <KidsShell icon={Grid3x3} title={["Zoo Bingo", "ប៊ីងហ្គោសួនសត្វ"]} subtitle={["A spotting game for your zoo day. How fast can you get three in a row?", "ល្បែងស្វែងរកសម្រាប់ថ្ងៃទៅសួនសត្វ។ តើអ្នកអាចបានបីក្នុងមួយជួរលឿនប៉ុណ្ណា?"]}>
      <ZooBingo />
    </KidsShell>
  );
}
