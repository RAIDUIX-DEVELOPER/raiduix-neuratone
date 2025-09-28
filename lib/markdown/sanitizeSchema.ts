import { defaultSchema } from "hast-util-sanitize";

// Safe subset for forum Markdown rendering
const schema = {
  ...defaultSchema,
  tagNames: [
    "p",
    "br",
    "b",
    "i",
    "em",
    "strong",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ["href", "http"],
      ["href", "https"],
      ["href", "mailto"],
      "title",
      "rel",
      "target",
    ],
    code: ["className"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
  },
};

export default schema;
