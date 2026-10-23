import base from '../tailwind.config';
// Only the explicit dashboard QA server compiles the unapproved V2 design.
export default { ...base, content: [...base.content, './docs/design/setter-dashboard/v2/**/*.{ts,tsx}'] };
