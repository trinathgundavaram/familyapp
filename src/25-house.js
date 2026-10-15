/* ================= HOUSEHOLD: insurance, utilities, loans, subscriptions, deadlines ================= */
var HTYPES=[
  ['insurance','Insurance','shield','var(--c-trips)'],
  ['utility','Bills & utilities','bolt','var(--c-shop)'],
  ['loan','Mortgage & loans','bank','var(--c-tasks)'],
  ['subscription','Subscriptions','repeat','var(--c-notes)'],
  ['deadline','Other deadlines','hourglass','var(--c-cal)']
];
var HREPEAT=[['monthly','Every month'],['quarterly','Every 3 months'],['yearly','Every year'],['once','One time']];
var HREPEAT_MONTHS={monthly:1,quarterly:3,yearly:12};
function htype(id){return HTYPES.filter(function(t){return t[0]===id})[0]||HTYPES[4]}
function defRemind(rep){return {monthly:3,quarterly:7,yearly:30,once:14}[rep]||7}
function repLabel(r){var o=HREPEAT.filter(function(x){return x[0]===r})[0];return o?o[1]:''}

// Move a date forward by whole months, keeping the original day (31st -> last day of shorter months).
function addMonthsKeep(s,n,day){
  var a=s.split('-').map(Number),y=a[0],m=a[1]-1+n;y+=Math.floor(m/12);m=((m%12)+12)%12;
  var last=new Date(y,m+1,0).getDate();return y+'-'+pad(m+1)+'-'+pad(Math.min(day||a[2],last));
}
function nextDue(it){var n=HREPEAT_MONTHS[it.repeat];return n?addMonthsKeep(it.due,n,it.day):null}
// Autopay items roll forward on their own once the date has passed.
function effDue(it){
  var d=it.due,t=today(),n=HREPEAT_MONTHS[it.repeat],guard=0;
  if(it.autopay&&n){while(d<t&&guard++<240)d=addMonthsKeep(d,n,it.day)}
  return d;
}
function houseItems(){return col('house').items.filter(function(x){return !x.done})}
// Everything inside its reminder window (or overdue), soonest first.
function houseDue(){
  var t=today(),out=[];
  houseItems().forEach(function(it){
    if(it.due){
      var d=effDue(it),days=diffDays(d,t),rem=it.remind==null||it.remind===''?defRemind(it.repeat):Number(it.remind);
      if(days<=rem)out.push({it:it,kind:'due',date:d,days:days,late:days<0&&!it.autopay});
    }
    if(it.type==='subscription'&&it.cancelBy&&!it.cancelDone){
      var cd=diffDays(it.cancelBy,t);
      if(cd<=7)out.push({it:it,kind:'cancel',date:it.cancelBy,days:cd,late:cd<0});
    }
  });
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
}
function whenText(days){
  return days<0?(-days)+' day'+(days===-1?'':'s')+' overdue':days===0?'Today':days===1?'Tomorrow':'In '+days+' days';
}
function safeUrl(u){
  u=String(u||'').trim();if(!u)return '';
  if(!/^[a-z]+:\/\//i.test(u))u='https://'+u;
  return /^https?:\/\/[^\s]+$/i.test(u)?u:'';
}
function telHref(p){return 'tel:'+String(p||'').replace(/[^\d+]/g,'')}

function payItem(it){
  var t=today(),d=effDue(it),isDeadline=it.type==='deadline';
  var hist=(it.history||[]).concat([{date:t,due:d,by:S.uid}]).slice(-24);
  var patch={history:hist};
  if(HREPEAT_MONTHS[it.repeat]){patch.due=addMonthsKeep(d,HREPEAT_MONTHS[it.repeat],it.day)}else{patch.done=true}
  col('house').patch(it.id,patch);
  if(!isDeadline&&Number(it.amount)>0)col('txns').add({type:'expense',amount:Number(it.amount),cat:it.cat||'bills',date:t,who:S.uid,note:it.name});
  toast(isDeadline?'Marked done':(patch.due?'Paid. Next due '+dayLabel(patch.due):'Marked paid'));
}
function dueRow(x,compact){
  var it=x.it,ty=htype(it.type),isCancel=x.kind==='cancel';
  var pillCls=x.late?'pill red':x.days<=3?'pill brand':'pill';
  var label=isCancel?'Cancel by '+dayLabel(x.date):(it.autopay&&!isCancel?'Autopay ':'')+(it.type==='insurance'?'Renews ':'Due ')+dayLabel(x.date);
  var act=isCancel
    ?h('button',{class:'btn sm',type:'button',onclick:function(){cancelPrompt(it)}},'Decide')
    :it.autopay?null:h('button',{class:'btn sm'+(x.late?'':' primary'),type:'button',onclick:function(){payItem(it)}},it.type==='deadline'?'Done':(x.late?'Pay now':'Mark paid'));
  return h('div',{class:'item'},icoTile(isCancel?'bell':ty[2],isCancel?'var(--over)':ty[3]),
    h('button',{class:'t',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0},onclick:function(){houseDetail(it)}},
      h('b',{class:'ellip',text:it.name}),
      h('small',{class:'duemeta'},h('span',{class:pillCls,text:whenText(x.days)}),h('span',{class:'ellip',text:label+(Number(it.amount)>0&&!isCancel?' · '+money(it.amount):'')}))),
    act);
}
function cancelPrompt(it){
  var el=openSheet('Cancel '+it.name+'?',h('div',{class:'form'},
    h('p',{class:'muted',text:'You asked to be reminded to cancel by '+dayLabel(it.cancelBy)+'.'}),
    safeUrl(it.link)?h('a',{class:'btn wide',href:safeUrl(it.link),target:'_blank',rel:'noopener noreferrer'},ico('link'),'Open their website'):null,
    h('button',{class:'btn primary wide',type:'button',onclick:function(){col('house').patch(it.id,{cancelDone:true,done:true,cancelled:today()});el.close();toast(it.name+' marked cancelled')}},'I cancelled it'),
    h('button',{class:'btn wide',type:'button',onclick:function(){col('house').patch(it.id,{cancelDone:true});el.close();toast('Keeping '+it.name)}},'Keep it, stop reminding me')));
}
function houseDetail(it){
  var ty=htype(it.type),d=it.due?effDue(it):'',link=safeUrl(it.link),rows=h('div',{class:'list'});
  function row(label,val,node){if(!val&&!node)return;rows.append(h('div',{class:'item'},h('div',{class:'t'},h('small',{text:label}),node||h('b',{text:val,style:{whiteSpace:'pre-wrap'}}))))}
  row('Company',it.provider);
  row(it.type==='insurance'?'Premium':'Amount',Number(it.amount)>0?money(it.amount)+(it.repeat&&it.repeat!=='once'?' · '+repLabel(it.repeat).toLowerCase():''):'');
  row(it.type==='insurance'?'Renewal date':'Next due',d?dayLabel(d,true)+(it.autopay?' (autopay)':''):'');
  if(it.type==='subscription'&&it.cancelBy&&!it.cancelDone)row('Cancel by',dayLabel(it.cancelBy,true));
  row('Payoff date',it.endDate?dayLabel(it.endDate,true):'');
  row('Phone',it.phone,it.phone?h('a',{href:telHref(it.phone),text:it.phone,style:{fontWeight:'600'}}):null);
  row('Account / policy (last digits)',it.acct?'•••• '+it.acct:'');
  row('Agent',it.agent);row('What it covers',it.coverage);row('Papers kept at',it.docs);row('Notes',it.notes);
  var last=(it.history||[]).slice(-1)[0];
  if(last)row('Last paid',dayLabel(last.date,true)+' by '+nameOf(last.by));
  var el=openSheet(it.name,h('div',{class:'form'},
    h('div',{class:'chead'},icoTile(ty[2],ty[3]),h('div',{class:'grow'},h('b',{text:ty[1]}),h('div',{class:'muted small',text:it.repeat?repLabel(it.repeat):''}))),
    rows,
    link?h('a',{class:'btn wide',href:link,target:'_blank',rel:'noopener noreferrer'},ico('link'),'Open website'):null,
    it.done?null:h('button',{class:'btn primary wide',type:'button',onclick:function(){el.close();payItem(it)}},it.type==='deadline'?'Mark done':'Mark paid'),
    h('button',{class:'btn wide',type:'button',onclick:function(){el.close();houseForm(it)}},'Edit')));
}
function houseForm(it,defType){
  var isNew=!it,t=today();
  it=it||{type:defType||'utility',name:'',provider:'',amount:'',repeat:defType==='insurance'?'yearly':defType==='deadline'?'once':'monthly',due:'',remind:'',autopay:false,link:'',phone:'',acct:'',cat:defType==='loan'?'home':'bills'};
  var is=function(){var a=[].slice.call(arguments);return function(v){return a.indexOf(v.type)>=0}};
  openForm({title:isNew?'Add to Household':'Edit '+it.name,values:it,fields:[
    {k:'type',label:'What is it?',type:'chips',opts:HTYPES.map(function(x){return [x[0],x[1]]})},
    {k:'name',label:'Name',req:true,max:80,ph:'Home insurance, Electricity, Mortgage, Netflix, Car registration…'},
    {k:'provider',label:'Company',max:80,ph:'e.g. State Farm, PG&E, Chase',show:is('insurance','utility','loan','subscription')},
    {k:'amount',label:'Amount',type:'money',ph:'0.00',show:is('insurance','utility','loan','subscription')},
    {k:'repeat',label:'How often',type:'select',opts:HREPEAT},
    {k:'due',label:'Next due date',type:'date',req:true},
    {k:'remind',label:'Remind me this many days before (leave empty for the usual)',type:'number',ph:'e.g. 3'},
    {k:'autopay',label:'Paid automatically (autopay)',type:'check',show:is('insurance','utility','loan','subscription')},
    {k:'cancelBy',label:'Remind me to cancel by (optional)',type:'date',show:is('subscription')},
    {k:'endDate',label:'Payoff date (optional)',type:'date',show:is('loan')},
    {k:'link',label:'Website link',max:300,ph:'e.g. statefarm.com/login'},
    {k:'phone',label:'Phone',max:40,ph:'Customer service number'},
    {k:'acct',label:'Account or policy number — last 4 digits only',max:6,ph:'1234',show:is('insurance','utility','loan','subscription')},
    {k:'agent',label:'Agent',max:120,ph:'Name and phone',show:is('insurance')},
    {k:'coverage',label:'What it covers',type:'textarea',rows:2,show:is('insurance')},
    {k:'docs',label:'Where the papers are kept',max:120,ph:'e.g. Blue folder in the study'},
    {k:'cat',label:'Money category when paid',type:'select',opts:EXP_CATS.map(function(c){return [c[0],c[1]]}),show:is('insurance','utility','loan','subscription')},
    {k:'notes',label:'Notes',type:'textarea',rows:2}],
    validate:function(v){
      if(v.acct&&String(v.acct).replace(/\D/g,'').length>4)return 'For safety, enter only the last 4 digits of the account or policy number.';
      if(v.link&&!safeUrl(v.link))return 'That website link does not look right.';
      if(v.remind!==''&&!(v.remind>=0&&v.remind<=365))return 'Reminder days should be between 0 and 365.';
      return null;
    },
    save:function(v){
      var o=Object.assign({},it,v,{amount:Number(v.amount)||0,link:v.link?safeUrl(v.link):'',day:Number(v.due.split('-')[2]),remind:v.remind===''?'':Number(v.remind)});
      if(o.type==='deadline'){o.autopay=false}
      if(!isNew&&v.cancelBy!==it.cancelBy)o.cancelDone=false;
      if(isNew)col('house').add(o);else col('house').save(o);
      toast(isNew?'Added '+o.name:'Saved');
    },
    del:isNew?null:function(){col('house').del(it.id);toast('Deleted')}});
}

