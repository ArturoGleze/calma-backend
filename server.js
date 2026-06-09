// ════════════════════════════════════════════════════════════════
//  Calma · Backend del formulario de beta
//  Recibe el registro de la landing y envía dos correos:
//    1) Aviso para TI (equipo de Calma) con los datos del interesado
//    2) Confirmación para el visitante
//  Stack: Node.js + Express + Nodemailer (Gmail)  ·  Deploy: Render
// ════════════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────────
app.use(cors());          // Permite peticiones desde tu dominio de Netlify
app.use(express.json());  // Lee el body en formato JSON

// ── Transportador de correo (Gmail + contraseña de aplicación) ───
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,      // tu-correo@gmail.com
    pass: process.env.GMAIL_APP_PASS,  // contraseña de app de 16 caracteres
  },
});

// Escapa el texto del formulario para que no rompa el HTML del correo
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validación simple de formato de email
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Ruta de health check: confirma que el servidor está vivo ─────
app.get('/', (req, res) => {
  res.json({ status: 'OK', mensaje: 'Servidor de Calma funcionando ✓' });
});

// ── Ruta principal: recibe el formulario y envía los correos ─────
app.post('/contacto', async (req, res) => {
  const email = (req.body.email || '').trim();
  const whatsapp = (req.body.whatsapp || '').trim();

  // Validación
  if (!email) {
    return res.status(400).json({ error: 'El correo es obligatorio.' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
  }

  const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  try {
    // 1) Correo que recibes TÚ (el equipo de Calma)
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      replyTo: email, // así puedes responderle directo al interesado
      subject: `🌱 Nueva solicitud al beta de Calma: ${email}`,
      html: `
        <h2>Nueva solicitud al beta</h2>
        <p><b>Email:</b> ${esc(email)}</p>
        <p><b>WhatsApp:</b> ${esc(whatsapp) || 'No proporcionó'}</p>
        <p><b>Fecha:</b> ${esc(fecha)}</p>
        <hr>
        <small>Enviado desde la landing de Calma vía Render</small>
      `,
    });

    // 2) Correo de confirmación al visitante
    await transporter.sendMail({
      from: `Calma <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Recibimos tu solicitud — Calma 🌱',
      html: `
        <h2>¡Listo! Apartamos tu lugar ✓</h2>
        <p>Gracias por pedir tu invitación al beta de <b>Calma</b>.</p>
        <p>Lanzamos en olas — te avisamos por aquí en cuanto sea tu turno.
        Sin lista de espera infinita.</p>
        <p>— El equipo de Calma</p>
      `,
    });

    res.json({ ok: true, mensaje: '¡Registro exitoso! Revisa tu correo.' });

  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({ error: 'Error al enviar el correo. Intenta de nuevo.' });
  }
});

// ── Manejador de errores: responde JSON limpio (no HTML con stack) ──
// Si llega un body con JSON roto, express.json() lanza aquí.
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El formato de los datos no es válido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor de Calma corriendo en puerto ${PORT}`);
});
