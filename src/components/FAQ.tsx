import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { allFaqItems, homeFaqIds } from '@/lib/content/faq';

const homeItems: AccordionItem[] = allFaqItems
  .filter((item) => homeFaqIds.includes(item.id))
  .map((item) => ({ id: item.id, title: item.question, content: item.answer }));

export function FAQ({ items = homeItems }: { items?: AccordionItem[] }) {
  return <Accordion items={items} />;
}