/* iPhone / Google / Outlook calendar file with repeating events and alerts */
function icsEsc(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n')}
function icsFold(line){var out=[],s=line;while(s.length>73){out.push(s.slice(0,73));s=' '+s.slice(73)}out.push(s);return out.join('\r\n')}
function icsAlarm(days,desc){
  // All-day events start at midnight; fire at 9am "days" before.
  var trig=days<=0?'PT9H':'-P'+(days-1)+'DT15H';
  return ['BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(desc),'TRIGGER:'+trig,'END:VALARM'];
}
function houseIcs(){
  var stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z',L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nourish//Household//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Nourish household'];
  houseItems().forEach(function(it){
    var ty=htype(it.type),link=safeUrl(it.link);
    var desc=[ty[1]+(it.provider?' · '+it.provider:''),Number(it.amount)>0?'Amount: '+money(it.amount):'',it.autopay?'Autopay is on':'',it.phone?'Phone: '+it.phone:'',link?'Website: '+link:'',it.docs?'Papers: '+it.docs:''].filter(Boolean).join('\n');
    if(it.due){
      var d=effDue(it),rem=it.remind===''||it.remind==null?defRemind(it.repeat):Number(it.remind),n=HREPEAT_MONTHS[it.repeat];
      L.push('BEGIN:VEVENT','UID:'+it.id+'-due@nourish-household','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(d,1).replace(/-/g,''),
        'SUMMARY:'+icsEsc((it.type==='insurance'?'Renew: ':it.type==='deadline'?'Due: ':it.autopay?'Autopay: ':'Pay: ')+it.name+(Number(it.amount)>0?' ('+money(it.amount)+')':'')),
        'DESCRIPTION:'+icsEsc(desc),link?'URL:'+link:'');
      if(n){var rr='RRULE:FREQ=MONTHLY;INTERVAL='+n;if(it.day>=29)rr+=';BYMONTHDAY=-1';if(it.endDate)rr+=';UNTIL='+it.endDate.replace(/-/g,'');L.push(rr)}
      L=L.concat(rem>0?icsAlarm(rem,it.name+' is coming up'):[],icsAlarm(0,it.name+' is due today'));
      L.push('END:VEVENT');
    }
    if(it.type==='subscription'&&it.cancelBy&&!it.cancelDone){
      L.push('BEGIN:VEVENT','UID:'+it.id+'-cancel@nourish-household','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+it.cancelBy.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(it.cancelBy,1).replace(/-/g,''),
        'SUMMARY:'+icsEsc('Cancel by today: '+it.name),'DESCRIPTION:'+icsEsc(desc),link?'URL:'+link:'');
      L=L.concat(icsAlarm(7,'Decide whether to cancel '+it.name),icsAlarm(0,'Last day to cancel '+it.name));
      L.push('END:VEVENT');
    }
  });
  L.push('END:VCALENDAR');
  return L.filter(Boolean).map(icsFold).join('\r\n');
}
function exportHouseCal(){
  if(!houseItems().length){toast('Add something first.');return}
  var file='nourish-household.ics',blob=new Blob([houseIcs()],{type:'text/calendar'});
  // iPhone Home Screen apps can't download files; the share sheet can hand the file to Calendar.
  var standalone=window.navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  if(standalone&&navigator.canShare){try{var f=new File([blob],file,{type:'text/calendar'});if(navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Household reminders'}).catch(function(){});return}}catch(e){}}
  var a=h('a',{href:URL.createObjectURL(blob),download:file});document.body.append(a);a.click();a.remove();
  toast('Calendar file ready. Open it to add the reminders.');
}
function calHelp(){
  openSheet('Reminders on your phone',h('div',{class:'form'},
    h('p',{text:'This adds every Household item to your phone’s calendar, repeating on schedule, with an alert the morning of your reminder day and again on the due day. Your phone alerts you even when the app is closed.'}),
    h('ol',{style:{margin:'0',paddingLeft:'20px',display:'flex',flexDirection:'column',gap:'6px'}},
      h('li',{text:'Best on iPhone: open the app in Safari (not from the Home Screen icon).'}),
      h('li',{text:'Tap “Add to my calendar” below, then “Add All”.'}),
      h('li',{text:'If you change dates later, delete the old “Nourish household” events and add again.'})),
    h('button',{class:'btn primary wide',type:'button',onclick:exportHouseCal},ico('calendar'),'Add to my calendar')));
}

/* Home card + badge */
function houseDueCard(){
  var due=houseDue();if(!due.length)return null;
  var c=h('section',{class:'card'});
  var late=due.filter(function(x){return x.late}).length;
  c.append(cardHead('bell',late?'var(--over)':'var(--brand)','Coming due',late?late+' overdue':'Household',function(){go('house')}));
  var l=h('div',{class:'list'});due.slice(0,4).forEach(function(x){l.append(dueRow(x,true))});c.append(l);
  if(due.length>4)c.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){go('house')}},'See all '+due.length));
  return c;
}
function updBadge(){
  var n=0;try{n=houseDue().filter(function(x){return x.days<=3||x.late}).length}catch(e){}
  $$('.tab[data-tab="more"] .ic,.navi[data-route="house"] .ic').forEach(function(ic){
    var b=ic.querySelector('.badge');
    if(!n){if(b)b.remove();return}
    if(!b){b=h('span',{class:'badge'});ic.append(b)}
    b.textContent=n>9?'9+':String(n);
  });
  try{if(navigator.setAppBadge){n?navigator.setAppBadge(n):navigator.clearAppBadge()}}catch(e){}
}

