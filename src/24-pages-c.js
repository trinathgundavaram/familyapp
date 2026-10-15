/* ================= TRIPS ================= */
var BOOK_TYPES=[['flight','Flight','✈️'],['hotel','Stay','🏨'],['car','Car / transport','🚗'],['activity','Activity / tickets','🎟️'],['food','Food','🍽️'],['other','Other','📌']];
var PACK_TEMPLATE={
  'Documents':['Passports / IDs','Tickets & boarding passes','Hotel confirmations','Travel insurance','Cash & cards'],
  'Clothes':['Underwear & socks','T-shirts / tops','Pants / shorts','Jacket or sweater','Sleepwear','Comfortable shoes','Swimwear'],
  'Toiletries':['Toothbrush & toothpaste','Shampoo & soap','Deodorant','Sunscreen','Medicines','Hair brush'],
  'Tech':['Phone chargers','Power bank','Headphones','Adapter']
};
function tripCard(t){
  var tdy=today(),d=t.start?diffDays(t.start,tdy):null;
  var status=!t.start?'':d>0?'in '+d+' day'+(d===1?'':'s'):(t.end&&tdy<=t.end?'Happening now':'Past');
  var spent=sum(t.bookings||[],function(b){return Number(b.cost)||0});
  return h('button',{class:'card tap',type:'button',onclick:function(){go('trips',t.id)}},
    h('div',{class:'row'},h('span',{class:'avatar lg',style:{background:'var(--c-trips)22'},text:'✈️'}),h('div',{class:'grow'},h('b',{style:{fontSize:'1.1rem'},text:t.name}),h('div',{class:'muted small',text:(t.dest?t.dest+' · ':'')+(t.start?dayLabel(t.start)+(t.end?' – '+dayLabel(t.end):''):'No dates yet')})),status?h('span',{class:'pill '+(d>0||status==='Happening now'?'brand':'')},status):null),
    t.budget>0?h('div',{class:'small muted',text:money(spent)+' of '+money(t.budget)+' budget'}):null);
}
function tripForm(t){
  var isNew=!t;t=t||{name:'',dest:'',start:'',end:'',budget:'',who:[],notes:'',itinerary:[],packing:[],bookings:[]};
  openForm({title:isNew?'New trip':'Edit trip',values:t,fields:[
    {k:'name',label:'Trip name',req:true,ph:'Summer in Colorado'},{k:'dest',label:'Where',ph:'Denver, CO'},
    {k:'start',label:'Start',type:'date'},{k:'end',label:'End',type:'date'},{k:'budget',label:'Budget (optional)',type:'money'},
    {k:'who',label:'Who is going',type:'who'},{k:'notes',label:'Notes',type:'textarea',rows:3}],
    validate:function(v){return v.start&&v.end&&v.end<v.start?'The end date is before the start date.':null},
    save:function(v){var o=Object.assign({},t,v,{budget:Number(v.budget)||0});if(isNew){var id=col('trips').add(o);setTimeout(function(){go('trips',id)},50)}else col('trips').save(o)},
    del:isNew?null:function(){col('trips').del(t.id);go('trips')}});
}
function downloadIcs(t){
  var s=t.start.replace(/-/g,''),e=addDays(t.end||t.start,1).replace(/-/g,'');
  var ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gundavaram//EN','BEGIN:VEVENT','UID:'+t.id+'@nourish','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z','DTSTART;VALUE=DATE:'+s,'DTEND;VALUE=DATE:'+e,'SUMMARY:'+t.name.replace(/[,;\n]/g,' '),t.dest?'LOCATION:'+t.dest.replace(/[,;\n]/g,' '):'','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
  var a=h('a',{href:URL.createObjectURL(new Blob([ics],{type:'text/calendar'})),download:t.name.replace(/\W+/g,'-')+'.ics'});document.body.append(a);a.click();a.remove();
}
function pageTrips(el,id){
  if(id)return pageTrip(el,id);
  var body=h('div',{class:'grid g2'});
  el.append(pageHead('Trips','Plan holidays together'),body,fab('Trip',function(){tripForm()}));
  return function upd(){
    body.replaceChildren();var t=today(),ts=col('trips').items.slice();
    var up=ts.filter(function(x){return !x.end||x.end>=t}).sort(function(a,b){return (a.start||'9')<(b.start||'9')?-1:1}),past=ts.filter(function(x){return x.end&&x.end<t}).sort(function(a,b){return a.end<b.end?1:-1});
    if(!ts.length){body.append(h('div',{class:'card',style:{gridColumn:'1/-1'}},emptyState('🏖️','No trips yet. Plan your next getaway.',h('button',{class:'btn primary',type:'button',onclick:function(){tripForm()}},'Plan a trip'))));return}
    up.forEach(function(x){body.append(tripCard(x))});
    if(past.length){body.append(h('div',{class:'label',style:{gridColumn:'1/-1'},text:'Past trips'}));past.forEach(function(x){body.append(tripCard(x))})}
  };
}
function pageTrip(el,id){
  var tab='ov',body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  var head=h('div'),seg;
  el.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){go('trips')}},'‹ All trips'),head,body);
  function T(){return col('trips').get(id)}
  function saveT(p){col('trips').save(Object.assign({},T(),p))}
  var segEl=null;
  function itemSheet(kind,item,date){
    var t=T(),isNew=!item;
    if(kind==='it'){
      item=item||{id:newId(),date:date||t.start||today(),time:'',title:'',notes:''};
      openForm({title:isNew?'Add to itinerary':'Edit',values:item,fields:[{k:'title',label:'What',req:true,ph:'Hike, museum, dinner…'},{k:'date',label:'Day',type:'date',req:true},{k:'time',label:'Time',type:'time'},{k:'notes',label:'Notes',type:'textarea',rows:2}],
        save:function(v){var list=(t.itinerary||[]).filter(function(x){return x.id!==item.id});list.push(Object.assign({},item,v));saveT({itinerary:list})},
        del:isNew?null:function(){saveT({itinerary:t.itinerary.filter(function(x){return x.id!==item.id})})}});
    }else{
      item=item||{id:newId(),type:'flight',title:'',cost:'',conf:'',date:''};
      openForm({title:isNew?'Add booking or cost':'Edit',values:item,fields:[{k:'type',label:'Type',type:'chips',opts:BOOK_TYPES.map(function(b){return [b[0],b[1],b[2]]})},{k:'title',label:'What',req:true,ph:'Delta DL123, Airbnb…'},{k:'cost',label:'Cost',type:'money'},{k:'date',label:'Date',type:'date'},{k:'conf',label:'Confirmation # (optional)'}],
        save:function(v){var list=(t.bookings||[]).filter(function(x){return x.id!==item.id});list.push(Object.assign({},item,v,{cost:Number(v.cost)||0}));saveT({bookings:list})},
        del:isNew?null:function(){saveT({bookings:t.bookings.filter(function(x){return x.id!==item.id})})}});
    }
  }
  function overview(t){
    var tdy=today(),spent=sum(t.bookings||[],function(b){return Number(b.cost)||0}),pk=t.packing||[],pd=pk.filter(function(x){return x.done}).length;
    var c=h('section',{class:'card'});
    if(t.start){var d=diffDays(t.start,tdy);c.append(h('div',{class:'row'},h('div',{class:'num',style:{fontSize:'2.4rem',fontWeight:'800',lineHeight:1},text:d>0?String(d):(t.end&&tdy<=t.end?'Now':'✓')}),h('div',null,h('b',{text:d>0?(d===1?'day to go':'days to go'):(t.end&&tdy<=t.end?'Trip in progress':'Trip complete')}),h('div',{class:'muted small',text:dayLabel(t.start,true)+(t.end?' → '+dayLabel(t.end):'')+(t.end?' · '+(diffDays(t.end,t.start)+1)+' days':'')}))))}
    else c.append(h('div',{class:'muted',text:'Add dates to see a countdown and show this trip on the calendar.'}));
    if(t.dest)c.append(h('div',{text:'📍 '+t.dest}));
    if(t.who&&t.who.length)c.append(h('div',{class:'row'},avatars(t.who),h('span',{class:'muted small',text:t.who.map(nameOf).join(', ')})));
    if(t.notes)c.append(h('p',{class:'muted',style:{whiteSpace:'pre-wrap'},text:t.notes}));
    body.append(c);
    var b=h('section',{class:'card'},h('h2',{text:'Budget'}));
    if(t.budget>0){var pb=h('i');pb.style.width=Math.min(100,spent/t.budget*100)+'%';if(spent>t.budget)pb.className='over';b.append(h('div',{class:'row'},h('b',{class:'num',style:{fontSize:'1.4rem'},text:money(spent)}),h('span',{class:'muted small',text:'of '+money(t.budget)})),h('div',{class:'bar'},pb),h('div',{class:'small muted',text:spent>t.budget?money(spent-t.budget)+' over budget':money(t.budget-spent)+' left'}))}
    else b.append(h('div',{class:'muted small',text:'Booked so far: '+money(spent)+'. Set a trip budget with Edit.'}));
    body.append(b);
    body.append(h('section',{class:'card'},h('h2',{text:'Checklist'}),h('div',{class:'muted',text:pk.length?pd+' of '+pk.length+' packed':'No packing list yet.'}),pk.length?h('div',{class:'bar'},(function(){var i=h('i');i.style.width=(pd/pk.length*100)+'%';return i})()):null));
    if(t.start)body.append(h('button',{class:'btn wide',type:'button',onclick:function(){downloadIcs(t)}},'📅 Add to my phone calendar (.ics)'));
  }
  function itinerary(t){
    var items=(t.itinerary||[]).slice().sort(function(a,b){return (a.date+(a.time||''))<(b.date+(b.time||''))?-1:1});
    var days=[];
    if(t.start&&t.end){for(var d=t.start,i=0;d<=t.end&&i<45;d=addDays(d,1),i++)days.push(d)}
    items.forEach(function(x){if(days.indexOf(x.date)<0)days.push(x.date)});days.sort();
    if(!days.length){body.append(h('div',{class:'card'},emptyState('🗺️','Set trip dates to plan day by day, or add an item.',h('button',{class:'btn primary',type:'button',onclick:function(){itemSheet('it')}},'Add item'))));return}
    days.forEach(function(d,i){
      var c=h('section',{class:'card'},h('div',{class:'row'},h('div',{class:'grow'},h('b',{text:'Day '+(t.start?diffDays(d,t.start)+1:i+1)}),h('div',{class:'muted small',text:dayLabel(d)})),h('button',{class:'ibtn brand',type:'button','aria-label':'Add to '+dayLabel(d),onclick:function(){itemSheet('it',null,d)}},'+')));
      var l=h('div',{class:'list'});items.filter(function(x){return x.date===d}).forEach(function(x){l.append(h('button',{class:'item',type:'button',onclick:function(){itemSheet('it',x)}},h('div',{class:'t'},h('b',{text:x.title}),h('small',{text:(x.time?fmtTime(x.time)+' · ':'')+(x.notes||'')}))))});
      if(l.children.length)c.append(l);body.append(c);
    });
  }
  function packing(t){
    var pk=(t.packing||[]).slice(),input=h('input',{type:'text',placeholder:'Add item to pack…','aria-label':'Add packing item',enterkeyhint:'done'});
    function addOne(){var v=input.value.trim();if(!v)return;saveT({packing:(T().packing||[]).concat([{id:newId(),text:v,done:false}])});input.value=''}
    input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addOne()}});
    body.append(h('div',{class:'quickadd'},input,h('button',{class:'btn primary',type:'button',onclick:addOne},'Add')));
    var c=h('section',{class:'card'}),l=h('div',{class:'list'});
    pk.forEach(function(x){l.append(h('div',{class:'item'+(x.done?' done':'')},h('button',{class:'check',type:'button',role:'checkbox','aria-checked':x.done?'true':'false','aria-label':x.text,onclick:function(){saveT({packing:T().packing.map(function(y){return y.id===x.id?Object.assign({},y,{done:!y.done}):y})})}},'✓'),h('div',{class:'t'},h('b',{text:x.text})),h('button',{class:'ibtn plain',type:'button','aria-label':'Remove '+x.text,onclick:function(){saveT({packing:T().packing.filter(function(y){return y.id!==x.id})})}},'×')))});
    if(!pk.length)l.append(emptyState('🧳','Nothing on the list yet.'));
    c.append(l);body.append(c);
    var row=h('div',{class:'row'});
    row.append(h('button',{class:'btn grow',type:'button',onclick:function(){
      var have={};(T().packing||[]).forEach(function(x){have[x.text.toLowerCase()]=1});var add=[];
      Object.keys(PACK_TEMPLATE).forEach(function(k){PACK_TEMPLATE[k].forEach(function(s){if(!have[s.toLowerCase()])add.push({id:newId(),text:s,done:false})})});
      saveT({packing:(T().packing||[]).concat(add)});toast(add.length+' items added')}},'＋ Add the usual'));
    if(pk.some(function(x){return x.done}))row.append(h('button',{class:'btn grow',type:'button',onclick:function(){saveT({packing:T().packing.map(function(y){return Object.assign({},y,{done:false})})})}},'Uncheck all'));
    body.append(row);
  }
  function bookings(t){
    var bk=(t.bookings||[]).slice().sort(function(a,b){return (a.date||'9')<(b.date||'9')?-1:1}),total=sum(bk,function(b){return Number(b.cost)||0});
    var c=h('section',{class:'card'},h('div',{class:'row'},h('div',{class:'grow'},h('b',{text:'Bookings & costs'}),h('div',{class:'muted small num',text:'Total '+money(total)})),h('button',{class:'btn primary sm',type:'button',onclick:function(){itemSheet('bk')}},'+ Add')));
    var l=h('div',{class:'list'});
    bk.forEach(function(b){var ty=BOOK_TYPES.filter(function(x){return x[0]===b.type})[0]||BOOK_TYPES[5];
      l.append(h('button',{class:'item',type:'button',onclick:function(){itemSheet('bk',b)}},h('span',{class:'avatar',text:ty[2]}),h('div',{class:'t'},h('b',{text:b.title}),h('small',{text:[b.date?dayLabel(b.date):'',b.conf?'Conf '+b.conf:''].filter(Boolean).join(' · ')||ty[1]})),h('b',{class:'num',text:b.cost?money(b.cost):''})))});
    if(!bk.length)l.append(emptyState('🎫','Add flights, stays and activities to keep costs and confirmation numbers in one place.'));
    c.append(l);body.append(c);
  }
  function upd(){
    var t=T();
    if(!t){head.replaceChildren(h('div',{class:'card'},emptyState('🤷','This trip was not found.')));body.replaceChildren();return}
    head.replaceChildren(pageHead('✈️ '+t.name,null,[h('button',{class:'btn sm',type:'button',onclick:function(){tripForm(t)}},'Edit')]));
    if(!segEl){segEl=segControl([['ov','Overview'],['it','Plan'],['pk','Packing'],['bk','Bookings']],tab,function(v){tab=v;upd()});head.after(segEl)}
    body.replaceChildren();
    ({ov:overview,it:itinerary,pk:packing,bk:bookings})[tab](t);
  }
  return upd;
}

