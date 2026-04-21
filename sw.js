// sw.js — Service Worker para Fiados da Padaria
const CACHE_NAME = 'fiados-v1';

// Arquivos que serão cacheados na instalação
const ARQUIVOS_PARA_CACHEAR = [
  '/fiados/',
  '/fiados/index.html',
  '/fiados/manifest.json',
  '/fiados/icons/icon-192.png',
  '/fiados/icons/icon-512.png',
];

// ── Instalação: cacheia os arquivos principais ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando arquivos principais...');
      return cache.addAll(ARQUIVOS_PARA_CACHEAR);
    })
  );
  // Ativa imediatamente, sem esperar fechar outras abas
  self.skipWaiting();
});

// ── Ativação: remove caches antigos ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => {
            console.log('[SW] Removendo cache antigo:', nome);
            return caches.delete(nome);
          })
      )
    )
  );
  // Assume controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// ── Interceptação de requisições: Cache First ───────────────────────────────
// Estratégia: tenta o cache primeiro; se não tiver, vai para a rede.
// Ideal para PWAs que precisam funcionar offline.
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respostaCacheada) => {
      if (respostaCacheada) {
        return respostaCacheada; // ✅ Encontrou no cache — retorna offline
      }

      // Não está no cache — tenta a rede e salva no cache para próxima vez
      return fetch(event.request)
        .then((respostaRede) => {
          // Só cacheia respostas válidas
          if (!respostaRede || respostaRede.status !== 200 || respostaRede.type !== 'basic') {
            return respostaRede;
          }

          const respostaParaCachear = respostaRede.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, respostaParaCachear);
          });

          return respostaRede;
        })
        .catch(() => {
          // Sem rede e sem cache — retorna o index.html como fallback
          return caches.match('/fiados/index.html');
        });
    })
  );
});