import { readFileSync } from "fs";
import path from "path";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Navbar } from "@/components/visitor/Navbar";
import { BottomNav } from "@/components/visitor/BottomNav";
import { PageHeader } from "@/components/visitor/PageHeader";
import { SiteFooter } from "@/components/visitor/SiteFooter";
import { getI18n } from "@/lib/i18n/server";

// Attribution for the sample animal photos (CC BY / CC BY-SA licences
// require crediting the photographer and linking the licence).
interface Credit {
  file: string;
  source: string;
  title: string;
  author: string;
  license: string;
  licenseUrl?: string;
}

function loadCredits(): Credit[] {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "public", "animals", "CREDITS.json"), "utf8"));
  } catch {
    return [];
  }
}

export default function CreditsPage() {
  const credits = loadCredits();
  const { t } = getI18n();
  return (
    <div className="pb-20 md:pb-0">
      <Navbar />
      <PageHeader icon={Camera} eyebrow={t.credits.eyebrow} title={t.credits.title} subtitle={t.credits.subtitle} />
      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {credits.map((c) => (
            <div key={c.file} className="card flex gap-4 p-3">
              <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl">
                <Image src={`/animals/${c.file}`} alt="" fill sizes="112px" className="object-cover" />
              </div>
              <div className="min-w-0 text-sm">
                <a href={c.source} target="_blank" rel="noreferrer" className="block truncate font-bold text-forest hover:text-primary">
                  {c.title.replace(/^File:/, "")}
                </a>
                <div className="text-ink/60">{t.credits.photo}: {c.author}</div>
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                    {c.license}
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-primary">{c.license}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Starter Photo Booth stickers (Admin → Booth Stickers) */}
        <p className="card mt-3 p-4 text-sm text-ink/70">
          Photo booth stickers (giraffe, zebra, bear, tortoise):{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Animals_png_set_by_mossi889-d4uye4q.png" target="_blank" rel="noreferrer" className="font-bold text-forest hover:text-primary">
            “Animals png set”
          </a>{" "}
          by mossi889, licence{" "}
          <a href="https://creativecommons.org/licenses/by/3.0" target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
            CC BY 3.0
          </a>
        </p>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
