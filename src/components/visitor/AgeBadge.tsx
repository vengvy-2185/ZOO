import { calculateAge, isBirthdayToday } from "@/lib/utils/age";

export function AgeBadge({ dateOfBirth }: { dateOfBirth: string | null }) {
  const age = calculateAge(dateOfBirth);
  if (!age) return <span className="text-ink/40">Age unknown</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {age}
      {isBirthdayToday(dateOfBirth) && <span title="Happy Birthday!">🎉</span>}
    </span>
  );
}
