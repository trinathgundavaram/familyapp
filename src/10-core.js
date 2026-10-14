'use strict';
/* ================= helpers ================= */
var CFG=window.APP_CONFIG||{};
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function h(tag,props){
  var e=document.createElement(tag);
  if(props){for(var k in props){var v=props[k];
    if(v==null||v===false)continue;
    if(k==='class')e.className=v;else if(k==='text')e.textContent=v;
    else if(k==='style'&&typeof v==='object'){for(var s in v)e.style[s]=v[s]}
    else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);
    else if(v===true)e.setAttribute(k,'');else e.setAttribute(k,v);}}
  for(var i=2;i<arguments.length;i++){
    var kids=[].concat(arguments[i]);
    for(var j=0;j<kids.length;j++){var c=kids[j];if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)));}
  }
  return e;
}
function pad(n){return String(n).padStart(2,'0')}
function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseD(s){var a=String(s).split('-').map(Number);return new Date(a[0],a[1]-1,a[2])}
function today(){return dstr(new Date())}
function addDays(s,n){var d=parseD(s);d.setDate(d.getDate()+n);return dstr(d)}
function diffDays(a,b){return Math.round((parseD(a)-parseD(b))/864e5)}
function monthKey(s){return s.slice(0,7)}
function addMonths(mk,n){var a=mk.split('-').map(Number),d=new Date(a[0],a[1]-1+n,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function monthLabel(mk){var a=mk.split('-').map(Number);return new Date(a[0],a[1]-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
function dayLabel(s,long){return parseD(s).toLocaleDateString('en-US',long?{weekday:'long',month:'long',day:'numeric'}:{weekday:'short',month:'short',day:'numeric'})}
function relDay(s){var t=today(),d=diffDays(s,t);return d===0?'Today':d===1?'Tomorrow':d===-1?'Yesterday':dayLabel(s)}
function fmtTime(t){if(!t)return '';var a=t.split(':').map(Number),hh=a[0]%12||12;return hh+(a[1]?':'+pad(a[1]):'')+(a[0]<12?' AM':' PM')}
function fmt(n){return Math.round(n).toLocaleString('en-US')}
function r1(n){return Math.round(n*10)/10}
function fmtQty(q){return q%1===0?String(q):String(r1(q))}
function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function num(v,max){v=Number(v);if(!isFinite(v)||v<0)return 0;return Math.min(v,max||1e9)}
function sum(a,f){return a.reduce(function(s,x){return s+(f?f(x):x)},0)}
function money(n,dec){
  var c=(S.fam&&S.fam.currency)||'$',neg=n<0;n=Math.abs(n);
  var s=n.toLocaleString('en-US',{minimumFractionDigits:dec?2:(n%1?2:0),maximumFractionDigits:2});
  return (neg?'−':'')+c+s;
}
function firstName(n){return String(n||'').trim().split(/\s+/)[0].slice(0,30)}
function clean(o){return JSON.parse(JSON.stringify(o))}
function greet(){var hh=new Date().getHours();return hh<5?'Good night':hh<12?'Good morning':hh<18?'Good afternoon':'Good evening'}

/* ================= state ================= */
var S={mode:'local',uid:'local',fam:{currency:'$',name:'Our family'},famId:null,members:{},ready:false,auth:null};
var EMOJIS=['🦊','🐼','🐯','🐸','🦉','🐙','🦄','🐻','🐶','🐱','🦁','🐧'];
var COLORS=['#4F46E5','#EF4444','#10B981','#F59E0B','#0EA5E9','#EC4899','#8B5CF6','#14B8A6'];
function me(){return S.members[S.uid]||{name:'Me',emoji:'🦊',color:COLORS[0]}}
function memberList(){return Object.keys(S.members).map(function(id){return Object.assign({id:id},S.members[id])}).sort(function(a,b){return (a.name||'').localeCompare(b.name||'')})}
function nameOf(uid){var m=S.members[uid];return uid===S.uid?(m&&m.name)||'Me':(m&&m.name)||'Family'}
function avatar(uid,cls){var m=S.members[uid]||{};return h('span',{class:'avatar'+(cls?' '+cls:''),style:{background:(m.color||'#999')+'33'},title:m.name||'','aria-label':m.name||''},m.emoji||'🙂')}
function avatars(ids){
  ids=(ids&&ids.length)?ids:null;
  if(!ids)return h('span',{class:'pill',text:'Everyone'});
  return h('span',{class:'avs'},ids.slice(0,4).map(function(u){return avatar(u)}));
}

/* ================= store ================= */
var Store={cloud:false,fdb:null,FS:null,cols:{},ucols:{},unsubs:[]};
var FAMCOLS=['events','tasks','shop','txns','bills','budgets','goals','trips','notes','meals'];
var refreshQueued=false;
function refresh(){
  if(refreshQueued)return;refreshQueued=true;
  requestAnimationFrame(function(){refreshQueued=false;if(App.upd){try{App.upd()}catch(e){console.error(e)}}});
}
function LSget(k,d){try{var j=JSON.parse(localStorage.getItem(k));return j==null?d:j}catch(e){return d}}
function LSset(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}

function makeCol(segs,opts){
  opts=opts||{};
  var C={items:[],map:{},subs:[],ready:false,ro:!!opts.ro,unsub:null};
  var lsKey='nourish2:'+segs.map(function(x,i){return (x===S.famId||x===S.uid)&&i>0?'_':x}).join('/');
  function set(list){C.items=list;C.map={};list.forEach(function(i){C.map[i.id]=i});C.ready=true;C.subs.slice().forEach(function(f){f(C.items)});refresh()}
  function fsCol(){return Store.FS.collection.apply(null,[Store.fdb].concat(segs))}
  if(Store.cloud){
    C.unsub=Store.FS.onSnapshot(fsCol(),function(snap){set(snap.docs.map(function(d){return Object.assign({},d.data(),{id:d.id})}))},function(){C.ready=true;refresh()});
  }else{set(Object.keys(LSget(lsKey,{})).map(function(k){return LSget(lsKey,{})[k]}))}
  C.get=function(id){return C.map[id]};
  C.save=function(o){
    if(C.ro)return Promise.reject(new Error('read only'));
    if(!o.id)o.id=newId();
    var data=clean(o);
    if(Store.cloud){return Store.FS.setDoc(Store.FS.doc.apply(null,[Store.fdb].concat(segs,[o.id])),data).catch(function(e){setStatus('Could not save: '+(e&&e.code==='permission-denied'?'database rules block this (see README).':'no connection.'));throw e})}
    var m=LSget(lsKey,{});m[o.id]=data;LSset(lsKey,m);set(Object.keys(m).map(function(k){return m[k]}));
    return Promise.resolve();
  };
  C.add=function(o){var id=newId();C.save(Object.assign({},o,{id:id,by:S.uid,at:Date.now()}));return id};
  C.patch=function(id,p){var o=Object.assign({},C.map[id]||{id:id},p);return C.save(o)};
  C.del=function(id){
    if(C.ro)return Promise.resolve();
    if(Store.cloud)return Store.FS.deleteDoc(Store.FS.doc.apply(null,[Store.fdb].concat(segs,[id])));
    var m=LSget(lsKey,{});delete m[id];LSset(lsKey,m);set(Object.keys(m).map(function(k){return m[k]}));return Promise.resolve();
  };
  C.on=function(f){C.subs.push(f);if(C.ready)f(C.items);return function(){C.subs=C.subs.filter(function(x){return x!==f})}};
  return C;
}
function col(name){return Store.cols[name]||(Store.cols[name]=makeCol(['families',S.famId||'local',name]))}
function ucol(uid,name){
  var k=uid+'/'+name;
  return Store.ucols[k]||(Store.ucols[k]=makeCol(['users',uid,name],{ro:uid!==S.uid}));
}
function saveMe(patch){
  Object.assign(S.members[S.uid]=S.members[S.uid]||{},patch);
  if(Store.cloud){var FS=Store.FS;return Promise.all([FS.setDoc(FS.doc(Store.fdb,'users',S.uid),clean(patch),{merge:true}),
    FS.setDoc(FS.doc(Store.fdb,'families',S.famId,'members',S.uid),clean(patch),{merge:true})])}
  LSset('nourish2:me',S.members[S.uid]);refresh();return Promise.resolve();
}
function saveFam(patch){
  Object.assign(S.fam,patch);
  if(Store.cloud){return Store.FS.setDoc(Store.FS.doc(Store.fdb,'families',S.famId),clean(patch),{merge:true})}
  LSset('nourish2:fam',S.fam);refresh();return Promise.resolve();
}
function setStatus(t){var e=$('#status');if(e)e.textContent=t}

/* connect */
function gate(content){var el=h('div',{class:'gate'},h('div',{class:'gatecard'},content));document.body.append(el);return el}
function gateSignIn(AU,auth){
  return new Promise(function(res){
    var msg=h('div',{class:'muted small','aria-live':'polite'});
    var el=gate([h('div',{class:'logo','aria-hidden':'true'},'🏡'),h('h1',{text:'Welcome to Nourish'}),
      h('p',{class:'muted',text:'One home for your family: calendar, chores, shopping, budget, trips and more.'}),
      h('button',{class:'btn primary wide',type:'button',onclick:async function(){
        msg.textContent='Opening Google…';
        try{var cred=await AU.signInWithPopup(auth,new AU.GoogleAuthProvider());el.remove();res(cred.user)}
        catch(e){msg.textContent=e&&e.code==='auth/unauthorized-domain'?'This web address is not allowed yet. In Firebase: Authentication → Settings → Authorized domains → add it.':'Sign-in did not finish. Please try again.'}
      }},'Continue with Google'),msg,
      h('button',{class:'btn link',type:'button',onclick:function(){el.remove();res('local')}},'Try it on this device only')]);
  });
}
function gateFamily(FS,fdb,uid){
  return new Promise(function(res){
    var msg=h('div',{class:'muted small','aria-live':'polite'}),el;
    var codeIn=h('input',{type:'text',placeholder:'Family code',maxlength:'10',autocapitalize:'characters','aria-label':'Family code',style:{textAlign:'center',letterSpacing:'.15em',fontWeight:'700'}});
    var nameIn=h('input',{type:'text',placeholder:'Family name, e.g. The Gundavarams',maxlength:'40','aria-label':'Family name'});
    function done(code){el.remove();res(code)}
    el=gate([h('div',{class:'logo','aria-hidden':'true'},'👨‍👩‍👧'),h('h1',{text:'Set up your family'}),
      h('p',{class:'muted',text:'Start a new family space, or join one with a code from a family member.'}),
      nameIn,
      h('button',{class:'btn primary wide',type:'button',onclick:async function(){
        var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',code='',buf=new Uint8Array(8);crypto.getRandomValues(buf);for(var i=0;i<8;i++)code+=chars[buf[i]%chars.length];
        msg.textContent='Creating…';
        try{await FS.setDoc(FS.doc(fdb,'families',code),{owner:uid,created:Date.now(),name:nameIn.value.trim()||'Our family',currency:'$'});done(code)}
        catch(e){msg.textContent='Could not create the family. Check the database rules (README, step 1.4).'}
      }},'Start a new family'),
      h('div',{class:'muted',text:'or join one'}),codeIn,
      h('button',{class:'btn wide',type:'button',onclick:async function(){
        var code=codeIn.value.trim().toUpperCase();if(code.length<6){msg.textContent='Type the family code first.';return}
        msg.textContent='Checking…';
        try{var s=await FS.getDoc(FS.doc(fdb,'families',code));if(!s.exists()){msg.textContent='No family found with that code.';return}done(code)}
        catch(e){msg.textContent='Could not check the code. Try again.'}
      }},'Join with a code'),msg]);
  });
}
async function connect(){
  var cfg=CFG.firebase;
  if(!cfg||!cfg.apiKey||/^PASTE/i.test(cfg.apiKey))return false;
  var B='https://www.gstatic.com/firebasejs/10.12.2/';
  var m=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);
  var A=m[0],AU=m[1],FS=m[2];
  var app=A.initializeApp(cfg),auth=AU.getAuth(app),fdb;
  try{fdb=FS.initializeFirestore(app,{localCache:FS.persistentLocalCache({tabManager:FS.persistentMultipleTabManager()})})}catch(e){fdb=FS.getFirestore(app)}
  var user=await new Promise(function(r){var un=AU.onAuthStateChanged(auth,function(u){un();r(u)})});
  while(!user){user=await gateSignIn(AU,auth);if(user==='local')return false}
  var uref=FS.doc(fdb,'users',user.uid),snap=await FS.getDoc(uref),data=snap.exists()?snap.data():{};
  var famId=data.familyId;
  if(!famId){
    famId=await gateFamily(FS,fdb,user.uid);
    var idx=Math.floor(Math.random()*EMOJIS.length);
    data={kind:'profile',name:firstName(user.displayName)||'Me',emoji:EMOJIS[idx],color:COLORS[idx%COLORS.length],familyId:famId,goal:2000,goalSet:false};
    await FS.setDoc(uref,data,{merge:true});
  }
  // members/{uid} is the family-visible copy of the profile (the family list reads from here)
  await FS.setDoc(FS.doc(fdb,'families',famId,'members',user.uid),{name:data.name||'Me',emoji:data.emoji||EMOJIS[0],color:data.color||COLORS[0],goal:data.goal||2000,goalSet:!!data.goalSet},{merge:true});
  Store.cloud=true;Store.FS=FS;Store.fdb=fdb;S.mode='cloud';S.uid=user.uid;S.famId=famId;S.auth={signOut:function(){return AU.signOut(auth)}};
  return true;
}
async function startStore(){
  var ok=false;
  try{ok=await connect()}catch(e){console.error(e);ok=false;setStatus('Could not reach the family database. Using this device only.')}
  if(ok){
    var FS=Store.FS;
    FS.onSnapshot(FS.collection(Store.fdb,'families',S.famId,'members'),function(snap){
      var m={};snap.docs.forEach(function(d){m[d.id]=d.data()});S.members=m;refresh();
    },function(){});
    FS.onSnapshot(FS.doc(Store.fdb,'families',S.famId),function(s){if(s.exists())S.fam=Object.assign({currency:'$',name:'Our family'},s.data());refresh()},function(){});
    setStatus('Synced with your family');
  }else{
    S.mode='local';S.uid='local';S.famId='local';
    S.members={local:Object.assign({name:'Me',emoji:EMOJIS[0],color:COLORS[0],goal:2000,goalSet:false},LSget('nourish2:me',{}))};
    S.fam=Object.assign({currency:'$',name:'Our family'},LSget('nourish2:fam',{}));
    if(!$('#status').textContent||$('#status').textContent==='Loading…')setStatus('Saved on this device only. Family sharing turns on after the one-time setup (see README).');
  }
  FAMCOLS.forEach(col);
  S.ready=true;
}

/* ================= UI kit ================= */
var toastTimer;
function toast(msg,actLabel,act){
  var w=$('#toastWrap');w.replaceChildren();
  var t=h('div',{class:'toast',role:'status'},h('span',{text:msg}));
  if(actLabel)t.append(h('button',{type:'button',onclick:function(){act();w.hidden=true}},actLabel));
  w.append(t);w.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){w.hidden=true},actLabel?6000:2400);
}
var sheetStack=[];
function openSheet(title,body,opts){
  opts=opts||{};
  var prev=document.activeElement;
  var close=function(){el.remove();sheetStack=sheetStack.filter(function(x){return x!==el});if(!sheetStack.length)document.body.style.overflow='';if(prev&&prev.focus&&document.contains(prev))prev.focus();if(opts.onclose)opts.onclose()};
  var el=h('div',{class:'sheet',onclick:function(e){if(e.target===el)close()}},
    h('div',{class:'panel',role:'dialog','aria-modal':'true','aria-label':title},
      h('div',{class:'panelhead'},h('h2',{text:title}),h('button',{class:'ibtn plain',type:'button','aria-label':'Close',onclick:close},'×')),body));
  document.body.append(el);sheetStack.push(el);document.body.style.overflow='hidden';
  var f=$('input:not([type=checkbox]):not([type=date]):not([type=time]),textarea',el);if(f&&!opts.noFocus)setTimeout(function(){try{f.focus()}catch(e){}},50);
  el.close=close;return el;
}
function closeTopSheet(){var s=sheetStack[sheetStack.length-1];if(s)s.close()}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeTopSheet()});
function askConfirm(msg,okLabel,fn){
  var el=openSheet('Are you sure?',h('div',{class:'form'},h('p',{text:msg}),
    h('button',{class:'btn primary wide danger',type:'button',style:{background:'var(--over)',color:'#fff'},onclick:function(){el.close();fn()}},okLabel||'Delete'),
    h('button',{class:'btn wide',type:'button',onclick:function(){el.close()}},'Cancel')),{noFocus:true});
}

