# Graph Report - SIH  (2026-09-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 126 nodes · 132 edges · 10 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- compilerOptions
- dependencies
- compilerOptions
- OverlayHUD.tsx
- devDependencies
- plugins
- package.json
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `scripts` - 5 edges
4. `SceneConfig` - 4 edges
5. `react` - 4 edges
6. `plugins` - 4 edges
7. `lib` - 3 edges
8. `rules` - 3 edges
9. `OverlayHUDProps` - 2 edges
10. `App()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `plugins` --extends--> `typescript`  [EXTRACTED]
  .oxlintrc.json → package.json
- `OverlayHUDProps` --references--> `SceneConfig`  [EXTRACTED]
  src/components/OverlayHUD.tsx → src/components/Scene3D.tsx

## Import Cycles
- None detected.

## Communities (10 total, 1 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, dependencies, clsx, framer-motion, lucide-react, react (+13 more)

### Community 2 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 3 - "OverlayHUD.tsx"
Cohesion: 0.19
Nodes (11): react, App(), OverlayHUD(), OverlayHUDProps, PALETTES, Scene3D(), SceneConfig, fadeInUp (+3 more)

### Community 4 - "devDependencies"
Cohesion: 0.12
Nodes (17): oxlint, devDependencies, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+9 more)

### Community 5 - "plugins"
Cohesion: 0.20
Nodes (9): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, typescript, oxc, warn (+1 more)

### Community 6 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

## Knowledge Gaps
- **68 isolated node(s):** `allowArbitraryExtensions`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `jsx`, `module` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 73 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `plugins`, `package.json`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `OverlayHUD.tsx`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `typescript` connect `plugins` to `devDependencies`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **What connects `allowArbitraryExtensions`, `allowImportingTsExtensions`, `erasableSyntaxOnly` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._