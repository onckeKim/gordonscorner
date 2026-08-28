import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { policies as defaultPolicies, type PolicyEntry } from '@/lib/content/policies';

export function PolicyAccordion({ policies = defaultPolicies }: { policies?: PolicyEntry[] }) {
  const items: AccordionItem[] = policies.map((p) => ({ id: p.id, title: p.title, content: p.content }));
  return <Accordion items={items} />;
}
