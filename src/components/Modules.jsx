import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

const TiltCard = ({ mod, index }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const isPrimary = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.15, type: 'spring', bounce: 0.3 }}
      className="module-card"
      onMouseMove={handleMouseMove}
      style={{
        padding: '2.5rem',
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        cursor: 'default',
        zIndex: 1
      }}
      whileHover={{
        scale: 1.02,
        rotateX: (mouseY.get() - 150) * -0.05,
        rotateY: (mouseX.get() - 150) * 0.05,
        boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 20px ${isPrimary ? 'rgba(138,43,226,0.2)' : 'rgba(255,183,3,0.2)'}`
      }}
      onMouseLeave={() => {
        mouseX.set(150);
        mouseY.set(150);
      }}
    >
      <motion.div
        className="card-glow"
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
          zIndex: -1,
          background: useMotionTemplate`radial-gradient(circle at ${mouseX}px ${mouseY}px, rgba(138, 43, 226, 0.15) 0%, rgba(255,255,255,0) 80%)`,
          transition: 'opacity 0.3s ease'
        }}
      ></motion.div>

      {/* 3D floating elements inside the card */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          position: 'absolute', top: -10, right: -10,
          width: '80px', height: '80px',
          background: isPrimary ? 'var(--color-primary)' : 'var(--color-accent)',
          filter: 'blur(40px)', opacity: 0.3, zIndex: -1
        }}></div>

        <div style={{
          width: '60px', height: '60px', borderRadius: '16px',
          background: isPrimary ? 'linear-gradient(135deg, rgba(138,43,226,0.2), rgba(138,43,226,0.05))' : 'linear-gradient(135deg, rgba(255,183,3,0.2), rgba(255,183,3,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isPrimary ? 'var(--color-primary-light)' : 'var(--color-accent)',
          fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: '900',
          border: `1px solid ${isPrimary ? 'rgba(138,43,226,0.3)' : 'rgba(255,183,3,0.3)'}`,
          boxShadow: `0 8px 20px ${isPrimary ? 'rgba(138,43,226,0.2)' : 'rgba(255,183,3,0.2)'}`
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{mod.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', fontSize: '1.05rem' }}>{mod.desc}</p>
      </div>
    </motion.div>
  );
};

const Modules = () => {
  const prompts = [
    { title: 'Restaurante Premium', desc: 'Site de alto padrão com cardápio, reservas e atmosfera de fine dining. Restaurantes pagam de R$ 1.000 a R$ 1.500 por um site neste nível.' },
    { title: 'Pizzaria', desc: 'Visual de dar fome, seção de sabores e botão de pedido direto no WhatsApp. Um dos nichos mais fáceis de fechar na sua cidade.' },
    { title: 'Lanchonete & Fast Food', desc: 'Layout mobile-first para quem vende pelo Instagram. O dono abre no celular, se impressiona e fecha na hora.' },
    { title: 'Cardápio Digital Interativo', desc: 'O produto mais pedido do momento: cardápio com fotos, categorias e link de pedido. Todo restaurante precisa de um — demanda infinita.' },
    { title: 'Cafeteria & Bistrô', desc: 'Estética aconchegante e sofisticada que valoriza o ambiente e o produto. Perfeito para cafés que querem se posicionar como premium.' },
    { title: 'Página de Produto', desc: 'Vitrine com slider estilo grandes marcas para destacar um produto. Ideal para lojas que querem lançar algo com impacto.' },
    { title: 'Transporte Executivo', desc: 'Site de luxo para motoristas particulares e transfers. Nicho com clientes acostumados a pagar caro por posicionamento.' },
    { title: 'Fotógrafos & Portfólio', desc: 'Galeria elegante com animações suaves que fazem o trabalho do fotógrafo brilhar. Fácil de vender para qualquer criativo.' },
    { title: 'Estética Automotiva', desc: 'Página com pacotes, serviços e visual agressivo que combina com o nicho. Estúdios de detailing pagam bem por essa imagem.' },
    { title: 'Negócios Locais (Coringa)', desc: 'O prompt versátil que se adapta a qualquer serviço da sua cidade: clínicas, academias, salões, pet shops. Nunca fique sem resposta para um cliente.' }
  ];

  return (
    <section className="section" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background ambient orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '-10%', width: '40vw', height: '40vw', background: 'var(--color-primary-dark)', filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '30vw', height: '30vw', background: 'var(--color-accent)', filter: 'blur(150px)', opacity: 0.08, borderRadius: '50%', pointerEvents: 'none' }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '5rem', maxWidth: '800px', margin: '0 auto 5rem' }}
        >
          <div style={{ display: 'inline-block', padding: '0.4rem 1rem', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', letterSpacing: '2px', textTransform: 'uppercase' }}>O Que Tem Dentro do Pack</div>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.5rem', fontWeight: 900, lineHeight: 1.1 }}>Os 10 Prompts Que Viram <span className="text-gradient">Dinheiro no Seu Pix</span></h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>Prompts testados: é copiar, colar no ChatGPT, Claude, Lovable ou outra IA, e ter o site pronto em ~10 minutos. Sem mensalidade e sem limite de uso: os mesmos 10 prompts servem para quantos clientes você conseguir fechar.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', perspective: '2000px' }}>
          {prompts.map((mod, i) => (
            <TiltCard key={i} mod={mod} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, type: 'spring' }}
          style={{ textAlign: 'center', marginTop: '6rem' }}
        >
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={CHECKOUT_URL}
            className="btn btn-accent"
            style={{ padding: '1.4rem 4rem', fontSize: '1.3rem', borderRadius: '100px', display: 'inline-block' }}
          >
            🚀 Destravar os 10 Prompts por R$ 9,99
          </motion.a>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Menos de 2% do que você vai cobrar por UM único site.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default Modules;
