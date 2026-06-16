import { requireTenantAccess } from "@/lib/auth";
import ProductsClient from "./ProductsClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function AdminProductsPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Validar se o usuário autenticado tem acesso de gestor/dono a esta barbearia
  await requireTenantAccess(slug);

  return <ProductsClient slug={slug} />;
}
