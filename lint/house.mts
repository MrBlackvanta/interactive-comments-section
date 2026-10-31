import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { OxfmtConfig } from "vite-plus/fmt";
import type { OxlintConfig } from "vite-plus/lint";
import { definePlugin, defineRule, type ESTree } from "vite-plus/lint/plugins";

type Overrides = NonNullable<OxlintConfig["overrides"]>;

const tailwindEntry = "./src/app/globals.css";
const signatureUrl = "https://www.linkedin.com/in/abdelrhman-vanta/";
const defaultTextSizes = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
]);

function read(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function filesUnder(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" }).map((path) =>
    join(dir, path),
  );
}

function themeNames(css: string, namespace: string) {
  const declaration = new RegExp(
    `--${namespace}-([a-z0-9-]+?)(?:--[a-z-]+)?\\s*:`,
    "g",
  );
  return new Set([...css.matchAll(declaration)].map(([, name]) => name));
}

function balancedBody(css: string, start: number) {
  let depth = 1;
  let end = start;
  while (end < css.length && depth > 0) {
    if (css[end] === "{") depth++;
    if (css[end] === "}") depth--;
    end++;
  }
  return css.slice(start, end - 1);
}

function rootBlocks(css: string) {
  return [...css.matchAll(/([^{};]*)\{/g)]
    .filter(([, selector]) =>
      selector.split(",").some((part) => /^\s*(?:html|:root)\s*$/.test(part)),
    )
    .map((match) => balancedBody(css, match.index + match[0].length));
}

function appliedClasses(body: string) {
  return [...body.matchAll(/@apply([^;]+);/g)].flatMap(([, list]) =>
    list.trim().split(/\s+/),
  );
}

function gradientVariables(css: string) {
  return [...css.matchAll(/(--[\w-]+)\s*:[^;]*gradient\(/g)].map(
    ([, name]) => name,
  );
}

function restrictedClasses(css: string) {
  return [
    {
      pattern: "^(group|peer)$",
      message:
        "Name it ($1/<name>): a bare $1 satisfies every $1-* variant below it, not just the nearest.",
    },
    {
      pattern: "(^|:)(group|peer)-[^/:]+:",
      message:
        "Bind the variant to a named $2 ($2-hover/<name>:), never to whichever $2 is nearest.",
    },
    {
      pattern: "^(.*)nth-1:(.*)$",
      message: "nth-1: emits nothing; the first child is first:.",
      fix: "$1first:$2",
    },
    {
      pattern: "(^|:)outline-none$",
      message:
        "outline-none removes the ring for forced-colors users too: use outline-transparent (plus outline-2 where no base rule sets the style).",
    },
    {
      pattern: "^(.*)motion-reduce:translate-none$",
      message:
        "The closed state is a transform, so cancelling it parks the panel on screen: cancel the transition instead.",
      fix: "$1motion-reduce:transition-none",
    },
    {
      pattern: "-\\[-?[\\d.]+(px|rem)\\]$",
      message:
        "No bare form for this value: round to a whole pixel (the 0.25 scale) or add a @theme token.",
    },
    {
      pattern: "^(.*bg-(?:linear|radial|conic)(?:-[^/]*)?)$",
      message:
        "Figma blends gradients in sRGB and Tailwind in oklab, so every midpoint drifts: add /srgb.",
      fix: "$1/srgb",
    },
    ...gradientVariables(css).map((name) => ({
      pattern: `^(.*)bg-(?:\\(${name}\\)|\\[var\\(${name}\\)\\])$`,
      message: `${name} holds a gradient, and bg-(--x) sets background-color, which cannot paint one.`,
      fix: `$1bg-(image:${name})`,
    })),
  ];
}

function attributeName(attribute: ESTree.JSXAttribute) {
  return attribute.name.type === "JSXIdentifier"
    ? attribute.name.name
    : attribute.name.name.name;
}

function elementName(element: ESTree.JSXOpeningElement) {
  return element.name.type === "JSXIdentifier" ? element.name.name : "";
}

function unwrap(expression: ESTree.Expression): ESTree.Expression {
  if (
    expression.type === "TSAsExpression" ||
    expression.type === "TSSatisfiesExpression"
  )
    return unwrap(expression.expression);
  return expression;
}

function propertyKey(
  property: Pick<ESTree.ObjectProperty, "key" | "computed">,
) {
  if (property.key.type === "Identifier" && !property.computed)
    return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);
  return "";
}

const noComments = defineRule({
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({
            loc: comment.loc,
            message:
              "Zero comments: rename or extract until the code says it, and put the why in the commit message.",
          });
        }
      },
    };
  },
});

