import fetch from 'node-fetch';
import tough from 'tough-cookie';
import fetchCookieFactory from 'fetch-cookie';

const cookieJar = new tough.CookieJar();
const fetchWithCookies = fetchCookieFactory(fetch, cookieJar);

export async function getSessionCookieAndToken(domain, retry = 2) {
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      await fetchWithCookies(`${domain}/lelang`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0',
          'Referer': `${domain}/lelang`,
         }
      });

      const cookies = await cookieJar.getCookies(`${domain}/`);
      const spseCookie = cookies.find(c => c.key === 'SPSE_SESSION');
      const cfuvidCookie = cookies.find(c => c.key === '_cfuvid');
      if (!spseCookie) throw new Error('SPSE_SESSION tidak ditemukan');

      const spseValue = spseCookie.value;
      const match = spseValue.match(/___AT=([^&]+)/);
      const authenticityToken = match ? match[1] : null;

      const cookieString = [
        `${spseCookie.key}=${spseValue}`,
        cfuvidCookie ? `${cfuvidCookie.key}=${cfuvidCookie.value}` : ''
      ].filter(Boolean).join('; ');

      return { cookieString, authenticityToken };
    } catch (err) {
      if (attempt === retry) {
        console.log(cookies);
        console.error(`❌ Gagal ambil cookie dari ${domain}: ${err.message}`);
        return null;
      }
    }
  }
}

//tidak dipakai
export async function getAllLpseDomains() {
  const res = await fetch("https://ceklpse.id/lpse/data?draw=1&columns%5B0%5D%5Bdata%5D=&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=nama&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=url&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=-1&search%5Bvalue%5D=&search%5Bregex%5D=false", {
      method: "GET",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-ID,en;q=0.9,id-ID;q=0.8,id;q=0.7,en-GB;q=0.6,en-US;q=0.5",
        "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://ceklpse.id/lpse",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      "cookie": "_ga=GA1.1.1119895037.1750298823; show-pengumuman-17=false; _ga_6J4JSGSN6C=deleted; XSRF-TOKEN=eyJpdiI6Ik9JNWRSRmJzRnZ4SXpXa1VBc0NRdkE9PSIsInZhbHVlIjoiNkdhUnZkdjBuZmkzM0NNM2J4NkttY205UHV2VEdjaFRUZzQ2MkltM0RtSGNEYi95ZGdERXFOZnhvVzVHRzZTK2pvZzE3R1lmME0yN1ByNnp6Z1lrYm1SVTYvTmprMFBVdkJRZUZCMG1zMWZYejQyTmhWTE14ZmdKK2tRMDVYZHEiLCJtYWMiOiJmODFiY2M2MWYwNjRiNTYxM2YxMWY0NzA2NDlkMzlhOTNhZTBhMjI1Y2VkMmEwNmQ5NzkyM2I0MDUzODY0OTU4IiwidGFnIjoiIn0%3D; ceklpse_session=eyJpdiI6IkFHZ0lRR21aVFVtZ1ZHQ3NJd3NaVVE9PSIsInZhbHVlIjoibTVsVXk1YTQzYXBxaGV2STczWWc3QUl3SUxiV203ZHovcHJUZGx2UHVMUmROTnlBZWhON1JmZVpiMEtlbmVYYThjU2c3RnB4VFJWT0tWQTFKS3hRRlFkZm12dWxIRjQ3QnJEY2tmOFRFNWlpdnNEMHhKTTN2RWhDMzE0ejAxdmkiLCJtYWMiOiI5Y2E3ZDRjYmRjMTJiY2NkMTBjODg0MzcxZDZmMTg0MDUzYTZiYzlhMzQ4YzZjY2EzOGM2OTk0YjA1NzNmYWRkIiwidGFnIjoiIn0%3D; _ga_6J4JSGSN6C=GS2.1.s1750316003$o2$g1$t1750316081$j58$l0$h0",
      }
    });
  const json = await res.json();
  return json.data.map(item => item.url);
}