function weekStart(d){var x=parseD(d),k=(x.getDay()+6)%7;return addDays(d,-k)}
/* ================= FAMILY INFO (notes) ================= */
var NOTE_CATS=[['home','Home','🏠'],['health','Health','🩺'],['school','School','🎒'],['money','Money','💳'],['travel','Travel','🧳'],['other','Other','📝']];
var NOTE_TEMPLATES=[['Wi-Fi & home','home','Wi-Fi name: \nWi-Fi password: \nAlarm / garage code: \nLandlord / plumber / electrician: '],['Emergency contacts','health','Mom: \nDad: \nNeighbour: \nFamily doctor: \nPoison control: 1-800-222-1222'],['School details','school','School: \nOffice phone: \nTeacher: \nBus number & times: \nPickup rules: '],['Insurance & doctors','health','Health insurer: \nPolicy / member ID: \nPharmacy: \nDentist: \nPediatrician: ']];
function noteForm(n,tpl){
  var isNew=!n;n=n||{title:tpl?tpl[0]:'',cat:tpl?tpl[1]:'home',body:tpl?tpl[2]:'',pinned:false};
  openForm({title:isNew?'New note':'Edit note',values:n,fields:[{k:'title',label:'Title',req:true},{k:'cat',label:'Folder',type:'chips',opts:NOTE_CATS.map(function(c){return [c[0],c[1],c[2]]})},{k:'body',label:'Details',type:'textarea',rows:8},{k:'pinned',label:'Pin to top',type:'check'},{k:'tip',label:'Everyone in your family can read these notes. Avoid card numbers, government ID numbers and passwords you would not want shared.',type:'note'}],
    save:function(v){var o=Object.assign({},n,{title:v.title,cat:v.cat,body:v.body,pinned:v.pinned,updated:Date.now()});if(isNew)col('notes').add(o);else col('notes').save(o)},
    del:isNew?null:function(){col('notes').del(n.id)}});
}
function pageNotes(el){
  var cat='',q='';
  var input=h('input',{type:'search',placeholder:'Search family info','aria-label':'Search notes'}),cats=h('div'),body=h('div',{class:'grid g2'});
  input.addEventListener('input',function(){q=input.value;fill()});
  el.append(pageHead('Family info','Wi-Fi, doctors, school, emergency numbers'),input,cats,body,fab('Note',function(){noteForm()}));
  function fill(){
    body.replaceChildren();
    var items=col('notes').items.filter(function(n){return (!cat||n.cat===cat)&&(!q||((n.title+' '+n.body).toLowerCase().indexOf(q.toLowerCase())>=0))}).sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0)||(b.updated||0)-(a.updated||0)});
    if(!items.length){
      var c=h('div',{class:'card',style:{gridColumn:'1/-1'}},emptyState('📒','Keep the family’s important details in one place. Start from a template:'));
      var chipRow=h('div',{class:'chips',style:{justifyContent:'center'}});NOTE_TEMPLATES.forEach(function(t){chipRow.append(h('button',{class:'chip',type:'button',onclick:function(){noteForm(null,t)}},t[0]))});c.append(chipRow);body.append(c);return;
    }
    items.forEach(function(n){var ci=NOTE_CATS.filter(function(c){return c[0]===n.cat})[0]||NOTE_CATS[5];
      body.append(h('button',{class:'card tap',type:'button',onclick:function(){noteForm(n)}},h('div',{class:'row'},h('span',{text:ci[2]}),h('b',{class:'grow ellip',text:n.title}),n.pinned?h('span',{text:'📌'}):null),h('div',{class:'muted small',style:{whiteSpace:'pre-wrap',maxHeight:'5.5em',overflow:'hidden'},text:n.body||'(empty)'})))});
  }
  function upd(){
    cats.replaceChildren();var g=chipGroup([['','All','🗂️']].concat(NOTE_CATS),cat,false,function(v){cat=v;upd()});g.classList.add('scroll');cats.append(g);
    if(document.activeElement===input)return;fill();
  }
  return upd;
}