const imageRoute =
  /(?:^|[\\/])(?:opengraph-image|twitter-image|icon|apple-icon)\.tsx$/;

const styleCustomPropertiesOnly = defineRule({
  create(context) {
    if (imageRoute.test(context.filename)) return {};
    return {
      JSXAttribute(node) {
        if (
          attributeName(node) !== "style" ||
          node.value?.type !== "JSXExpressionContainer"
        )
          return;
        if (node.value.expression.type === "JSXEmptyExpression") return;
        const style = unwrap(node.value.expression);
        if (style.type !== "ObjectExpression") return;
        for (const property of style.properties) {
          if (
            property.type !== "Property" ||
            propertyKey(property).startsWith("--")
          )
            continue;
          context.report({
            node: property,
            message:
              "Inline style is for CSS custom properties only: move a fixed declaration into a class.",
          });
        }
      },
    };
  },
});

const sourceNeedsDimensions = defineRule({
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (
          elementName(node) !== "source" ||
          node.attributes.some(({ type }) => type === "JSXSpreadAttribute")
        )
          return;
        const names = new Set(
          node.attributes.flatMap((item) =>
            item.type === "JSXAttribute" ? [attributeName(item)] : [],
          ),
        );
        if (!names.has("srcSet") || (names.has("width") && names.has("height")))
          return;
        context.report({
          node,
          message:
            "Give every <source> the width and height of its own file: without them the picture reserves the <img>'s ratio and shifts on load.",
        });
      },
    };
  },
});

const suppressHydrationWarningOnHtml = defineRule({
  create(context) {
    return {
      JSXAttribute(node) {
        if (attributeName(node) !== "suppressHydrationWarning") return;
        if (
          node.parent.type === "JSXOpeningElement" &&
          elementName(node.parent) === "html"
        )
          return;
        context.report({
          node,
          message:
            "suppressHydrationWarning belongs only on <html>, for a class set before hydration; anywhere else it hides a real mismatch.",
        });
      },
    };
  },
});

