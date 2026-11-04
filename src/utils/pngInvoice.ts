type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  due_date?: string | null;
  completed_at?: string | null;
};

interface ExportOptions {
  title?: string;
  subtitle?: string;
  quality?: number; // 0.1 to 1.0, default 0.95
  scale?: number; // For high DPI, default 2
}

// Portrait format for A4-like documents
export function downloadTasksInvoicePngPortrait(
  filename: string, 
  rows: TaskRow[], 
  opts?: ExportOptions
) {
  if (!rows || rows.length === 0) return;

  const title = opts?.title || 'Weekly Task Invoice';
  const subtitle = opts?.subtitle || new Date().toLocaleString();
  const quality = opts?.quality || 0.95;
  const scale = opts?.scale || 2; // High DPI scaling

  // Portrait dimensions (A4-like)
  const width = 595; // A4 width in points
  const height = 842; // A4 height in points
  
  const cols = [
    { key: 'id', label: 'ID', x: 30, width: 60 },
    { key: 'title', label: 'Task Title', x: 100, width: 200 },
    { key: 'status', label: 'Status', x: 310, width: 80 },
    { key: 'priority', label: 'Priority', x: 400, width: 70 },
    { key: 'created_at', label: 'Created', x: 480, width: 100 },
  ] as const;

  const rowHeight = 20;
  const headerHeight = 120;
  const footerHeight = 40;
  const maxRowsPerPage = Math.floor((height - headerHeight - footerHeight) / rowHeight);
  const totalPages = Math.ceil(rows.length / maxRowsPerPage);

  // Create canvas with high DPI scaling
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Set high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textRenderingOptimization = 'optimizeQuality';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Header background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, 100);

  // Header text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TaskVision', 30, 35);

  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, 30, 60);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle, 30, 85);

  // Page number
  ctx.fillStyle = '#64748B';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Page 1 of ${totalPages}`, width - 30, 85);
  ctx.textAlign = 'left';

  // Table header background
  const tableHeaderY = headerHeight - 10;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, tableHeaderY, width, 25);

  // Table header text
  ctx.fillStyle = '#0F172A';
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  cols.forEach(col => {
    ctx.fillText(col.label, col.x, tableHeaderY + 16);
  });

  // Table body
  const visibleRows = rows.slice(0, maxRowsPerPage);
  visibleRows.forEach((row, i) => {
    const y = headerHeight + i * rowHeight;
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    
    // Row background
    ctx.fillStyle = bg;
    ctx.fillRect(0, y, width, rowHeight);

    // Row text
    ctx.fillStyle = '#0F172A';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    const cells = [
      row.id.slice(0, 6),
      row.title.length > 25 ? row.title.slice(0, 22) + '…' : row.title,
      row.status.replace('_', ' '),
      row.priority,
      new Date(row.created_at).toLocaleDateString(),
    ];

    cells.forEach((cell, cellIndex) => {
      ctx.fillText(cell, cols[cellIndex].x, y + 14);
    });
  });

  // Summary section
  const summaryY = headerHeight + visibleRows.length * rowHeight + 20;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, summaryY, width, 60);

  // Summary text
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Summary', 30, summaryY + 20);

  const completed = rows.filter(r => r.status === 'completed').length;
  const inProgress = rows.filter(r => r.status === 'in_progress').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const total = rows.length;

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Total Tasks: ${total}`, 30, summaryY + 35);
  ctx.fillText(`Completed: ${completed}`, 150, summaryY + 35);
  ctx.fillText(`In Progress: ${inProgress}`, 250, summaryY + 35);
  ctx.fillText(`Pending: ${pending}`, 350, summaryY + 35);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  ctx.fillText(`Completion Rate: ${completionRate}%`, 30, summaryY + 50);

  // Footer
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, height - footerHeight, width, footerHeight);

  ctx.fillStyle = '#64748B';
  ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Generated by TaskVision • ${new Date().toLocaleString()}`, 30, height - 15);

  // Convert to PNG and download
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png', quality);
}

// Landscape format for wide tables
export function downloadTasksInvoicePngLandscape(
  filename: string, 
  rows: TaskRow[], 
  opts?: ExportOptions
) {
  if (!rows || rows.length === 0) return;

  const title = opts?.title || 'Weekly Task Invoice';
  const subtitle = opts?.subtitle || new Date().toLocaleString();
  const quality = opts?.quality || 0.95;
  const scale = opts?.scale || 2;

  // Landscape dimensions
  const width = 842; // A4 landscape width
  const height = 595; // A4 landscape height
  
  const cols = [
    { key: 'id', label: 'ID', x: 24, width: 120 },
    { key: 'title', label: 'Title', x: 150, width: 320 },
    { key: 'status', label: 'Status', x: 480, width: 110 },
    { key: 'priority', label: 'Priority', x: 600, width: 90 },
    { key: 'created_at', label: 'Created', x: 700, width: 150 },
    { key: 'due_date', label: 'Due', x: 860, width: 150 },
  ] as const;

  const rowHeight = 24;
  const headerHeight = 140;
  const footerHeight = 60;
  const bodyHeight = rows.length * rowHeight;
  const totalHeight = headerHeight + bodyHeight + footerHeight;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  ctx.scale(scale, scale);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textRenderingOptimization = 'optimizeQuality';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, 110);

  // Header text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TaskVision', 24, 48);

  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, 24, 80);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(subtitle, 24, 102);

  // Table header background
  const tableHeaderY = headerHeight - 16;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, tableHeaderY, width, 32);

  // Table header text
  ctx.fillStyle = '#0F172A';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  cols.forEach(col => {
    ctx.fillText(col.label, col.x, tableHeaderY + 22);
  });

  // Table body
  rows.forEach((row, i) => {
    const y = headerHeight + i * rowHeight;
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    
    ctx.fillStyle = bg;
    ctx.fillRect(0, y, width, rowHeight);

    ctx.fillStyle = '#0F172A';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    const cells = [
      row.id.slice(0, 8),
      row.title.length > 36 ? row.title.slice(0, 33) + '…' : row.title,
      row.status.replace('_', ' '),
      row.priority,
      row.created_at,
      row.due_date || '',
    ];

    cells.forEach((cell, cellIndex) => {
      ctx.fillText(cell, cols[cellIndex].x, y + 16);
    });
  });

  // Footer
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, totalHeight - footerHeight, width, footerHeight);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Generated by TaskVision • ${new Date().toLocaleString()}`, 24, totalHeight - 24);

  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png', quality);
}
