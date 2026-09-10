// Generates the SIH 2026 "IMPACT AND BENEFITS" slide for HoneyChain.
// Every claim below is grounded in this repo's actual code (contract +
// backend verification layer) — see comments next to each point.
const pptxgen = require('pptxgenjs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const Fa = require('react-icons/fa');

// --- palette: honey amber dominates, green marks the benefits column -------
const INK = '1B1B1B';
const BODY = '262626';
const MUTED = '7A7A7A';
const DIVIDER = 'D9D9D9';

async function icon(Comp, hex) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Comp, { color: '#FFFFFF', size: 256 }),
  );
  const png = await sharp(Buffer.from(svg)).resize(256, 256, {
    fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
  return { data: 'image/png;base64,' + png.toString('base64'), hex };
}

const IMPACT = [
  {
    // contract: verifyRecord(batchIdHash, recordHash) + backend recompute-and-compare
    Icon: Fa.FaFingerprint, hex: 'B45309', label: 'Counterfeiting Blocked: ',
    text: 'a cloned label fails verifyRecord() — the freshly recomputed SHA-256 digest no longer matches the one anchored on-chain.',
  },
  {
    // contract: _require(idHash, expected) gates every stage; LAB_FAILED is terminal
    Icon: Fa.FaBan, hex: 'C2410C', label: 'Rejected Honey Stays Rejected: ',
    text: 'stage order is enforced in the contract, so a lab-failed batch can never be packaged, sold or exported.',
  },
  {
    // server.js: /api/batches/:id/verify-integrity, per-event MATCH / MISMATCH
    Icon: Fa.FaClipboardCheck, hex: 'A16207', label: 'Audit Without Paperwork: ',
    text: 'KVIC and FSSAI officers read the same immutable timeline the consumer sees, with a per-event MATCH / MISMATCH check.',
  },
];

const BENEFITS = [
  {
    // consumer route is public; backend service wallet submits all transactions
    Icon: Fa.FaQrcode, hex: '15803D', label: 'Trust In One Scan: ',
    text: 'consumers verify a jar on any phone — no app, no wallet, no login — and follow the hive-to-jar trail themselves.',
  },
  {
    // verified origin + purity anchored per batch; Etherscan + IPFS CID exposed
    Icon: Fa.FaRupeeSign, hex: '166534', label: 'Fair Farm-Gate Price: ',
    text: 'verified origin and purity let KVIC beekeepers claim their premium, while export buyers confirm provenance independently.',
  },
];

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9'; // 10" x 5.625"
  const s = pres.addSlide();
  s.background = { color: 'FFFFFF' };

  s.addText('EMINENCE', {
    x: 0.34, y: 0.1, w: 2.2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: 'Calibri', fontSize: 15, color: MUTED, charSpacing: 2,
  });

  s.addText('IMPACT AND BENEFITS', {
    x: 1.6, y: 0.16, w: 6.8, h: 0.44, isTextBox: true, margin: 0,
    fontFace: 'Cambria', fontSize: 25, bold: true, color: INK, align: 'center',
  });

  s.addText('SMART INDIA\nHACKATHON 2026', {
    x: 8.05, y: 0.13, w: 1.62, h: 0.44, isTextBox: true, margin: 0,
    fontFace: 'Calibri', fontSize: 9.5, bold: true, color: MUTED,
    align: 'right', lineSpacingMultiple: 1.05,
  });

  // Column headings, underlined like the reference deck.
  s.addText('IMPACT', {
    x: 0.9, y: 0.78, w: 3.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: 'Cambria', fontSize: 15, bold: true, color: INK,
    align: 'center', underline: { style: 'sng' },
  });
  s.addText('BENEFITS', {
    x: 5.15, y: 0.78, w: 3.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: 'Cambria', fontSize: 15, bold: true, color: INK,
    align: 'center', underline: { style: 'sng' },
  });

  s.addShape(pres.ShapeType.line, {
    x: 4.86, y: 1.24, w: 0, h: 3.62, line: { color: DIVIDER, width: 1.25 },
  });

  const D = 0.44; // icon circle diameter
  const row = async ({ Icon, hex, label, text }, { x, y, w, iconX }) => {
    const img = await icon(Icon, hex);
    s.addShape(pres.ShapeType.ellipse, {
      x: iconX, y: y - 0.05, w: D, h: D, fill: { color: hex },
    });
    s.addImage({ data: img.data, x: iconX + 0.115, y: y + 0.065, w: 0.21, h: 0.21 });
    s.addText(
      [
        { text: label, options: { bold: true, color: INK } },
        { text, options: { color: BODY } },
      ],
      {
        x, y, w, h: 1.05, isTextBox: true, margin: 0, valign: 'top',
        fontFace: 'Cambria', fontSize: 12.5, lineSpacingMultiple: 1.12,
      },
    );
  };

  const leftY = [1.32, 2.55, 3.78];
  for (let i = 0; i < IMPACT.length; i++) {
    await row(IMPACT[i], { x: 1.0, w: 3.55, y: leftY[i], iconX: 0.36 });
  }
  // Two benefits against three impacts: center the pair on the left column's
  // span so the shorter column reads as deliberate, not unfinished.
  const rightY = [1.98, 3.22];
  for (let i = 0; i < BENEFITS.length; i++) {
    await row(BENEFITS[i], { x: 5.24, w: 3.52, y: rightY[i], iconX: 8.98 });
  }

  s.addText('5', {
    x: 9.3, y: 5.18, w: 0.4, h: 0.25, isTextBox: true, margin: 0,
    fontFace: 'Calibri', fontSize: 10, color: MUTED, align: 'right',
  });

  s.addNotes(
    'Impact is enforced by code, not policy. The contract gates every stage transition, '
    + 'so a lab-failed batch is terminal — it cannot be packaged or exported. '
    + 'Any edit to a record breaks its SHA-256 digest, so verifyRecord() returns false and the '
    + 'audit view flags MISMATCH. Consumers need no wallet: a backend service wallet submits all '
    + 'transactions, so verification is a plain QR scan.',
  );

  await pres.writeFile({ fileName: 'HoneyChain-Impact-and-Benefits.pptx' });
  console.log('written');
})();
