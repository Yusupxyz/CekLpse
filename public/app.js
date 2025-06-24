document.getElementById('crawler-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama').value;

  document.getElementById('output').textContent = '🚀 Memulai crawl...';

  const res = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama })
  });

  const data = await res.json();
  document.getElementById('output').textContent =
    `✅ Total domain dicek: ${data.totalDomain}\n🎯 Total match ditemukan: ${data.totalMatch}`;
});
