/* ================= calendar data ================= */
var KINDS=[['event','Event','📌'],['appt','Appointment','🩺'],['school','School','🎒'],['work','Work','💼'],['activity','Activity','⚽'],['birthday','Birthday','🎂']];
var KIND_COLOR={event:'#00A2C7',appt:'#EF4444',school:'#F59E0B',work:'#0EA5E9',activity:'#10B981',birthday:'#EC4899'};
function kindIcon(k){var x=KINDS.filter(function(a){return a[0]===k})[0];return x?x[2]:'📌'}
function occurs(ev,date){
  if(!ev.date||date<ev.date)return false;
  if(ev.until&&date>ev.until)return false;
  var rp=ev.repeat||'none',d=parseD(date),s=parseD(ev.date);
  if(rp==='none')return date===ev.date;
  if(rp==='daily')return true;
  if(rp==='weekly'){var days=(ev.days&&ev.days.length)?ev.days:[s.getDay()];return days.indexOf(d.getDay())>=0}
  if(rp==='monthly')return d.getDate()===s.getDate();
  if(rp==='yearly')return d.getDate()===s.getDate()&&d.getMonth()===s.getMonth();
  return false;
}
function eventsOn(date,who){
  return col('events').items.filter(function(e){
    if(!occurs(e,date))return false;
    if(who&&e.who&&e.who.length&&e.who.indexOf(who)<0)return false;
    return true;
  }).sort(function(a,b){return (a.time||'')<(b.time||'')?-1:1});
}
function tripsOn(date){return col('trips').items.filter(function(t){return t.start&&t.end&&date>=t.start&&date<=t.end})}
// done tasks stay listed (crossed out) on the day they were due
function tasksDueOn(date){return col('tasks').items.filter(function(t){return t.due===date&&(!t.done||date>=today())})}
function eventForm(ev,defaults){
  var isNew=!ev;ev=ev||Object.assign({date:today(),repeat:'none',kind:'event',who:[]},defaults||{});
  openForm({title:isNew?'New event':'Edit event',values:ev,saveLabel:isNew?'Add event':'Save',
    fields:[
      {k:'title',label:'What',req:true,ph:'Soccer practice, dentist, dinner with grandma…'},
      {k:'kind',label:'Type',type:'chips',opts:KINDS.map(function(k){return [k[0],k[1],k[2]]})},
      {k:'date',label:'Date',type:'date',req:true},
      {k:'time',label:'Starts',type:'time'},{k:'endTime',label:'Ends',type:'time'},
      {k:'who',label:'Who',type:'who'},
      {k:'repeat',label:'Repeats',type:'select',opts:[['none','Does not repeat'],['daily','Every day'],['weekly','Every week'],['monthly','Every month'],['yearly','Every year']]},
      {k:'days',label:'On these days',type:'days',show:function(v){return v.repeat==='weekly'}},
      {k:'until',label:'Until (optional)',type:'date',show:function(v){return v.repeat&&v.repeat!=='none'}},
      {k:'place',label:'Place (optional)'},
      {k:'notes',label:'Notes (optional)',type:'textarea',rows:3}
    ],
    save:function(v){
      var o=Object.assign({},ev,v);
      if(o.repeat!=='weekly')o.days=[];
      if(isNew){col('events').add(o)}else col('events').save(o);
      toast(isNew?'Event added':'Saved');
    },
    del:isNew?null:function(){col('events').del(ev.id);toast('Event deleted')}
  });
}
function evRow(e,opts){
  opts=opts||{};
  var color=KIND_COLOR[e.kind]||KIND_COLOR.event;
  var tm=e.time?fmtTime(e.time)+(e.endTime?' – '+fmtTime(e.endTime):''):'All day';
  return h('button',{class:'item',type:'button',onclick:function(){eventForm(e)}},
    h('span',{class:'evbar',style:{background:color}}),
    h('div',{class:'t'},h('b',{text:kindIcon(e.kind)+' '+e.title}),h('small',{text:tm+(e.place?' · '+e.place:'')})),
    avatars(e.who));
}

