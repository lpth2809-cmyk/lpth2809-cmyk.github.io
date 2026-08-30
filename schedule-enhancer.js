(() => {
  const hourHeight = 72;
  const firstHour = 6;
  const lastHour = 23;
  const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOf = date => { const value = new Date(date); value.setDate(value.getDate() - ((value.getDay() + 6) % 7)); return value; };
  let weekStart = mondayOf(today);
  let timeStep = 1;

  const escape = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
  const minutes = time => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute; };
  const label = date => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
  const fullDate = date => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const readData = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('LopHocCaNhan');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['sessions', 'classrooms'], 'readonly');
      const sessions = tx.objectStore('sessions').getAll();
      const classrooms = tx.objectStore('classrooms').getAll();
      tx.oncomplete = () => resolve({ sessions: sessions.result, classrooms: classrooms.result });
      tx.onerror = () => reject(tx.error);
    };
  });
  const clearData = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('LopHocCaNhan');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['classrooms', 'sessions', 'payments'], 'readwrite');
      tx.objectStore('classrooms').clear(); tx.objectStore('sessions').clear(); tx.objectStore('payments').clear();
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    };
  });

  function enhanceSettings() {
    const page = document.querySelector('.data-page');
    if (!page || page.querySelector('#data-management-enhancer')) return;
    const cards = [...page.querySelectorAll('.data-card')];
    const exportCard = cards.find(card => card.textContent.includes('Xuất bản sao lưu'));
    const importCard = cards.find(card => card.textContent.includes('Nhập và phục hồi'));
    if (!exportCard || !importCard) return;
    exportCard.style.display = 'none'; importCard.style.display = 'none';
    const host = document.createElement('section');
    host.id = 'data-management-enhancer'; host.className = 'card data-management-card';
    host.innerHTML = `<div class="data-management-copy"><span>Quản lý dữ liệu</span><h2>Sao lưu, phục hồi và xóa dữ liệu</h2><p>Giữ dữ liệu lớp học của bạn an toàn và dễ quản lý.</p></div><button class="data-management-toggle">Mở quản lý dữ liệu</button><div class="data-management-actions" hidden><button data-tool="export">Xuất dữ liệu</button><button data-tool="import">Nhập dữ liệu</button><button data-tool="delete" class="danger">Xóa toàn bộ dữ liệu</button></div>`;
    exportCard.before(host);
    host.querySelector('.data-management-toggle').addEventListener('click', event => { const actions = host.querySelector('.data-management-actions'); actions.hidden = !actions.hidden; event.currentTarget.textContent = actions.hidden ? 'Mở quản lý dữ liệu' : 'Thu gọn'; });
    host.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', async () => {
      const tool = button.dataset.tool;
      if (tool === 'export') exportCard.querySelector('button')?.click();
      if (tool === 'import') importCard.querySelector('button')?.click();
      if (tool === 'delete') {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ lớp học, buổi học và dữ liệu thanh toán? Thao tác này không thể hoàn tác.')) return;
        button.disabled = true; button.textContent = 'Đang xóa…';
        try { await clearData(); location.reload(); } catch { button.disabled = false; button.textContent = 'Xóa toàn bộ dữ liệu'; alert('Không thể xóa dữ liệu. Hãy thử lại.'); }
      }
    }));
  }

  async function render() {
    enhanceSettings();
    const page = document.querySelector('.page');
    const nativeFilters = page?.querySelector('.schedule-filters');
    const nativeCard = page?.querySelector('.schedule-card');
    if (!page || !nativeFilters || !nativeCard) return;
    nativeFilters.style.display = 'none'; nativeCard.style.display = 'none';
    let host = page.querySelector('#schedule-enhancer');
    if (!host) { host = document.createElement('section'); host.id = 'schedule-enhancer'; host.className = 'card schedule-enhancer'; nativeFilters.before(host); }
    try {
      const { sessions, classrooms } = await readData();
      const classMap = new Map(classrooms.map(item => [item.id, item]));
      const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setDate(date.getDate() + index); return date; });
      const days = dates.map(date => {
        const dateValue = key(date);
        const raw = sessions.filter(item => item.date === dateValue && item.status !== 'rescheduled' && !item.rescheduledToId)
          .map(item => ({ ...item, start: minutes(item.startTime), end: minutes(item.startTime) + item.durationHours * 60 }));
        return raw.map(item => {
          const overlaps = raw.filter(other => other.id !== item.id && other.start < item.end && item.start < other.end)
            .map(other => ({ start: Math.max(item.start, other.start), end: Math.min(item.end, other.end) }))
            .sort((a, b) => a.start - b.start);
          const merged = overlaps.reduce((all, value) => { const previous = all[all.length - 1]; if (previous && value.start <= previous.end) previous.end = Math.max(previous.end, value.end); else all.push(value); return all; }, []);
          return { ...item, conflicts: merged };
        });
      });
      const weekEnd = dates[6];
      const dayHeaders = dates.map((date, index) => `<div class="week-day ${key(date) === key(today) ? 'is-today' : ''}"><span>${['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ nhật'][index]}</span><b>${label(date)}</b></div>`).join('');
      const pixelsPerHour = hourHeight / timeStep;
      const frameHeight = pixelsPerHour * timeStep;
      const gridHeight = (lastHour - firstHour) * pixelsPerHour;
      const hourLabels = Array.from({ length: Math.ceil((lastHour - firstHour) / timeStep) }, (_, index) => `<div class="week-hour" style="height:${frameHeight}px">${String(firstHour + index * timeStep).padStart(2, '0')}:00</div>`).join('');
      const lines = Array.from({ length: Math.ceil((lastHour - firstHour) / timeStep) }, () => `<div class="week-line" style="height:${frameHeight}px"></div>`).join('');
      const columns = days.map((items, index) => {
        const events = items.map(item => {
          const room = classMap.get(item.classId);
          const top = Math.max(0, (item.start - firstHour * 60) / 60 * pixelsPerHour);
          const height = Math.max(28, (item.end - item.start) / 60 * pixelsPerHour);
          const style = `top:${top}px;height:${height}px;left:3px;width:calc(100% - 6px);--class-color:${escape(room?.color || '#5b6fc7')}`;
          const conflicts = item.conflicts.map(conflict => `<i class="week-conflict" style="top:${(conflict.start - item.start) / (item.end - item.start) * 100}%;height:${(conflict.end - conflict.start) / (item.end - item.start) * 100}%"></i>`).join('');
          return `<article class="week-event ${item.conflicts.length ? 'has-conflict' : ''}" style="${style}">${conflicts}<b>${escape(room?.name || 'Lớp đã xóa')}</b></article>`;
        }).join('');
        return `<div class="week-column ${key(dates[index]) === key(today) ? 'is-today' : ''}"><div class="week-lines">${lines}</div>${events}</div>`;
      }).join('');
      host.innerHTML = `<div class="schedule-enhancer-head"><div><span>Thời gian biểu tuần</span><h2>${fullDate(weekStart)} – ${fullDate(weekEnd)}</h2></div><div class="week-controls"><button data-action="previous">← Tuần trước</button><button data-action="today" class="primary">Hôm nay</button><button data-action="next">Tuần sau →</button></div></div><div class="timetable-options" aria-label="Chọn khung giờ"><span>Khung giờ</span><button data-step="1" class="${timeStep === 1 ? 'active' : ''}">1 giờ</button><button data-step="2" class="${timeStep === 2 ? 'active' : ''}">2 giờ</button></div><div class="week-scroll"><div class="week-board"><div class="week-corner">Giờ</div><div class="week-heads">${dayHeaders}</div><div class="week-hours" style="height:${gridHeight}px">${hourLabels}</div><div class="week-columns" style="height:${gridHeight}px">${columns}</div></div></div>`;
      host.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.action; if (action === 'today') weekStart = mondayOf(today); else weekStart.setDate(weekStart.getDate() + (action === 'next' ? 7 : -7)); render(); }));
      host.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { timeStep = Number(button.dataset.step); render(); }));
    } catch (error) { host.innerHTML = '<p class="schedule-empty">Không thể tải thời gian biểu.</p>'; }
  }
  new MutationObserver(records => { if (records.some(record => !record.target.closest?.('#schedule-enhancer') && !record.target.closest?.('#data-management-enhancer'))) render(); }).observe(document.documentElement, { childList: true, subtree: true });
  render();
})();
