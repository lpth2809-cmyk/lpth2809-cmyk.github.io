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
  let scheduleView = 'classic';

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
  function ensureScheduleStyle() {
    if (document.querySelector('#schedule-inline-style')) return;
    const style = document.createElement('style'); style.id = 'schedule-inline-style';
    style.textContent = '#schedule-enhancer{margin:0 0 18px!important;padding:18px 20px!important;min-height:0!important;background:#fff!important;border:1px solid #e6e9f0!important;border-radius:16px!important;box-shadow:none!important}.schedule-classic-heading{margin:0 0 12px!important}.schedule-classic-heading span,.schedule-enhancer-head span{display:block!important;color:#8f98aa!important;font-size:10px!important;font-weight:800!important;letter-spacing:.8px!important;text-transform:uppercase!important}.schedule-classic-heading h2,.schedule-enhancer-head h2{margin:4px 0 0!important;color:#29354b!important;font-size:17px!important;line-height:1.3!important}.schedule-view-toggle{display:inline-flex!important;gap:4px!important;width:auto!important;margin:0 0 14px!important;padding:4px!important;background:#f0f2f7!important;border-radius:10px!important}.schedule-view-toggle button{display:block!important;margin:0!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#718097!important;padding:7px 12px!important;font-size:12px!important;font-weight:750!important;line-height:1.2!important;cursor:pointer!important}.schedule-view-toggle button.active{background:#fff!important;color:#5064ba!important;box-shadow:0 1px 5px #202c4218!important}.schedule-enhancer-head{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:12px!important;margin-bottom:14px!important}.week-controls{display:flex!important;flex-wrap:wrap!important;gap:7px!important;width:100%!important}.week-controls button{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:34px!important;border:1px solid #dfe4ed!important;border-radius:9px!important;background:#fff!important;color:#647189!important;padding:7px 10px!important;font-size:11px!important;font-weight:750!important;white-space:nowrap!important;cursor:pointer!important}.week-controls button.primary{background:#5b6fc7!important;border-color:#5b6fc7!important;color:#fff!important}.timetable-options{display:flex!important;align-items:center!important;gap:7px!important;margin:0 0 14px!important}.timetable-options span{color:#939cab!important;font-size:10px!important;font-weight:800!important}.timetable-options button{border:0!important;border-radius:8px!important;background:#f0f2f7!important;color:#6e7b92!important;padding:7px 10px!important;font-size:11px!important;font-weight:750!important}.timetable-options button.active{background:#5b6fc7!important;color:#fff!important}.week-corner{color:#526078!important;background:#edf1f8!important;font-size:11px!important;font-weight:850!important}.week-heads{background:#f7f8fc!important}.week-day{background:#f7f8fc!important;border-color:#e4e8f0!important}.week-day span{color:#758198!important;font-size:10px!important;font-weight:800!important}.week-day b{color:#35425a!important;font-size:13px!important;font-weight:850!important}.week-day.is-today{background:#e9edff!important;box-shadow:inset 0 3px #5b6fc7!important}.week-hours{background:#f4f6fa!important}.week-hour{color:#5d6c86!important;border-color:#e1e6ef!important;font-size:11px!important;font-weight:850!important}.week-column{border-color:#e6eaf1!important}.week-event{font:inherit!important;text-align:left!important;cursor:pointer!important}.week-event:hover{filter:brightness(.97)!important}@media(max-width:560px){#schedule-enhancer{padding:16px!important}.week-controls button{flex:1!important}.schedule-view-toggle button{padding:7px 10px!important}}';
    document.head.append(style);
    const themeStyle = document.createElement('style');
    themeStyle.id = 'schedule-theme-style';
    themeStyle.textContent = `
      .theme-cute #schedule-enhancer{background:#fffdfa!important;border-color:#efddd3!important;border-radius:23px!important;box-shadow:0 10px 27px #704b3e12!important}
      .theme-cute .schedule-classic-heading h2,.theme-cute .schedule-enhancer-head h2{color:#4b3028!important}.theme-cute .schedule-classic-heading span,.theme-cute .schedule-enhancer-head span{color:#a2796b!important}.theme-cute .schedule-view-toggle{background:#f0e5ff!important}.theme-cute .schedule-view-toggle button.active{color:#735dab!important}.theme-cute .week-controls button.primary,.theme-cute .timetable-options button.active{background:#9a6396!important;border-color:#9a6396!important}.theme-cute .week-day.is-today{background:#e8e1ff!important;box-shadow:inset 0 3px #9a6396!important}.theme-cute #schedule-enhancer{position:relative!important;overflow:hidden!important;background:linear-gradient(125deg,#fffdfa,#fff1ea 56%,#eee8ff)!important}.theme-cute #schedule-enhancer:after{content:'✿  ✦  ♡'!important;position:absolute!important;right:24px!important;top:18px!important;color:#d597b0!important;letter-spacing:7px!important;font-size:16px!important;opacity:.7!important}.theme-cute .schedule-classic-heading,.theme-cute .schedule-enhancer-head{position:relative!important;z-index:1!important}.theme-cute .week-scroll{border-color:#f1ded7!important;border-radius:15px!important}.theme-cute .week-day{background:#fff9f6!important;border-color:#f1e2dc!important}.theme-cute .week-hour{color:#9e7580!important;background:#fffaf7!important;border-color:#f1e5df!important}.theme-cute .week-column{border-color:#f2e6e0!important}.theme-cute .week-event{border:1px solid #fff!important;box-shadow:0 4px 10px #bc79852b!important;border-radius:11px!important}.theme-cute .week-conflict{background:#ffd6d9!important;border-color:#f2aeb7!important}
      .theme-notebook #schedule-enhancer{background:#fffdf8!important;border-color:#e0d4c5!important;border-radius:15px!important;box-shadow:0 9px 23px #67523a12!important;position:relative!important;overflow:hidden!important}.theme-notebook #schedule-enhancer:after{content:'✎  ✦  notes'!important;position:absolute!important;right:23px!important;top:18px!important;color:#b29276!important;font-family:Georgia,serif!important;font-size:14px!important;font-style:italic!important;letter-spacing:4px!important;transform:rotate(-7deg)!important}.theme-notebook .schedule-classic-heading,.theme-notebook .schedule-enhancer-head{position:relative!important;z-index:1!important}.theme-notebook .schedule-classic-heading h2,.theme-notebook .schedule-enhancer-head h2{color:#293a5b!important}.theme-notebook .schedule-classic-heading span,.theme-notebook .schedule-enhancer-head span{color:#9a806a!important}.theme-notebook .schedule-view-toggle{background:#f4ebde!important}.theme-notebook .schedule-view-toggle button.active{color:#49677f!important}.theme-notebook .week-controls button.primary,.theme-notebook .timetable-options button.active{background:#567590!important;border-color:#567590!important}.theme-notebook .week-day.is-today{background:#e8efdf!important;box-shadow:inset 0 3px #87af97!important}.theme-notebook .week-scroll{border-color:#dfd0bd!important;border-radius:8px!important}.theme-notebook .week-day{background:#fffaf3!important;border-color:#e8dccd!important}.theme-notebook .week-hour{color:#806c5a!important;background:#faf4eb!important;border-color:#eadfce!important}.theme-notebook .week-column{border-color:#e9ded0!important}.theme-notebook .week-event{border:1px solid #fffaf0!important;border-radius:5px!important;box-shadow:2px 2px 0 #d8c4ac!important}.theme-notebook .week-conflict{background:#f6d9d5!important;border-color:#d99c94!important}
      .theme-pixel #schedule-enhancer{background:#172746!important;border:2px solid #5677a8!important;border-radius:7px!important;box-shadow:inset 0 0 0 2px #0b1530!important;position:relative!important;overflow:hidden!important}.theme-pixel #schedule-enhancer:after{content:'WEEKLY QUEST  + XP'!important;position:absolute!important;right:22px!important;top:19px!important;color:#f3c96e!important;font:10px monospace!important;letter-spacing:1px!important;text-shadow:2px 2px #0b1530!important}.theme-pixel .schedule-classic-heading,.theme-pixel .schedule-enhancer-head{position:relative!important;z-index:1!important}.theme-pixel .schedule-classic-heading h2,.theme-pixel .schedule-enhancer-head h2{color:#f3f6ff!important}.theme-pixel .schedule-classic-heading span,.theme-pixel .schedule-enhancer-head span{color:#aec2e4!important}.theme-pixel .schedule-view-toggle{background:#243960!important}.theme-pixel .schedule-view-toggle button{color:#d6e2fa!important}.theme-pixel .schedule-view-toggle button.active{background:#365b93!important;color:#fff1bd!important}.theme-pixel .week-controls button{color:#d6e2fa!important;background:#243960!important;border-color:#5e80b2!important}.theme-pixel .week-controls button.primary,.theme-pixel .timetable-options button.active{background:#cd8b3e!important;border-color:#ffe5a0!important;color:#2a1b13!important}.theme-pixel .week-heads,.theme-pixel .week-day{background:#1f3458!important;border-color:#476796!important}.theme-pixel .week-day span{color:#aec2e4!important}.theme-pixel .week-day b{color:#f3f6ff!important}.theme-pixel .week-day.is-today{background:#365b93!important;box-shadow:inset 0 3px #f0bd62!important}.theme-pixel .week-hours{background:#172746!important}.theme-pixel .week-hour{color:#d6e2fa!important;border-color:#31496e!important}.theme-pixel .week-column{border-color:#31496e!important}.theme-pixel .week-scroll{border:2px solid #3e6092!important;border-radius:4px!important;box-shadow:3px 3px 0 #0b1530!important}.theme-pixel .week-event{border:1px solid #b4d3ff!important;border-radius:3px!important;box-shadow:2px 2px 0 #091127!important}.theme-pixel .week-conflict{background:#873e52!important;border-color:#ff9b9b!important}
    `;
    document.head.append(themeStyle);
  }

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
    ensureScheduleStyle();
    enhanceSettings();
    const page = document.querySelector('.page');
    const nativeFilters = page?.querySelector('.schedule-filters');
    const nativeCard = page?.querySelector('.schedule-card');
    if (!page || !nativeFilters || !nativeCard) return;
    let host = page.querySelector('#schedule-enhancer');
    if (!host) { host = document.createElement('section'); host.id = 'schedule-enhancer'; host.className = 'schedule-enhancer'; nativeFilters.before(host); }
    const renderViewToggle = () => `<div class="schedule-view-toggle"><button data-view="classic" class="${scheduleView === 'classic' ? 'active' : ''}">Danh sách</button><button data-view="timetable" class="${scheduleView === 'timetable' ? 'active' : ''}">Thời gian biểu</button></div>`;
    if (scheduleView === 'classic') {
      nativeFilters.style.display = ''; nativeCard.style.display = '';
      host.innerHTML = `<div class="schedule-classic-heading"><span>Lịch học</span><h2>Xem theo danh sách</h2></div>${renderViewToggle()}`;
      host.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { scheduleView = button.dataset.view; render(); }));
      return;
    }
    nativeFilters.style.display = 'none'; nativeCard.style.display = 'none';
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
          return `<button type="button" data-session-id="${item.id}" class="week-event ${item.conflicts.length ? 'has-conflict' : ''}" style="${style}">${conflicts}<b>${escape(room?.name || 'Lớp đã xóa')}</b></button>`;
        }).join('');
        return `<div class="week-column ${key(dates[index]) === key(today) ? 'is-today' : ''}"><div class="week-lines">${lines}</div>${events}</div>`;
      }).join('');
      host.innerHTML = `<div class="schedule-enhancer-head"><div><span>Thời gian biểu tuần</span><h2>${fullDate(weekStart)} – ${fullDate(weekEnd)}</h2></div><div class="week-controls"><button data-action="previous">← Tuần trước</button><button data-action="today" class="primary">Hôm nay</button><button data-action="next">Tuần sau →</button></div></div>${renderViewToggle()}<div class="timetable-options" aria-label="Chọn khung giờ"><span>Khung giờ</span><button data-step="1" class="${timeStep === 1 ? 'active' : ''}">1 giờ</button><button data-step="2" class="${timeStep === 2 ? 'active' : ''}">2 giờ</button></div><div class="week-scroll"><div class="week-board"><div class="week-corner">Giờ</div><div class="week-heads">${dayHeaders}</div><div class="week-hours" style="height:${gridHeight}px">${hourLabels}</div><div class="week-columns" style="height:${gridHeight}px">${columns}</div></div></div>`;
      const switcher = host.querySelector('.schedule-view-toggle');
      const options = host.querySelector('.timetable-options');
      switcher.style.cssText = 'display:flex;align-items:center;gap:4px;width:max-content;margin:0 0 14px;padding:4px;background:#f0f2f7;border-radius:10px;clear:both';
      options.style.cssText = 'display:flex;align-items:center;gap:7px;margin:0 0 14px;padding:0;min-height:34px;clear:both';
      host.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.action; if (action === 'today') weekStart = mondayOf(today); else weekStart.setDate(weekStart.getDate() + (action === 'next' ? 7 : -7)); render(); }));
      host.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { timeStep = Number(button.dataset.step); render(); }));
      host.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { scheduleView = button.dataset.view; render(); }));
      host.querySelectorAll('[data-session-id]').forEach(button => button.addEventListener('click', () => {
        const session = sessions.find(item => item.id === button.dataset.sessionId);
        const room = classMap.get(session?.classId);
        const row = [...nativeCard.querySelectorAll('.session-row')].find(item => item.querySelector('.session-time strong')?.textContent === session?.startTime && item.querySelector('.session-main strong')?.textContent === room?.name);
        row?.querySelectorAll('button.icon-btn')[0]?.click();
      }));
    } catch (error) { host.innerHTML = '<p class="schedule-empty">Không thể tải thời gian biểu.</p>'; }
  }
  new MutationObserver(records => { if (records.some(record => !record.target.closest?.('#schedule-enhancer') && !record.target.closest?.('#data-management-enhancer'))) render(); }).observe(document.documentElement, { childList: true, subtree: true });
  render();
})();
