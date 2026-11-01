SHREEKUNJA OPTICALS — SEO FILE PACK

FILES
- robots.txt: crawler rules and sitemap location.
- sitemap.xml: homepage sitemap. The current storefront is a single-page site; #shop, #services, #journal, #track and #visit are sections, not separate pages.
- llms.txt: concise, factual overview for AI crawlers and assistants.
- opengraph-head.html: metadata snippet to place inside index.html <head>.
- og-image.png: 1200x630 social preview image made from the supplied Shreekunja logo.
- BingSiteAuth.xml: PLACEHOLDER ONLY; replace with the exact file downloaded from Bing Webmaster Tools.

INSTALL
1. Copy robots.txt, sitemap.xml, llms.txt, og-image.png and BingSiteAuth.xml to the deployed site's public/root directory so they resolve at /robots.txt, /sitemap.xml, /llms.txt, /og-image.png and /BingSiteAuth.xml.
2. Copy the contents of opengraph-head.html into the <head> of index.html. Check for duplicate canonical/description/Open Graph/Twitter tags and keep only one authoritative set.
3. In Bing Webmaster Tools, add https://shreekunjaoptical.vercel.app, select XML file verification, download Bing's real BingSiteAuth.xml, and replace the placeholder in this pack. Deploy it, then click Verify.
4. Submit https://shreekunjaoptical.vercel.app/sitemap.xml in Bing Webmaster Tools and Google Search Console.
5. Deploy the files before submitting the sitemap. Then test each URL directly in a browser.

NOTES
- Disallowing /admin.html in robots.txt is a crawler request, NOT security. Keep the admin protected by real authentication/authorization.
- Sitemap intentionally lists only the canonical homepage because the supplied latest index is a single-page storefront with hash sections and a separate admin page. Do not list admin.html. If you add public standalone product or article URLs, add their canonical URLs to sitemap.xml.
- The current website already has some Open Graph tags; merge the supplied tags into the head rather than duplicating them.
