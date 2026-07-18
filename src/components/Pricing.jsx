import React from 'react';
import { motion } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

// ⚠️ AJUSTE AQUI: deixe estes valores iguais aos do checkout na Cakto.
const PRECO_CENTAVOS = ',99';
const PRECO_REAIS = 'R$9';
const PRECO_TOTAL_ANCORADO = 'R$ 1.788,00';

const Pricing = () => {
  return (
    <section className="section bg-gradient" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw', background: 'radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 60 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
          className="glass"
          style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', borderRadius: '30px', textAlign: 'center', border: '1px solid rgba(138,43,226,0.4)', boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 0 40px rgba(138,43,226,0.1)' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem', fontWeight: 900 }}>Leve os 10 Prompts + <span className="highlight">Todos os Bônus</span></h2>

          <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px' }}>
              <span>10 Prompts de Sites Premium:</span> <span style={{ textDecoration: 'line-through' }}>R$ 997,00</span>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px' }}>
              <span>Bônus 1 (Contratos):</span> <span style={{ textDecoration: 'line-through' }}>R$ 297,00</span>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px' }}>
              <span>Bônus 2 (Guia de Entrega):</span> <span style={{ textDecoration: 'line-through' }}>R$ 197,00</span>
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px' }}>
              <span>Bônus 3 (Precificação):</span> <span style={{ textDecoration: 'line-through' }}>R$ 297,00</span>
            </p>
            <div style={{ width: '100%', maxWidth: '340px', height: '1px', background: 'rgba(255,255,255,0.2)', margin: '1rem 0' }}></div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '340px' }}>
              <span>Valor Total:</span> <span style={{ textDecoration: 'line-through', color: '#ff3333', fontWeight: 'bold' }}>{PRECO_TOTAL_ANCORADO}</span>
            </p>
          </div>

          <div style={{ margin: '3rem 0' }}>
            <p style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-primary-light)', fontWeight: 700, marginBottom: '0.5rem' }}>Hoje, tudo isso por apenas</p>
            <motion.div
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
              style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '5px' }}
            >
              <span style={{ fontSize: 'clamp(4rem, 8vw, 6rem)', fontWeight: 900, lineHeight: 1, color: '#fff', textShadow: '0 0 40px rgba(138,43,226,0.5)' }}>{PRECO_REAIS}</span>
              <span style={{ fontSize: '2rem', fontWeight: 600 }}>{PRECO_CENTAVOS}</span>
            </motion.div>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Pagamento único • Acesso vitalício • Uso ilimitado</p>
          </div>

          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={CHECKOUT_URL}
            className="btn btn-primary"
            style={{ padding: '1.5rem 4rem', fontSize: '1.5rem', width: '100%', borderRadius: '100px', animation: 'pulse-shadow 2s infinite', display: 'inline-block' }}
          >
            🚀 QUERO MEU PACK POR R$ 9,99
          </motion.a>

          <p style={{ marginTop: '1.2rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            🔒 Compra 100% segura • Garantia incondicional de 7 dias • Acesso imediato no seu e-mail
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1.5rem', borderRadius: '50px' }}>
              <span style={{ width: '12px', height: '12px', background: '#ff3333', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Preço promocional de lançamento — pode subir a qualquer momento</span>
            </div>
          </div>
        </motion.div>
      </div>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </section>
  );
};

export default Pricing;
