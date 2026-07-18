import React from 'react';
import { FaGift } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

const Bonuses = () => {
  const bonuses = [
    {
      title: 'Bônus 1: Modelos de Contrato de Venda de Sites',
      value: 'R$ 297',
      desc: 'Feche clientes com segurança e profissionalismo: contratos prontos para venda de sites — é só preencher o nome do cliente e assinar. Nunca mais leve calote.',
      icon: '📝'
    },
    {
      title: 'Bônus 2: Guia "Do Prompt ao Site no Ar"',
      value: 'R$ 197',
      desc: 'O passo a passo para colar o prompt na IA, gerar o site e publicá-lo gratuitamente na internet em minutos — mesmo que você nunca tenha feito isso na vida.',
      icon: '🚀'
    },
    {
      title: 'Bônus 3: Guia de Precificação e Abordagem',
      value: 'R$ 297',
      desc: 'Quanto cobrar por cada tipo de site (para não cobrar barato demais) e a mensagem exata para mandar aos donos de negócio da sua cidade e fechar as primeiras vendas.',
      icon: '💰'
    }
  ];

  return (
    <section className="section" style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 183, 3, 0.1)', color: 'var(--color-accent)', padding: '0.5rem 1.2rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', border: '1px solid rgba(255, 183, 3, 0.3)' }}>
            <FaGift /> Bônus Exclusivos Para Quem Age Rápido
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem', fontWeight: 800 }}>
            Garanta o Pack Hoje e Leve Tudo Isso <span className="highlight">De Graça</span>
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {bonuses.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15, type: 'spring' }}
              whileHover={{ y: -10, boxShadow: '0 15px 30px rgba(0,0,0,0.5)' }}
              className="glass"
              style={{ padding: '2.5rem', borderRadius: '20px', position: 'relative', overflow: 'hidden', cursor: 'default' }}
            >
              <motion.div
                whileHover={{ rotate: 15, scale: 1.2 }}
                transition={{ type: 'spring' }}
                style={{ position: 'absolute', top: -20, right: -20, fontSize: '6rem', opacity: 0.05 }}
              >
                {b.icon}
              </motion.div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem', fontWeight: 700, color: '#fff' }}>{b.title}</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{b.desc}</p>
              <div style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: 'rgba(255,51,51,0.1)', color: '#ff3333', borderRadius: '8px', fontWeight: 600, textDecoration: 'line-through' }}>
                Vendido separadamente por {b.value}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, type: 'spring' }}
          style={{ textAlign: 'center', marginTop: '4rem' }}
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={CHECKOUT_URL}
            className="btn btn-primary"
            style={{ padding: '1.3rem 3.5rem', fontSize: '1.2rem', borderRadius: '100px', display: 'inline-block', animation: 'pulse-shadow 2s infinite' }}
          >
            Quero o Pack + os 3 Bônus por R$ 9,99
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default Bonuses;
