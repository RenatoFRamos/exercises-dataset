// Servidor estático mínimo, sem dependências, só para validar o build de
// produção (dist/) tal como ele sai do `npm run build` — não é parte do
// entregável, é ferramenta de verificação interna.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'dist');
const port = 8080;

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.css': 'text/css' };

http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (req.url === '/') filePath = path.join(root, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`serving dist/ at http://localhost:${port}`));
