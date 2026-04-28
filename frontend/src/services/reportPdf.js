import jsPDF from 'jspdf';

const COLORS = {
  accent: [0, 128, 128],
  dark: [15, 23, 42],
  muted: [100, 116, 139],
  light: [234, 236, 238],
  white: [255, 255, 255],
  approved: [34, 197, 94],
  bug: [107, 114, 128],
  blocked: [245, 158, 11],
  rejected: [249, 115, 22],
  pending: [139, 92, 246],
};

const STATUS_COLORS = {
  approved: COLORS.approved,
  bug: COLORS.bug,
  blocked: COLORS.blocked,
  rejected: COLORS.rejected,
  pending_approval: COLORS.pending,
  pending: COLORS.pending,
};

const STATUS_LABELS = {
  approved: 'Aprovado',
  bug: 'Bug',
  blocked: 'Bloqueado',
  rejected: 'Rejeitado',
  pending_approval: 'Pendente',
  pending: 'Pendente',
};

async function loadImageAsDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageType(dataUrl) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/gif')) return 'GIF';
  return 'PNG';
}

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });
}

export async function generateProjectPdf(project, sprints, bugs = []) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  function checkPageBreak(needed = 20) {
    if (y + needed > PAGE_H - 18) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function setFont(style = 'normal', size = 10, color = COLORS.dark) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  // ─── COVER HEADER ─────────────────────────────────────────────────────────
  // Top accent bar
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 0, PAGE_W, 52, 'F');

  // Logo circle
  doc.setFillColor(255, 255, 255, 0.2);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(MARGIN + 8, 18, 8, 'S');
  setFont('bold', 11, COLORS.white);
  doc.text('QA', MARGIN + 4.5, 21);

  // Title
  setFont('bold', 18, COLORS.white);
  doc.text('Relatório de Projeto', MARGIN + 22, 17);

  setFont('normal', 9, [220, 240, 240]);
  doc.text('QualiQA • ALM Onion', MARGIN + 22, 23);

  // Date
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  setFont('normal', 8, [200, 230, 230]);
  doc.text(`Gerado em: ${dateStr}`, PAGE_W - MARGIN - doc.getTextWidth(`Gerado em: ${dateStr}`), 23);

  // Project name big
  setFont('bold', 14, COLORS.white);
  const nameLines = doc.splitTextToSize(project.name || 'Projeto Sem Nome', CONTENT_W);
  doc.text(nameLines, MARGIN, 36);

  y = 62;

  // ─── PROJECT INFO CARD ────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(MARGIN, y, CONTENT_W, 48, 3, 3, 'F');

  setFont('bold', 9, COLORS.muted);
  doc.text('INFORMAÇÕES DO PROJETO', MARGIN + 6, y + 8);

  // Line separator
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.4);
  doc.line(MARGIN + 6, y + 10, MARGIN + CONTENT_W - 6, y + 10);

  const infoItems = [
    { label: 'Nº Proposta', value: project.proposal_number || '—' },
    { label: 'Desenvolvedor', value: project.developer_name || '—' },
    { label: 'Analista QA', value: project.qa_name || '—' },
    { label: 'Gestor', value: project.manager_name || '—' },
    { label: 'Status', value: STATUS_LABELS[project.status] || project.status || '—' },
  ];

  const colW = CONTENT_W / 2;
  infoItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = MARGIN + 6 + col * colW;
    const iy = y + 17 + row * 12;

    setFont('bold', 7.5, COLORS.muted);
    doc.text(item.label.toUpperCase(), ix, iy);
    setFont('normal', 9, COLORS.dark);
    doc.text(doc.splitTextToSize(item.value, colW - 8)[0], ix, iy + 5);
  });

  y += 56;

  // ─── SCOPE ────────────────────────────────────────────────────────────────
  if (project.scope_summary) {
    checkPageBreak(24);
    setFont('bold', 10, COLORS.accent);
    doc.text('Escopo do Projeto', MARGIN, y);
    y += 5;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 5;

    setFont('normal', 9, COLORS.dark);
    const scopeLines = doc.splitTextToSize(project.scope_summary, CONTENT_W);
    scopeLines.forEach((line) => {
      checkPageBreak(6);
      doc.text(line, MARGIN, y);
      y += 5;
    });
    y += 4;
  }

  // ─── RESUMO DOS CENÁRIOS ───────────────────────────────────────────────────
  {
    const total   = sprints.length;
    const passed  = sprints.filter(s => s.status === 'approved').length;
    const failed  = sprints.filter(s => s.status === 'rejected').length;
    const blocked = sprints.filter(s => s.status === 'blocked').length;
    const bugSpr  = sprints.filter(s => s.status === 'bug').length;
    const pending = total - passed - failed - blocked - bugSpr;
    const bugsTotal = bugs.length;
    const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0;

    checkPageBreak(60);
    // Timestamp
    const tsStr = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setFont('normal', 7.5, COLORS.muted);
    doc.text(`Relatório gerado em: ${tsStr}`, PAGE_W - MARGIN - doc.getTextWidth(`Relatório gerado em: ${tsStr}`), y);
    y += 6;

    setFont('bold', 10, COLORS.accent);
    doc.text('Resumo dos Cenários', MARGIN, y);
    y += 4;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 6;

    // Card background
    doc.setFillColor(247, 248, 250);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, 52, 2, 2, 'F');

    const summaryRows = [
      { label: 'Total',    val: total,     color: COLORS.accent },
      { label: 'Passed',   val: passed,    color: COLORS.approved },
      { label: 'Failed',   val: failed,    color: COLORS.rejected },
      { label: 'Blocked',  val: blocked,   color: COLORS.blocked },
      { label: 'Pendente', val: pending,   color: COLORS.pending },
      { label: 'Bugs',     val: bugsTotal, color: COLORS.bug },
    ];

    const colW2 = CONTENT_W / 3;
    summaryRows.forEach((row, i) => {
      const col = i % 3;
      const rowN = Math.floor(i / 3);
      const rx = MARGIN + 6 + col * colW2;
      const ry = y + 4 + rowN * 22;
      const percent = row.label === 'Total' ? '' : `  ${pct(row.val)}%`;

      // Color dot
      doc.setFillColor(...row.color);
      doc.circle(rx + 2, ry + 1.5, 2, 'F');

      setFont('bold', 7.5, COLORS.muted);
      doc.text(row.label.toUpperCase(), rx + 6, ry + 2.5);

      setFont('bold', 13, row.color);
      doc.text(`${row.val}`, rx + 6, ry + 12);

      if (percent) {
        setFont('normal', 8, COLORS.muted);
        doc.text(percent, rx + 6 + doc.getTextWidth(`${row.val}`) + 1, ry + 12);
      }

      // Mini bar (skip for Total)
      if (row.label !== 'Total' && total > 0) {
        const barMaxW = colW2 - 14;
        const barFill = Math.max((row.val / total) * barMaxW, row.val > 0 ? 1 : 0);
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(rx + 6, ry + 14, barMaxW, 3, 1, 1, 'F');
        doc.setFillColor(...row.color);
        if (barFill > 0) doc.roundedRect(rx + 6, ry + 14, barFill, 3, 1, 1, 'F');
      }
    });

    y += 56;
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  checkPageBreak(30);
  setFont('bold', 12, COLORS.accent);
  doc.text('Sumário de Test Cases', MARGIN, y);
  y += 4;
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 6;


  sprints.forEach((sprint, idx) => {
    checkPageBreak(8);
    const statusColor = STATUS_COLORS[sprint.status] || COLORS.muted;

    // Bullet circle
    doc.setFillColor(...statusColor);
    doc.circle(MARGIN + 2.5, y - 1.5, 2, 'F');

    setFont('bold', 9, COLORS.dark);
    doc.text(`${idx + 1}.`, MARGIN + 6, y);
    setFont('normal', 9, COLORS.dark);
    doc.text(doc.splitTextToSize(sprint.name, CONTENT_W - 40)[0], MARGIN + 12, y);

    // Status tag
    doc.setFillColor(...statusColor);
    const statusLabel = STATUS_LABELS[sprint.status] || sprint.status || '';
    const tagW = doc.getTextWidth(statusLabel) + 5;
    doc.roundedRect(PAGE_W - MARGIN - tagW - 2, y - 4.5, tagW + 2, 6, 1.5, 1.5, 'F');
    setFont('bold', 7, COLORS.white);
    doc.text(statusLabel, PAGE_W - MARGIN - tagW + 0.5, y - 0.5);

    y += 7;
  });

  y += 6;

  // ─── TEST CASES DETAIL ────────────────────────────────────────────────────
  for (let idx = 0; idx < sprints.length; idx++) {
    const sprint = sprints[idx];
    const statusColor = STATUS_COLORS[sprint.status] || COLORS.muted;

    checkPageBreak(28);

    // Section header bar
    doc.setFillColor(...statusColor);
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, 'F');

    setFont('bold', 10, COLORS.white);
    doc.text(`${idx + 1} — ${sprint.name}`, MARGIN + 5, y + 7.5);

    const statusLabel = STATUS_LABELS[sprint.status] || '';
    const tagW = doc.getTextWidth(statusLabel) + 5;
    doc.setFillColor(255, 255, 255, 0.25);
    doc.roundedRect(PAGE_W - MARGIN - tagW - 4, y + 2, tagW + 2, 7, 1.5, 1.5, 'F');
    setFont('bold', 7, COLORS.white);
    doc.text(statusLabel, PAGE_W - MARGIN - tagW - 1.5, y + 7);

    y += 16;

    // Steps
    if (!sprint.steps || sprint.steps.length === 0) {
      checkPageBreak(10);
      setFont('italic', 8.5, COLORS.muted);
      doc.text('Nenhum passo de teste adicionado.', MARGIN + 4, y);
      y += 10;
    } else {
      for (let si = 0; si < sprint.steps.length; si++) {
        const step = sprint.steps[si];
        checkPageBreak(16);

        // Step row background alternating
        if (si % 2 === 0) {
          doc.setFillColor(247, 248, 250);
          doc.roundedRect(MARGIN, y - 2, CONTENT_W, 10, 1.5, 1.5, 'F');
        }

        // Step number circle
        doc.setFillColor(...COLORS.accent);
        doc.circle(MARGIN + 5, y + 2.5, 3.5, 'F');
        setFont('bold', 7.5, COLORS.white);
        doc.text(`${si + 1}`, MARGIN + 3.5, y + 4.2);

        setFont('normal', 9, COLORS.dark);
        const stepLines = doc.splitTextToSize(step.description || '', CONTENT_W - 16);
        doc.text(stepLines[0], MARGIN + 12, y + 4);

        if (stepLines.length > 1) {
          y += 7;
          checkPageBreak(8);
          stepLines.slice(1).forEach((line) => {
            setFont('normal', 9, COLORS.dark);
            doc.text(line, MARGIN + 12, y + 4);
            y += 5;
          });
        }

        y += 10;

        // Image
        if (step.image_path) {
          const imgUrl = `http://localhost:8000${step.image_path}`;
          const dataUrl = await loadImageAsDataUrl(imgUrl);
          if (dataUrl) {
            const imgType = getImageType(dataUrl);
            const dims = await getImageDimensions(dataUrl);
            if (dims.w > 0) {
              const maxW = CONTENT_W - 16;
              const maxH = 70;
              const ratio = Math.min(maxW / dims.w, maxH / dims.h, 1);
              const imgW = dims.w * ratio;
              const imgH = dims.h * ratio;
              checkPageBreak(imgH + 8);

              // Image border box
              doc.setDrawColor(...COLORS.light);
              doc.setLineWidth(0.3);
              doc.roundedRect(MARGIN + 12, y, imgW + 4, imgH + 4, 2, 2, 'S');
              doc.addImage(dataUrl, imgType, MARGIN + 14, y + 2, imgW, imgH);
              y += imgH + 10;
            }
          }
        }

        if (step.expected_result) {
          checkPageBreak(10);
          setFont('italic', 7.5, COLORS.muted);
          doc.text(`Resultado esperado: ${step.expected_result}`, MARGIN + 12, y);
          y += 7;
        }
      }
    }

    // ─── ADDING BUG DETAILS ───
    const sprintBugs = bugs.filter(b => b.sprint_id === sprint.id);
    if (sprintBugs.length > 0) {
      y += 2;
      checkPageBreak(15);
      setFont('bold', 9, COLORS.bug);
      doc.text('Defeitos Registrados (Bugs):', MARGIN + 4, y);
      y += 8;

      for (let bi = 0; bi < sprintBugs.length; bi++) {
        const bug = sprintBugs[bi];
        checkPageBreak(15);
        
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(MARGIN + 4, y - 4, CONTENT_W - 8, 10, 1.5, 1.5, 'F');
        
        setFont('bold', 8, COLORS.dark);
        doc.text(`Bug ${bug.serial_number || `#${bug.id}`}:`, MARGIN + 8, y + 2);
        
        setFont('normal', 8.5, COLORS.dark);
        const descLines = doc.splitTextToSize(bug.description || 'Sem descrição', CONTENT_W - 24);
        
        let ty = y + 8;
        descLines.forEach(line => {
          checkPageBreak(6);
          doc.text(line, MARGIN + 8, ty);
          ty += 5;
        });
        y = ty + 2;

        if (bug.evidence_url) {
          const imgUrl = `http://localhost:8000${bug.evidence_url}`;
          const dataUrl = await loadImageAsDataUrl(imgUrl);
          if (dataUrl) {
            const imgType = getImageType(dataUrl);
            const dims = await getImageDimensions(dataUrl);
            if (dims.w > 0) {
              const maxW = CONTENT_W - 24;
              const maxH = 60;
              const ratio = Math.min(maxW / dims.w, maxH / dims.h, 1);
              const imgW = dims.w * ratio;
              const imgH = dims.h * ratio;
              checkPageBreak(imgH + 10);
              
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.3);
              doc.roundedRect(MARGIN + 12, y, imgW + 2, imgH + 2, 1, 1, 'S');
              doc.addImage(dataUrl, imgType, MARGIN + 13, y + 1, imgW, imgH);
              y += imgH + 6;
            }
          }
        }
        y += 4;
      }
    }

    y += 6;

    // Divider between test cases
    if (idx < sprints.length - 1) {
      checkPageBreak(4);
      doc.setDrawColor(...COLORS.light);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 8;
    }
  }

  // ─── FOOTER on each page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, 'F');
    setFont('normal', 7.5, COLORS.white);
    doc.text('QualiQA — ALM Onion', MARGIN, PAGE_H - 4);
    const pageText = `Página ${p} de ${totalPages}`;
    doc.text(pageText, PAGE_W - MARGIN - doc.getTextWidth(pageText), PAGE_H - 4);
  }

  // ─── SAVE ─────────────────────────────────────────────────────────────────
  const safeName = (project.name || 'projeto').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateTag = new Date().toISOString().split('T')[0];
  doc.save(`relatorio_${safeName}_${dateTag}.pdf`);
}