/* Copy old Money → Bills into Household once (safe to run on every device). */
function migrateBills(){
  function run(){
    var B=col('bills'),H=col('house');if(!B.ready||!H.ready||!B.items.length)return;
    var t=today(),mk=monthKey(t);
    B.items.slice().forEach(function(b){
      var id='bill-'+b.id;
      if(!H.map[id]){
        var due=b.paid&&b.paid[mk]?billDue(b,monthKey(addMonthsKeep(mk+'-01',1))):billDue(b,mk);
        var isLoan=/mortgage|rent|loan|lease/i.test(b.name||'');
        H.save({id:id,type:isLoan?'loan':'utility',name:b.name,amount:Number(b.amount)||0,repeat:'monthly',due:due,day:Number(b.day)||1,remind:'',autopay:false,cat:b.cat||'bills',link:'',phone:'',by:b.by||S.uid,at:Date.now()});
      }
      B.del(b.id);
    });
  }
  col('bills').on(run);col('house').on(run);
}

/* Page */
function pageHouse(el){
  var filter='all';
  var seg=h('div',{class:'chips scroll'}),body=h('div',{style:{display:'flex',flexDirection:'column',gap:'14px'}});
  el.append(pageHead('Household','Insurance, bills, subscriptions and deadlines',[h('button',{class:'btn sm nowrap',type:'button',onclick:calHelp},ico('bell'),'Reminders')]),seg,body,
    fab('Add',function(){houseForm(null,filter==='all'?'utility':filter)}));
  function drawSeg(){
    seg.replaceChildren();
    [['all','All']].concat(HTYPES.map(function(t){return [t[0],t[1]]})).forEach(function(o){
      var n=o[0]==='all'?houseItems().length:houseItems().filter(function(x){return x.type===o[0]}).length;
      seg.append(h('button',{class:'chip',type:'button','aria-pressed':filter===o[0]?'true':'false',onclick:function(){filter=o[0];upd()}},o[1]+(n?' · '+n:'')));
    });
  }
  function upd(){
    drawSeg();body.replaceChildren();
    var due=houseDue().filter(function(x){return filter==='all'||x.it.type===filter});
    if(due.length){
      var c=h('section',{class:'card'});c.append(h('div',{class:'chead'},icoTile('bell','var(--over)'),h('h2',{text:'Coming due'})));
      var l=h('div',{class:'list'});due.forEach(function(x){l.append(dueRow(x))});c.append(l);body.append(c);
    }
    var types=filter==='all'?HTYPES:HTYPES.filter(function(t){return t[0]===filter});
    var any=false;
    types.forEach(function(ty){
      var items=houseItems().filter(function(x){return x.type===ty[0]}).sort(function(a,b){return effDue(a)<effDue(b)?-1:1});
      if(!items.length&&filter==='all')return;
      any=any||items.length>0;
      var c=h('section',{class:'card'});
      var monthly=sum(items,function(x){var n=HREPEAT_MONTHS[x.repeat];return n?(Number(x.amount)||0)/n:0});
      c.append(h('div',{class:'chead'},icoTile(ty[2],ty[3]),h('div',{class:'grow'},h('h2',{text:ty[1]}),monthly>0?h('div',{class:'muted small',text:'About '+money(monthly)+' a month'}):null),
        h('button',{class:'more',type:'button',onclick:function(){houseForm(null,ty[0])}},'+ Add')));
      var l=h('div',{class:'list'});
      items.forEach(function(it){
        var d=it.due?effDue(it):'',link=safeUrl(it.link);
        l.append(h('div',{class:'item'},
          h('button',{class:'t',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0},onclick:function(){houseDetail(it)}},
            h('b',{text:it.name}),
            h('small',{text:[it.provider,Number(it.amount)>0?money(it.amount)+(HREPEAT_MONTHS[it.repeat]?' / '+({1:'mo',3:'qtr',12:'yr'})[HREPEAT_MONTHS[it.repeat]]:''):'',d?(it.type==='insurance'?'renews ':'due ')+dayLabel(d):''].filter(Boolean).join(' · ')})),
          it.autopay?h('span',{class:'pill green',text:'Autopay'}):null,
          link?h('a',{class:'ibtn plain',href:link,target:'_blank',rel:'noopener noreferrer','aria-label':'Open '+it.name+' website'},ico('link')):null,
          it.phone?h('a',{class:'ibtn plain',href:telHref(it.phone),'aria-label':'Call '+it.name},ico('phone')):null));
      });
      if(!items.length)l.append(emptyState(ty[2],'Nothing here yet. Tap “+ Add”.'));
      c.append(l);body.append(c);
    });
    if(!any&&filter==='all'){
      body.append(h('section',{class:'card'},emptyState('key','Keep insurance, utilities, mortgage, subscriptions and other deadlines in one place, with reminders before each one is due.',
        h('button',{class:'btn primary',type:'button',onclick:function(){houseForm()}},'Add the first one'))));
    }
    var done=col('house').items.filter(function(x){return x.done});
    if(done.length&&filter==='all'){
      var dl=h('div',{class:'list'});
      done.forEach(function(it){dl.append(h('div',{class:'item done'},h('button',{class:'t',type:'button',style:{background:'none',border:0,textAlign:'left',padding:0},onclick:function(){houseForm(it)}},h('b',{text:it.name}),h('small',{text:it.cancelled?'Cancelled '+dayLabel(it.cancelled):'Finished'}))))});
      body.append(h('details',{class:'card'},h('summary',{style:{fontWeight:'600',cursor:'pointer'}},'Finished and cancelled ('+done.length+')'),dl));
    }
  }
  return upd;
}
