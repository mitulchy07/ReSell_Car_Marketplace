import emailjs from '@emailjs/browser';
import React, { useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';

export const Contact = () => {
  const { user } = useContext(AuthContext);
  const form = useRef(null);
  const [sending, setSending] = useState(false);

  const sendEmail = async (event) => {
    event.preventDefault();
    if (!form.current || sending) return;
    try {
      setSending(true);
      // Existing EmailJS configuration retained from the original project.
      await emailjs.sendForm(
        'service_hu9we12',
        'template_hidbk6w',
        form.current,
        'bnq5kMoL3oqS7myN1',
      );
      form.current.reset();
      toast.success('Message sent!');
    } catch (error) {
      console.error('Contact form failed:', error);
      toast.error('Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rs-contact-section" aria-labelledby="rs-contact-title">
      <div className="rs-contact-copy">
        <span className="rs-section-kicker rs-section-kicker-light">HAVE A QUESTION?</span>
        <h2 id="rs-contact-title">
          Let's talk about
          <br />
          <em>your next ride.</em>
        </h2>
        <p>Curious about a listing or have a question about the marketplace? Drop us a message.</p>
        <div className="rs-contact-decoration" aria-hidden="true">
          ↗
        </div>
      </div>
      <div className="rs-contact-form-wrap">
        <h3>Send a message</h3>
        <p>We'll do our best to get back to you.</p>
        <form ref={form} onSubmit={sendEmail} className="rs-form rs-contact-form">
          <label htmlFor="rs-contact-name">Your name</label>
          <input
            id="rs-contact-name"
            className="rs-input"
            name="user_name"
            type="text"
            placeholder="Full name"
            defaultValue={user?.displayName || ''}
            required
          />
          <label htmlFor="rs-contact-email">Email address</label>
          <input
            id="rs-contact-email"
            className="rs-input"
            name="user_email"
            type="email"
            placeholder="you@example.com"
            defaultValue={user?.email || ''}
            required
          />
          <label htmlFor="rs-contact-message">Your message</label>
          <textarea
            id="rs-contact-message"
            className="rs-input rs-textarea"
            name="message"
            placeholder="How can we help?"
            rows="4"
            required
          />
          <button className="rs-btn rs-btn-primary rs-form-submit" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send message'} <span aria-hidden="true">↗</span>
          </button>
        </form>
      </div>
    </section>
  );
};
