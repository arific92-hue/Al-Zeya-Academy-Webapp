async function guardAdmin(){return window.AdminCore.requireAdmin();}
(async()=>{
 if(!await guardAdmin()) return;
 const rowsEl=document.getElementById('studentRows'), noteEl=document.getElementById('resultNote');
 const search=document.getElementById('studentSearch'), courseFilter=document.getElementById('courseFilter');
 const modal=document.getElementById('studentModal'), detailEl=document.getElementById('studentDetail');
 const addModal=document.getElementById('addStudentModal'), addForm=document.getElementById('addStudentForm');
 const addStatus=document.getElementById('addStudentStatus'), saveStudentBtn=document.getElementById('saveStudentBtn');
 let students=[];
 const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 const money=(n)=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
 const dateText=(v)=>v?new Date(`${v}T00:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
 function populateCourseFilter(){ const current=courseFilter.value; const set=[...new Set(students.map(s=>s.course).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); courseFilter.innerHTML='<option value="">All courses</option>'+set.map(c=>`<option>${esc(c)}</option>`).join(''); courseFilter.value=set.includes(current)?current:''; }
 async function populateCourseSuggestions(){
   const list=document.getElementById('addStudentCourse');
   if(!list) return;
   const current=String(list.value||'');
   const {data}=await supabaseClient.from('courses').select('name').order('name',{ascending:true});
   const names=[...(data||[]).map(c=>c.name), ...students.map(s=>s.course).filter(Boolean)];
   const unique=[...new Set(names.map(v=>String(v).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
   list.innerHTML='<option value="">Select class / course</option>'+unique.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
   if(unique.includes(current)) list.value=current;
 }
 function render(){
   const q=(search.value||'').trim().toLowerCase(), course=courseFilter.value;
   const filtered=students.filter(s=>{const hay=[s.student_name,s.student_id,s.guardian_name,s.mobile,s.course,s.email].join(' ').toLowerCase(); return (!q||hay.includes(q))&&(!course||s.course===course)});
   noteEl.textContent=`${filtered.length} of ${students.length} enrolled student${students.length===1?'':'s'}`;
   if(!filtered.length){rowsEl.innerHTML='<tr><td colspan="8" class="empty-cell">No enrolled student matches the selected filters.</td></tr>';return}
   rowsEl.innerHTML=filtered.map(s=>`<tr><td><div class="cell-title">${esc(s.student_name)}</div><div class="cell-sub">DOB: ${esc(dateText(s.dob))}</div></td><td><span class="pill">${esc(s.student_id)}</span></td><td>${esc(s.guardian_name)}</td><td>${esc(s.mobile)}<div class="cell-sub">${esc(s.email||'')}</div></td><td>${esc(s.course||'Not specified')}</td><td>${money(s.monthly_fee)}</td><td>${esc(dateText(s.enrolled_on||s.created_at?.slice(0,10)))}</td><td><div class="student-row-actions"><button class="table-btn view-student" data-id="${esc(s.id)}">View</button><button class="table-btn edit-student" data-id="${esc(s.id)}">Edit</button></div></td></tr>`).join('');
   document.querySelectorAll('.view-student').forEach(btn=>btn.addEventListener('click',()=>openStudent(btn.dataset.id)));
   document.querySelectorAll('.edit-student').forEach(btn=>btn.addEventListener('click',()=>openEditStudent(btn.dataset.id)));
 }
 function openStudent(id){const s=students.find(x=>x.id===id); if(!s)return; document.getElementById('modalStudentId').textContent=s.student_id; detailEl.innerHTML=`<div class="detail-grid">
   <div class="detail-item"><div class="detail-label">Student Name</div><div class="detail-value">${esc(s.student_name)}</div></div>
   <div class="detail-item"><div class="detail-label">Father / Guardian</div><div class="detail-value">${esc(s.guardian_name)}</div></div>
   <div class="detail-item"><div class="detail-label">Contact Number</div><div class="detail-value">${esc(s.mobile)}</div></div>
   <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${esc(s.email||'—')}</div></div>
   <div class="detail-item"><div class="detail-label">Course</div><div class="detail-value">${esc(s.course||'Not specified')}</div></div>
   <div class="detail-item"><div class="detail-label">Monthly Course Fee</div><div class="detail-value">${money(s.monthly_fee)}</div></div>
   <div class="detail-item"><div class="detail-label">Date of Birth</div><div class="detail-value">${esc(dateText(s.dob))}</div></div>
   <div class="detail-item"><div class="detail-label">Admission Year</div><div class="detail-value">${esc(s.admission_year||'—')}</div></div>
   <div class="detail-item"><div class="detail-label">City / District</div><div class="detail-value">${esc(s.city)}</div></div>
   <div class="detail-item"><div class="detail-label">State</div><div class="detail-value">${esc(s.state)}</div></div>
   <div class="detail-item full"><div class="detail-label">Address</div><div class="detail-value">${esc(s.address)}</div></div>
   <div class="detail-item full"><div class="detail-label">Additional Note</div><div class="detail-value">${esc(s.note||'—')}</div></div>
 </div>
 <div class="credentials-panel">
   <h3>Student Portal Login</h3>
   <div class="credentials-help">Change the username and/or password used by this student to access the Student Portal. Leave the password field blank to keep the current password.</div>
   <div class="credential-grid">
     <div class="credential-field"><label for="portalUsername">Username</label><input id="portalUsername" type="text" value="${esc(s.portal_username||'')}" autocomplete="off"></div>
     <div class="credential-field"><label for="portalPassword">New Password</label><input id="portalPassword" type="password" placeholder="Enter new password" autocomplete="new-password"></div>
   </div>
   <div class="credential-actions"><button type="button" class="btn btn-primary" id="savePortalCredentials">Save Portal Login</button></div>
   <div class="credential-status" id="credentialStatus"></div>
 </div>`;
 document.getElementById('openFeesBtn').href=`admin-fees.html?student=${encodeURIComponent(s.id)}`;
 document.getElementById('openMarksBtn').href=`admin-marks.html?student=${encodeURIComponent(s.id)}`;
 document.getElementById('deleteStudentBtn').onclick=()=>deleteStudent(s.id,s.student_name);
 document.getElementById('savePortalCredentials').onclick=()=>savePortalCredentials(s.id);
 document.getElementById('editFromProfileBtn')?.addEventListener('click',()=>openEditStudent(s.id));
 document.getElementById('promoteStudentBtn')?.addEventListener('click',()=>openPromotion(s.id));
 document.getElementById('viewHistoryBtn')?.addEventListener('click',()=>openHistory(s.id));
 void loadPromotionPreview(s.id);
 modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
 function close(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
 function openAddStudent(){
   addForm.reset();
   const enrolled=document.getElementById('addEnrolledOn'); if(enrolled) enrolled.value=new Date().toISOString().slice(0,10);
   const year=document.getElementById('addAdmissionYear'); if(year && !year.value) year.value='2026–27';
   addStatus.textContent=''; addStatus.className='add-student-status';
   saveStudentBtn.disabled=false; saveStudentBtn.textContent='Add Student';
   addModal.classList.add('open'); addModal.setAttribute('aria-hidden','false');
   setTimeout(()=>document.getElementById('addStudentName')?.focus(),30);
 }
 function closeAddStudent(){addModal.classList.remove('open');addModal.setAttribute('aria-hidden','true')}
 function showAddStatus(message,error=false){addStatus.textContent=message;addStatus.className=`add-student-status show${error?' error':''}`}
 function formPayload(){
   const get=id=>(document.getElementById(id)?.value||'').trim();
   return {
     student_name:get('addStudentName'), course:get('addStudentCourse'), guardian_name:get('addGuardianName'), mobile:get('addMobile'),
     email:get('addEmail'), dob:get('addDob'), city:get('addCity'), state:get('addState'), address:get('addAddress'), note:get('addNote'),
     monthly_fee:get('addMonthlyFee'), admission_year:get('addAdmissionYear'), enrolled_on:get('addEnrolledOn'),
     portal_username:get('addPortalUsername'), portal_password:document.getElementById('addPortalPassword')?.value||''
   };
 }
 async function addStudent(event){
   event.preventDefault();
   const payload=formPayload();
   if(!payload.student_name){showAddStatus('Student name is required.',true);document.getElementById('addStudentName')?.focus();return;}
   if(!payload.course){showAddStatus('Class / course is required.',true);document.getElementById('addStudentCourse')?.focus();return;}
   if(payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)){showAddStatus('Please enter a valid email address or leave it blank.',true);return;}
   if(payload.monthly_fee && Number(payload.monthly_fee)<0){showAddStatus('Monthly fee cannot be negative.',true);return;}
   saveStudentBtn.disabled=true; saveStudentBtn.textContent='Adding Student…'; showAddStatus('Creating student record…');
   try{
     const {data,error}=await supabaseClient.rpc('admin_add_student',{p_student:payload});
     if(error) throw error;
     const st=data?.student||{};
     showAddStatus(`Student added successfully. ${st.student_id?`Student ID: ${st.student_id}.`:''}`);
     await load();
     await populateCourseSuggestions();
     setTimeout(closeAddStudent,700);
   }catch(error){
     showAddStatus(error.message||'Unable to add student.',true);
   }finally{
     saveStudentBtn.disabled=false; saveStudentBtn.textContent='Add Student';
   }
 }
 async function savePortalCredentials(id){const username=(document.getElementById('portalUsername')?.value||'').trim(); const password=document.getElementById('portalPassword')?.value||''; const status=document.getElementById('credentialStatus'); if(!username){status.textContent='Username is required.';status.className='credential-status error';return;} status.textContent='Saving…';status.className='credential-status'; const {error}=await supabaseClient.rpc('admin_update_student_portal_credentials',{p_student_uuid:id,p_username:username,p_password:password||null}); if(error){status.textContent=`Could not save portal login. ${error.message}`;status.className='credential-status error';return;} const s=students.find(x=>x.id===id); if(s)s.portal_username=username; document.getElementById('portalPassword').value=''; status.textContent='Student portal login updated successfully.';}
 async function openEditStudent(id){
   const s=students.find(x=>x.id===id); if(!s)return;
   const form=document.getElementById('editStudentForm'); form.dataset.studentId=s.id;
   const set=(fieldId,value)=>{const el=document.getElementById(fieldId);if(el)el.value=value??'';};
   set('editStudentName',s.student_name); set('editGuardianName',s.guardian_name); set('editMobile',s.mobile); set('editEmail',s.email);
   set('editDob',s.dob); set('editCity',s.city); set('editState',s.state); set('editMonthlyFee',s.monthly_fee ?? '');
   set('editAdmissionYear',s.admission_year); set('editEnrolledOn',s.enrolled_on || s.created_at?.slice(0,10)); set('editAddress',s.address); set('editNote',s.note);
   const course=document.getElementById('editStudentCourse'), currentCourse=String(s.course||'').trim();
   const status=document.getElementById('editStudentStatus'); status.textContent=''; status.className='edit-student-status';
   course.innerHTML='<option value="">Loading courses…</option>';
   try{
     const {data,error}=await supabaseClient.from('courses').select('name').order('name',{ascending:true});
     if(error)throw error;
     const names=[...(data||[]).map(c=>c.name), ...students.map(x=>x.course).filter(Boolean)];
     const unique=[...new Set(names.map(v=>String(v).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
     course.innerHTML='<option value="">Select class / course</option>'+unique.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
     if(unique.includes(currentCourse)) course.value=currentCourse;
   }catch(error){course.innerHTML='<option value="">Unable to load courses</option>';showEditStatus(error.message||'Unable to load courses.',true);return;}
   const button=document.getElementById('saveEditStudentBtn'); button.disabled=false; button.textContent='Save Changes';
   const editModal=document.getElementById('editStudentModal'); editModal.classList.add('open'); editModal.setAttribute('aria-hidden','false');
   setTimeout(()=>document.getElementById('editStudentName')?.focus(),30);
 }
 function closeEditStudent(){const editModal=document.getElementById('editStudentModal');editModal.classList.remove('open');editModal.setAttribute('aria-hidden','true');}
 function showEditStatus(message,error=false){const el=document.getElementById('editStudentStatus');el.textContent=message;el.className=`edit-student-status show${error?' error':''}`;}
 function editPayload(){
   const get=id=>(document.getElementById(id)?.value||'').trim();
   return {student_name:get('editStudentName'),course:get('editStudentCourse'),guardian_name:get('editGuardianName'),mobile:get('editMobile'),email:get('editEmail'),dob:get('editDob'),city:get('editCity'),state:get('editState'),address:get('editAddress'),note:get('editNote'),monthly_fee:get('editMonthlyFee'),admission_year:get('editAdmissionYear'),enrolled_on:get('editEnrolledOn')};
 }
 async function saveEditedStudent(event){
   event.preventDefault();
   const form=document.getElementById('editStudentForm'), id=form.dataset.studentId, payload=editPayload();
   if(!id){showEditStatus('Student record could not be identified.',true);return;}
   if(!payload.student_name){showEditStatus('Student name is required.',true);document.getElementById('editStudentName')?.focus();return;}
   if(!payload.course){showEditStatus('Class / course is required.',true);document.getElementById('editStudentCourse')?.focus();return;}
   if(payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)){showEditStatus('Please enter a valid email address or leave it blank.',true);return;}
   if(payload.monthly_fee && Number(payload.monthly_fee)<0){showEditStatus('Monthly fee cannot be negative.',true);return;}
   const button=document.getElementById('saveEditStudentBtn'); button.disabled=true; button.textContent='Saving…'; showEditStatus('Updating student record…');
   try{
     const {error}=await supabaseClient.rpc('admin_update_student',{p_student_uuid:id,p_student:payload});
     if(error)throw error;
     await load();
     await populateCourseSuggestions();
     closeEditStudent();
     if(students.some(x=>x.id===id))openStudent(id);
   }catch(error){showEditStatus(error.message||'Unable to update student.',true);}
   finally{button.disabled=false;button.textContent='Save Changes';}
 }
 
 async function loadPromotionPreview(id){
   const btn=document.getElementById('promoteStudentBtn'); if(!btn)return;
   btn.disabled=true; btn.style.display='none';
   try{
     const {data,error}=await supabaseClient.rpc('admin_get_student_promotion_preview',{p_student_uuid:id});
     if(error)throw error;
     if(data?.eligible){btn.style.display='inline-flex';btn.disabled=false;btn.textContent=`Promote to ${data.next_course}`;}
   }catch(error){console.warn('Promotion preview unavailable:',error?.message||error);}
 }
 async function openPromotion(id){
   const s=students.find(x=>x.id===id); if(!s)return;
   const promotionModal=document.getElementById('promotionModal'), detail=document.getElementById('promotionDetail'), status=document.getElementById('promotionStatus'), note=document.getElementById('promotionNote'), confirmBtn=document.getElementById('confirmPromotionBtn');
   detail.innerHTML='<div class="empty-cell">Loading promotion details…</div>'; status.textContent='';status.className='add-student-status';note.value='';confirmBtn.disabled=true;confirmBtn.textContent='Confirm Promotion';
   promotionModal.classList.add('open');promotionModal.setAttribute('aria-hidden','false');
   try{
     const {data,error}=await supabaseClient.rpc('admin_get_student_promotion_preview',{p_student_uuid:id}); if(error)throw error;
     if(!data?.eligible){detail.innerHTML=`<div class="promotion-warning">${esc(data?.reason||'This student is not eligible for promotion.')}</div>`;return;}
     detail.innerHTML=`<div class="promotion-summary"><div class="promotion-box"><div class="label">Current</div><strong>${esc(data.current_course)}</strong><div class="history-meta"><span>${esc(data.academic_year)}</span><span>Fee: ${money(data.current_monthly_fee)}</span></div></div><div class="promotion-arrow">→</div><div class="promotion-box"><div class="label">Next Class</div><strong>${esc(data.next_course)}</strong><div class="history-meta"><span>${esc(data.next_academic_year)}</span><span>Fee: ${money(data.next_monthly_fee)}</span></div></div></div><div class="promotion-warning">${esc(s.student_name)} (${esc(s.student_id)}) will keep the same permanent Student ID and portal account. The completed ${esc(data.academic_year)} record will be archived and the new academic enrollment will become active.</div>`;
     confirmBtn.disabled=false; confirmBtn.onclick=()=>confirmPromotion(id,data);
   }catch(error){detail.innerHTML=`<div class="promotion-warning">Could not load promotion details. ${esc(error.message||'Please try again.')}</div>`;}
 }
 function closePromotion(){const el=document.getElementById('promotionModal');el.classList.remove('open');el.setAttribute('aria-hidden','true');}
 async function confirmPromotion(id,preview){
   const btn=document.getElementById('confirmPromotionBtn'),status=document.getElementById('promotionStatus'); if(!btn)return;
   btn.disabled=true;btn.textContent='Promoting…';status.textContent='Completing current year and creating the next enrollment…';status.className='add-student-status show';
   try{
     const note=(document.getElementById('promotionNote')?.value||'').trim();
     const {data,error}=await supabaseClient.rpc('admin_promote_student',{p_student_uuid:id,p_notes:note||null}); if(error)throw error;
     await load(); await populateCourseSuggestions(); closePromotion();
     const st=students.find(x=>x.id===id); if(st)openStudent(id);
   }catch(error){status.textContent=error.message||'Unable to promote student.';status.className='add-student-status show error';btn.disabled=false;btn.textContent='Confirm Promotion';}
 }
 function historyTable(rows,fields,empty='No records'){
   if(!rows?.length)return `<div class="modal-subtle" style="margin-top:8px">${empty}</div>`;
   const head=fields.map(f=>`<th>${esc(f.label)}</th>`).join('');
   const body=rows.map(r=>`<tr>${fields.map(f=>`<td>${esc(f.value(r))}</td>`).join('')}</tr>`).join('');
   return `<div class="table-wrap"><table class="history-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
 }
 async function openHistory(id){
   const modalEl=document.getElementById('historyModal'),detail=document.getElementById('historyDetail');
   detail.innerHTML='<div class="empty-cell">Loading academic history…</div>';modalEl.classList.add('open');modalEl.setAttribute('aria-hidden','false');
   try{
     const {data,error}=await supabaseClient.rpc('admin_get_student_academic_history',{p_student_uuid:id});if(error)throw error;
     const history=data?.history||[]; if(!history.length){detail.innerHTML='<div class="empty-cell">No academic history is available yet.</div>';return;}
     detail.innerHTML=`<div class="history-list">${history.map(item=>{const e=item.enrollment||{},fees=item.fees||[],marks=item.marks||[],attendance=item.attendance||[],isCurrent=e.status==='active';const archive=item.archive||{};return `<div class="history-card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3>${esc(e.course_name||'Course')}</h3><div class="history-meta"><span>${esc(e.academic_year||'—')}</span><span>${isCurrent?'CURRENT':'COMPLETED'}</span><span>Enrolled: ${esc(dateText(e.enrolled_on))}</span>${e.ended_on?`<span>Ended: ${esc(dateText(e.ended_on))}</span>`:''}</div></div><span class="pill">${isCurrent?'Active':'Archived'}</span></div><div class="history-grid"><div class="history-stat"><span>Fees</span><strong>${fees.length} record${fees.length===1?'':'s'}</strong></div><div class="history-stat"><span>Mark Records</span><strong>${marks.length}</strong></div><div class="history-stat"><span>Attendance</span><strong>${attendance.length}</strong></div></div>${archive.profile?`<details class="history-details"><summary>Student profile recorded for this year</summary><div class="history-meta" style="margin-top:8px"><span>Name: ${esc(archive.profile.student_name||'—')}</span><span>Guardian: ${esc(archive.profile.guardian_name||'—')}</span><span>Course: ${esc(archive.profile.course_name||e.course_name||'—')}</span><span>Monthly fee: ${money(archive.profile.monthly_fee)}</span></div></details>`:''}<details class="history-details"><summary>View Fee Records</summary>${historyTable(fees,[{label:'Month',value:r=>dateText(r.month_date)},{label:'Due',value:r=>money(r.amount_due)},{label:'Paid',value:r=>money(r.amount_paid)},{label:'Status',value:r=>r.status||'—'},{label:'Paid On',value:r=>dateText(r.paid_on)}])}</details><details class="history-details"><summary>View Marksheet Records</summary>${historyTable(marks,[{label:'Assessment',value:r=>r.assessment_name||'—'},{label:'Subject',value:r=>r.subject||'—'},{label:'Marks',value:r=>r.marks_obtained==null?'—':r.marks_obtained},{label:'Maximum',value:r=>r.max_marks??'—'},{label:'Exam Date',value:r=>dateText(r.exam_date)},{label:'Remarks',value:r=>r.remarks||'—'}])}</details><details class="history-details"><summary>View Attendance Records</summary>${historyTable(attendance,[{label:'Date',value:r=>dateText(r.class_date)},{label:'Status',value:r=>r.status||'—'},{label:'Notes',value:r=>r.notes||'—'}])}</details></div>`}).join('')}</div>`;
   }catch(error){detail.innerHTML=`<div class="empty-cell">Could not load academic history. ${esc(error.message||'Please try again.')}</div>`;}
 }
 function closeHistory(){const el=document.getElementById('historyModal');el.classList.remove('open');el.setAttribute('aria-hidden','true');}
 async function deleteStudent(id,name){if(!confirm(`Delete ${name} permanently? This will remove the student record, admission record, fees, marks, portal account, and active portal sessions.`))return; const {error}=await supabaseClient.rpc('admin_delete_student',{p_student_uuid:id}); if(error){alert(`Could not delete student. ${error.message}`);return;} close(); await load();}
 async function load(){noteEl.textContent='Loading accepted students…'; rowsEl.innerHTML='<tr><td colspan="8" class="empty-cell">Loading student data…</td></tr>'; const {data,error}=await supabaseClient.from('students').select('*').is('archived_at',null).order('student_name',{ascending:true}); if(error){rowsEl.innerHTML=`<tr><td colspan="8" class="empty-cell">Could not load student data. ${esc(error.message)}</td></tr>`; return;} students=data||[]; const {data:accounts,error:accountError}=await supabaseClient.rpc('admin_student_portal_credentials'); if(!accountError&&Array.isArray(accounts)){const byStudent=new Map(accounts.map(a=>[a.student_id,a.username])); students=students.map(s=>({...s,portal_username:byStudent.get(s.id)||''}));} populateCourseFilter(); document.getElementById('studentCount').textContent=students.length; document.getElementById('courseCount').textContent=new Set(students.map(s=>s.course).filter(Boolean)).size; document.getElementById('monthlyFeeTotal').textContent=money(students.reduce((a,s)=>a+Number(s.monthly_fee||0),0)); const latest=[...students].sort((a,b)=>new Date(b.enrolled_on||b.created_at)-new Date(a.enrolled_on||a.created_at))[0]; document.getElementById('latestAdmission').textContent=latest?dateText(latest.enrolled_on||latest.created_at?.slice(0,10)):'—'; render(); }
 search.addEventListener('input',render); courseFilter.addEventListener('change',render); document.getElementById('refreshStudents').addEventListener('click',load); document.getElementById('closeStudentModal').addEventListener('click',close); modal.addEventListener('click',e=>{if(e.target===modal)close()});
 document.getElementById('closePromotionModal').addEventListener('click',closePromotion); document.getElementById('cancelPromotion').addEventListener('click',closePromotion); document.getElementById('promotionModal').addEventListener('click',e=>{if(e.target===document.getElementById('promotionModal'))closePromotion()}); document.getElementById('closeHistoryModal').addEventListener('click',closeHistory); document.getElementById('historyModal').addEventListener('click',e=>{if(e.target===document.getElementById('historyModal'))closeHistory()});
 const editModal=document.getElementById('editStudentModal'); document.getElementById('closeEditStudentModal').addEventListener('click',closeEditStudent); document.getElementById('cancelEditStudent').addEventListener('click',closeEditStudent); editModal.addEventListener('click',e=>{if(e.target===editModal)closeEditStudent()}); document.getElementById('editStudentForm').addEventListener('submit',saveEditedStudent);
 document.getElementById('addStudentBtn').addEventListener('click',openAddStudent);
 document.getElementById('closeAddStudentModal').addEventListener('click',closeAddStudent);
 document.getElementById('cancelAddStudent').addEventListener('click',closeAddStudent);
 addModal.addEventListener('click',e=>{if(e.target===addModal)closeAddStudent()});
 addForm.addEventListener('submit',addStudent);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('historyModal').classList.contains('open'))closeHistory();else if(document.getElementById('promotionModal').classList.contains('open'))closePromotion();else if(document.getElementById('editStudentModal').classList.contains('open'))closeEditStudent();else if(addModal.classList.contains('open'))closeAddStudent();else if(modal.classList.contains('open'))close();}});
 await load(); await populateCourseSuggestions();
})();
