export function setupPuppeteer(puppeteer, StealthPlugin) {
  puppeteer.use(StealthPlugin());
}
