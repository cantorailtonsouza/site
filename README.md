# Toca Ailton Souza — Firebase v1

Sistema de pedidos musicais para shows, hospedado no GitHub Pages e conectado ao Firebase.

## Endereços

- Página pública: `https://cantorailtonsouza.github.io/site/`
- Painel: `https://cantorailtonsouza.github.io/site/admin/`

## Antes de publicar

### 1. Configure as regras do Firestore

No Firebase Console:

1. Firestore
2. Aba **Regras**
3. Substitua o conteúdo pelo arquivo `firestore.rules`
4. Clique em **Publicar**

As regras deixam:
- configurações, playlists, músicas e “agora tocando” visíveis ao público;
- alterações permitidas somente para usuários autenticados;
- criação de pedidos permitida ao público;
- leitura e gerenciamento de pedidos somente no painel autenticado.

### 2. Publique no GitHub

Envie todo o conteúdo desta pasta para a raiz do repositório `site`, substituindo os arquivos antigos.

A estrutura precisa ficar:

```
site/
├── index.html
├── assets/
├── css/
├── js/
├── firebase/
├── admin/
└── firestore.rules
```

### 3. Entre no painel

Acesse `/site/admin/` e entre com o usuário criado no Firebase Authentication.

### 4. Crie os dados iniciais

No Dashboard, clique uma única vez em **Criar dados iniciais**.

Depois personalize:
- evento;
- WhatsApp dos pedidos;
- WhatsApp para contratação;
- Pix;
- redes sociais;
- playlists;
- músicas.

## Spotify

O cadastro manual de músicas já funciona.

A busca no Spotify ficou preparada como próxima integração. Para ativá-la, será preciso:

1. Criar um app no Spotify for Developers;
2. Obter o Client ID;
3. Cadastrar a URL de redirecionamento;
4. Implementar Authorization Code com PKCE.

Não coloque `Client Secret` em um site público.

## Segurança

A configuração pública do Firebase pode ficar no JavaScript. A segurança é controlada pelo Authentication e pelas regras do Firestore.

Não compartilhe sua senha administrativa.