/* ================= HOME ================= */
function pageHome(el){
  var head=h('div',{class:'hero'}),quick=h('div',{class:'quick'}),grid=h('div',{class:'grid g2'});
  el.append(head,quick,grid);
  [['📌','Event',function(){eventForm()}],['✅','Task',function(){taskForm()}],['🛒','Shopping',function(){shopQuick()}],['💸','Expense',function(){txnForm(null,{type:'expense'})}],['🥗','Food',function(){go('food')}]].forEach(function(q){
    quick.append(h('button',{type:'button',onclick:q[2]},h('span',{class:'qi'},ico(q[0])),q[1]));
  });
  function card(){var c=h('section',{class:'card'});grid.append(c);return c}
  return function upd(){
    grid.replaceChildren();
    var t=today(),m=me();
    head.replaceChildren(h('h1',{text:greet()+(m.name?', '+m.name:'')}),h('p',{text:dayLabel(t,true)+(S.fam.name?' · '+S.fam.name:'')}));

    var hc=houseDueCard();if(hc)grid.append(hc);
    // today
    var c=card(),evs=eventsOn(t),tsk=col('tasks').items.filter(function(x){return x.due&&x.due<=t&&(!x.done||(x.doneAt&&x.doneAt>=new Date(t+'T00:00').getTime()))}).sort(function(a,b){return a.due<b.due?-1:1});
    c.append(cardHead('📅','var(--c-cal)','Today','Calendar',function(){go('cal')}));
    var l=h('div',{class:'list'});
    tripsOn(t).forEach(function(tr){l.append(h('button',{class:'item',type:'button',onclick:function(){go('trips',tr.id)}},h('span',{class:'evbar',style:{background:'var(--c-trips)'}}),h('div',{class:'t'},h('b',{text:'✈️ '+tr.name}),h('small',{text:'Trip in progress'}))))});
    evs.slice(0,5).forEach(function(e){l.append(evRow(e))});
    tsk.slice(0,4).forEach(function(x){l.append(taskRow(x,true))});
    if(!l.children.length)l.append(emptyState('☀️','Nothing planned today.'));
    c.append(l);

    // shopping
    c=card();var open=col('shop').items.filter(function(x){return !x.done}),t0=new Date(t+'T00:00').getTime();
    var shown=col('shop').items.filter(function(x){return !x.done||(x.doneAt&&x.doneAt>=t0)}).sort(function(a,b){return (a.at||0)-(b.at||0)});
    c.append(cardHead('🛒','var(--c-shop)','Shopping',open.length+' to buy',function(){go('shop')}));
    l=h('div',{class:'shoplist home'});
    shown.slice(0,6).forEach(function(x){l.append(shopRow(x))});
    if(!open.length)l.append(emptyState('🧺','Your shopping list is empty.',h('button',{class:'btn sm',type:'button',onclick:shopQuick},'Add an item')));
    c.append(l);

    // money
    c=card();var mk=monthKey(t),tx=col('txns').items.filter(function(x){return monthKey(x.date)===mk});
    var inc=sum(tx.filter(function(x){return x.type==='income'}),function(x){return x.amount}),spent=sum(tx.filter(function(x){return x.type!=='income'}),function(x){return x.amount});
    var bud=sum(col('budgets').items,function(b){return b.amount});
    c.append(cardHead('💰','var(--c-money)',monthLabel(mk).split(' ')[0]+' money','Open',function(){go('money')}));
    c.append(h('div',{class:'kpis'},
      h('div',{class:'kpi'},h('b',{class:'num',text:money(inc)}),h('span',{text:'Income'})),
      h('div',{class:'kpi'},h('b',{class:'num',text:money(spent)}),h('span',{text:'Spent'})),
      h('div',{class:'kpi'},h('b',{class:'num',style:{color:inc-spent<0?'var(--over)':''},text:money(inc-spent)}),h('span',{text:'Left'}))));
    if(bud>0){var pb=h('i');pb.style.width=Math.min(100,spent/bud*100)+'%';if(spent>bud)pb.className='over';c.append(h('div',{class:'bar'},pb),h('div',{class:'small muted',text:money(spent)+' of '+money(bud)+' budgeted'}))}

    // food
    c=card();var fd=foodSummary(S.uid,t);
    c.append(cardHead('🥗','var(--c-food)','Calories','Open',function(){go('food')}));
    c.append(h('div',{class:'row'},donut([{v:Math.min(fd.cal,fd.goal),color:'var(--c-food)'}],fd.goal,fmt(Math.abs(fd.goal-fd.cal)),fd.cal>fd.goal?'over':'left'),
      h('div',{class:'grow'},h('div',{class:'num',style:{fontWeight:'800',fontSize:'1.2rem'},text:fmt(fd.cal)+' eaten'}),h('div',{class:'muted small',text:'Goal '+fmt(fd.goal)}),
        h('button',{class:'btn sm',type:'button',style:{marginTop:'10px'},onclick:function(){go('food')}},'Log food'))));

    // upcoming
    c=card();c.append(cardHead('🎉','var(--c-notes)','Coming up'));
    l=h('div',{class:'list'});var up=[];
    for(var i=1;i<=30&&up.length<5;i++){var d=addDays(t,i);eventsOn(d).forEach(function(e){if(up.length<5)up.push([d,e])})}
    up.forEach(function(p){l.append(h('button',{class:'item',type:'button',onclick:function(){eventForm(p[1])}},h('div',{class:'t'},h('b',{text:kindIcon(p[1].kind)+' '+p[1].title}),h('small',{text:relDay(p[0])+(p[1].time?' · '+fmtTime(p[1].time):'')})),avatars(p[1].who)))});
    var nt=col('trips').items.filter(function(x){return x.start>=t}).sort(function(a,b){return a.start<b.start?-1:1})[0];
    if(nt)l.prepend(h('button',{class:'item',type:'button',onclick:function(){go('trips',nt.id)}},h('div',{class:'t'},h('b',{text:'✈️ '+nt.name}),h('small',{text:'in '+diffDays(nt.start,t)+' days · '+dayLabel(nt.start)}))));
    if(!l.children.length)l.append(emptyState('📆','Nothing coming up.',h('button',{class:'btn sm',type:'button',onclick:function(){eventForm()}},'Add an event')));
    c.append(l);
  };
}

