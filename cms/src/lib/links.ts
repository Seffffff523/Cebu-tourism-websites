/** URL for a site's collection, optionally with an entry open in the editor. */
export function contentHref(siteId: string, collId: string, params: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams(Object.entries(params).filter((kv): kv is [string, string] => !!kv[1]));
  const s = q.toString();
  return `/sites/${siteId}/${collId}${s ? `?${s}` : ""}`;
}

export const entryHref = (e: { id: string; site_id: string; collection_id: string }) =>
  contentHref(e.site_id, e.collection_id, { entry: e.id });
