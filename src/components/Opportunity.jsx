import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { CHECKOUT_URL } from '../config';
import PreviewModal from './PreviewModal';

const MiniPreview = ({ proj, delay = 0, duration = 20, reverse = false, onClick }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-150, 150], [15, -15]);
  const rotateY = useTransform(x, [-150, 150], [-15, 15]);

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left - rect.width / 2);
    y.set(event.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(proj)}
      whileHover={{ scale: 1.05, boxShadow: `0 30px 60px rgba(0,0,0,0.9), 0 0 40px ${proj.color}4d`, borderColor: `${proj.color}80` }}
      style={{
        width: '100%', height: '350px', borderRadius: '16px', overflow: 'hidden',
        position: 'relative', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', background: '#000', cursor: 'pointer',
        transition: 'border-color 0.3s ease',
        rotateX, rotateY, transformStyle: "preserve-3d"
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, var(--color-surface) 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to top, var(--color-surface) 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>

      {/* Interactive Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', backdropFilter: 'blur(5px)', opacity: 0, transition: 'opacity 0.3s ease' }}
        className="click-indicator"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onClick(proj); }}
          style={{ width: '80%', padding: '12px', fontSize: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '50px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          👁️ Explorar o Site
        </button>
        <a
          href={CHECKOUT_URL}
          onClick={(e) => e.stopPropagation()}
          className="btn btn-primary"
          style={{ width: '80%', padding: '12px', fontSize: '1rem', boxShadow: `0 0 30px ${proj.color}80`, textAlign: 'center' }}
        >
          🚀 Quero Este Prompt
        </a>
      </div>

      <style>{`.click-indicator { opacity: 0; } div:hover > .click-indicator { opacity: 1; }`}</style>

      <motion.img
        src={proj.img}
        alt={`Site ${proj.name} gerado com 1 prompt do pack`}
        draggable={false}
        initial={{ y: reverse ? "-50%" : "0%" }}
        animate={{ y: reverse ? ["-50%", "0%", "-50%"] : ["0%", "-50%", "0%"] }}
        transition={{ repeat: Infinity, duration, ease: "linear", delay }}
        style={{ width: '100%', height: 'auto', minHeight: '200%', objectFit: 'cover', objectPosition: 'top', filter: 'contrast(1.1)' }}
      />
    </motion.div>
  )
}

const Opportunity = () => {
  const [activeProject, setActiveProject] = useState(null);

  const projects = {
    prime: { name: 'The Prime', img: '/screenshots/prime.jpg', color: '#ff3366' },
    doener: { name: 'The Döner', img: '/screenshots/doener.jpg', color: '#ff3333' },
    brace: { name: 'Brace Pizza', img: '/screenshots/brace.jpg', color: '#ff9933' },
    nike: { name: 'Nike Slider', img: '/screenshots/nike.jpg', color: '#eeeeee' }
  };

  return (
    <section className="section" style={{ backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
      <div className="container">

        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', marginBottom: '1rem', fontWeight: 800 }}
          >
            Uma Mina de Ouro <span className="text-gradient">no Seu Bolso</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto' }}
          >
            Todo negócio da sua cidade precisa de um site bonito — e quase nenhum tem. Com os prompts, você entrega em minutos o que agências cobram caro para fazer em semanas. Eles nem vão saber como você fez tão rápido.
          </motion.p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, type: 'spring' }}
            style={{ display: 'flex', gap: '1.5rem', perspective: '1000px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, marginTop: '2rem' }}>
              <MiniPreview proj={projects.prime} duration={25} onClick={setActiveProject} />
              <MiniPreview proj={projects.doener} duration={22} reverse onClick={setActiveProject} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              <MiniPreview proj={projects.brace} duration={28} reverse onClick={setActiveProject} />
              <MiniPreview proj={projects.nike} duration={20} onClick={setActiveProject} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
            className="glass"
            style={{ padding: '3rem 2rem', borderRadius: '20px', position: 'relative', overflow: 'hidden', perspective: '1000px' }}
          >
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--color-primary)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
            <h3 style={{ fontSize: '1.8rem', marginBottom: '2rem', fontWeight: 800, textAlign: 'center' }}>Faça as Contas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <motion.div
                whileHover={{ scale: 1.05, x: 10 }}
                style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'default' }}
              >
                <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>1 Site Entregue (1 prompt)</p>
                <p style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-primary-light)' }}>R$ 700 a R$ 1.500</p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, x: 10 }}
                style={{ background: 'rgba(255,183,3,0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,183,3,0.2)', cursor: 'default' }}
              >
                <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>10 Clientes no Mês</p>
                <p style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--color-accent)' }}>R$ 7.000 a R$ 15.000</p>
              </motion.div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>*O pack custa só R$ 9,99 e o uso é ilimitado: um único cliente fechado já paga o investimento mais de 70 vezes.</p>

            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={CHECKOUT_URL}
              className="btn btn-primary"
              style={{ padding: '1.2rem', fontSize: '1.2rem', width: '100%', borderRadius: '12px', animation: 'pulse-shadow 2s infinite', display: 'block', textAlign: 'center', marginTop: '2rem' }}
            >
              Quero Faturar Assim
            </motion.a>

          </motion.div>
        </div>
      </div>

      <PreviewModal project={activeProject} onClose={() => setActiveProject(null)} />

    </section>
  );
};

export default Opportunity;
