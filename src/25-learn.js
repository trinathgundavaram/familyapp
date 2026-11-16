/* ================= LEARNING: course roadmaps with progress tracking ================= */
var LEARN_TPL={ai:/*LEARNAI*/};
var LSTAT=[['todo','Not started'],['doing','In progress'],['blocked','Blocked'],['done','Done']];
var LSTAT_IC={todo:'⬜',doing:'🔄',blocked:'⛔',done:'✅'};
function lTracks(){return col('learn').items.filter(function(x){return x.kind==='track'&&LEARN_TPL[x.tpl]})}
function lTpl(t){return LEARN_TPL[t.tpl]}
function lDay(t,n){return col('learn').get('d_'+t.id+'_'+n)||{}}
function lWeek(t,n){return col('learn').get('w_'+t.id+'_'+n)||{}}
function lCap(t,i){return col('learn').get('c_'+t.id+'_'+i)||{}}
function lCanEdit(t){return t.owner===S.uid}
function lStats(t){
  var tp=lTpl(t),N=tp.days.length,done=0,hours=0;
  tp.days.forEach(function(d){var x=lDay(t,d[0]);if(x.status==='done')done++;hours+=Number(x.hours)||0});
  var planned=Math.max(0,Math.min(N,diffDays(today(),t.start)+1));
  return {N:N,done:done,hours:r1(hours),planned:planned,diff:done-planned,pct:Math.round(done/N*100)};
}
function lCourseOf(t,id){return lTpl(t).courses.filter(function(c){return c.id===id})[0]||{name:id,platform:''}}
function lCourseStats(t){
  var tp=lTpl(t);
  return tp.courses.map(function(c){
    var ds=tp.days.filter(function(d){return d[1]===c.id}),done=0,hrs=0,started=false;
    ds.forEach(function(d){var x=lDay(t,d[0]);if(x.status==='done')done++;if(x.status&&x.status!=='todo')started=true;hrs+=Number(x.hours)||0});
    return {c:c,days:ds,total:ds.length,done:done,hours:r1(hrs),state:done===ds.length&&ds.length?'done':(started?'doing':'todo')};
  }).filter(function(x){return x.total});
}
function lActivity(t){
  var m={};
  col('learn').items.filter(function(x){return x.kind==='day'&&x.track===t.id&&(x.on||x.doneOn)&&(x.status!=='todo'||x.hours)}).forEach(function(x){
    var d=x.on||x.doneOn;m[d]=m[d]||{hours:0,days:[]};m[d].hours+=Number(x.hours)||0;m[d].days.push(x);
  });
  return m;
}
function lStreak(act){var d=today(),n=0;if(!act[d])d=addDays(d,-1);while(act[d]){n++;d=addDays(d,-1)}return n}
function lSaveDay(t,n,patch){var o=Object.assign({},lDay(t,n),{id:'d_'+t.id+'_'+n,kind:'day',track:t.id,n:n,on:today()},patch);col('learn').save(o)}
function lCurrent(t){var tp=lTpl(t);for(var i=0;i<tp.days.length;i++){if(lDay(t,tp.days[i][0]).status!=='done')return tp.days[i]}return null}
function lScore(t,w){var x=lWeek(t,w);if(x.a==null||x.b==null||x.c==null||x.a===''||x.b===''||x.c==='')return null;return Number(x.a)+Number(x.b)+Number(x.c)}
function lDecision(s){return s==null?'':s>=5?'Move on':s>=3?'Practise 1–2 more days':'Repeat this week'}
function lPace(s){return s.planned===0?'Starts '+'soon':s.diff===0?'On track':s.diff>0?s.diff+' day'+(s.diff>1?'s':'')+' ahead':Math.abs(s.diff)+' day'+(s.diff<-1?'s':'')+' behind'}
function lBar(p,cls){var i=h('i');i.style.width=p+'%';if(cls)i.className=cls;return h('div',{class:'bar'},i)}

