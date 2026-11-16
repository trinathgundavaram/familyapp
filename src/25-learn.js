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
      var o=Object.assign({},x,{id:'d_'+t.id+'_'+d[0],kind:'day',track:t.id,n:d[0],status:v.status,hours:v.hours,conf:v.conf,note:v.note});
      if(v.status==='done'&&!o.doneOn)o.doneOn=today();
      col('learn').save(o);toast('Saved');
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
  var head=h('div'),kp=h('div',{class:'kpis'}),seg=segControl([['today','Today'],['plan','Plan'],['weeks','Weekly'],['cap','Capstone']],tab,function(v){tab=v;upd()});
  el.append(head,kp,seg,body);
  function upd(){
    t=col('learn').get(param);
    if(!t){head.replaceChildren(emptyState('🤷','This track was not found.'));kp.replaceChildren();body.replaceChildren();seg.hidden=true;return}
    var tp=lTpl(t),s=lStats(t),edit=lCanEdit(t);
    head.replaceChildren(pageHead(t.name,nameOf(t.owner)+' · started '+dayLabel(t.start)+' · '+s.hours+' h logged'+(edit?'':' · view only')));
    kp.replaceChildren(
      h('div',{class:'kpi'},h('b',{class:'num',text:s.done+'/'+s.N}),h('span',{text:'Days done'})),
      h('div',{class:'kpi'},h('b',{class:'num',text:s.pct+'%'}),h('span',{text:'Complete'})),
      h('div',{class:'kpi'},h('b',{class:'num',style:{color:s.diff<0?'var(--over)':''},text:s.planned===0?'–':(s.diff>0?'+':'')+s.diff}),h('span',{text:lPace(s)})));
    body.replaceChildren();
    if(tab==='today'){
      var c=lCurrent(t);
      if(!c){body.append(h('div',{class:'card'},emptyState('🎉','All 60 days done. Well done!')))}
      else{
        var x=lDay(t,c[0]),card=h('section',{class:'card'});
        card.append(h('div',{class:'chead'},h('h2',{text:'Day '+c[0]+' · '+tp.weeks[Math.ceil(c[0]/7)-1]}),h('span',{class:'pill brand',text:c[1]})));
        card.append(h('div',null,h('div',{class:'label',text:'Learn (45 min)'}),h('div',{text:c[2]})),
          h('div',null,h('div',{class:'label',text:'Code (60 min)'}),h('div',{text:c[3]})),
          h('div',null,h('div',{class:'label',text:'Deliverable'}),h('div',{text:c[4]})));
        if(edit){
          card.append(chipGroup(LSTAT.map(function(o){return [o[0],o[1],LSTAT_IC[o[0]]]}),x.status||'todo',false,function(v){
            col('learn').save(Object.assign({},lDay(t,c[0]),{id:'d_'+t.id+'_'+c[0],kind:'day',track:t.id,n:c[0],status:v,doneOn:v==='done'?today():''}));
            if(v==='done')toast('Day '+c[0]+' done');
          }),h('button',{class:'btn',type:'button',onclick:function(){learnDayForm(t,c)}},'Add hours and notes'));
        }
        body.append(card);
        var nx=tp.days.filter(function(d){return d[0]>c[0]&&lDay(t,d[0]).status!=='done'}).slice(0,3);
        if(nx.length){var l=h('div',{class:'list'});nx.forEach(function(d){l.append(h('div',{class:'item'},h('div',{class:'t'},h('b',{text:'Day '+d[0]+' · '+d[2]}),h('small',{text:d[1]+' · '+d[4]}))))});body.append(h('section',{class:'card'},h('div',{class:'label',text:'Coming up'}),l))}
      }
    }else if(tab==='plan'){
      tp.weeks.forEach(function(wn,wi){
        var ds=tp.days.filter(function(d){return Math.ceil(d[0]/7)===wi+1}),dn=ds.filter(function(d){return lDay(t,d[0]).status==='done'}).length;
        var card=h('section',{class:'card'},h('div',{class:'chead'},h('h2',{text:'Week '+(wi+1)+' · '+wn}),h('span',{class:'pill'+(dn===ds.length?' green':''),text:dn+'/'+ds.length})));
        var l=h('div',{class:'list'});
        ds.forEach(function(d){var st=lDay(t,d[0]).status||'todo';
          l.append(h('button',{class:'item',type:'button',onclick:function(){if(edit)learnDayForm(t,d);else toast('View only')}},h('span',{text:LSTAT_IC[st],style:{fontSize:'1.1rem'}}),h('div',{class:'t'},h('b',{text:'Day '+d[0]+' · '+d[2]}),h('small',{text:d[1]+' · '+d[3]}))));
        });
        card.append(l);body.append(card);
      });
    }else if(tab==='weeks'){
      var card2=h('section',{class:'card'}),l2=h('div',{class:'list'});
      tp.weeks.forEach(function(wn,wi){var sc=lScore(t,wi+1);
        l2.append(h('button',{class:'item',type:'button',onclick:function(){if(edit)learnWeekForm(t,wi+1);else toast('View only')}},h('div',{class:'t'},h('b',{text:'Week '+(wi+1)+' · '+wn}),h('small',{text:sc==null?'Not scored yet':lDecision(sc)})),h('span',{class:'pill '+(sc==null?'':sc>=5?'green':sc>=3?'brand':'red'),text:sc==null?'–':sc+'/6'})));
      });
      card2.append(h('div',{class:'small muted',text:'At the end of each week, score yourself 0–2 on three questions. 5–6 means move on.'}),l2);body.append(card2);
    }else{
      var card3=h('section',{class:'card'}),l3=h('div',{class:'list'}),nd=0;
      tp.capstone.forEach(function(r,i){var x=lCap(t,i),on=!!x.done;if(on)nd++;
        l3.append(h('button',{class:'item',type:'button',onclick:function(){if(!edit){toast('View only');return}col('learn').save({id:'c_'+t.id+'_'+i,kind:'cap',track:t.id,n:i,done:!on})}},h('span',{text:on?'✅':'⬜',style:{fontSize:'1.1rem'}}),h('div',{class:'t'},h('b',{text:r}))));
      });
      card3.append(h('div',{class:'chead'},h('h2',{text:'Final project checklist'}),h('span',{class:'pill'+(nd===tp.capstone.length?' green':''),text:nd+'/'+tp.capstone.length})),l3);body.append(card3);
      if(edit)body.append(h('button',{class:'btn link danger',type:'button',style:{alignSelf:'flex-start'},onclick:function(){askConfirm('Delete this track and all its progress?','Delete',function(){col('learn').items.filter(function(x){return x.id===t.id||x.track===t.id}).forEach(function(x){col('learn').del(x.id)});go('learn')})}},'Delete this track'));
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
