import React from 'react';

const Footer = () => {
  return (
    <footer className="footer mt-auto py-4 bg-light border-top">
      <div className="container text-center">
        <p className="mb-1">
          &copy; 2025 <strong>TalentPath</strong>. All rights reserved. | Powered by{' '}
          <a href="#" className="text-decoration-none">TheForeverKnights</a>
        </p>
        
        <div className="donate text-muted small">
          <p className="mb-1">
            💰 <strong>Donate:</strong>{' '}
            <span>Bitcoin (BTC): <code>bc1q9wnzq42c0nz8659hajq3820e5pgn5t342e2wcz</code></span> |{' '}
            <span>Ethereum (ETH): <code>0x78fE31D333aec6Be5EBF57854b635f3d1C614F22</code></span>
          </p>
          <p className="mb-0">
            📧 <strong>Contact:</strong>{' '}
            <a href="mailto:talentpath.dev@gmail.com" className="text-decoration-none">
              theforeverknights1@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
