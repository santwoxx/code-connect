import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Hero from './components/Hero';
import Opportunity from './components/Opportunity';
import Modules from './components/Modules';
import Portfolio from './components/Portfolio';
import Bonuses from './components/Bonuses';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import { CHECKOUT_URL } from './config';

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Sticky CTA appears only after the hero (and its own CTA) leaves the viewport
    const handleScroll = () => setShowStickyCta(window.scrollY > window.innerHeight);
    // PreviewModal dispatches 'cs:modal' so the sticky CTA hides while it is open
    const handleModal = (e) => setModalOpen(Boolean(e.detail?.open));
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('cs:modal', handleModal);

    // Check if mobile to disable intensive mouse tracking
    if (window.innerWidth < 768) {
      setIsMobile(true);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('cs:modal', handleModal);
      };
    }

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('cs:modal', handleModal);
    };
  }, []);

  return (
    <>
      {/* Global Interactive Background Glow */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            zIndex: 9998, // Just below modals
            background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(255, 102, 0, 0.05), transparent 80%)`,
            transition: 'background 0.3s ease-out' // Smooth following
          }}
        />
      )}

      {/* Sticky checkout CTA — hidden while a preview modal is open */}
      <AnimatePresence>
        {showStickyCta && !modalOpen && (
          <motion.a
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            href={CHECKOUT_URL}
            className="btn btn-primary"
            style={{
              position: 'fixed',
              bottom: '18px',
              left: '50%',
              x: '-50%',
              zIndex: 9990,
              width: 'min(92vw, 420px)',
              textAlign: 'center',
              padding: '1rem 1.5rem',
              fontSize: '1.05rem',
              borderRadius: '100px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 25px rgba(138,43,226,0.5)'
            }}
          >
            🔥 Quero Meu Pack por R$ 9,99
          </motion.a>
        )}
      </AnimatePresence>

      {/* App Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Hero />
        <Opportunity />
        <Modules />
        <Portfolio />
        <Bonuses />
        <Pricing />
        <FAQ />
        <Footer />
      </div>
    </>
  );
}

export default App;
