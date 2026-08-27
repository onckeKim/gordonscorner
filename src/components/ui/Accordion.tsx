'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Allow more than one panel open at once. Defaults to single-open. */
  allowMultiple?: boolean;
  /** ids that start expanded. */
  defaultOpenIds?: string[];
  className?: string;
}

/**
 * Accessible accordion: each trigger is a real <button> with
 * aria-expanded/aria-controls, each panel has role="region" +
 * aria-labelledby, and the disclosure state is keyboard-operable natively
 * via the button element (no custom key handling needed for basic use).
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenIds));
  const baseId = useId();

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = allowMultiple ? new Set(prev) : new Set<string>();
      if (prev.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className={className}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;

        return (
          <div key={item.id} className="border-b border-corner-stone">
            <h3>
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-medium text-corner-charcoal"
              >
                {item.title}
                <ChevronDown
                  aria-hidden
                  className={`h-5 w-5 shrink-0 text-corner-gold transition-transform motion-reduce:transition-none ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="pb-5 text-sm leading-relaxed text-corner-muted"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
