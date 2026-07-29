TOCA AILTON SOUZA — VERSÃO 1.0 PARA GITHUB PAGES

ARQUIVOS
- index.html: página pública
- admin/index.html: painel interno
- assets/: logo e foto

ENDEREÇOS APÓS PUBLICAR
- Público: https://cantorailtonsouza.github.io/site/
- Painel: https://cantorailtonsouza.github.io/site/admin/
- Senha inicial: 172839

RECURSOS
- Todas as músicas das playlists ativas ficam visíveis.
- Busca por música e artista.
- Pedido enviado pelo WhatsApp.
- Nome do bar/evento editável.
- WhatsApp dos pedidos e contratação editáveis.
- Pix opcional configurado.
- Playlists e músicas gerenciáveis.
- Backup JSON.
- Busca opcional no Spotify via Authorization Code com PKCE.

IMPORTANTE — LIMITAÇÃO DO GITHUB PAGES
O GitHub Pages é estático. As alterações feitas no painel ficam no localStorage do mesmo navegador.
Elas não são sincronizadas automaticamente com celulares de outras pessoas.
Para sincronização real, login seguro e atualização pública imediata, será necessário conectar Firebase/Supabase.

SPOTIFY
1. Crie um app no Spotify for Developers.
2. Cadastre como Redirect URI:
   https://cantorailtonsouza.github.io/site/admin/
3. Copie o Client ID e cole no painel.
4. Clique em Conectar ao Spotify.

PUBLICAÇÃO
Extraia o ZIP e envie todo o conteúdo para a raiz do repositório site, substituindo os arquivos anteriores.
