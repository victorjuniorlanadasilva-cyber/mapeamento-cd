self.addEventListener('install', function(event) {
  console.log('Service Worker instalado!');
});

self.addEventListener('fetch', function(event) {
  // Aqui poderia colocar cache, mas por enquanto deixa vazio
});
