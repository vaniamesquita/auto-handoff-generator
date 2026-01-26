
# Plugin Logic Master Doc (Fonte da Verdade)

**Versão:**  2.0 (Baseada em  `code.ts`)  **Objetivo:**  Documentar regras de negócio, travessia e renderização para garantir consistência em refatorações.

## 1. Núcleo de Travessia e Seleção (Traversal Core)

### 1.1. Lógica Estrutural (`isStructuralInstance`)

O plugin distingue "Arquitetura" de "Conteúdo" através de nomes de camadas.

-   **Identificador:**  Nomes começando com  `.`,  `_`,  `-`  ou  `.asset`  (case-insensitive).
-   **Regra de Ouro:**
    -   **Traversable:**  Se for estrutural, o plugin  **entra**  (recursão) para ler propriedades internas (cor do texto, borda do container).
    -   **Black Box:**  Se  **NÃO**  for estrutural (ex: ícone de lib externa), o plugin  **para**  a recursão e considera apenas a instância em si.
-   **Exceção de Visibilidade:**  Nós com  `visible: false`  são sumariamente ignorados em qualquer nível.

### 1.2. Resolução de Nomes (`resolveNodeName`)

Resolve o nome semântico ignorando renomeações manuais desorganizadas.

-   **Bubbling Up:**  Se um nó está dentro de uma estrutura (ex: Text "R$ 0,00" dentro de  `.asset/Saldo`), o nome retornado é  **"Saldo"**. O plugin sobe a árvore genealógica até achar o pai estrutural ou Component Set.
-   **Semantic Roles:**  O nome resolvido é comparado contra a constante  `SEMANTIC_ROLES`  (ex: "input", "error", "badge"). Se der match, usa o nome do role padronizado.

----------

## 2. Motor de Extração de Dados (Extraction Engine)

### 2.1. Variáveis e Tokens (`resolveBoundVariable`)

-   **Hierarquia de Valor:**
    1.  **Variável Vinculada (Bound Variable):**  Se existir, é a verdade absoluta. O nome é formatado (`formatToken`).
    2.  **Estilo (Style ID):**  Se não houver variável, busca o estilo (Text Style / Color Style).
    3.  **Valor Raw (Hex/Pixel):**  Último recurso.
-   **Formatação:**  Tokens de espaçamento removem prefixos "spacing/" ou "size/" para limpeza visual.

### 2.2. Exceções por Tipo de Propriedade

-   **Cores (Ícones):**  A função  `extractIconColor`  ignora a estrutura da instância e busca recursivamente um nó chamado  `"Vector"`  ou tipo  `VECTOR`. Isso contorna máscaras e wrappers de ícones (ex: FontAwesome containers).
-   **Tipografia:**  Ignora propriedades mistas (`figma.mixed`). Se a fonte for "Mixed", retorna um objeto placeholder para evitar erro.
-   **Espaçamentos (Auto Layout):**
    -   **Gap:**  Só é extraído se  `layoutMode != "NONE"`,  `itemSpacing > 0`  **E**  houver pelo menos  **2 filhos visíveis**.
    -   **Paddings:**  Extraídos individualmente (Top, Bottom, Left, Right).
-   **Bordas (Strokes):**
    -   Detecta se é uniforme (`strokeWeight`) ou mista (`strokeTopWeight`, etc.).
    -   Mapeia posição:  `INSIDE`,  `OUTSIDE`,  `CENTER`.

----------

## 3. Motor de Visualização e Layout (Rendering Engine)

### 3.1. Grid de Variantes (`createGenericVariantGrid`)

Lógica crítica para evitar que o grid fique desalinhado ("denteado").

-   **Regra de Passada Dupla (Obrigatória):**
    1.  **Pré-Cálculo:**  Itera sobre  _todas_  as variantes para encontrar a  `maxFrameHeight`  (Altura da variante + Margem).
    2.  **Renderização:**  Desenha os frames usando a  `maxFrameHeight`  fixa para todos os itens da linha.
