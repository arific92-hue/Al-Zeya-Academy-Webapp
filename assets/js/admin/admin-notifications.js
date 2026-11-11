(async()=>{
  const studentSelect=document.getElementById('notificationStudents');
  const recent=document.getElementById('recentNotifications');
  const form=document.getElementById('notificationForm');
  const esc=window.AdminCore.escape;
  async function loadStudents(){
    const {data,error}=await supabaseClient.from('students').select('id,student_id,student_name').is('archived_at',null).order('student_name');
    if(error){AdminCore.toast('Unable to load students.','error');return;}
    studentSelect.innerHTML=(data||[]).map(s=>`<option value="${esc(s.id)}">${esc(s.student_name)} · ${esc(s.student_id)}</option>`).join('');
  }
  async function loadRecent(){
    const {data,error}=await supabaseClient.from('notifications').select('id,title,message,kind,created_at,students(student_name,student_id)').order('created_at',{ascending:false}).limit(20);
    if(error){recent.innerHTML='<div style="padding:18px;color:var(--ink-muted)">Unable to load notifications.</div>';return;}
    recent.innerHTML=(data||[]).length?(data||[]).map(n=>`<article style="padding:14px 0;border-bottom:1px solid rgba(8,21,46,.08)"><div style="display:flex;gap:8px;align-items:center"><strong>${esc(n.title)}</strong><span class="badge">${esc(n.kind||'general')}</span></div><div style="font-size:13px;line-height:1.6;margin-top:5px">${esc(n.message)}</div><div style="font-size:11px;color:var(--ink-muted);margin-top:5px">${esc(n.students?.student_name||'Student')} · ${new Date(n.created_at).toLocaleString('en-IN')}</div></article>`).join(''):'<div style="padding:18px;color:var(--ink-muted)">No notifications yet.</div>';
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const studentIds=[...studentSelect.selectedOptions].map(o=>o.value);
    if(!studentIds.length){AdminCore.toast('Select at least one student.','warning');return;}
    const title=document.getElementById('notificationTitle').value.trim();
    const message=document.getElementById('notificationMessage').value.trim();
    const kind=document.getElementById('notificationKind').value;
    const linkUrl=document.getElementById('notificationLink').value.trim()||null;
    const payload=studentIds.map(student_id=>({student_id,title,message,kind,link_url:linkUrl}));
    const {error}=await supabaseClient.from('notifications').insert(payload);
    if(error){AdminCore.toast(error.message,'error');return;}
    form.reset();
    await loadRecent();
    AdminCore.toast(`Notification sent to ${studentIds.length} student${studentIds.length===1?'':'s'}.`);
  });
  document.getElementById('refreshNotifications').addEventListener('click',loadRecent);
  if(await guardAdmin()){await loadStudents();await loadRecent();}
})();