/* chips */
function chipGroup(options,value,multi,onChange,opts){
  var wrap=h('div',{class:'chips',role:'group'});
  var cur=multi?(value||[]).slice():value;
  function draw(){
    wrap.replaceChildren();
    options.forEach(function(o){
      var on=multi?cur.indexOf(o[0])>=0:cur===o[0];
      wrap.append(h('button',{class:'chip',type:'button','aria-pressed':on?'true':'false',onclick:function(){
        if(multi){var i=cur.indexOf(o[0]);if(i>=0)cur.splice(i,1);else cur.push(o[0])}
        else cur=(opts&&opts.toggle&&cur===o[0])?'':o[0];
        onChange(cur);draw();
      }},o[2]?h('span',{text:o[2]}):null,o[1]));
    });
  }
  draw();wrap.get=function(){return cur};return wrap;
}

/* generic form: fields [{k,label,type,opts,ph,req,show}] */
function openForm(o){
  var vals=Object.assign({},o.values||{});
  var form=h('form',{class:'form',novalidate:true}),wraps=[],getters={};
  var mem=memberList().map(function(m){return [m.id,m.name||'Member',m.emoji]});
  function visible(){o.fields.forEach(function(f,i){if(f.show)wraps[i].hidden=!f.show(collect(true))})}
  function collect(soft){
    var out=Object.assign({},vals);
    o.fields.forEach(function(f){if(getters[f.k])out[f.k]=getters[f.k]()});
    return out;
  }
  o.fields.forEach(function(f,idx){
    var inp,v=vals[f.k],t=f.type||'text',label=f.label,wrap;
    if(t==='text'||t==='number'||t==='date'||t==='time'||t==='money'){
      inp=h('input',{type:t==='money'?'number':t,placeholder:f.ph||'',id:'f_'+f.k,value:v==null?'':v,maxlength:t==='text'?(f.max||120):null,autocomplete:'off'});
      if(t==='number'||t==='money'){inp.setAttribute('inputmode','decimal');inp.setAttribute('step','any');inp.setAttribute('min','0')}
      if(t==='money')inp.classList.add('money');
      getters[f.k]=function(){var x=inp.value;return (t==='number'||t==='money')?(x===''?'':Number(x)):x.trim()};
      inp.addEventListener('input',visible);
    }else if(t==='textarea'){
      inp=h('textarea',{id:'f_'+f.k,placeholder:f.ph||'',rows:f.rows||4},v||'');
      getters[f.k]=function(){return inp.value.trim()};
    }else if(t==='select'){
      inp=h('select',{id:'f_'+f.k},f.opts.map(function(x){return h('option',{value:x[0],text:x[1]})}));inp.value=v==null?f.opts[0][0]:v;
      getters[f.k]=function(){return inp.value};inp.addEventListener('change',visible);
    }else if(t==='chips'||t==='multi'||t==='days'){
      var optsArr=t==='days'?[[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']]:f.opts;
      var g=chipGroup(optsArr,t==='chips'?(v==null?optsArr[0][0]:v):(v||[]),t!=='chips',function(){visible()});
      inp=g;getters[f.k]=function(){return g.get()};
    }else if(t==='who'){
      var g2=chipGroup([['__all','Everyone','👪']].concat(mem),(v&&v.length)?v:['__all'],true,function(c){
        if(c.indexOf('__all')>=0&&c.length>1){var last=c[c.length-1];if(last==='__all'){c.length=0;c.push('__all')}else{c.splice(c.indexOf('__all'),1)}}
        if(!c.length)c.push('__all');
      });
      inp=g2;getters[f.k]=function(){return g2.get().filter(function(x){return x!=='__all'})};
    }else if(t==='one'){
      var g3=chipGroup((f.none?[['','Nobody','🚫']]:[]).concat(mem),v==null?(f.none?'':S.uid):v,false,function(){});
      inp=g3;getters[f.k]=function(){return g3.get()};
    }else if(t==='check'){
      inp=h('input',{type:'checkbox',id:'f_'+f.k});inp.checked=!!v;label=null;
      wrap=h('label',{class:'togrow'},h('span',{text:f.label}),inp);getters[f.k]=function(){return inp.checked};inp.addEventListener('change',visible);
    }else if(t==='note'){
      wrap=h('div',{class:'muted small',text:f.label});
    }
    if(!wrap)wrap=h('div',{class:'field'},label?h('label',{for:'f_'+f.k,text:label+(f.req?' *':'')}):null,inp);
    wraps.push(wrap);form.append(wrap);
  });
  var msg=h('div',{class:'small',style:{color:'var(--over)'},'aria-live':'polite'});
  form.append(msg);
  var save=h('button',{class:'btn primary wide',type:'submit'},o.saveLabel||'Save');
  form.append(save);
  if(o.extra)form.append(o.extra);
  if(o.del)form.append(h('button',{class:'btn link danger',type:'button',onclick:function(){askConfirm('This cannot be undone.','Delete',function(){el.close();o.del()})}},'Delete'));
  var el=openSheet(o.title,form);
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var out=collect();
    for(var i=0;i<o.fields.length;i++){var f=o.fields[i];if(f.req&&(!wraps[i].hidden)&&(out[f.k]===''||out[f.k]==null||(Array.isArray(out[f.k])&&!out[f.k].length))){msg.textContent='Please fill in: '+f.label;return}}
    if(o.validate){var er=o.validate(out);if(er){msg.textContent=er;return}}
    if(o.save(out)!==false)el.close();
  });
  visible();
  return el;
}

