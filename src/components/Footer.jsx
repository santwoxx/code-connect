import React from 'react';
import { CHECKOUT_URL } from '../config';

const Footer = () => {
  return (
    <footer style={{ backgroundColor: '#000', padding: '6rem 0 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="glass" style={{ textAlign: 'center', marginBottom: '4rem', padding: '4rem 2rem', border: '1px solid rgba(138,43,226,0.3)', background: 'linear-gradient(180deg, rgba(30,30,30,0.8) 0%, rgba(10,10,10,0.9) 100%)' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1.5rem', fontWeight: 900 }}>Sua Decisão Mais <span className="text-gradient">Lucrativa</span> do Ano</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem', fontSize: '1.2rem' }}>
            Cada dia que você passa pensando, é um site de R$ 1.500 que outra pessoa está entregando na sua cidade — feito em 10 minutos, com um prompt igual aos que estão a um clique de serem seus. Por R$ 9,99, o risco de ficar de fora é muito maior que o de entrar.
          </p>
          <a href={CHECKOUT_URL} className="btn btn-primary" style={{ padding: '1.4rem 4rem', fontSize: '1.3rem', width: '100%', maxWidth: '400px', animation: 'pulse-shadow 2s infinite' }}>
            🚀 QUERO MEU PACK POR R$ 9,99
          </a>
          <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            🔒 Compra 100% Segura • Acesso Imediato via E-mail • Garantia de 7 Dias
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            &copy; {new Date().getFullYear()} Pack 10 Prompts de Sites Premium. Todos os direitos reservados.
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', maxWidth: '500px', textAlign: 'right' }}>
            Este site não faz parte do site do Facebook ou da Meta Platforms, Inc.<br/>
            Além disso, este site não é endossado pelo Facebook de nenhuma maneira. FACEBOOK é uma marca comercial independente da META PLATFORMS, INC.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