/* ================= MORE ================= */
function pageMore(el){
  el.append(pageHead('More'));
  var g=h('div',{class:'grid g2'});el.append(g);
  [['house','🔑','Household','Insurance, bills, mortgage, subscriptions, deadlines','--c-house'],['food','🥗','Calories','Track what you eat','--c-food'],['trips','✈️','Trips','Plan holidays, packing, bookings','--c-trips'],['notes','📒','Family info','Wi-Fi, doctors, school, emergency numbers','--c-notes'],['shop','🛒','Shopping','Shared shopping lists','--c-shop'],['family','⚙️','Family & settings','Members, invite code, preferences','--c-family']].forEach(function(r){
    g.append(h('button',{class:'card tap',type:'button',onclick:function(){go(r[0])}},h('div',{class:'chead'},icoTile(r[1],'var('+r[4]+')'),h('div',{class:'grow'},h('h2',{text:r[2]}),h('div',{class:'muted small',text:r[3]})),h('span',{class:'chev','aria-hidden':'true'},'›'))));
  });
}

/* ================= CALENDAR ================= */
function pageCal(el,startView){
  var sel=today(),mk=monthKey(sel),who='',view=startView||LSget('nourish2:calview','week');
  var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var head=h('div'),seg=h('div'),filt=h('div'),bar=h('div',{class:'calbar'}),body=h('div',{class:'calbody'});
  el.append(head,seg,filt,bar,body,fab('Add',function(){eventForm(null,{date:sel})}));
  function setView(v){view=v;LSset('nourish2:calview',v);upd()}
  function wkStart(d){return weekStart(d)} // Monday
  function itemsOn(d){
    var out=[];
    tripsOn(d).forEach(function(tr){out.push({k:'trip',t:'',o:tr})});
    eventsOn(d,who).forEach(function(e){out.push({k:'ev',t:e.time||'',o:e})});
    tasksDueOn(d).forEach(function(x){out.push({k:'task',t:'',o:x})});
    return out.sort(function(a,b){return a.k==='trip'?-1:b.k==='trip'?1:(a.t||'99')<(b.t||'99')?-1:1});
  }
  function cell(it){
    if(it.k==='trip')return h('button',{class:'ttcell',type:'button',style:{borderLeftColor:'var(--c-trips)'},onclick:function(){go('trips',it.o.id)}},h('b',null,ico('suitcase'),' '+it.o.name),h('span',{class:'muted',text:'Trip'}));
    if(it.k==='task')return h('div',{class:'ttcell task',style:{borderLeftColor:'var(--c-tasks)'}},taskRow(it.o,true));
    var e=it.o,rep=(e.repeat||'none')!=='none';
    return h('button',{class:'ttcell',type:'button',style:{borderLeftColor:KIND_COLOR[e.kind]||'var(--brand)'},onclick:function(){eventForm(e)}},
      h('span',{class:'tm'},e.time?fmtTime(e.time)+(e.endTime?' – '+fmtTime(e.endTime):''):'All day',rep?ico('repeat'):null),
      h('b',{text:e.title}),e.place?h('span',{class:'muted',text:e.place}):null,(e.who&&e.who.length)?h('div',{class:'avrow'},avatars(e.who)):null);
  }
  function weekView(){
    var ws=wkStart(sel),days=[0,1,2,3,4,5,6].map(function(i){return addDays(ws,i)});
    bar.replaceChildren();bar.append.apply(bar,[h('button',{class:'ibtn plain',type:'button','aria-label':'Previous week',onclick:function(){sel=addDays(sel,-7);upd()}},'‹'),
      h('div',{class:'grow calrange',text:parseD(days[0]).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+parseD(days[6]).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}),
      days.indexOf(today())<0?h('button',{class:'btn sm',type:'button',onclick:function(){sel=today();upd()}},'Today'):null,
      h('button',{class:'ibtn plain',type:'button','aria-label':'Next week',onclick:function(){sel=addDays(sel,7);upd()}},'›')].filter(Boolean));
    var strip=h('div',{class:'wkstrip'}),grid=h('div',{class:'tt'});
    days.forEach(function(d){
      var n=itemsOn(d).length,dt=parseD(d);
      strip.append(h('button',{class:'wkday'+(d===today()?' today':''),type:'button','aria-pressed':d===sel?'true':'false','aria-label':dayLabel(d,true),onclick:function(){sel=d;upd()}},
        h('span',{text:DN[dt.getDay()]}),h('b',{text:String(dt.getDate())}),h('i',{class:n?'on':''})));
      var colEl=h('div',{class:'ttcol'+(d===sel?' sel':'')+(d===today()?' today':'')},h('h3',null,h('span',{text:DN[dt.getDay()]}),h('b',{text:String(dt.getDate())})));
      var its=itemsOn(d);its.forEach(function(it){colEl.append(cell(it))});
      if(!its.length)colEl.append(h('div',{class:'free',text:'Free'}));
      grid.append(colEl);
    });
    body.append(strip,h('div',{class:'mobday',text:dayLabel(sel,true)}),grid);
    body.append(h('div',{class:'calhint'},h('button',{class:'btn link',type:'button',onclick:function(){eventForm(null,{repeat:'weekly',kind:'school',who:who?[who]:[],days:[1,2,3,4,5],date:sel})}},ico('repeat'),'Add a weekly class, shift or activity')));
  }
  function monthView(){
    var nav=monthNav(function(){return mk},function(v){mk=v;if(monthKey(sel)!==mk)sel=mk+'-01';upd()});nav.upd();bar.replaceChildren(nav);
    var grid=h('div',{class:'mgrid'});
    ['S','M','T','W','T','F','S'].forEach(function(d){grid.append(h('div',{class:'dow',text:d}))});
    var first=parseD(mk+'-01'),start=addDays(mk+'-01',-first.getDay());
    for(var i=0;i<42;i++){
      var d=addDays(start,i),inM=monthKey(d)===mk;if(i>=35&&!inM)break;
      var n=itemsOn(d).length,dots=h('span',{class:'dots'});if(n)dots.append(h('i'));if(n>1)dots.append(h('i'));
      (function(d){grid.append(h('button',{class:'mday'+(inM?'':' out')+(d===today()?' today':''),type:'button','aria-pressed':d===sel?'true':'false','aria-label':dayLabel(d,true),onclick:function(){sel=d;if(monthKey(d)!==mk)mk=monthKey(d);upd()}},h('b',{text:String(parseD(d).getDate())}),dots))})(d);
    }
    var l=h('div',{class:'agenda'});itemsOn(sel).forEach(function(it){l.append(cell(it))});
    if(!l.children.length)l.append(emptyState('🌤️','Nothing on this day.',h('button',{class:'btn sm',type:'button',onclick:function(){eventForm(null,{date:sel})}},'Add event')));
    body.append(grid,h('section',{class:'card'},h('h2',{text:dayLabel(sel,true)}),l));
  }
  function upd(){
    if(view==='month')mk=monthKey(sel);
    head.replaceChildren(pageHead('Calendar','Events, school, work and activities in one place'));
    seg.replaceChildren(segControl([['week','Week'],['month','Month']],view,setView));
    var mem=memberList();filt.replaceChildren();
    if(mem.length>1){filt.append(chipGroup([['','Everyone']].concat(mem.map(function(m){return [m.id,m.name,m.emoji]})),who,false,function(v){who=v;upd()}));filt.firstChild.classList.add('scroll')}
    body.replaceChildren();body.classList.toggle('month',view==='month');
    (view==='month'?monthView:weekView)();
  }
  return upd;
}
function pageTimetable(el){return pageCal(el,'week')}

