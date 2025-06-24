import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { getSessionCookieAndToken } from './lpse-utils.js';

const savedSet = new Set();

// Load hasil.jsonl jika sudah ada
if (fs.existsSync('hasil.jsonl')) {
  const lines = fs.readFileSync('hasil.jsonl', 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      savedSet.add(`${entry.domain}_${entry.id}`);
    } catch (e) {
      console.error('❌ Gagal parsing baris:', line);
    }
  }
}

function logError(domain, msg) {
  fs.appendFileSync('error_domains.log', `${domain} - ${msg}\n`);
}

function saveMatch(data) {
  fs.appendFileSync('hasil.jsonl', JSON.stringify(data) + '\n');
}

export async function getTenderIds(domain, year) {
  console.log(`🔍 Mengambil ID tender dari ${domain} untuk tahun ${year}...`);
  const session = await getSessionCookieAndToken(domain);
  if (!session) {
    logError(domain, 'Gagal ambil cookie');
    return [];
  }

  const res = await fetch(`${domain}/dt/lelang?tahun=${year}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'cookie': session.cookieString,
      'x-requested-with': 'XMLHttpRequest',
      'Referer': `${domain}/pl`
    },
    body: `draw=1&start=0&length=10000&search[value]=&authenticityToken=${session.authenticityToken}`
  });

  try {
    const json = await res.json();
    console.log(`✅ ID Tender ditemukan sebanyak: ${json.data.length} di tahun ${year}`);
    const filtered = json.data
      .filter(row => row[3] === 'Tender Sudah Selesai')
      .map(row => row[0]);
    
    console.log(`✅ Tender selesai ditemukan sebanyak ${filtered.length} di domain ${domain} tahun ${year}`);
    return filtered;
  } catch {
    logError(domain, `Gagal parse JSON dt/lelang untuk tahun ${year}`);
    return [];
  }
}


export async function crawlDomain(domain, targetNama) {
  let matchCount = 0;
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const ids = await getTenderIds(domain, year);
    if (!ids.length) {
      console.log(`❌ Tidak ada tender di ${domain} untuk tahun ${year}`);
      continue;
    }

    for (const id of ids) {
      const key = `${domain}_${id}`;
      if (savedSet.has(key)) {
        console.log(`⚠️ Sudah ada: ${key}, lewati`);
        continue;
      }

      try {
        console.log(`🔍 Mencari di tender ID ${id} (${year})...`);

        const [resPemenang, resKontrak] = await Promise.all([
          fetch(`${domain}/evaluasi/${id}/pemenang`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': `${domain}/lelang/${id}/pengumumanlelang` } }),
          fetch(`${domain}/evaluasi/${id}/pemenangberkontrak`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': `${domain}/lelang/${id}/pengumumanlelang` } })
        ]);

        const htmlPemenang = await resPemenang.text();
        const $ = cheerio.load(htmlPemenang);
        const namaTender = $('th:contains("Nama Tender")').next('td').text();
        const namaPemenang = $('table.table-sm table.table-sm tr').eq(1).find('td').eq(0).text().trim();

        const htmlKontrak = await resKontrak.text();
        const $2 = cheerio.load(htmlKontrak);
        const namaPemenangKontrak = $2('table.table-sm table.table-sm tr').eq(1).find('td').eq(0).text().trim();
        const statusLink = $2('a[title="Status Kontrak"]').filter((i, el) => $2(el).text().trim() === 'Selesai').first();
        let statusPemenang = statusLink.length ? statusLink.text().trim() : '';

        const sycDetected = namaTender.includes('SYC');

        if (!sycDetected || year !== currentYear) {
          console.log(sycDetected ? '✅ SYC ditemukan tapi tahun tidak sesuai' : '❌ SYC tidak ditemukan');
          continue;
        }

        console.log('✅ SYC ditemukan di kolom Nama Tender');

        const matchNama = namaPemenang.toLowerCase().includes(targetNama.toLowerCase());

        if (namaPemenang === namaPemenangKontrak) {
          if (statusPemenang === 'Selesai') {
            console.log(`✅ Tender ID ${id} (${year}) sudah selesai`);
          } else if (matchNama) {
            matchCount++;
            saveMatch({ domain, id, namaPemenang, year });
            savedSet.add(key);
            console.log(`✅ Match ditemukan: "${namaPemenang}"`);
          } else {
            console.log(`❌ Belum selesai, nama tidak match: "${namaPemenang}"`);
          }
        } else {
          if (matchNama) {
            matchCount++;
            saveMatch({ domain, id, namaPemenang, year });
            savedSet.add(key);
            console.log(`✅ Match ditemukan walau nama pemenang beda`);
          } else {
            console.log(`❌ Nama pemenang tidak sama: "${namaPemenang}" vs "${namaPemenangKontrak}"`);
          }
        }

        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        logError(domain, `Gagal fetch detail ID ${id} (${year}): ${err.message}`);
      }
    }
  }
}