/* page header helpers */
function pageHead(title,sub,acts){return h('div',{class:'phead'},h('div',null,h('h1',{text:title}),sub?h('div',{class:'sub',text:sub}):null),acts?h('div',{class:'acts'},acts):null)}
function segControl(opts,value,onChange){
  var wrap=h('div',{class:'seg',role:'group'});
  function draw(){wrap.replaceChildren();opts.forEach(function(o){wrap.append(h('button',{type:'button','aria-pressed':o[0]===value?'true':'false',onclick:function(){value=o[0];draw();onChange(value)}},o[1]))})}
  draw();return wrap;
}
function emptyState(icon,text,btn){return h('div',{class:'empty'},h('span',{class:'big',text:icon}),text,btn?h('div',{style:{marginTop:'10px'}},btn):null)}
function monthNav(get,set){
  var lbl=h('div',{class:'grow',style:{textAlign:'center',fontWeight:'800'}});
  var w=h('div',{class:'row'},h('button',{class:'ibtn plain',type:'button','aria-label':'Previous month',onclick:function(){set(addMonths(get(),-1))}},'‹'),lbl,h('button',{class:'ibtn plain',type:'button','aria-label':'Next month',onclick:function(){set(addMonths(get(),1))}},'›'));
  w.upd=function(){lbl.textContent=monthLabel(get())};return w;
}
function fab(label,fn){return h('button',{class:'fab',type:'button',onclick:fn},h('span',{text:'+'}),label)}
function cardHead(icon,color,title,moreLabel,moreFn){
  return h('div',{class:'chead'},h('span',{class:'ico',style:{background:color},'aria-hidden':'true'},icon),h('h2',{text:title}),moreFn?h('button',{class:'more',type:'button',onclick:moreFn},moreLabel||'See all'):null);
}
function donut(parts,total,centerTop,centerBottom){
  var r=52,C=2*Math.PI*r,off=0,svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('aria-hidden','true');
  var bg=document.createElementNS('http://www.w3.org/2000/svg','circle');
  [['cx',60],['cy',60],['r',r],['fill','none'],['stroke-width',14],['class','tr']].forEach(function(a){bg.setAttribute(a[0],a[1])});svg.append(bg);
  parts.forEach(function(p){
    if(!(p.v>0)||!(total>0))return;
    var len=Math.min(C,p.v/total*C),c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    [['cx',60],['cy',60],['r',r],['fill','none'],['stroke',p.color],['stroke-width',14],['stroke-dasharray',len+' '+(C-len)],['stroke-dashoffset',-off]].forEach(function(a){c.setAttribute(a[0],a[1])});
    svg.append(c);off+=len;
  });
  return h('div',{class:'ring'},svg,h('div',{class:'tx'},h('b',{class:'num',text:centerTop}),h('span',{text:centerBottom})));
}

