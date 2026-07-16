## Redesign visual global — referência "Super Admin"

Usar a imagem enviada **apenas como referência de estilo** (não copiar layout nem conteúdo). Aplicar a mesma linguagem tipográfica e cromática em **todas as páginas** do Nexus360.

### 1. Tipografia (base da mudança)
A referência usa uma sans-serif geométrica moderna, pesos fortes em títulos e leve no corpo. Vou adotar:
- **Headings**: `Inter` weight 700 (títulos de página, cards, seções) — mesmo caractere da referência.
- **Body/UI**: `Inter` weight 400/500 — números grandes em 600.
- Carregar via `<link>` no `__root.tsx` (Google Fonts: Inter 400/500/600/700).
- Registrar `--font-sans: "Inter", system-ui, sans-serif` em `src/styles.css` e aplicar no `body`.
- Tracking levemente negativo em títulos (`tracking-tight`), já compatível com o padrão atual.

### 2. Paleta (inspirada na referência: dark sidebar + accent vermelho)
Ajustar tokens em `src/styles.css` (light + dark):
- **Sidebar**: fundo quase preto (`oklch(0.18 0.01 260)`), texto claro.
- **Accent primary**: vermelho da referência (`oklch(0.58 0.22 25)`) — usado em item ativo do menu, botões primários e ícone do logo.
- **Ícones coloridos nos KPI cards**: azul, verde, roxo, amarelo (como na referência) via `--chart-1..5` já existentes, apenas reequilibrados.
- Cards com fundo branco puro no light, borda sutil, sombra muito leve.
- Manter dark mode coerente (fundo `oklch(0.14 0.02 260)`).

### 3. Componentes afetados (só apresentação, sem lógica)
- `src/styles.css` — tokens de cor + variável de fonte.
- `src/routes/__root.tsx` — `<link>` do Google Fonts Inter + meta.
- `src/components/layout/app-shell.tsx` — item ativo do sidebar com highlight vermelho (barra/fundo), logo em vermelho, tipografia dos labels.
- `src/components/ui/*` (button, card, badge) — nenhuma edição estrutural; herdam os novos tokens automaticamente.
- Páginas (`dashboard`, `leads`, `prospect`, `audit`, `campaigns`, `templates`, `messages`, `settings`, `signin`) — sem mudanças de código; herdam fonte e cores via tokens.

### 4. Fora de escopo
- Não mudar layout de nenhuma página, não mexer em lógica, dados, rotas ou funções server.
- Não trocar componentes shadcn nem estrutura do sidebar.
- Manter o logo/nome "Nexus360" (a referência "Super Admin" é só inspiração visual).

### Resultado esperado
Todas as páginas passam a usar Inter com hierarquia consistente, sidebar escura com destaque vermelho no item ativo e cards limpos — mesmo "peso visual" da referência, mantendo a identidade Nexus360.