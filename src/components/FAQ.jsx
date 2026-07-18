import React from 'react';
import { FaShieldAlt, FaRocket } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

const FAQ = () => {
  const faqs = [
    {
      q: 'Preciso saber programar ou entender de design?',
      a: 'Não. Os prompts foram criados exatamente para quem parte do zero: você copia, cola em uma IA gratuita e o site sai pronto, com design e animações de nível profissional. Sua única tarefa é trocar o nome, as fotos e as cores para o cliente.'
    },
    {
      q: 'Em qual IA esses prompts funcionam?',
      a: 'Nas principais IAs do mercado — ChatGPT, Claude, Gemini, Lovable e outras —, inclusive nos planos gratuitos. Junto com o pack você recebe o guia mostrando exatamente onde colar o prompt e como gerar o site.'
    },
    {
      q: 'Posso usar o mesmo prompt para vários clientes?',
      a: 'Sim! O uso é ilimitado e vitalício. Os 10 prompts são seus para sempre: cada novo cliente que você fecha é praticamente 100% de lucro, sem pagar nada de novo.'
    },
    {
      q: 'Como e quando recebo os prompts?',
      a: 'O acesso chega no seu e-mail imediatamente após a confirmação do pagamento. Em menos de 5 minutos você já pode estar gerando o seu primeiro site.'
    },
    {
      q: 'E se eu comprar e não gostar?',
      a: 'Você está protegido por uma Garantia Incondicional de 7 Dias. Se achar que não é para você, basta pedir e devolvemos 100% do seu dinheiro, sem perguntas. O risco é todo nosso.'
    }
  ];

  return (
    <section className="section" style={{ backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
      <div className="container">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'flex-start' }}>
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, type: 'spring' }}
            style={{ flex: '1 1 400px' }}
          >
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1.5rem', fontWeight: 800 }}>Acabe com Suas <span className="text-gradient">Dúvidas</span></h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2.5rem', fontSize: '1.15rem' }}>
              Transparência total. Se a sua dúvida não está aqui, saiba que o único risco real é continuar vendo outras pessoas venderem sites feitos em minutos enquanto você pensa.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <motion.div whileHover={{ scale: 1.02 }} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#27c93f', fontSize: '2rem' }}><FaShieldAlt /></div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Garantia Incondicional</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>7 dias de teste livre de riscos</p>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: 'var(--color-accent)', fontSize: '2rem' }}><FaRocket /></div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>Acesso Imediato</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Gere seu primeiro site ainda hoje</p>
                </div>
              </motion.div>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href={CHECKOUT_URL}
                className="btn btn-primary"
                style={{ padding: '1.1rem 2rem', fontSize: '1.1rem', borderRadius: '12px', textAlign: 'center', display: 'block', marginTop: '0.5rem' }}
              >
                Testar por R$ 9,99 — Risco Zero por 7 Dias
              </motion.a>
            </div>
          </motion.div>

          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1, type: 'spring' }}
                whileHover={{ scale: 1.02 }}
                className="glass"
                style={{ padding: '1.5rem 2rem', cursor: 'default' }}
              >
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 700 }}>
                  {faq.q}
                  <motion.span whileHover={{ rotate: 90 }} style={{ color: 'var(--color-primary-light)', fontSize: '1.5rem', lineHeight: 1, cursor: 'pointer' }}>+</motion.span>
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', lineHeight: '1.6' }}>{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
