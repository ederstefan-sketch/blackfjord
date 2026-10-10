// BLACKFJORD Admin AI Chat — getrennt vom Kundenchat, read-only in Phase 1.
let adminAiThreadId = null;
let adminAiLoading = false;

async function renderAdminAIChat() {
  if (!isAdmin()) return;
  const intro = h('section', {class:'admin-page-intro'},
    h('h2', {}, 'Dein interner KI-Geschäftspartner'),
    h('p', {class:'muted'}, 'Analysiert den Systemstatus, Ventures, Aufgaben, Agenten und Freigaben. Diese erste Version arbeitet ausschließlich lesend.')
  );
  const threadList=h('div',{class:'admin-ai-thread-list'});
  const messages=h('div',{class:'admin-ai-messages','aria-live':'polite'});
  const status=h('div',{class:'muted admin-ai-status',role:'status'},'Bereit');
  const input=h('textarea',{class:'admin-ai-input',rows:'3',maxlength:'8000',placeholder:'Was ist überfällig und was sollte ich zuerst erledigen?','aria-label':'Nachricht an BLACKFJORD Admin AI'});
  const send=h('button',{class:'btn btn-primary',type:'submit'},'Senden');
  const form=h('form',{class:'admin-ai-form'},input,h('div',{class:'admin-ai-form-footer'},h('span',{class:'muted'},'Enter zum Senden · Shift+Enter für neue Zeile'),send));

  function addMessage(role,text) {
    messages.append(h('article',{class:'admin-ai-message '+(role==='user'?'user':'assistant')},
      h('div',{class:'admin-ai-message-role'},role==='user'?'DU':'BLACKFJORD AI'),
      h('div',{class:'admin-ai-message-content'},text)));
    messages.scrollTop=messages.scrollHeight;
  }
  async function loadThreads() {
    threadList.replaceChildren();
    const {data,error}=await sb.from('admin_chat_threads').select('id,title,last_message_at').order('last_message_at',{ascending:false}).limit(12);
    if(error){threadList.append(h('p',{class:'muted'},'Chatverläufe konnten nicht geladen werden.'));return;}
    for(const t of data||[]) threadList.append(h('button',{class:'admin-ai-thread'+(t.id===adminAiThreadId?' active':''),type:'button',onclick:async()=>{adminAiThreadId=t.id;await loadThreads();await loadMessages();}},
      h('span',{},t.title||'Admin Chat'),h('small',{},t.last_message_at?fmtT(t.last_message_at):'')));
  }
  async function loadMessages() {
    messages.replaceChildren();
    if(!adminAiThreadId){addMessage('assistant','Hallo! Ich bin dein interner BLACKFJORD-Geschäftspartner. Ich kann den aktuellen Systemstand auswerten, offene Punkte priorisieren und nächste Schritte empfehlen. Änderungen führe ich in dieser Version nicht selbstständig aus.');return;}
    const {data,error}=await sb.from('admin_chat_messages').select('role,content,created_at').eq('thread_id',adminAiThreadId).order('created_at',{ascending:true}).limit(100);
    if(error){addMessage('assistant','Der Chatverlauf konnte nicht geladen werden. Bitte versuche es erneut.');return;}
    for(const m of data||[]) if(m.role==='user'||m.role==='assistant') addMessage(m.role,m.content);
  }
  form.addEventListener('submit',async(e)=>{
    e.preventDefault(); if(adminAiLoading)return;
    const message=input.value.trim();if(!message)return;
    adminAiLoading=true;input.value='';input.disabled=true;send.disabled=true;status.textContent='BLACKFJORD AI analysiert …';addMessage('user',message);
    const {data,error}=await sb.functions.invoke('blackfjord-admin-orchestrator',{body:{message,thread_id:adminAiThreadId}});
    adminAiLoading=false;input.disabled=false;send.disabled=false;
    if(error||!data?.ok){status.textContent='Anfrage fehlgeschlagen';addMessage('assistant',data?.error||error?.message||'Die Anfrage konnte nicht abgeschlossen werden.');input.focus();return;}
    adminAiThreadId=data.thread_id;status.textContent='Aktualisiert · '+fmtT(data.created_at||new Date().toISOString());
    await loadThreads();await loadMessages();input.focus();
  });
  input.addEventListener('keydown',(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  const newChat=h('button',{class:'btn btn-secondary',type:'button',onclick:async()=>{if(adminAiLoading)return;adminAiThreadId=null;await loadThreads();await loadMessages();status.textContent='Neuer Chat';input.focus();}},'Neuer Chat');
  adminShell('Admin AI Chat',intro,h('div',{class:'admin-ai-layout'},
    h('aside',{class:'admin-card admin-ai-sidebar'},h('div',{class:'admin-ai-sidebar-head'},h('strong',{},'Verlauf'),newChat),threadList),
    h('section',{class:'admin-card admin-ai-workspace'},h('div',{class:'admin-ai-workspace-head'},h('div',{},h('strong',{},'BLACKFJORD Admin AI'),h('p',{class:'muted'},'Systemstatus · Ventures · Aufgaben · Agenten')),status),messages,form)
  ));
  await loadThreads();await loadMessages();
}
