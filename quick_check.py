import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vw in (390, 820, 1366):
            ctx = await b.new_context(viewport={"width": vw, "height": 850})
            page = await ctx.new_page()
            await page.goto("http://127.0.0.1:8177/rhcsa-practice/index.html", wait_until="domcontentloaded")
            await page.wait_for_timeout(400)
            r = await page.evaluate("""() => {
              const vw = document.documentElement.clientWidth;
              const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
              const scrollers = [];
              for (const el of document.querySelectorAll('body *')) {
                if (el.scrollWidth > el.clientWidth + 2) {
                  const cs = getComputedStyle(el);
                  if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.clientWidth > 100)
                    scrollers.push((el.id ? '#'+el.id : el.tagName) + ' c=' + el.clientWidth + ' s=' + el.scrollWidth);
                }
              }
              return { pageOv: docW - vw, scrollers };
            }""")
            print(vw, "px ->", r)
            await ctx.close()
        await b.close()
asyncio.run(main())
