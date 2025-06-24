import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { crawlDomain } from './lpse-scraper.js';
import pLimit from 'p-limit';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Fungsi untuk membaca list-url.json dan mengambil daftar domain
async function getAllLpseDomains() {
  const filePath = path.join(process.cwd(), 'list-url2.json');
  const rawData = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(rawData);
  return json.data.map(item => item.url.replace(/\\\//g, '/'));
}

app.post('/api/crawl', async (req, res) => {
  const targetNama = req.body.nama;
  const domains = await getAllLpseDomains();

  const limit = pLimit(5);
  let totalMatch = 0;

  const results = await Promise.allSettled(
    domains.map(domain =>
      limit(() => crawlDomain(domain, targetNama))
    )
  );

  for (const r of results) {
    if (r.status === 'fulfilled') totalMatch += r.value;
  }

  res.json({ totalDomain: domains.length, totalMatch });
});

app.get('/api/hasil', async (req, res) => {
  const filePath = path.join(process.cwd(), 'hasil.jsonl');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const data = lines.map(line => JSON.parse(line));
    res.json(data);
  } catch (err) {
    console.error('Gagal membaca hasil.jsonl:', err.message);
    res.json([]); // jika file tidak ditemukan atau gagal parsing, kembalikan array kosong
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
