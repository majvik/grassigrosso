import { CatalogPage } from "@/components/pages/CatalogPage";
import { DealersPage } from "@/components/pages/DealersPage";
import { ContactsPage } from "@/components/pages/ContactsPage";
import { DocumentsPage } from "@/components/pages/DocumentsPage";
import { HotelsPage } from "@/components/pages/HotelsPage";
import { IndexPage } from "@/components/pages/IndexPage";
import { LegalPage } from "@/components/pages/LegalPage";
import {
  LEGAL_PAGES,
  type LegalPageId,
} from "@/components/pages/legal-content";
import { NotFoundPage } from "@/components/pages/NotFoundPage";
import { UnsubscribePage } from "@/components/pages/UnsubscribePage";

interface ReactIslandRootProps {
  page: string;
}

export function ReactIslandRoot({ page }: ReactIslandRootProps) {
  if (page === "index") return <IndexPage />;
  if (page === "catalog") return <CatalogPage />;
  if (page === "hotels") return <HotelsPage />;
  if (page === "dealers") return <DealersPage />;
  if (page === "contacts") return <ContactsPage />;
  if (page === "documents") return <DocumentsPage />;
  if (page === "unsubscribe") return <UnsubscribePage />;
  if (page === "404") return <NotFoundPage />;
  if (page in LEGAL_PAGES) return <LegalPage pageId={page as LegalPageId} />;

  return <NotFoundPage />;
}