/* ================= router / shell ================= */
var App={routes:{},cur:'home',param:null,upd:null};
function go(route,param){location.hash='#/'+route+(param?'/'+param:'')}
function navigate(){
  var m=(location.hash||'#/home').replace(/^#\/?/,'').split('/'),r=m[0]||'home';
  if(!App.routes[r]){r='home'}
  App.cur=r;App.param=m[1]||null;
  var main=$('#view');main.replaceChildren();App.upd=null;
  var page=h('div',{class:'page'+(App.routes[r].wide?' wide':'')});main.append(page);
  App.upd=App.routes[r].page(page,App.param)||null;
  if(App.upd){try{App.upd()}catch(e){console.error(e)}}
  var inTab={home:'home',cal:'cal',timetable:'cal',tasks:'tasks',shop:'tasks',money:'money'}[r]||'more';
  $$('.tab').forEach(function(b){b.setAttribute('aria-current',b.dataset.tab===inTab?'page':'false')});
  $$('.navi').forEach(function(b){b.setAttribute('aria-current',b.dataset.route===r?'page':'false')});
  window.scrollTo(0,0);
}
function buildShell(){
  var nav=[['home','Home','🏠'],['cal','Calendar','📅'],['timetable','Timetable','🗓️'],['tasks','Tasks','✅'],['shop','Shopping','🛒'],['money','Money','💰'],['food','Calories','🥗'],['trips','Trips','✈️'],['meals','Meal plan','🍽️'],['notes','Family info','📒']];
  var side=$('#side');
  side.append(h('div',{class:'brandrow'},h('div',{class:'logo sm','aria-hidden':'true'},'🏡'),h('b',{text:'Nourish',style:{fontSize:'1.2rem'}})));
  nav.forEach(function(n){side.append(h('button',{class:'navi',type:'button','data-route':n[0],onclick:function(){go(n[0])}},h('span',{class:'ic'},n[2]),n[1]))});
  side.append(h('div',{class:'navsp'}));
  side.append(h('button',{class:'navi',type:'button','data-route':'family',onclick:function(){go('family')}},h('span',{class:'ic'},'⚙️'),'Family & settings'));
  var tabs=[['home','Home','🏠','home'],['cal','Calendar','📅','cal'],['tasks','Lists','✅','tasks'],['money','Money','💰','money'],['more','More','⋯','more']];
  tabs.forEach(function(t){$('#tabbar').append(h('button',{class:'tab',type:'button','data-tab':t[0],onclick:function(){go(t[3])}},h('span',{class:'ic'},t[2]),t[1]))});
}
