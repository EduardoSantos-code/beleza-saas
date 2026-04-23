import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Pega o caminho da URL que o usuário está tentando acessar
  const pathname = req.nextUrl.pathname;

  // Só aplica a barreira de senha na rota /master
  if (pathname.startsWith('/master')) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      // ==========================================
      // DEFINA SEU USUÁRIO E SENHA AQUI
      // ==========================================
      const validUser = 'Eduardo';
      const validPass = '2032Edu';

      if (user === validUser && pwd === validPass) {
        return NextResponse.next(); // Senha correta, deixa passar!
      }
    }

    // Se não colocou senha ou errou, mostra o pop-up nativo do navegador pedindo a senha
    return new NextResponse('Acesso restrito.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Painel Master TratoMarcado"',
      },
    });
  }

  return NextResponse.next();
}

// Essa configuração diz ao Next.js para rodar esse arquivo apenas na rota master, deixando o resto do site rápido
export const config = {
  matcher: ['/master/:path*'],
};