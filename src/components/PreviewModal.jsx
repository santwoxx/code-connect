import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHECKOUT_URL } from '../config';

// Preview navegável por screenshot: o visitante explora o site inteiro rolando a
// imagem, sem iframe e sem nenhuma URL do projeto exposta no código ou na tela.
const PreviewModal = ({ project, onClose }) => {
  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(15px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
          }}
        >
          {/* Modal Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', color: '#fff', gap: '15px', flexWrap: 'wrap' }}
          >
            <div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Visualizando: <span style={{ color: project.color }}>{project.name}</span></h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Este site inteiro nasceu de <strong>1 único prompt</strong> do pack. Role para explorar cada seção.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <a href={CHECKOUT_URL} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', borderRadius: '8px', animation: 'pulse-shadow 2s infinite' }}>
                Quero o Prompt Deste Site
              </a>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                  width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)', flexShrink: 0
                }}
              >
                ✕
              </motion.button>
            </div>
          </motion.div>

          {/* Scrollable full-page screenshot */}
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${project.color}66`, boxShadow: `0 0 40px ${project.color}40`, background: '#000', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <div style={{ height: '34px', background: 'rgba(25,25,25,0.95)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '6px', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
              </div>
              <div style={{ fontSize: '11px', color: '#fff', opacity: 0.6 }}>🔒 Preview exclusivo — o prompt completo está no pack</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <img
                src={project.img}
                alt={`Site ${project.name} gerado com 1 prompt do pack`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
              />
            </div>
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            style={{ textAlign: 'center', marginTop: '15px' }}
          >
            <a href={CHECKOUT_URL} className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '100px', display: 'inline-block', width: '100%', maxWidth: '420px' }}>
              🚀 Quero Criar Sites Como Este por R$ 9,99
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PreviewModal;
