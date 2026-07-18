import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CHECKOUT_URL } from '../config';
import PreviewModal from './PreviewModal';

const ProjectCard = ({ proj, i, setActiveProject }) => {
  const ref = useRef(null);

  // Track this specific card's position in the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Map the scroll progress (0 to 1) to a Y translation for the image.
  // The image will scroll up as the user scrolls down the page.
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);

  return (
    <motion.div
      ref={ref}
      className="project-card"
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: (i % 3) * 0.1, type: "spring", stiffness: 100 }}
      style={{
        position: 'relative',
        borderRadius: '20px',
        background: 'var(--color-surface-light)',
        padding: '1rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'box-shadow 0.4s ease'
      }}
      whileHover={{
        y: -15,
        scale: 1.03,
        boxShadow: `0 20px 40px rgba(0,0,0,0.8), 0 0 20px ${proj.color}33`,
        borderColor: `${proj.color}66`
      }}
      onClick={() => setActiveProject(proj)}
    >
      <div style={{
        width: '100%',
        height: '300px',
        overflow: 'hidden',
        borderRadius: '12px',
        position: 'relative',
        background: '#000',
        pointerEvents: 'none'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30px', background: 'rgba(25,25,25,0.9)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', zIndex: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
          </div>
          <div style={{ fontSize: '10px', color: '#fff', opacity: 0.5 }}>Interação Automática no Scroll</div>
        </div>

        <motion.img
          className="project-img"
          src={proj.img}
          alt={`Site ${proj.name} gerado com 1 prompt do pack`}
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '160%',
            objectFit: 'cover',
            objectPosition: 'top',
            marginTop: '30px',
            filter: 'contrast(1.1) brightness(0.9)',
            y // Apply the scroll-driven transform here
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.style.background = 'linear-gradient(135deg, var(--color-primary-dark), #000)';
          }}
        />
      </div>
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{proj.name}</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-primary-light)', marginTop: '0.3rem', fontWeight: 500 }}>Gerado com 1 prompt do pack</p>
      </div>
    </motion.div>
  );
};

const Portfolio = () => {
  const [activeProject, setActiveProject] = useState(null);

  const projects = [
    { name: 'The Prime', img: '/screenshots/prime.jpg', color: '#ff3366' },
    { name: 'Privé Chauffeur', img: '/screenshots/prive.jpg', color: '#33ccff' },
    { name: 'Brace Pizza', img: '/screenshots/brace.jpg', color: '#ff9933' },
    { name: 'Nike Slider', img: '/screenshots/nike.jpg', color: '#eeeeee' },
    { name: 'Noir Brew', img: '/screenshots/noir.jpg', color: '#d4af37' },
    { name: 'The Döner', img: '/screenshots/doener.jpg', color: '#ff3333' },
    { name: 'Birria Chi', img: '/screenshots/birria.jpg', color: '#ff6600' },
    { name: 'Evermore', img: '/screenshots/evermore.jpg', color: '#a084dc' },
    { name: 'Lustre', img: '/screenshots/lustre.jpg', color: '#00e5ff' }
  ];

  return (
    <section className="section" style={{ backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '1rem', fontWeight: 800 }}>Sites Reais Criados Pelos Prompts <span className="text-gradient">Que Você Vai Receber</span></h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>
            Nenhuma linha de código foi escrita à mão: cada projeto abaixo saiu de <strong>1 único prompt</strong>. <strong>Role a página</strong> para ver os sites ganhando vida e clique em qualquer um para explorar por dentro.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '3rem' }}>
          {projects.map((proj, i) => (
            <ProjectCard key={i} proj={proj} i={i} setActiveProject={setActiveProject} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, type: 'spring' }}
          style={{ textAlign: 'center', marginTop: '5rem' }}
        >
          <a href={CHECKOUT_URL} className="btn btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.2rem', boxShadow: '0 0 30px rgba(138, 43, 226, 0.5)' }}>
            Quero Gerar Sites Como Estes
          </a>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Cada um destes sites vale de R$ 700 a R$ 1.500 no mercado — o pack inteiro custa R$ 9,99.</p>
        </motion.div>
      </div>

      <PreviewModal project={activeProject} onClose={() => setActiveProject(null)} />
    </section>
  );
};

export default Portfolio;
