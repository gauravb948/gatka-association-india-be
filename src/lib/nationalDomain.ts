/** Hostname for the national (Gatka Federation India) site. */
export function getNationalDomain(): string {
  const raw = process.env.NATIONAL_DOMAIN?.trim().toLowerCase() || "gatkafederationindia.com";
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/g, "").replace(/^www\./, "");
}

/** Normalize a hostname for comparison (strip protocol, path, www). */
export function normalizeDomainHostname(domainName: string): string {
  return domainName
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/g, "")
    .replace(/^www\./, "");
}

export function isNationalDomain(domainName: string): boolean {
  return normalizeDomainHostname(domainName) === getNationalDomain();
}
