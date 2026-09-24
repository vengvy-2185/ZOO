import Link from "next/link";
import type { AnimalRelationship } from "@/types/domain";
import { getI18n } from "@/lib/i18n/server";

function Node({ rel }: { rel: AnimalRelationship }) {
  return (
    <Link
      href={`/animals/${rel.related_code}`}
      className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 card-shadow"
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-light-green text-xl">
        {rel.related_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rel.related_image} alt={rel.related_name} className="h-full w-full object-cover" />
        ) : (
          "🦁"
        )}
      </div>
      <span className="text-xs font-medium">{rel.related_name}</span>
    </Link>
  );
}

export function FamilyTree({
  animalName,
  relationships,
}: {
  animalName: string;
  relationships: AnimalRelationship[];
}) {
  const { t } = getI18n();
  const father = relationships.find((r) => r.relationship_type === "father");
  const mother = relationships.find((r) => r.relationship_type === "mother");
  const siblings = relationships.filter((r) => r.relationship_type === "sibling");
  const children = relationships.filter((r) => r.relationship_type === "child");

  if (relationships.length === 0) {
    return <p className="text-sm text-ink/50">{t.detail.noFamily}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {(father || mother) && (
        <div className="flex gap-4">
          {father && <Node rel={father} />}
          {mother && <Node rel={mother} />}
        </div>
      )}
      {(father || mother) && <div className="h-6 w-px bg-black/10" />}
      <div className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">{animalName}</div>
      {(siblings.length > 0 || children.length > 0) && <div className="h-6 w-px bg-black/10" />}
      {siblings.length > 0 && (
        <div>
          <p className="mb-2 text-center text-xs font-medium text-ink/50">{t.detail.siblings}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {siblings.map((s) => (
              <Node key={s.related_animal_id} rel={s} />
            ))}
          </div>
        </div>
      )}
      {children.length > 0 && (
        <div>
          <p className="mb-2 text-center text-xs font-medium text-ink/50">{t.detail.children}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {children.map((c) => (
              <Node key={c.related_animal_id} rel={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