/* ================= FAMILY & SETTINGS ================= */
function applySize(s){if(s==='n')document.documentElement.removeAttribute('data-size');else document.documentElement.setAttribute('data-size',s);LSset('nourish2:size',s)}
function pageFamily(el){
  var wrap=h('div',{class:'page-inner cols',style:{display:'flex',flexDirection:'column',gap:'16px'}});
  el.append(pageHead('Family & settings'),wrap);
  function inviteText(){return 'Join our family on Gundavaram. Open '+location.href.split('#')[0]+' , sign in with Google, then choose “Join with a code” and enter: '+S.famId}
  function share(){
    if(navigator.share){navigator.share({title:'Join our family on Gundavaram',text:inviteText()}).catch(function(){})}
    else if(navigator.clipboard){navigator.clipboard.writeText(inviteText()).then(function(){toast('Invite copied. Paste it in a message.')},function(){toast('Could not copy. Share the code by message.')})}
  }
  function allowCard(){
    var isOwner=S.fam.owner===S.uid,list=(S.fam.allowed||[]).slice();
    var c=h('section',{class:'card'});
    c.append(h('h2',{text:'Who can join'}),h('p',{class:'muted small',text:isOwner?'Only these Google accounts can see your family’s data. Removing an email takes away access right away.':'Only these Google accounts can see your family’s data. The family owner manages this list.'}));
    var l=h('div',{class:'list'});
    list.forEach(function(em){
      l.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:em}),h('small',{text:em===S.email?'You':((S.members[S.fam.owner]||{}).email===em?'Owner':'Can join')})),
        isOwner&&em!==S.email?h('button',{class:'btn sm ghost danger',type:'button','aria-label':'Remove '+em,onclick:function(){
          if(!confirm('Remove '+em+'? They will lose access to all family data.'))return;
          saveFam({allowed:list.filter(function(x){return x!==em})}).then(function(){
            memberList().forEach(function(x){if(x.email===em)Store.FS.deleteDoc(Store.FS.doc(Store.fdb,'families',S.famId,'members',x.id)).catch(function(){})});
            toast('Removed '+em);
          },function(){toast('Could not remove. Try again.')});
        }},'Remove'):null));
    });
    c.append(l);
    if(isOwner){
      var inp=h('input',{type:'email',placeholder:'name@gmail.com',autocapitalize:'none','aria-label':'Email to allow'});
      c.append(h('div',{class:'row'},h('div',{class:'grow'},inp),h('button',{class:'btn primary',type:'button',onclick:function(){
        var em=inp.value.trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){toast('Type a full email address.');return}
        if(list.indexOf(em)>=0){toast('Already on the list.');return}
        if(list.length>=30){toast('The list is full (30).');return}
        saveFam({allowed:list.concat([em])}).then(function(){inp.value='';toast('Added '+em+'. Now send them the invite.')},function(){toast('Could not add. Try again.')});
      }},'Add')));
    }
    return c;
  }
  function aiCard(){
    var isOwner=S.fam.owner===S.uid,on=!!S.fam.geminiKey;
    var c=h('section',{class:'card'});
    c.append(h('h2',{text:'AI calorie estimates'}),h('p',{class:'muted small',text:on?'On for the whole family.':'Off. '+(isOwner?'Paste a free Gemini key to turn it on for the whole family.':'The family owner can turn it on.')}));
    if(!isOwner)return c;
    c.append(h('p',{class:'muted small',text:'The key is saved privately in your family space. Only people on the “Who can join” list can use it.'}));
    var inp=h('input',{type:'password',placeholder:on?'Paste a new key to replace it':'Paste Gemini key',autocomplete:'off',autocapitalize:'none',spellcheck:'false','aria-label':'Gemini key'});
    c.append(h('div',{class:'row'},h('div',{class:'grow'},inp),h('button',{class:'btn primary',type:'button',onclick:function(){
      var k=inp.value.trim();if(k.length<20||/\s/.test(k)){toast('That does not look like a full key.');return}
      saveFam({geminiKey:k}).then(function(){inp.value='';toast('AI estimates are on.')},function(){toast('Could not save. Try again.')});
    }},'Save')));
    if(on)c.append(h('button',{class:'btn ghost wide danger',type:'button',onclick:function(){
      if(!confirm('Turn off AI estimates and delete the key?'))return;
      saveFam({geminiKey:''}).then(function(){toast('AI estimates are off.')},function(){toast('Could not remove. Try again.')});
    }},'Turn off and delete key'));
    return c;
  }
  var built=false;
  return function upd(){
    if(built&&document.activeElement&&document.activeElement.tagName==='INPUT'&&wrap.contains(document.activeElement))return;
    built=true;wrap.replaceChildren();
    var m=me();
    var c=h('section',{class:'card'});
    c.append(h('div',{class:'row'},avatar(S.uid,'lg'),h('div',{class:'grow'},h('b',{text:m.name||'Me',style:{fontSize:'1.2rem'}}),h('div',{class:'muted small',text:S.mode==='cloud'?'Signed in':'This device only'})),
      h('button',{class:'btn sm',type:'button',onclick:function(){
        openForm({title:'My profile',values:{name:m.name,emoji:m.emoji,color:m.color},fields:[
          {k:'name',label:'Name',req:true,max:30},
          {k:'emoji',label:'Avatar',type:'chips',opts:EMOJIS.map(function(e){return [e,e]})},
          {k:'color',label:'Colour',type:'chips',opts:COLORS.map(function(c,i){return [c,'●']})}],
          save:function(v){saveMe({name:v.name,emoji:v.emoji,color:v.color})}});
      }},'Edit')));
    wrap.append(c);

    c=h('section',{class:'card'});c.append(h('h2',{text:'Family members'}));
    var l=h('div',{class:'list'});
    memberList().forEach(function(x){l.append(h('button',{class:'item',type:'button',onclick:function(){go('person',x.id)}},avatar(x.id),h('div',{class:'t'},h('b',{text:x.name||'Member'}),h('small',{text:(x.id===S.uid?'You':'Member')+' · tap to see or edit details'})),h('span',{class:'muted','aria-hidden':'true',text:'›'})))});
    c.append(l);wrap.append(c);

    if(S.mode==='cloud'){
      c=h('section',{class:'card'});c.append(h('h2',{text:'Invite family'}),h('p',{class:'muted small',text:'1. Add their Google email under “Who can join” below. 2. Send the app link and this code. They sign in with Google and choose “Join with a code”. The code only works for emails on the list.'}),
        h('div',{class:'code',text:S.famId}),h('button',{class:'btn primary wide',type:'button',onclick:share},'Share invite'));
      wrap.append(c);
      wrap.append(allowCard());
      wrap.append(aiCard());
    }else{
      wrap.append(h('section',{class:'card'},h('h2',{text:'Family sharing is off'}),h('p',{class:'muted small',text:'Right now everything stays on this device. Finish the one-time setup in the README (about 15 minutes) and this page will show your invite code.'})));
    }

    c=h('section',{class:'card'});c.append(h('h2',{text:'Preferences'}));
    c.append(h('div',{class:'field'},h('label',{text:'Family name'}),h('input',{type:'text',value:S.fam.name||'',maxlength:'40','aria-label':'Family name',onchange:function(e){saveFam({name:e.target.value.trim()||'Our family'})}})));
    c.append(h('div',{class:'field'},h('label',{text:'Currency symbol'}),chipGroup([['$','$'],['€','€'],['£','£'],['₹','₹'],['A$','A$'],['C$','C$']],S.fam.currency||'$',false,function(v){saveFam({currency:v})})));
    var cs=document.documentElement.getAttribute('data-size')||'n';
    c.append(h('div',{class:'field'},h('label',{text:'Text size'}),chipGroup([['n','Normal'],['l','Large'],['xl','Extra large']],cs,false,applySize)));
    var th=document.documentElement.getAttribute('data-theme')||'auto';
    c.append(h('div',{class:'field'},h('label',{text:'Appearance'}),chipGroup([['auto','Automatic'],['light','Light'],['dark','Dark']],th,false,function(v){if(v==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',v);LSset('nourish2:theme',v)})));
    wrap.append(c);

    c=h('section',{class:'card'});c.append(h('h2',{text:'Your data'}));
    c.append(h('button',{class:'btn wide',type:'button',onclick:exportAll},ico('download'),'Download everything (backup)'));
    if(S.mode==='cloud')c.append(h('button',{class:'btn ghost wide danger',type:'button',onclick:function(){S.auth.signOut().then(function(){location.reload()})}},'Sign out'));
    wrap.append(c);
  };
}
function exportAll(){
  var out={exported:new Date().toISOString(),family:S.fam};
  FAMCOLS.forEach(function(n){out[n]=col(n).items});
  out.myFood={days:ucol(S.uid,'days').items,foods:ucol(S.uid,'foods').items};
  var a=h('a',{href:URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'})),download:'nourish-backup-'+today()+'.json'});
  document.body.append(a);a.click();a.remove();toast('Backup downloaded');
}

/* person details: everyone in the family can view and edit anyone's details */
var BLOOD=[['','Not sure'],['A+','A+'],['A-','A−'],['B+','B+'],['B-','B−'],['AB+','AB+'],['AB-','AB−'],['O+','O+'],['O-','O−']];
var INFO_SECTIONS=[
  {k:'basics',icon:'🪪',title:'Basics',fields:[
    {k:'fullName',label:'Full name',max:80},{k:'nickname',label:'Nickname',max:40},{k:'birthday',label:'Birthday',type:'date'},
    {k:'phone',label:'Phone',max:40,tel:true},{k:'contactEmail',label:'Email',max:80},{k:'address',label:'Address',type:'textarea',rows:2}]},
  {k:'health',icon:'🩺',title:'Health',fields:[
    {k:'blood',label:'Blood type',type:'select',opts:BLOOD},{k:'allergies',label:'Allergies',type:'textarea',rows:2,ph:'e.g. peanuts, penicillin'},
    {k:'meds',label:'Medications',type:'textarea',rows:2,ph:'Name, dose, when'},{k:'conditions',label:'Health conditions',type:'textarea',rows:2},
    {k:'doctor',label:'Doctor',max:120,ph:'Name and phone'},{k:'dentist',label:'Dentist',max:120,ph:'Name and phone'},
    {k:'insurance',label:'Health insurance',max:120,ph:'Provider and where the card is kept'},{k:'healthNotes',label:'Other health notes',type:'textarea',rows:2}]},
  {k:'work',icon:'💼',title:'Work & school',fields:[
    {k:'org',label:'Employer or school',max:120},{k:'role',label:'Job title or grade/class',max:80},
    {k:'contact',label:'Manager or teacher',max:120,ph:'Name and phone or email'},{k:'workPhone',label:'Work or school phone',max:40,tel:true},
    {k:'schedule',label:'Schedule notes',type:'textarea',rows:2,ph:'e.g. Mon–Fri 9–5, pick-up 3:15'}]},
  {k:'sizes',icon:'👕',title:'Sizes & preferences',fields:[
    {k:'top',label:'Shirt / top size',max:20},{k:'bottom',label:'Pants / bottom size',max:20},{k:'shoe',label:'Shoe size',max:20},
    {k:'favFoods',label:'Favourite foods',type:'textarea',rows:2},{k:'dislikes',label:'Dislikes',type:'textarea',rows:2},
    {k:'gifts',label:'Gift ideas',type:'textarea',rows:2}]}
];
function pagePerson(el,param){
  var uid=param&&S.members[param]?param:S.uid;
  var head=h('div'),wrap=h('div',{class:'page-inner cols',style:{display:'flex',flexDirection:'column',gap:'16px'}});
  el.append(head,wrap);
  function show(f,v){
    if(f.type==='select'){var o=f.opts.filter(function(x){return x[0]===v})[0];return o?o[1]:v}
    if(f.type==='date'&&v){var d=new Date(v+'T00:00');return isNaN(d)?v:d.toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}
    return v;
  }
  var built=false;
  return function upd(){
    if(built&&document.activeElement&&wrap.contains(document.activeElement)&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
    built=true;
    var m=S.members[uid]||{},info=m.info||{},isMe=uid===S.uid;
    head.replaceChildren(pageHead(nameOf(uid)+(isMe?' (you)':''),'Everyone in the family can see and change these details'));
    wrap.replaceChildren();
    wrap.append(h('section',{class:'card'},h('div',{class:'row'},avatar(uid,'lg'),h('div',{class:'grow'},h('b',{text:m.name||'Member',style:{fontSize:'1.2rem'}}),
      h('div',{class:'muted small',text:m.infoBy?'Last changed by '+nameOf(m.infoBy)+(m.infoAt?' on '+new Date(m.infoAt).toLocaleDateString():''):'No details added yet'})),
      h('button',{class:'btn sm',type:'button',onclick:function(){
        openForm({title:isMe?'My profile':nameOf(uid)+'’s profile',values:{name:m.name,emoji:m.emoji,color:m.color},fields:[
          {k:'name',label:'Name',req:true,max:30},
          {k:'emoji',label:'Avatar',type:'chips',opts:EMOJIS.map(function(e){return [e,e]})},
          {k:'color',label:'Colour',type:'chips',opts:COLORS.map(function(c){return [c,'●']})}],
          save:function(v){savePerson(uid,{name:v.name,emoji:v.emoji,color:v.color})}});
      }},'Edit'))));
    INFO_SECTIONS.forEach(function(sec){
      var c=h('section',{class:'card'}),l=h('div',{class:'list'}),any=false;
      c.append(h('div',{class:'row'},h('div',{class:'chead grow'},icoTile(sec.icon,'var(--brand)'),h('h2',{text:sec.title})),h('button',{class:'btn sm',type:'button','aria-label':'Edit '+sec.title,onclick:function(){
        var vals={};sec.fields.forEach(function(f){vals[f.k]=info[f.k]==null?(f.type==='select'?'':''):info[f.k]});
        openForm({title:sec.title+' — '+nameOf(uid),values:vals,fields:sec.fields.map(function(f){return Object.assign({},f)}),
          save:function(v){
            var next=Object.assign({},(S.members[uid]||{}).info||{});
            sec.fields.forEach(function(f){var x=v[f.k];next[f.k]=typeof x==='string'?x.trim():(x==null?'':x)});
            savePerson(uid,{info:next,infoBy:S.uid,infoAt:Date.now()}).then(function(){toast('Saved')},function(){toast('Could not save. Try again.')});
          }});
      }},'Edit')));
      sec.fields.forEach(function(f){
        var v=info[f.k];if(v==null||v==='')return;any=true;
        var val=show(f,v);
        l.append(h('div',{class:'item'},h('div',{class:'t'},h('small',{text:f.label}),
          f.tel?h('a',{href:'tel:'+String(v).replace(/[^\d+]/g,''),text:val,style:{fontWeight:'600'}}):h('b',{text:val,style:{whiteSpace:'pre-wrap'}}))));
      });
      c.append(any?l:h('div',{class:'muted small',text:'Nothing added yet. Tap Edit to add.'}));
      wrap.append(c);
    });
    if(S.mode==='cloud')wrap.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){go('food',uid)}},ico('apple'),'Open '+(isMe?'my':nameOf(uid)+'’s')+' calorie log'));
  };
}
