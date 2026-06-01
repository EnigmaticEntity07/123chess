import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="container hero">
        <h1>Next-Gen Progressive Chess</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
          Experience the intense Italian variant where each turn grows longer.<br/>
          White makes 1 move, Black makes 2, White makes 3... Can you survive the escalation?
        </p>
        <Link to="/register" className="btn-primary" style={{ fontSize: '1.2rem', padding: '16px 32px' }}>
          Start Playing Free
        </Link>
      </div>
    </>
  );
}
