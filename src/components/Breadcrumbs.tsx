import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd } from '@/lib/seo';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD — home is
 * always the first entry. Also doubles as structured internal linking:
 * every page using this links back up its own hierarchy, which is exactly
 * the kind of clear internal link structure search engines use to
 * understand site architecture.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const trail: BreadcrumbItem[] = [{ name: 'Home', path: '/' }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-6 text-sm text-corner-muted">
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 text-corner-stone" />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-corner-charcoal">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-corner-gold hover:underline">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