-   **Ordenação:**  As variantes são ordenadas via  `SIZE_ORDER`  (xsmall -> small -> regular...).

### 3.2. Sistema de Colisão de Anotações (`AnnotationTracker`)

Para evitar que etiquetas de medidas (Padding/Margin) se sobreponham.

-   **Tracker:**  O objeto  `AnnotationTracker`  armazena as posições X ou Y já ocupadas.
-   **Algoritmo de Desvio (`findFreeXPosition`  /  `findFreeYPosition`):**
    -   Verifica se a posição ideal colide com uma existente (`minSpacing`).
    -   Se colidir, tenta alternar posições (cima/baixo ou esquerda/direita) incrementalmente até achar um espaço livre.
    -   _Fallback:_  Se falhar 10 tentativas, usa a posição com offset acumulado.

### 3.3. Anatomia do Componente (`createUsedComponentsSectionAutoLayout`)

-   **Smart Scaling:**
    -   Componentes maiores que 180px são redimensionados (`rescale`) para caber no card.
    -   Componentes pequenos  **mantêm**  o tamanho original (não são esticados).
-   **Pointer Logic:**  O "Pointer" (linha + bolinha) na anatomia conecta o label à  **borda superior**  do componente (não ao centro), garantindo visibilidade limpa.
-   **Blacklist de Anatomia:**  Componentes cujo nome começa com  `.`  ou  `_`  são  **excluídos**  da lista visual de dependências, mesmo que tenham sido lidos na extração de dados.

### 3.4. Assets Manuais (Markers)

Os markers inseridos via UI ("Insert Asset") são programados para serem responsivos.

-   **Constraints:**  As linhas e badges possuem constraints (`STRETCH`,  `CENTER`) configuradas no momento da criação (`createMeasureAssetResizable`). Isso permite que o usuário estique o asset no Figma e o desenho se adapte sem quebrar.

----------

## 4. Lógica de Agrupamento de Tabelas

### 4.1. Consolidação Semântica

As tabelas (Cores, Espaçamentos, Efeitos) não listam cada variante individualmente se os valores forem iguais.

-   **Regra "Todos":**  Se um token/valor é usado por  **todas**  as variantes, a linha da tabela exibe o prefixo  **"Todos"**  (ex: "Todos / Padding-16").
-   **Regra de Grupo:**  Se o valor muda por variante, o plugin agrupa (ex: "Small / Padding-8", "Large / Padding-24"). O agrupamento usa a propriedade principal da variante.

### 4.2. Tratamento de Propriedades (Properties Table)

-   **Nested Instances:**  Propriedades do tipo  `INSTANCE_SWAP`  são separadas em uma sub-tabela específica.
-   **Boolean/Text Sorting:**  Pares lógicos são agrupados visualmente. Se existir uma prop booleana "Has Label" e uma prop de texto "Label Text", o plugin tenta ordená-las juntas.

----------

## 5. Referência Rápida de Arquivos e Funções

Use esta tabela para localizar onde a lógica reside:


| Funcionalidade        | Função Chave                     | Arquivo (Contexto Novo)                  |
|----------------------|----------------------------------|------------------------------------------|
| Ignorar Layers       | isStructuralInstance             | src/core/node-helpers.ts                 |
| Resolver Nome        | resolveNodeName                  | src/core/node-helpers.ts                 |
| Extração Recursiva   | collectNodeData                  | src/core/traversal.ts                    |
| Cor de Ícone         | extractIconColor                 | src/core/traversal.ts                    |
| Evitar Colisão       | findFreeXPosition                | src/ui/annotations.ts                    |
| Grid Alinhado        | createGenericVariantGrid         | src/features/generators.ts               |
| Anatomia / Scale    | createUsedComponentsSection...   | src/features/generators.ts               |
| Assets Responsivos   | createMeasureAssetResizable      | src/assets/marker-generator.ts           |