const noStringifiedScript = defineRule({
  create(context) {
    return {
      JSXAttribute(node) {
        if (attributeName(node) !== "dangerouslySetInnerHTML" || !node.value)
          return;
        if (
          !/\.toString\(\)|\bString\(/.test(
            context.sourceCode.getText(node.value),
          )
        )
          return;
        context.report({
          node,
          message:
            "Write a pre-paint script as a template literal: wrangler's keepNames injects __name() into a stringified function and it throws in the page.",
        });
      },
    };
  },
});

const noOverflowScrollLock = defineRule({
  create(context) {
    return {
      AssignmentExpression(node) {
        const target = node.left;
        if (
          target.type !== "MemberExpression" ||
          target.computed ||
          target.object.type !== "MemberExpression"
        )
          return;
        if (target.object.computed || target.object.property.name !== "style")
          return;
        if (
          target.property.type !== "Identifier" ||
          !/^overflow[XY]?$/.test(target.property.name)
        )
          return;
        context.report({
          node,
          message:
            "Never lock scroll by hiding overflow: the scrollbar disappears and the layout shifts. Fix body (position fixed, top -scrollY, inset-inline 0) instead.",
        });
      },
    };
  },
});

const stripTrailingSlash = defineRule({
  create(context) {
    const pathnames = new Set<string>();
    const isPathname = (side: ESTree.Expression | ESTree.PrivateIdentifier) =>
      side.type === "Identifier" && pathnames.has(side.name);
    const isRoot = (side: ESTree.Expression | ESTree.PrivateIdentifier) =>
      side.type === "Literal" && side.value === "/";
    return {
      VariableDeclarator(node) {
        if (
          node.id.type !== "Identifier" ||
          node.init?.type !== "CallExpression"
        )
          return;
        if (
          node.init.callee.type === "Identifier" &&
          node.init.callee.name === "usePathname"
        )
          pathnames.add(node.id.name);
      },
      BinaryExpression(node) {
        if (!["===", "!==", "==", "!="].includes(node.operator)) return;
        if (
          !(isPathname(node.left) || isPathname(node.right)) ||
          isRoot(node.left) ||
          isRoot(node.right)
        )
          return;
        context.report({
          node,
          message:
            "usePathname keeps a trailing slash (/about/ on a static export): strip it before comparing, or hydration drops aria-current.",
        });
      },
    };
  },
});

const noRobotsOnNotFound = defineRule({
  create(context) {
    if (basename(context.filename) !== "not-found.tsx") return {};
    return {
      Property(node) {
        if (propertyKey(node) !== "robots") return;
        context.report({
          node,
          message:
            "Next already adds noindex to every 404: an explicit robots doubles the tag.",
        });
      },
    };
  },
});

const signatureOutOfFlow = defineRule({
  create(context) {
    return {
      JSXElement(node) {
        const text = node.children
          .flatMap((child) => (child.type === "JSXText" ? [child.value] : []))
          .join("");
        if (!text.includes("Coded by")) return;
        const classAttribute = node.openingElement.attributes.find(
          (item): item is ESTree.JSXAttribute =>
            item.type === "JSXAttribute" && attributeName(item) === "className",
        );
        const classes = classAttribute?.value
          ? context.sourceCode.getText(classAttribute.value).split(/[^\w.:/-]+/)
          : [];
        if (
          classes.includes("absolute") &&
          classes.includes("inset-x-0") &&
          classes.some((name) => name.startsWith("bottom-"))
        )
          return;
        context.report({
          node: node.openingElement,
          message:
            "The signature sits out of flow inside the design footer (absolute inset-x-0 bottom-0.5), never as a strip under it.",
        });
      },
    };
  },
});

function projectProblems(root: string) {
  const at = (path: string) => join(root, path);
  const css = read(at(tailwindEntry));
  const layout = read(at("src/app/layout.tsx"));
  const utils = read(at("src/lib/utils.ts"));
  const packageJson = read(at("package.json"));
  const staticExport = /output:\s*["']export["']/.test(
    read(at("next.config.ts")),
  );
  const sources = filesUnder(at("src")).filter(
    (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path),
  );
  const html = rootBlocks(css);
  const textNames = themeNames(css, "text");
  const colorNames = themeNames(css, "color");
  const customTextNames = [...textNames].filter(
    (name) => !defaultTextSizes.has(name),
  );
  const appliedTextSizes = html
    .flatMap(appliedClasses)
    .flatMap((name) => (name.startsWith("text-") ? [name.slice(5)] : []));
  const loadingRoutes = filesUnder(at("src/app")).filter(
    (path) => basename(path) === "loading.tsx",
  );
  const metadataRoute = (name: string) => read(at(`src/app/${name}.ts`));

  const checks: Array<[boolean, string]> = [
    [
      !metadataRoute("robots"),
      "Ship src/app/robots.ts: Lighthouse scores 100 without it and Cloudflare serves its own robots.txt, so nothing else notices.",
    ],
    [
      !metadataRoute("sitemap"),
      "Ship src/app/sitemap.ts: /sitemap.xml 404s until it exists, and no other gate notices.",
    ],
    ...["robots", "sitemap"].map((name): [boolean, string] => [
      staticExport &&
        metadataRoute(name) !== "" &&
        !metadataRoute(name).includes("force-static"),
      `src/app/${name}.ts needs export const dynamic = "force-static" under output: "export".`,
    ]),
    [
      !layout.includes("metadataBase"),
      "Set metadataBase in the root layout so canonical and Open Graph URLs resolve.",
    ],
    [
      /scroll-behavior:\s*smooth|scroll-smooth/.test(css + layout) &&
        !layout.includes('data-scroll-behavior="smooth"'),
      'Add data-scroll-behavior="smooth" to <html>: without it every route change animates its scroll-to-top, and the warning is dev-only.',
    ],
    [
      !sources.some((path) => read(path).includes(signatureUrl)),
      `Add the footer signature, "Coded by Abdelrhman Abdelaal." linking ${signatureUrl}, absolute inset-x-0 bottom-0.5 inside the design footer.`,
    ],
    [
      /\/\*/.test(css.replace(/"[^"]*"|'[^']*'/g, "")),
      "globals.css: zero comments.",
    ],
    [
      !css.includes('@source not "../../*.md"'),
      'globals.css: add @source not "../../*.md"; Tailwind compiles README prose into the bundle.',
    ],
    [
      !css.includes('@source not "../../lint"'),
      'globals.css: add @source not "../../lint"; the house rules quote class names.',
    ],
    [
      sources.length > 0 &&
        filesUnder(at("src")).some((path) => /\.test\.tsx?$/.test(path)) &&
        !/@source not "[^"]*test[^"]*"/.test(css),
      'globals.css: add @source not for the test files ("../**/*.test.tsx" and friends), or an asserted class string compiles into the bundle.',
    ],
    [
      !html.some(
        (body) =>
          /(?:^|[;\s])overflow-y:\s*scroll/.test(body) ||
          appliedClasses(body).includes("overflow-y-scroll"),
      ),
      "globals.css: reserve the scrollbar with html { overflow-y: scroll } in @layer base, or the layout shifts sideways whenever page height changes.",
    ],
    [
      html.some((body) => /(?:^|[;\s])font-size\s*:/.test(body)) ||
        appliedTextSizes.some(
          (name) => textNames.has(name) || defaultTextSizes.has(name),
        ),
      "globals.css: never put a font-size on html; every rem then resolves against it and the whole page shrinks. Put base type on body.",
    ],
    [
      /scrollbar-gutter/.test(css),
      "globals.css: scrollbar-gutter insets every full-bleed band; use html { overflow-y: scroll }.",
    ],
    [
      !/button[^{]*\{[^}]*(?:cursor:\s*pointer|cursor-pointer)/.test(css),
      "globals.css: restore the pointer in @layer base (button:not(:disabled) { cursor: pointer }); Tailwind v4's preflight leaves buttons on the arrow.",
    ],
    ...[...css.matchAll(/@utility\s+([\w-]+)/g)]
      .filter(([, name]) => !name.startsWith("v-"))
      .map(([, name]): [boolean, string] => [
        true,
        `globals.css: @utility ${name} needs the v- prefix.`,
      ]),
    ...[...textNames]
      .filter((name) => colorNames.has(name))
      .map((name): [boolean, string] => [
        true,
        `globals.css: --text-${name} and --color-${name} collide; text-${name} emits only the colour and drops the font-size. Rename the size.`,
      ]),
    [
      /(?<![\w-])--font-(?![\w-]*--)[\w-]+\s*:\s*["']/.test(css),
      "globals.css: a font token must be var(--font-x); next/font hashes the family name, so a literal never resolves.",
    ],
    [
      /@-(?:webkit|moz|ms|o)-keyframes/.test(css),
      "globals.css: drop vendor-prefixed @keyframes; Tailwind rejects them inside @theme and the Cloudflare build fails.",
    ],
    [
      utils.includes("twMerge") &&
        customTextNames.some(
          (name) => !new RegExp(`["']${name}["']`).test(utils),
        ),
      `src/lib/utils.ts: register every custom text size (${customTextNames.join(", ")}) with extendTailwindMerge, or cn() deletes it as a colour.`,
    ],
    [
      !/"packageManager":\s*"pnpm@/.test(packageJson),
      'package.json: pin "packageManager" to pnpm.',
    ],
    [
      existsSync(at("package-lock.json")) || existsSync(at("yarn.lock")),
      "Use pnpm only: delete the npm or yarn lockfile.",
    ],
    [
      filesUnder(at("src/assets")).some((path) =>
        /\.(?:jpe?g|png)$/i.test(path),
      ),
      "src/assets: convert every JPG and PNG to WebP (pnpm webp <challenge>/src/assets) in PHASE 1.",
    ],
    [
      staticExport && loadingRoutes.length > 0,
      'loading.tsx under output: "export" ships the skeleton as the page and hides the real one in a <template>: delete it.',
    ],
    ...loadingRoutes
      .filter((path) =>
        filesUnder(dirname(path)).some(
          (file) => /\.tsx?$/.test(file) && read(file).includes("notFound("),
        ),
      )
      .map((path): [boolean, string] => [
        true,
        `${path.slice(root.length + 1)} turns notFound() into a 200 soft 404: delete it and use useLinkStatus for the pending state.`,
      ]),
  ];
  return checks.filter(([failed]) => failed).map(([, message]) => message);
}

const projectInvariants = defineRule({
  create(context) {
    if (!/[\\/]src[\\/]app[\\/]layout\.tsx$/.test(context.filename)) return {};
    const root = dirname(dirname(dirname(context.filename)));
    return {
      Program(node) {
        for (const message of projectProblems(root))
          context.report({ node, message });
      },
    };
  },
});

export default definePlugin({
  meta: { name: "house" },
  rules: {
    "no-comments": noComments,
    "style-custom-properties-only": styleCustomPropertiesOnly,
    "source-needs-dimensions": sourceNeedsDimensions,
    "suppress-hydration-warning-on-html": suppressHydrationWarningOnHtml,
    "no-stringified-script": noStringifiedScript,
    "no-overflow-scroll-lock": noOverflowScrollLock,
    "strip-trailing-slash": stripTrailingSlash,
    "no-robots-on-not-found": noRobotsOnNotFound,
    "signature-out-of-flow": signatureOutOfFlow,
    project: projectInvariants,
  },
});

export function house({ overrides = [] }: { overrides?: Overrides } = {}): {
  lint: OxlintConfig;
  fmt: OxfmtConfig;
} {
  const css = read(tailwindEntry);
  return {
    lint: {
      ignorePatterns: [
        ".next/**",
        ".open-next/**",
        ".wrangler/**",
        "out/**",
        "next-env.d.ts",
      ],
      plugins: [
        "eslint",
        "typescript",
        "react",
        "nextjs",
        "jsx-a11y",
        "import",
        "oxc",
        "unicorn",
      ],
      jsPlugins: ["eslint-plugin-better-tailwindcss", "./lint/house.mts"],
      settings: {
        "better-tailwindcss": { entryPoint: tailwindEntry },
      },
      options: {
        typeAware: true,
        typeCheck: true,
        denyWarnings: true,
        reportUnusedDisableDirectives: "error",
      },
      categories: { correctness: "error" },
      rules: {
        "eslint/no-unused-vars": "error",
        "eslint/no-unused-expressions": "error",
        "eslint/no-var": "error",
        "eslint/prefer-const": "error",
        "eslint/prefer-rest-params": "error",
        "eslint/prefer-spread": "error",
        "eslint/no-array-constructor": "error",
        "eslint/no-console": "error",
        "eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "next-themes",
                message:
                  "Own the theme script as a template literal: next-themes stringifies a function, and wrangler's keepNames breaks it on the Worker.",
              },
            ],
          },
        ],
        "typescript/no-deprecated": "error",
        "typescript/ban-ts-comment": "error",
        "typescript/no-empty-object-type": "error",
        "typescript/no-explicit-any": "error",
        "typescript/no-namespace": "error",
        "typescript/no-require-imports": "error",
        "typescript/no-unnecessary-type-constraint": "error",
        "typescript/no-unsafe-function-type": "error",
        "react/rules-of-hooks": "error",
        "react/exhaustive-deps": "error",
        "react/display-name": "error",
        "react/jsx-no-comment-textnodes": "error",
        "react/jsx-no-target-blank": "error",
        "react/no-unescaped-entities": "error",
        "react/unsupported-syntax": "error",
        "import/no-anonymous-default-export": "error",
        "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
        "jsx-a11y/no-noninteractive-tabindex": [
          "error",
          { tags: [], roles: ["tabpanel", "application"] },
        ],
        "nextjs/no-img-element": "off",
        "unicorn/filename-case": ["error", { case: "kebabCase" }],
        "better-tailwindcss/enforce-canonical-classes": [
          "error",
          { rootFontSize: 16 },
        ],
        "better-tailwindcss/no-unknown-classes": "error",
        "better-tailwindcss/no-conflicting-classes": "error",
        "better-tailwindcss/no-duplicate-classes": "error",
        "better-tailwindcss/no-deprecated-classes": "error",
        "better-tailwindcss/no-restricted-classes": [
          "error",
          { restrict: restrictedClasses(css) },
        ],
        "house/no-comments": "error",
        "house/style-custom-properties-only": "error",
        "house/source-needs-dimensions": "error",
        "house/suppress-hydration-warning-on-html": "error",
        "house/no-stringified-script": "error",
        "house/no-overflow-scroll-lock": "error",
        "house/strip-trailing-slash": "error",
        "house/no-robots-on-not-found": "error",
        "house/signature-out-of-flow": "error",
        "house/project": "error",
      },
      overrides: [
        {
          files: ["**/*.test.{ts,tsx}"],
          rules: { "nextjs/no-html-link-for-pages": "off" },
        },
        {
          files: ["scripts/**"],
          rules: { "eslint/no-console": "off" },
        },
        ...overrides,
      ],
    },
    fmt: {
      printWidth: 80,
      sortPackageJson: false,
      sortTailwindcss: { stylesheet: tailwindEntry },
      ignorePatterns: ["pnpm-lock.yaml", "frontend-mentor-files/**"],
    },
  };
}
