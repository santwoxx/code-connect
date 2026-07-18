import React from 'react';
import { motion } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

// Colunas de screenshots que rolam ao fundo do hero (prova visual imediata)
const BG_COLUMNS = [
  ['/screenshots/prime.jpg', '/screenshots/noir.jpg', '/screenshots/brace.jpg'],
  ['/screenshots/prive.jpg', '/screenshots/doener.jpg', '/screenshots/evermore.jpg'],
  ['/screenshots/nike.jpg', '/screenshots/birria.jpg', '/screenshots/lustre.jpg']
];

const HeroBackground = () => (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', userSelect: 'none' }}>
    <div style={{ position: 'absolute', inset: '-12%', display: 'flex', gap: '1.5rem', transform: 'rotate(-4deg) scale(1.12)', opacity: 0.3 }}>
      {BG_COLUMNS.map((imgs, c) => (
        <motion.div
          key={c}
          animate={{ y: c % 2 ? ['-50%', '0%'] : ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 55 + c * 12, ease: 'linear' }}
          style={{ flex: 1 }}
        >
          {[...imgs, ...imgs].map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              draggable={false}
              style={{ width: '100%', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}
            />
          ))}
        </motion.div>
      ))}
    </div>
    {/* Véus escuros para manter o texto 100% legível sobre os previews */}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.8) 70%, var(--color-bg) 100%)' }}></div>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.35) 45%, rgba(10,10,10,0.92) 100%)' }}></div>
  </div>
);

const Hero = () => {
  return (
    <section className="section bg-gradient" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', paddingTop: '6rem', paddingBottom: '2rem', overflow: 'hidden', position: 'relative' }}>
      <HeroBackground />
      <div className="container" style={{ textAlign: 'center', maxWidth: '900px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          style={{ display: 'inline-block', background: 'rgba(255, 102, 0, 0.1)', color: 'var(--color-accent)', padding: '0.5rem 1.2rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', border: '1px solid rgba(255, 102, 0, 0.3)' }}
        >
          ⚠️ OFERTA DE LANÇAMENTO: Pack Completo por Apenas R$ 9,99
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, type: 'spring', bounce: 0.3 }}
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', marginBottom: '1.5rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.2, textShadow: '0 4px 30px rgba(0,0,0,0.8)' }}
        >
          Pare de Criar Sites do Zero e Genéricos: Tenha Sites de <span className="highlight">R$ 700 a R$ 1.500</span> Prontos em 10 Minutos
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ fontSize: 'clamp(1rem, 2vw, 1.3rem)', color: 'var(--color-text-muted)', marginBottom: '3rem', maxWidth: '800px', margin: '0 auto 3rem' }}
        >
          Receba <strong>10 prompts testados</strong> que geram sites modernos, profissionais e prontos para personalizar no <strong>ChatGPT, Claude, Lovable</strong> e outras IAs. Economize horas de trabalho: você cola o prompt, a IA monta o site e você entrega ao cliente cobrando o valor cheio.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={CHECKOUT_URL}
            className="btn btn-primary"
            style={{ padding: '1.4rem 3.5rem', fontSize: '1.3rem', width: '100%', maxWidth: '500px', display: 'inline-block', animation: 'pulse-shadow 2s infinite' }}
          >
            🚀 QUERO MEU PACK POR R$ 9,99
          </motion.a>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '15px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#27c93f' }}>✓</span> Acesso Imediato</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#27c93f' }}>✓</span> 7 Dias de Garantia</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#27c93f' }}>✓</span> Uso Ilimitado dos Prompts</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
