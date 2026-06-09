// ════════════════════════════════════════════════════════════════
//  Calma · Backend del formulario de beta
//  Recibe el registro de la landing y envía dos correos:
//    1) Aviso para TI (equipo de Calma) con los datos del interesado
//    2) Confirmación branded para el visitante
//  Stack: Node.js + Express + Nodemailer (Gmail)  ·  Deploy: Render
// ════════════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Banner del correo (opcional): sube tu imagen de Figma a tu sitio de Netlify
// y pega su URL como variable de entorno EMAIL_HEADER_URL en Render.
// Si no está, el correo usa un encabezado de texto con la marca.
const EMAIL_HEADER_URL = process.env.EMAIL_HEADER_URL || '';

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

// ── Plantillas de correo (estética salvia de Calma) ──────────────
// Paleta en HEX (los correos no soportan oklch de forma confiable).
const COLOR = {
  bg: '#f3f6f3', card: '#ffffff', border: '#e3e9e3', accent: '#5a8a6b',
  soft: '#eef3ee', text: '#2b332c', muted: '#8a948b', body: '#4a544b',
};

// Encabezado: usa tu banner de Figma si EMAIL_HEADER_URL está puesto;
// si no, un wordmark de texto con el mismo look de la landing.
function encabezado() {
  if (EMAIL_HEADER_URL) {
    return `<tr><td style="padding:0;">
      <img src="${EMAIL_HEADER_URL}" alt="Calma" width="480" style="display:block;width:100%;height:auto;border:0;">
    </td></tr>`;
  }
  return `<tr><td style="padding:26px 32px 22px;background:${COLOR.soft};border-bottom:1px solid ${COLOR.border};">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td><div style="width:30px;height:30px;border-radius:8px;background:${COLOR.accent};color:#ffffff;font:bold 17px Arial,sans-serif;text-align:center;line-height:30px;">C</div></td>
      <td style="padding-left:10px;font:bold 19px Arial,sans-serif;color:${COLOR.text};">Calma</td>
    </tr></table>
  </td></tr>`;
}

// Tarjeta contenedora con encabezado + cuerpo + pie
function emailShell(bodyHtml) {
  return `<div style="margin:0;padding:0;background:${COLOR.bg};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:20px;overflow:hidden;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${encabezado()}
          <tr><td style="padding:30px 32px 26px;">${bodyHtml}</td></tr>
          <tr><td style="padding:16px 32px;border-top:1px solid ${COLOR.border};">
            <p style="margin:0;font-size:12px;color:${COLOR.muted};">Le avisamos a tu yo del futuro. · Hecho en México 🌱</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

// Correo que recibe el VISITANTE
function emailConfirmacion() {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:bold;color:${COLOR.text};">¡Listo! Apartamos tu lugar ✓</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.body};">Gracias por pedir tu invitación al beta de <b>Calma</b>.</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLOR.body};">Lanzamos en olas — te avisamos por aquí en cuanto sea tu turno. Sin lista de espera infinita.</p>
    <p style="margin:22px 0 0;font-size:15px;color:${COLOR.text};">— El equipo de Calma</p>
  `);
}

// Correo que recibes TÚ (el dueño)
function emailNotificacion({ email, whatsapp, fecha }) {
  return emailShell(`
    <h1 style="margin:0 0 14px;font-size:20px;font-weight:bold;color:${COLOR.text};">Nueva solicitud al beta 🌱</h1>
    <p style="margin:0 0 8px;font-size:15px;color:${COLOR.body};"><b>Email:</b> ${email}</p>
    <p style="margin:0 0 8px;font-size:15px;color:${COLOR.body};"><b>WhatsApp:</b> ${whatsapp}</p>
    <p style="margin:0 0 8px;font-size:15px;color:${COLOR.body};"><b>Fecha:</b> ${fecha}</p>
  `);
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
      html: emailNotificacion({
        email: esc(email),
        whatsapp: esc(whatsapp) || 'No proporcionó',
        fecha: esc(fecha),
      }),
    });

    // 2) Correo de confirmación branded al visitante
    await transporter.sendMail({
      from: `Calma <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Recibimos tu solicitud — Calma 🌱',
      html: emailConfirmacion(),
    });

    res.json({ ok: true, mensaje: '¡Registro exitoso! Revisa tu correo.' });

  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({ error: 'Error al enviar el correo. Intenta de nuevo.' });
  }
});

// ── Manejador de errores: responde JSON limpio (no HTML con stack) ──
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El formato de los datos no es válido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// Arranca el servidor solo si se ejecuta directo (node server.js).
// Si se importa (para previsualizar correos) NO arranca.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor de Calma corriendo en puerto ${PORT}`);
  });
}

module.exports = { app, emailConfirmacion, emailNotificacion };
