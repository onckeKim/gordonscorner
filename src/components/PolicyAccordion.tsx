import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { policies } from '@/lib/content/policies';

const items: AccordionItem[] = policies.map((p) => ({ id: p.id, title: p.title, content: p.content }));

export function PolicyAccordion() {
  return <Accordion items={items} />;
}
