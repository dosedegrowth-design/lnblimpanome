/**
 * Layout root do /painel/*.
 *
 * NÃO renderiza sidebar. Sidebar é responsabilidade do route group
 * `(logged)` que cobre todas as páginas autenticadas.
 *
 * Esse layout existe pra evitar que o root layout interfira nas páginas
 * e pra permitir metadata/styles compartilhados se necessário no futuro.
 */
export default function PainelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
