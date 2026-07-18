import React from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';

const TargetAudience = () => {
  const goodFit = [
    "Iniciantes do absoluto zero que querem uma nova profissão altamente lucrativa.",
    "Designers e Freelancers estagnados que desejam cobrar mais caro pelos seus projetos.",
    "Agências que querem adicionar serviços Premium ao portfólio.",
    "Pessoas que desejam trabalhar de casa e ter liberdade geográfica e de horários."
  ];

  const badFit = [
    "Pessoas que buscam fórmulas mágicas de enriquecimento fácil e sem trabalho.",
    "Quem tem preguiça de estudar e aplicar metodologias comprovadas.",
    "Quem já sabe de tudo e não está aberto a aprender o novo padrão ouro do design.",
    "Pessoas que não querem ganhar dinheiro na internet de forma honesta."
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.15 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <section className="section" style={{ backgroundColor: 'var(--color-bg)', overflow: 'hidden' }}>
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem', fontWeight: 800 }}>
            Para Quem é Esta <span className="highlight">Oportunidade?</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto' }}>
            Nós não aceitamos qualquer pessoa. Queremos apenas pessoas comprometidas com o próprio sucesso. Veja se você se encaixa no perfil.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* GOOD FIT */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: -30 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, type: 'spring' }}
            className="glass" 
            style={{ padding: '2.5rem', borderRadius: '20px', borderTop: '4px solid #27c93f' }}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaCheckCircle color="#27c93f" /> É perfeito para você se...
            </h3>
            <motion.ul 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{ listStyle: 'none' }}
            >
              {goodFit.map((item, i) => (
                <motion.li key={i} variants={itemVariants} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1.2rem', color: 'var(--color-text)' }}>
                  <FaCheckCircle color="#27c93f" style={{ marginTop: '5px', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* BAD FIT */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 30 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.2, type: 'spring' }}
            className="glass" 
            style={{ padding: '2.5rem', borderRadius: '20px', borderTop: '4px solid #ff3333' }}
          >
            <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaTimesCircle color="#ff3333" /> Feche a página se...
            </h3>
            <motion.ul 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              style={{ listStyle: 'none' }}
            >
              {badFit.map((item, i) => (
                <motion.li key={i} variants={itemVariants} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1.2rem', color: 'var(--color-text-muted)' }}>
                  <FaTimesCircle color="#ff3333" style={{ marginTop: '5px', flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
