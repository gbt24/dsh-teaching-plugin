/**
 * Build-time asset imports. The plugin build uses esbuild's `text` loader for
 * CSS, so KaTeX's stylesheet arrives as a string and is injected into the page
 * by the client entry (no global CSS file, no CDN).
 */
declare module '*.css' {
  const text: string
  export default text
}