function learnTrackForm(){
  var opts=Object.keys(LEARN_TPL).map(function(k){return [k,LEARN_TPL[k].name]});
  openForm({title:'Start a learning track',saveLabel:'Start',values:{tpl:opts[0][0],owner:S.uid,start:today()},
    fields:[{k:'tpl',label:'Roadmap',type:'select',opts:opts},{k:'owner',label:'Whose is it',type:'one'},{k:'start',label:'Start date',type:'date',req:true}],
    save:function(v){var id=col('learn').add({kind:'track',tpl:v.tpl,name:LEARN_TPL[v.tpl].name,owner:v.owner||S.uid,start:v.start});toast('Track started');go('learn',id)}});
}
function learnDayForm(t,d){
  var x=lDay(t,d[0]);
  openForm({title:'Day '+d[0]+' · '+d[2],values:{status:x.status||'todo',hours:x.hours==null?'':x.hours,conf:x.conf||'',note:x.note||''},saveLabel:'Save',
    fields:[{k:'info',label:'Today: '+d[3]+' → '+d[4],type:'note'},
      {k:'status',label:'Status',type:'chips',opts:LSTAT},
      {k:'hours',label:'Hours spent',type:'number',ph:'2'},
      {k:'conf',label:'How confident do you feel? (1–5)',type:'chips',opts:[['','–'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5']]},
      {k:'note',label:'Notes',type:'textarea',rows:3}],
    save:function(v){
      var p={status:v.status,hours:v.hours,conf:v.conf,note:v.note};
      if(v.status==='done'&&!x.doneOn)p.doneOn=today();
      lSaveDay(t,d[0],p);toast('Saved');
    }});
}
function learnWeekForm(t,w){
  var x=lWeek(t,w),sc=[['','–'],[0,'0'],[1,'1'],[2,'2']];
  openForm({title:'Week '+w+' check · '+lTpl(t).weeks[w-1],values:{a:x.a==null?'':x.a,b:x.b==null?'':x.b,c:x.c==null?'':x.c,note:x.note||''},saveLabel:'Save',
    fields:[{k:'n1',label:'Score each from 0 (no) to 2 (yes). Move on at 5 or 6.',type:'note'},
      {k:'a',label:'Can I explain it without notes?',type:'chips',opts:sc},
      {k:'b',label:'Can I build it on my own?',type:'chips',opts:sc},
      {k:'c',label:'Can I debug it and explain why?',type:'chips',opts:sc},
      {k:'note',label:'What I struggled with',type:'textarea',rows:3}],
    save:function(v){col('learn').save({id:'w_'+t.id+'_'+w,kind:'week',track:t.id,n:w,a:v.a,b:v.b,c:v.c,note:v.note});toast('Saved')}});
}

function pageLearn(el,param){
  var t=param?col('learn').get(param):null,tab='today',body=h('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}});
  if(!param){
    el.append(pageHead('Learning','Roadmaps your family is working through',[h('button',{class:'btn primary sm',type:'button',onclick:learnTrackForm},'＋ New track')]),body);
    return function upd(){
      body.replaceChildren();var ts=lTracks();
      if(!ts.length){body.append(h('div',{class:'card'},emptyState('🎯','No learning tracks yet.',h('button',{class:'btn primary',type:'button',onclick:learnTrackForm},'Start AI Engineering'))));return}
      ts.forEach(function(x){var s=lStats(x),c=lCurrent(x);
        body.append(h('button',{class:'card tap',type:'button',onclick:function(){go('learn',x.id)}},
          h('div',{class:'chead'},icoTile('book','var(--c-learn)'),h('div',{class:'grow'},h('h2',{text:x.name}),h('div',{class:'muted small',text:nameOf(x.owner)+' · '+s.done+' of '+s.N+' days · '+lPace(s)})),avatar(x.owner),h('span',{class:'chev','aria-hidden':'true'},'›')),
          lBar(s.pct),c?h('div',{class:'small muted',text:'Next: Day '+c[0]+' – '+c[2]}):h('div',{class:'small',text:'🎉 Finished'})));
      });
    };
  }
  el.append(h('button',{class:'btn link',type:'button',style:{alignSelf:'flex-start'},onclick:function(){go('learn')}},'‹ All tracks'));
  var head=h('div'),bar=h('div'),kp=h('div',{class:'kpis'}),seg=segControl([['today','Today'],['courses','Courses'],['daily','Daily'],['weeks','Weekly'],['plan','Plan']],tab,function(v){tab=v;upd()});
  el.append(head,bar,kp,seg,body);
  function dayRow(d,edit,withCourse){
    var st=lDay(t,d[0]).status||'todo';
    return h('button',{class:'item',type:'button',onclick:function(){if(edit)learnDayForm(t,d);else toast('View only')}},h('span',{text:LSTAT_IC[st],style:{fontSize:'1.1rem'}}),h('div',{class:'t'},h('b',{text:'Day '+d[0]+' · '+d[2]}),h('small',{text:(withCourse?lCourseOf(t,d[1]).name+' · ':'')+d[3]})));
  }
  function upd(){
    t=col('learn').get(param);
    if(!t){head.replaceChildren(emptyState('🤷','This track was not found.'));kp.replaceChildren();bar.replaceChildren();body.replaceChildren();seg.hidden=true;return}
    var tp=lTpl(t),s=lStats(t),edit=lCanEdit(t),cs=lCourseStats(t),cdone=cs.filter(function(x){return x.state==='done'}).length;
    head.replaceChildren(pageHead(t.name,nameOf(t.owner)+' · started '+dayLabel(t.start)+' · '+s.hours+' h logged'+(edit?'':' · view only')));
    bar.replaceChildren(lBar(s.pct),h('div',{class:'small muted',text:'Overall: '+s.pct+'% · '+s.done+' of '+s.N+' days'}));
    kp.replaceChildren(
      h('div',{class:'kpi'},h('b',{class:'num',text:s.done+'/'+s.N}),h('span',{text:'Days done'})),
      h('div',{class:'kpi'},h('b',{class:'num',text:cdone+'/'+cs.length}),h('span',{text:'Courses done'})),
      h('div',{class:'kpi'},h('b',{class:'num',style:{color:s.diff<0?'var(--over)':''},text:s.planned===0?'–':(s.diff>0?'+':'')+s.diff}),h('span',{text:lPace(s)})));
    body.replaceChildren();
    if(tab==='today'){
      var c=lCurrent(t);
      if(!c){body.append(h('div',{class:'card'},emptyState('🎉','All '+s.N+' days done. Well done!')))}
      else{
        var x=lDay(t,c[0]),co=lCourseOf(t,c[1]),cst=cs.filter(function(q){return q.c.id===c[1]})[0],card=h('section',{class:'card'});
        card.append(h('div',{class:'chead'},h('h2',{text:'Day '+c[0]+' · '+tp.weeks[Math.ceil(c[0]/7)-1]}),h('span',{class:'pill brand',text:co.platform})));
        card.append(h('div',null,h('div',{class:'label',text:'Course'}),h('div',{text:co.name+(cst?' ('+cst.done+' of '+cst.total+' days done)':'')})),
          h('div',null,h('div',{class:'label',text:'Learn (45 min)'}),h('div',{text:c[2]})),
          h('div',null,h('div',{class:'label',text:'Code (60 min)'}),h('div',{text:c[3]})),
          h('div',null,h('div',{class:'label',text:'Deliverable'}),h('div',{text:c[4]})));
        if(edit){
          card.append(chipGroup(LSTAT.map(function(o){return [o[0],o[1],LSTAT_IC[o[0]]]}),x.status||'todo',false,function(v){
            lSaveDay(t,c[0],{status:v,doneOn:v==='done'?today():''});
            if(v==='done')toast('Day '+c[0]+' done');
          }),h('button',{class:'btn',type:'button',onclick:function(){learnDayForm(t,c)}},'Add hours and notes'));
        }
        body.append(card);
        var nx=tp.days.filter(function(d){return d[0]>c[0]&&lDay(t,d[0]).status!=='done'}).slice(0,3);
        if(nx.length){var l=h('div',{class:'list'});nx.forEach(function(d){l.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:'Day '+d[0]+' · '+d[2]}),h('small',{text:lCourseOf(t,d[1]).name+' · '+d[4]}))))});body.append(h('section',{class:'card'},h('div',{class:'label',text:'Coming up'}),l))}
      }
    }else if(tab==='courses'){
      var cc=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Progress by course'}),h('span',{class:'pill'+(cdone===cs.length?' green':''),text:cdone+'/'+cs.length})));
      var cl=h('div',{class:'list'});
      cs.forEach(function(q){
        var ic={done:'✅',doing:'🔄',todo:'⬜'}[q.state];
        cl.append(h('button',{class:'item',type:'button',style:{flexWrap:'wrap'},onclick:function(){
          var l=h('div',{class:'list'});q.days.forEach(function(d){l.append(dayRow(d,edit,false))});
          openSheet(q.c.name,h('div',{class:'form'},h('div',{class:'muted small',text:q.c.platform+' · '+q.done+' of '+q.total+' days done'+(q.hours?' · '+q.hours+' h':'')}),l));
        }},h('span',{text:ic,style:{fontSize:'1.1rem'}}),h('div',{class:'t'},h('b',{text:q.c.name}),h('small',{text:q.c.platform+' · '+q.done+'/'+q.total+' days'+(q.hours?' · '+q.hours+' h':'')}),lBar(Math.round(q.done/q.total*100)))));
      });
      cc.append(cl);body.append(cc);
      var card3=h('section',{class:'card'}),l3=h('div',{class:'list'}),nd=0;
      tp.capstone.forEach(function(r,i){var x=lCap(t,i),on=!!x.done;if(on)nd++;
        l3.append(h('button',{class:'item',type:'button',onclick:function(){if(!edit){toast('View only');return}col('learn').save({id:'c_'+t.id+'_'+i,kind:'cap',track:t.id,n:i,done:!on})}},h('span',{text:on?'✅':'⬜',style:{fontSize:'1.1rem'}}),h('div',{class:'t'},h('b',{text:r}))));
      });
      card3.append(h('div',{class:'chead'},h('h2',{text:'Final project checklist'}),h('span',{class:'pill'+(nd===tp.capstone.length?' green':''),text:nd+'/'+tp.capstone.length})),l3);body.append(card3);
      if(edit)body.append(h('button',{class:'btn link danger',type:'button',style:{alignSelf:'flex-start'},onclick:function(){askConfirm('Delete this track and all its progress?','Delete',function(){col('learn').items.filter(function(x){return x.id===t.id||x.track===t.id}).forEach(function(x){col('learn').del(x.id)});go('learn')})}},'Delete this track'));
    }else if(tab==='daily'){
      var act=lActivity(t),td=today(),wk=0,k;
      for(k=0;k<7;k++){var a=act[addDays(td,-k)];if(a)wk+=a.hours}
      var sc=h('div',{class:'kpis'},
        h('div',{class:'kpi'},h('b',{class:'num',text:lStreak(act)+''}),h('span',{text:'Day streak'})),
        h('div',{class:'kpi'},h('b',{class:'num',text:r1((act[td]||{hours:0}).hours)+' h'}),h('span',{text:'Today (goal 2 h)'})),
        h('div',{class:'kpi'},h('b',{class:'num',text:r1(wk)+' h'}),h('span',{text:'Last 7 days'})));
      var span=Math.max(1,Math.min(diffDays(td,t.start)+1,84)),grid=h('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px'}});
      for(k=0;k<span;k++){
        var ds=addDays(t.start,k),a2=act[ds],hrs=a2?a2.hours:0,bg=hrs>=2?'var(--good)':(a2?'color-mix(in srgb,var(--good) 40%,var(--soft))':'var(--soft)');
        grid.append(h('span',{title:dayLabel(ds)+(a2?' · '+r1(hrs)+' h':''),style:{width:'30px',height:'30px',borderRadius:'8px',background:bg,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:'700',color:hrs>=2?'#fff':'var(--muted)',outline:ds===td?'2px solid var(--brand)':'none'},text:String(parseD(ds).getDate())}));
      }
      body.append(sc,h('section',{class:'card'},h('div',{class:'label',text:'Every day since you started'}),grid,h('div',{class:'small muted',text:'Dark green = 2 hours or more. Light green = some progress.'})));
      var dates=Object.keys(act).sort().reverse(),lc=h('section',{class:'card'},h('div',{class:'label',text:'Daily log'})),ll=h('div',{class:'list'});
      dates.slice(0,30).forEach(function(ds){var a3=act[ds];
        ll.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:dayLabel(ds)+' · '+r1(a3.hours)+' h'}),h('small',{text:a3.days.sort(function(p,q){return p.n-q.n}).map(function(x){return 'Day '+x.n+' '+LSTAT_IC[x.status||'todo']}).join('  ')+(a3.days.some(function(x){return x.note})?'  · '+a3.days.filter(function(x){return x.note})[0].note:'')}))));
      });
      if(!dates.length)ll.append(emptyState('🎯','Nothing logged yet. Mark today\'s day to start your streak.'));
      lc.append(ll);body.append(lc);
    }else if(tab==='plan'){
      tp.weeks.forEach(function(wn,wi){
        var ds=tp.days.filter(function(d){return Math.ceil(d[0]/7)===wi+1}),dn=ds.filter(function(d){return lDay(t,d[0]).status==='done'}).length;
        var card=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Week '+(wi+1)+' · '+wn}),h('span',{class:'pill'+(dn===ds.length?' green':''),text:dn+'/'+ds.length})));
        var l=h('div',{class:'list'});ds.forEach(function(d){l.append(dayRow(d,edit,true))});
        card.append(l);body.append(card);
      });
    }else{
      var card2=h('section',{class:'card'}),l2=h('div',{class:'list'});
      tp.weeks.forEach(function(wn,wi){var sc2=lScore(t,wi+1);
        l2.append(h('button',{class:'item',type:'button',onclick:function(){if(edit)learnWeekForm(t,wi+1);else toast('View only')}},h('div',{class:'t'},h('b',{text:'Week '+(wi+1)+' · '+wn}),h('small',{text:sc2==null?'Not scored yet':lDecision(sc2)})),h('span',{class:'pill '+(sc2==null?'':sc2>=5?'green':sc2>=3?'brand':'red'),text:sc2==null?'–':sc2+'/6'})));
      });
      card2.append(h('div',{class:'small muted',text:'At the end of each week, score yourself 0–2 on three questions. 5–6 means move on.'}),l2);body.append(card2);
    }
  }
  return upd;
}
// Home screen card: every track in the family, with today's task for your own.
function learnHomeCard(){
  var ts=lTracks();if(!ts.length)return null;
  var c=h('section',{class:'card'}),l=h('div',{class:'list'});
  c.append(cardHead('book','var(--c-learn)','Learning','See all',function(){go('learn')}));
  ts.forEach(function(x){var s=lStats(x),cur=lCurrent(x);
    l.append(h('button',{class:'item',type:'button',onclick:function(){go('learn',x.id)}},avatar(x.owner),h('div',{class:'t'},h('b',{text:x.name}),h('small',{text:(cur&&x.owner===S.uid?'Today: Day '+cur[0]+' – '+cur[2]:s.done+' of '+s.N+' days')+' · '+lPace(s)}),lBar(s.pct))));
  });
  c.append(l);return c;
}
